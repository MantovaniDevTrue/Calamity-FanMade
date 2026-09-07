import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
const FRAME_COUNT = 4;

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function Len(x, y) { return Math.sqrt(x * x + y * y); }
function Center(player) { return Terraria.PlayerCenter(player); }
function Direction(player) { return Number(Terraria.PlayerDirection(player) || player?.direction || 1) >= 0 ? 1 : -1; }
function SetVelocity(p, x, y) { p.velocity = Vector2.new(N(x), N(y)); }
function SetCenter(p, x, y) { p.Center = Vector2.new(N(x), N(y)); }

export class Beldum extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Pets/Beldum';
        this.BuffType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.projPet[this.Type] = true;
        Terraria.Main.projFrames[this.Type] = FRAME_COUNT;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.netImportant = true;
        p.width = 32;
        p.height = 32;
        p.friendly = true;
        p.hostile = false;
        p.penetrate = -1;
        p.timeLeft = 18000;
        p.tileCollide = false;
        p.aiStyle = -1;
        p.hide = false;
        p.alpha = 0;
    }

    State(p) {
        return FusionEntityData.GetProjectileBag(p, 'beldumPet', () => ({
            mode: 0,
            timer: 0,
            blink: 0,
            useHeld: false,
            tileHeld: false
        }));
    }

    KeepAlive(p, player) {
        if (!(this.BuffType > 0)) this.BuffType = Number(ModBuff.getTypeByName('BeldumBuff') || 0);
        if (!player || !player.active || player.dead) {
            try { p.Kill(); } catch (e) { p.active = false; }
            return false;
        }
        let hasBuff = false;
        try { hasBuff = this.BuffType > 0 && player.FindBuffIndex(this.BuffType) >= 0; } catch (e) { }
        const pc = Center(player);
        const dx = N(pc.X) - N(p.Center?.X), dy = N(pc.Y) - N(p.Center?.Y);
        if (!hasBuff || dx * dx + dy * dy >= 4000 * 4000) {
            try { p.Kill(); } catch (e) { p.active = false; }
            return false;
        }
        p.timeLeft = 2;
        return true;
    }

    HandleInteraction(p, player, s) {
        const use = player.controlUseItem === true;
        const tile = player.controlUseTile === true;
        const oldUse = s.useHeld === true;
        const oldTile = s.tileHeld === true;
        s.useHeld = use;
        s.tileHeld = tile;

        let mouse = null;
        try { mouse = Terraria.Main.MouseWorld; } catch (e) { }
        if (!mouse) return;
        const pc = Center(player);
        const pdx = N(p.Center?.X) - N(pc.X), pdy = N(p.Center?.Y) - N(pc.Y);
        if (pdx * pdx + pdy * pdy > 12 * 16 * 12 * 16) return;
        const mx = N(mouse.X), my = N(mouse.Y);
        const left = N(p.Center?.X) - N(p.width) * 0.5, top = N(p.Center?.Y) - N(p.height) * 0.5;
        if (mx < left || mx > left + N(p.width) || my < top || my > top + N(p.height)) return;

        const stationary = Math.abs(N(player.velocity?.X)) < 0.01 && Math.abs(N(player.velocity?.Y)) < 0.01;
        if (use && !oldUse && stationary) s.mode = s.mode === 1 ? 0 : 1;
        else if (tile && !oldTile) s.mode = s.mode === 2 ? 0 : 2;
    }

    FloatingPetAI(p, player) {
        let passive = 0.5;
        p.tileCollide = false;
        const pc = Center(player);
        let xDist = N(pc.X) - N(p.Center?.X);
        let yDist = N(pc.Y) - N(p.Center?.Y);
        yDist += -10 + Math.random() * 30;
        xDist += -10 + Math.random() * 30;
        xDist += 60 * -Direction(player);
        yDist -= 60;
        let dist = Len(xDist, yDist);
        const returnSpeed = 18;

        if (dist < 100 && Math.abs(N(player.velocity?.Y)) < 0.01) {
            let solid = false;
            try { solid = !!SolidCollision(p.position, N(p.width), N(p.height)); } catch (e) { }
            const playerBottom = N(player.position?.Y) + N(player.height);
            const projBottom = N(p.position?.Y) + N(p.height);
            if (projBottom <= playerBottom && !solid && N(p.velocity?.Y) < -6)
                SetVelocity(p, N(p.velocity?.X), -6);
        }

        if (dist > 2000) {
            p.position = Vector2.new(N(pc.X) - N(p.width) * 0.5, N(pc.Y) - N(p.height) * 0.5);
            p.netUpdate = true;
            return;
        }

        if (dist < 50) {
            if (Math.abs(N(p.velocity?.X)) > 2 || Math.abs(N(p.velocity?.Y)) > 2)
                SetVelocity(p, N(p.velocity?.X) * 0.99, N(p.velocity?.Y) * 0.99);
            passive = 0.01;
        } else {
            if (dist < 100) passive = 0.1;
            if (dist > 300) passive = 1;
            const scale = returnSpeed / Math.max(0.001, dist);
            xDist *= scale;
            yDist *= scale;
        }

        let vx = N(p.velocity?.X), vy = N(p.velocity?.Y);
        if (vx < xDist) { vx += passive; if (passive > 0.05 && vx < 0) vx += passive; }
        if (vx > xDist) { vx -= passive; if (passive > 0.05 && vx > 0) vx -= passive; }
        if (vy < yDist) { vy += passive; if (passive > 0.05 && vy < 0) vy += passive * 2; }
        if (vy > yDist) { vy -= passive; if (passive > 0.05 && vy > 0) vy -= passive * 2; }
        SetVelocity(p, vx, vy);
        if (vx >= 0.25) p.direction = -1;
        else if (vx < -0.25) p.direction = 1;
        p.spriteDirection = p.direction;
    }

    PlayerPetting(p, player) {
        const targetDirection = N(p.Center?.X) > N(Center(player).X) ? 1 : -1;
        try { player.StopVanityActions(); } catch (e) { }
        try { Terraria.SetPlayerDirection(player, targetDirection); } catch (e) { try { player.direction = targetDirection; } catch (_) { } }
        try { player.gravDir = 1; } catch (e) { }
        try {
            const completion = Math.floor(N(player.miscCounter) % 14 / 7);
            const stretch = completion === 1 ? Terraria.Player.CompositeArmStretchAmount.Full : Terraria.Player.CompositeArmStretchAmount.ThreeQuarters;
            const pc = Center(player);
            const angle = Math.atan2(N(p.Center?.Y) - N(pc.Y), N(p.Center?.X) - N(pc.X)) - Math.PI / 2;
            player.SetCompositeArmBack(true, stretch, angle);
        } catch (e) { }
    }

    AI(p) {
        const player = Terraria.Main.player[p.owner];
        if (!this.KeepAlive(p, player)) return;
        const s = this.State(p);
        if (!s) return;
        this.HandleInteraction(p, player, s);

        if (s.mode === 0) {
            this.FloatingPetAI(p, player);
        } else if (s.mode === 1) {
            const moving = Math.abs(N(player.velocity?.X)) > 0.01 || Math.abs(N(player.velocity?.Y)) > 0.01;
            const iframes = player.immune === true || N(player.immuneTime) > 0;
            if (moving || iframes) s.mode = 0;
            else {
                const pc = Center(player);
                SetCenter(p, N(pc.X) + 40 * Direction(player), N(pc.Y));
                SetVelocity(p, 0, 0);
                this.PlayerPetting(p, player);
            }
        } else {
            const pc = Center(player);
            const grav = N(player.gravDir, 1) || 1;
            SetCenter(p, N(pc.X), N(pc.Y) - 20 * grav + N(player.gfxOffY));
            SetVelocity(p, 0, 0);
        }

        s.timer = N(s.timer) + 1;
        if (s.mode !== 2) {
            if (s.mode === 0) {
                p.spriteDirection = -((N(p.velocity?.X) > 0) ? 1 : (N(p.velocity?.X) < 0 ? -1 : Direction(player)));
                p.rotation = Math.sin(s.timer * 0.05) * (20 * Math.PI / 180);
            } else {
                const pc = Center(player);
                const dx = N(pc.X) - N(p.Center?.X);
                p.spriteDirection = -(dx > 0 ? 1 : (dx < 0 ? -1 : Direction(player)));
                p.rotation = Math.sin(s.timer * 0.05) * (5 * Math.PI / 180);
            }
        } else {
            p.rotation = 0;
            p.spriteDirection = -Direction(player);
        }

        if (Math.random() < 1 / 600 && s.blink === 0) s.blink = 1;
        if (s.blink === 1) {
            p.frameCounter = N(p.frameCounter) + 1;
            if (N(p.frameCounter) > 3) {
                p.frameCounter = 0;
                p.frame = N(p.frame) + 1;
            }
            if (N(p.frame) > 3) {
                p.frame = 0;
                s.blink = 0;
            }
        } else p.frame = 0;
    }

    PreDraw(p, lightColor) {
        try {
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            if (!texture) return true;
            const frameHeight = Math.floor(N(texture.Height) / FRAME_COUNT);
            const frame = ((Math.floor(N(p.frame)) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
            const source = Rectangle.new(0, frame * frameHeight, N(texture.Width), frameHeight);
            const s = this.State(p);
            const timer = N(s?.timer);
            const mode = Math.floor(N(s?.mode));
            const bob = Math.cos(timer * 0.05) * (mode === 0 ? 10 : 2);
            const position = Vector2.new(N(p.Center?.X) - N(Terraria.Main.screenPosition.X), N(p.Center?.Y) - N(Terraria.Main.screenPosition.Y) + bob);
            const origin = Vector2.new(N(texture.Width) / 2, frameHeight / 2);
            let color = lightColor;
            try { color = p.GetAlpha(lightColor); } catch (e) { }
            let effects = 0;
            try {
                if (N(p.spriteDirection, 1) === -1) effects |= Number(SpriteEffects.FlipHorizontally);
                const player = Terraria.Main.player[p.owner];
                if (N(player?.gravDir, 1) === -1) effects |= Number(SpriteEffects.FlipVertically);
            } catch (e) { }
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            draw(texture, position, source, color, N(p.rotation), origin, N(p.scale, 1), effects, 0);
            return false;
        } catch (e) {
            return true;
        }
    }

    CanDamage() { return false; }
    CanCutTiles() { return false; }
    OnTileCollide() { return false; }
    OnKill(p) { FusionEntityData.ClearProjectile(p); }
}
