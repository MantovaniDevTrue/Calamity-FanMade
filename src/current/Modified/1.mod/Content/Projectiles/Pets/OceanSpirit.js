import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Vector2, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const FRAME_COUNT = 17;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function Owner(index) {
    const i = Math.floor(N(index, -1));
    if (i < 0 || i >= 255) return null;
    try { if (i === Math.floor(N(Terraria.Main.myPlayer, -2)) && Terraria.Main.LocalPlayer) return Terraria.Main.LocalPlayer; } catch (_) { }
    try { return Terraria.Main.player[i]; } catch (_) { }
    try { return Terraria.Main.player.get_Item(i); } catch (_) { return null; }
}
function CenterXY(p) {
    try {
        const r = p['Rectangle getRect()']();
        return { x: N(r.X) + N(r.Width) * 0.5, y: N(r.Y) + N(r.Height) * 0.5 };
    } catch (_) {
        try { return { x: N(p.Center.X), y: N(p.Center.Y) }; } catch (_) { return { x: N(p.position?.X) + N(p.width) * 0.5, y: N(p.position?.Y) + N(p.height) * 0.5 }; }
    }
}
function AddOfficialLight(p, wet) {
    const c = CenterXY(p);
    const tx = Math.floor(c.x / 16), ty = Math.floor(c.y / 16);
    try {
        // The tile-coordinate overload is already confirmed reliable on TLPro.
        if (wet) Terraria.Lighting.AddLight(tx, ty, 0, 2, 2.5);
        else Terraria.Lighting.AddLight(tx, ty, 0, 1.32, 1.65);
    } catch (_) { }
}

export class OceanSpirit extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Pets/OceanSpirit'; }

    SetStaticDefaults() {
        try { Terraria.Main.projFrames[this.Type] = FRAME_COUNT; } catch (_) { }
        try { Terraria.Main.projPet[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.LightPet[this.Type] = true; } catch (_) { }
    }

    PostStaticDefaults() {
        try {
            const enabled = Terraria.ID.ProjectileID.Sets.LightPet[this.Type] === true;
            tl.log(`[CalamityPort OceanSpirit] light-pet registry ready; type=${Number(this.Type)}, enabled=${enabled}.`);
        } catch (_) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.netImportant = true; p.width = 38; p.height = 58; p.friendly = true; p.hostile = false;
        p.penetrate = -1; p.timeLeft = 18000; p.tileCollide = false; p.ignoreWater = true; p.aiStyle = -1;
        p.hide = false; p.alpha = 0; p.scale = 1; p.light = 1;
    }

    AI(p) {
        const player = Owner(p.owner);
        if (!player || player.dead === true) { try { p.Kill(); } catch (_) { p.active = false; } return; }

        const buff = Number(ModBuff.getTypeByName('OceanSpiritBuff') || 0);
        let hasBuff = false;
        try { hasBuff = buff > 0 && Number(player.FindBuffIndex(buff)) >= 0; } catch (_) { }
        if (!hasBuff) { try { p.Kill(); } catch (_) { p.active = false; } return; }
        p.timeLeft = 2; p.hide = false; p.alpha = 0;

        const wet = !!(player.wet || player.honeyWet || player.lavaWet || player.shimmerWet);
        p.frameCounter = N(p.frameCounter) + 1;
        if (N(p.frameCounter) > 6) { p.frameCounter = 0; p.frame = N(p.frame) + 1; }
        if (wet) {
            if (N(p.frame) >= 8) p.frame = 0;
        } else if (N(p.frame) < 8 || N(p.frame) >= 16) {
            p.frame = 8;
        }

        const pc = Terraria.PlayerCenter(player);
        const direction = N(player.direction, 1) || 1;
        const tx = N(pc.X) - 60 * direction;
        const ty = N(pc.Y) - 60 + N(player.gfxOffY);
        const c = CenterXY(p);
        let dx = tx - c.x, dy = ty - c.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1000) {
            try { p.Center = pc; } catch (_) { p.position = Vector2.new(N(pc.X) - N(p.width) * 0.5, N(pc.Y) - N(p.height) * 0.5); }
            p.velocity = Vector2.Zero;
            p.netUpdate = true;
        } else if (distance > 0.001) {
            const speedLimit = distance > 200 ? 12 : 5;
            const targetVx = dx / distance * speedLimit;
            const targetVy = dy / distance * speedLimit;
            const vx = N(p.velocity.X) + Math.max(-0.2, Math.min(0.2, targetVx - N(p.velocity.X)));
            const vy = N(p.velocity.Y) + Math.max(-0.2, Math.min(0.2, targetVy - N(p.velocity.Y)));
            p.velocity = Vector2.new(vx, vy);
        }

        if (N(p.velocity.X) < -0.25) p.direction = -1;
        else if (N(p.velocity.X) > 0.25) p.direction = 1;
        p.spriteDirection = N(p.direction, 1);
        p.rotation = N(p.velocity.X) * 0.05;
        AddOfficialLight(p, wet);
    }

    PreDraw(p, lightColor) {
        try {
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            if (!texture) return true;
            const frameHeight = Math.max(1, Math.floor(N(texture.Height) / FRAME_COUNT));
            const frame = ((Math.floor(N(p.frame)) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
            const source = Rectangle.new(0, frame * frameHeight, N(texture.Width), frameHeight);
            const c = CenterXY(p);
            const position = Vector2.new(c.x - N(Terraria.Main.screenPosition?.X), c.y - N(Terraria.Main.screenPosition?.Y));
            const origin = Vector2.new(N(texture.Width) * 0.5, frameHeight * 0.5);
            let effects = SpriteEffects.None;
            try { if (N(p.spriteDirection, 1) < 0) effects = SpriteEffects.FlipHorizontally; } catch (_) { }
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            // Light pets should remain readable even in the Abyss before the light map catches up.
            draw(texture, position, source, Modules.Color.White, N(p.rotation), origin, Math.max(0.01, N(p.scale, 1)), effects, 0);
            return false;
        } catch (_) { return true; }
    }

    CanDamage() { return false; }
    CanCutTiles() { return false; }
}
