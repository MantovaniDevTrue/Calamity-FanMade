import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { AndroidSound } from './../../../Common/Snippets/AndroidSound.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaled = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const MAX_PROJECTILES = 1000;
const TRAIL_LENGTH = 20;
const States = new Array(MAX_PROJECTILES);

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}
function Slot(projectile) {
    const value = Math.floor(Number(projectile && projectile.whoAmI));
    return value >= 0 && value < MAX_PROJECTILES ? value : -1;
}
function CreateState(projectile) {
    return {
        identity: Math.floor(Number(projectile && projectile.identity)),
        target: -1,
        trail: []
    };
}
function State(projectile) {
    const slot = Slot(projectile);
    if (slot < 0)
        return CreateState(projectile);
    const identity = Math.floor(Number(projectile.identity));
    let state = States[slot];
    if (!state || state.identity !== identity) {
        state = CreateState(projectile);
        States[slot] = state;
    }
    return state;
}
function RecordTrail(projectile, state) {
    const x = Number(projectile.position.X);
    const y = Number(projectile.position.Y);
    if (!Number.isFinite(x) || !Number.isFinite(y))
        return;
    const first = state.trail[0];
    if (!first || Math.abs(first.X - x) > 0.01 || Math.abs(first.Y - y) > 0.01)
        state.trail.unshift({ X: x, Y: y });
    if (state.trail.length > TRAIL_LENGTH)
        state.trail.length = TRAIL_LENGTH;
}
function LerpColor(a, b, amount, strength, alpha) {
    const t = Clamp(amount, 0, 1);
    const s = Clamp(strength, 0, 1.5);
    return Color.new(
        Math.floor((a[0] + (b[0] - a[0]) * t) * s),
        Math.floor((a[1] + (b[1] - a[1]) * t) * s),
        Math.floor((a[2] + (b[2] - a[2]) * t) * s),
        Math.max(1, Math.min(255, Math.floor(alpha)))
    );
}
function ActivePlayer(player) {
    return !!(player && player.active && !player.dead);
}
function Overlap(projectile, player) {
    return Number(projectile.position.X) < Number(player.position.X) + Number(player.width) &&
        Number(projectile.position.X) + Number(projectile.width) > Number(player.position.X) &&
        Number(projectile.position.Y) < Number(player.position.Y) + Number(player.height) &&
        Number(projectile.position.Y) + Number(projectile.height) > Number(player.position.Y);
}
function StickToTiles(projectile) {
    try {
        let xLeft = Math.floor(Number(projectile.position.X) / 16) - 1;
        let xRight = Math.floor((Number(projectile.position.X) + Number(projectile.width)) / 16) + 2;
        let yBottom = Math.floor(Number(projectile.position.Y) / 16) - 1;
        let yTop = Math.floor((Number(projectile.position.Y) + Number(projectile.height)) / 16) + 2;
        xLeft = Math.max(0, xLeft); yBottom = Math.max(0, yBottom);
        xRight = Math.min(Number(Terraria.Main.maxTilesX), xRight); yTop = Math.min(Number(Terraria.Main.maxTilesY), yTop);
        for (let x = xLeft; x < xRight; x++) {
            for (let y = yBottom; y < yTop; y++) {
                const tile = Terraria.Main.tile.get_Item(x, y);
                if (!tile || tile['bool active()']() !== true)
                    continue;
                let inactive = false;
                try { inactive = tile['bool inActive()']() === true; } catch (e) { }
                if (inactive || Terraria.Main.tileSolid[Number(tile.type)] !== true)
                    continue;
                const tileX = x * 16, tileY = y * 16;
                if (Number(projectile.position.X) + Number(projectile.width) - 4 > tileX && Number(projectile.position.X) + 4 < tileX + 16 &&
                    Number(projectile.position.Y) + Number(projectile.height) - 4 > tileY && Number(projectile.position.Y) + 4 < tileY + 16) {
                    projectile.velocity.X = 0;
                    projectile.velocity.Y = -0.2;
                }
            }
        }
    } catch (e) { }
}
function HealPlayer(player, amount) {
    amount = Math.max(1, Math.floor(Number(amount) || 1));
    const before = Math.floor(Number(player.statLife) || 0);
    const maxLife = Math.max(before, Math.floor(Number(player.statLifeMax2) || before));
    const healed = Math.max(0, Math.min(amount, maxLife - before));
    if (healed <= 0)
        return 0;
    player.statLife = before + healed;
    try { player.HealEffect(healed, true); } catch (e) { try { player.HealEffect(healed); } catch (_) { } }
    return healed;
}

export class GladiatorHealOrb extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Healing/GladiatorHealOrb';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0;
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = TRAIL_LENGTH;
        } catch (e) { }
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 8;
        projectile.height = 8;
        projectile.friendly = true;
        projectile.hostile = false;
        projectile.ignoreWater = true;
        projectile.alpha = 0;
        projectile.penetrate = 1;
        projectile.timeLeft = 4800;
        projectile.tileCollide = false;
        projectile.extraUpdates = 3;
    }

    OnSpawn(projectile) {
        const slot = Slot(projectile);
        if (slot >= 0)
            States[slot] = CreateState(projectile);
    }

    CanDamage(projectile) { return false; }

    AI(projectile) {
        const state = State(projectile);
        RecordTrail(projectile, state);
        const ai = new ProjAI(projectile);
        const heal = Math.max(1, Number(ai[0]) || 1);
        // Store the final 0.25-scaled value so the registered circle remains a
        // correctly sized native fallback if PreDraw becomes unavailable.
        projectile.scale = (heal / 8 + (1 - heal / 8) * 0.65) * 0.25;
        let target = Math.floor(Number(state.target));
        if (target < 0) {
            StickToTiles(projectile);
            projectile.velocity.X = Number(projectile.velocity.X) * 0.99;
            if (Number(projectile.velocity.Y) < 2)
                projectile.velocity.Y = Number(projectile.velocity.Y) + 0.02;
            if (Number(projectile.velocity.Y) > 2)
                projectile.velocity.Y = 2;
            let maxDistance = 150;
            for (let i = 0; i < Number(Terraria.Main.maxPlayers); i++) {
                const player = Terraria.Main.player[i];
                if (!ActivePlayer(player))
                    continue;
                if (player.lifeMagnet)
                    maxDistance = 225;
                const dx = Number(player.Center.X) - Number(projectile.Center.X);
                const dy = Number(player.Center.Y) - Number(projectile.Center.Y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < maxDistance) {
                    maxDistance = distance;
                    target = i;
                }
            }
            state.target = target;
            return;
        }
        const player = Terraria.Main.player[target];
        if (!ActivePlayer(player)) {
            state.target = -1;
            return;
        }
        const dx = Number(player.Center.X) - Number(projectile.Center.X);
        const dy = Number(player.Center.Y) - Number(projectile.Center.Y);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 50 && Overlap(projectile, player)) {
            HealPlayer(player, heal);
            const variant = 1 + Math.floor(Math.random() * 5);
            AndroidSound.PlayOneShot(`Sounds/Custom/OrbHeal${variant}.ogg`, 0.15, Number(projectile.Center.X), Number(projectile.Center.Y), 1200, 100);
            projectile.Kill();
            return;
        }
        const length = Math.max(0.0001, distance);
        projectile.velocity = Vector2.new(dx / length * 3.5 + Number(player.velocity.X) / 4, dy / length * 3.5 + Number(player.velocity.Y) / 4);
    }

    OnKill(projectile, timeLeft) {
        const slot = Slot(projectile);
        if (slot >= 0)
            States[slot] = null;
    }

    GetAlpha(projectile, lightColor) {
        return Color.new(40, 210, 120, 210);
    }

    PreDraw(projectile, lightColor) {
        try {
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            const spriteBatch = Terraria.Main.spriteBatch;
            const draw = spriteBatch && spriteBatch[DrawScaled];
            if (!texture || !draw)
                return true;

            const state = State(projectile);
            const points = state.trail.length > 0
                ? state.trail
                : [{ X: Number(projectile.position.X), Y: Number(projectile.position.Y) }];
            const count = Math.min(TRAIL_LENGTH, points.length);
            const screenX = Number(Terraria.Main.screenPosition.X);
            const screenY = Number(Terraria.Main.screenPosition.Y);
            const texW = Number(texture.Width);
            const texH = Number(texture.Height);
            const origin = Vector2.new(texW * 0.5, texH * 0.5);
            const time = Number(projectile.timeLeft) || 0;
            const globalTime = Number(Terraria.Main.GlobalTimeWrappedHourly) || 0;
            let drew = false;

            for (let i = 0; i < count; i++) {
                const old = points[i];
                if (!old)
                    continue;
                const oldX = Number(old.X);
                const oldY = Number(old.Y);
                if (!Number.isFinite(oldX) || !Number.isFinite(oldY))
                    continue;

                const interpolation = Math.cos(time / 32 + globalTime / 20 + i / Math.max(1, count) * Math.PI) * 0.5 + 0.5;
                let intensity = 0.9 + 0.15 * Math.cos((globalTime % 60) * Math.PI * 2);
                intensity *= 0.15 + 0.85 * (1 - i / Math.max(1, count));
                if (time <= 60)
                    intensity *= time / 60;
                const drawX = oldX + texW * 0.5 - screenX - 32.5;
                const drawY = oldY + texH * 0.5 - screenY + Number(projectile.gfxOffY || 0) - 32.5;
                const outerColor = LerpColor([32, 178, 170], [50, 205, 50], interpolation, 0.4 * intensity, 145 * intensity);
                const innerColor = LerpColor([32, 178, 170], [50, 205, 50], interpolation, 0.2 * intensity, 95 * intensity);
                const outerScale = Number(projectile.scale || 0.25) * intensity;
                const innerScale = outerScale * 0.7;
                const drawPosition = Vector2.new(drawX, drawY);
                draw(texture, drawPosition, null, outerColor, 0, origin, Vector2.new(outerScale, outerScale), SpriteEffects.None, 0);
                draw(texture, drawPosition, null, innerColor, 0, origin, Vector2.new(innerScale, innerScale), SpriteEffects.None, 0);
                drew = true;
            }
            // Keep the native registered orb visible even when the custom
            // trail draw is silently ignored by the mobile SpriteBatch bridge.
            return true;
        } catch (e) {
            return true;
        }
    }
}
