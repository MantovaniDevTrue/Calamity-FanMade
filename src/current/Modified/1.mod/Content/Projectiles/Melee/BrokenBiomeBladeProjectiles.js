import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { PlayItemSound, PlayNPCHitSound } from './../../../Common/Snippets/LegacySoundCompat.js';
import {
    BrokenBiomeAttunement,
    BrokenBiomeBladeState,
    SwapBrokenBiomeBladeAttunements,
    AttuneBrokenBiomeBlade,
    NormalizeAttunementsAfterHoldout,
    ConsumeBrokenBiomeProjectileSeed,
    IsStandingForAttunement,
    AttunementName,
    BrokenBiomeBiomeName,
    BrokenBiomeZoneSnapshot,
    ReleaseBrokenBiomeHoldout,
    BrokenBiomeBladeSelectedSlot,
    ReleaseBrokenBiomeHeldAttack
} from './../../../Core/BrokenBiomeBladeRuntime.js';

const { Vector2, Rectangle, Color } = Modules;
const PI = Math.PI;
const TAU = PI * 2;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const Draw = () => Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];

let ItemTexture = null;
let AridTexture = null;
let AridExtraTexture = null;
let ColdSmallTexture = null;
let ColdBigTexture = null;
let ColdThrustTexture = null;
let DecayTexture = null;
let PurityTexture = null;
let WindChilledType = 0;

// Module-level state is intentional: TLPro may expose different JS wrappers for the
// same native projectile across hooks. Keeping Pure Clarity state here prevents an
// old swing from being treated as a new one and firing/drawing again.
const PureClarityStates = new Map();
const PurityProjectionStates = new Map();
const BitingEmbraceStates = new Map();
const DecaysRetortStates = new Map();
const AridGrandeurStates = new Map();

function N(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function sign(v, fallback = 1) { return v < 0 ? -1 : (v > 0 ? 1 : fallback); }
function len(x, y) { return Math.sqrt(x * x + y * y); }
function norm(x, y, fallbackX = 1, fallbackY = 0) {
    const m = len(x, y);
    if (!(m > 0.00001)) return { x: fallbackX, y: fallbackY };
    return { x: x / m, y: y / m };
}
function rotvec(angle) { return { x: Math.cos(angle), y: Math.sin(angle) }; }
function center(entity) {
    try { const c = entity.Center; return { x: N(c.X), y: N(c.Y) }; } catch (e) { }
    return { x: N(entity.position?.X) + N(entity.width) * 0.5, y: N(entity.position?.Y) + N(entity.height) * 0.5 };
}
function setCenter(p, x, y) { try { p.Center = Vector2.new(x, y); } catch (e) { } }
function setBladeBroadphase(p, x1, y1, x2, y2, halfWidth) {
    const pad = Math.max(2, N(halfWidth));
    const minX = Math.min(x1, x2) - pad;
    const maxX = Math.max(x1, x2) + pad;
    const minY = Math.min(y1, y2) - pad;
    const maxY = Math.max(y1, y2) + pad;
    p.width = Math.max(8, Math.ceil(maxX - minX));
    p.height = Math.max(8, Math.ceil(maxY - minY));
    setCenter(p, (minX + maxX) * 0.5, (minY + maxY) * 0.5);
}
function ownerOf(p) {
    const wanted = Math.max(0, Math.floor(N(p.owner)));
    try {
        const local = Terraria.Main.LocalPlayer;
        if (local && Math.floor(N(Terraria.PlayerIndex(local))) === wanted) return local;
    } catch (e) { }
    try {
        const player = Terraria.Main.player.get_Item(wanted);
        if (player && player.active) return player;
    } catch (e) {
        try { const player = Terraria.Main.player[wanted]; if (player && player.active) return player; } catch (_) { }
    }
    try { return Terraria.Main.LocalPlayer; } catch (e) { return null; }
}
function heldIsBlade(player) {
    try { return Math.floor(N(player.HeldItem?.type)) === Math.floor(N(ModItem.getTypeByName('BrokenBiomeBlade'))); } catch (e) { return false; }
}
function aim(player, seed = null) {
    if (player && Math.floor(N(Terraria.PlayerIndex(player), -1)) === Math.floor(N(Terraria.Main.myPlayer, -2))) {
        try {
            const c = Terraria.PlayerCenter(player), m = Terraria.Main.MouseWorld;
            if (m) return norm(N(m.X) - N(c.X), N(m.Y) - N(c.Y), N(Terraria.PlayerDirection(player), 1), 0);
        } catch (e) { }
    }
    if (seed) return norm(N(seed.aimX), N(seed.aimY), player ? N(Terraria.PlayerDirection(player), 1) : 1, 0);
    return { x: player ? (N(Terraria.PlayerDirection(player), 1) || 1) : 1, y: 0 };
}
function rightHeld(player, item) {
    const s = BrokenBiomeBladeState(item, player);
    return s.rightDown === true;
}
function sourceFrom(player, p) {
    // TLPro's Terraria.Projectile wrapper does not expose GetSource_FromThis.
    // Probing that missing member prints the complete Projectile member table (~596 lines)
    // on every Purity Projection and causes visible Android frame hitches. Resolve the
    // already-proven typed Player item source directly, then use null as a
    // reflection-free fallback. The entity source is metadata only; projectile gameplay
    // values are unchanged.
    try { return player['IEntitySource GetProjectileSource_Item(Item item)'](player.HeldItem); } catch (e) { }
    try { return null; } catch (e) { return null; }
}
function key(p) {
    // Stable for the lifetime of a live projectile. Do not use Projectile.identity
    // as a JS-map key on TLPro: the IL2CPP wrapper can expose a different identity
    // value between callbacks, which recreated state every AI tick and reset timeLeft.
    return `${Math.floor(N(p.owner))}:${Math.floor(N(p.whoAmI, -1))}:${Math.floor(N(p.type, -1))}`;
}
function endHeldAttack(p) {
    if (!p) return;
    const owner = Math.floor(N(p.owner, -1)), index = Math.floor(N(p.whoAmI, -1));
    ReleaseBrokenBiomeHeldAttack(owner, index);
    try { p.Kill(); return; } catch (e) { }
    try { p.active = false; } catch (e) { }
}
function playVanilla(type, style, p, pitch = 0) {
    try { Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](type, p.Center, style, pitch); } catch (e) { }
}
function loadTexture(slot, path) {
    try { return slot || tl.texture.load(path); } catch (e) { return slot; }
}
function screen(x, y) {
    try { return Vector2.new(x - N(Terraria.Main.screenPosition.X), y - N(Terraria.Main.screenPosition.Y)); }
    catch (e) { return Vector2.new(x, y); }
}
function drawTexture(texture, x, y, source, color, rotation, ox, oy, scale = 1, flip = false) {
    if (!texture) return;
    try { Draw()(texture, screen(x, y), source || null, color || Color.White, rotation, Vector2.new(ox, oy), scale, flip ? SpriteEffects.FlipHorizontally : SpriteEffects.None, 0); } catch (e) { }
}
function segmentAabb(x1, y1, x2, y2, rect, halfWidth = 0) {
    const minX = N(rect.X) - halfWidth, maxX = N(rect.X) + N(rect.Width) + halfWidth;
    const minY = N(rect.Y) - halfWidth, maxY = N(rect.Y) + N(rect.Height) + halfWidth;
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const axes = [[-dx, x1 - minX], [dx, maxX - x1], [-dy, y1 - minY], [dy, maxY - y1]];
    for (const [p, q] of axes) {
        if (Math.abs(p) < 1e-9) { if (q < 0) return false; continue; }
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return true;
}
function solidAt(x, y, w = 10, h = 10) {
    try {
        return !!Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'](Vector2.new(x, y), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
    } catch (e) { return false; }
}
function solidTerrainAt(x, y, w = 10, h = 10) {
    const width = Math.max(1, Math.floor(w));
    const height = Math.max(1, Math.floor(h));
    try {
        const solidTiles = Terraria.Collision['bool SolidTiles(Vector2 position, int width, int height)'];
        if (typeof solidTiles === 'function' && solidTiles(Vector2.new(x, y), width, height) === true) return true;
    } catch (e) { }
    try {
        const solidOrSloped = Terraria.WorldGen['bool SolidOrSlopedTile(int x, int y)'];
        if (typeof solidOrSloped === 'function') {
            const minX = Math.max(1, Math.floor(x / 16));
            const minY = Math.max(1, Math.floor(y / 16));
            const maxX = Math.min(Math.floor(N(Terraria.Main.maxTilesX, minX + 1)) - 2, Math.floor((x + width - 1) / 16));
            const maxY = Math.min(Math.floor(N(Terraria.Main.maxTilesY, minY + 1)) - 2, Math.floor((y + height - 1) / 16));
            for (let ty = minY; ty <= maxY; ty++) {
                for (let tx = minX; tx <= maxX; tx++) {
                    if (solidOrSloped(tx, ty) === true) return true;
                }
            }
        }
    } catch (e) { }
    return solidAt(x, y, width, height);
}
function addLight(x, y, r, g, b) {
    try { Terraria.Lighting['void AddLight(Vector2 position, float r, float g, float b)'](Vector2.new(x, y), r, g, b); return; } catch (e) { }
    try { Terraria.Lighting.AddLight(Math.floor(x / 16), Math.floor(y / 16), r, g, b); } catch (e) { }
}
function dustBurst(x, y, type, count, scale = 1, speed = 2) {
    const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
    if (typeof NewDust !== 'function') return;
    for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU, s = speed * (0.4 + Math.random() * 0.8);
        try { NewDust(Vector2.new(x - 4, y - 4), 8, 8, type, Math.cos(a) * s, Math.sin(a) * s, 100, null, scale * (0.8 + Math.random() * 0.4)); } catch (e) { }
    }
}
function setOwnerPose(player, p, angle, dirOverride = 0) {
    if (!player) return;
    const d = dirOverride || sign(Math.cos(angle), N(Terraria.PlayerDirection(player), 1));
    try { Terraria.SetPlayerDirection(player, d); } catch (e) { }
    try { player.heldProj = p.whoAmI; } catch (e) { }
    try {
        let r = angle;
        if (d !== 1) r -= PI;
        while (r > PI) r -= TAU;
        while (r < -PI) r += TAU;
        player.itemRotation = r;
    } catch (e) { }
}
function polyInOut(t, power = 3) {
    t = clamp(t, 0, 1);
    if (t < 0.5) return Math.pow(t * 2, power) * 0.5;
    return 1 - Math.pow((1 - t) * 2, power) * 0.5;
}
function expIn(t) { t = clamp(t, 0, 1); return t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)); }
function thrustDisplace(t) {
    t = clamp(t, 0, 1);
    if (t < 0.2) return -0.15 * Math.sin(PI * (t / 0.2));
    if (t < 0.35) return 0.9 * polyInOut((t - 0.2) / 0.15, 3);
    if (t < 0.7) return 0.9 + 0.1 * Math.sin(PI * ((t - 0.35) / 0.35));
    return 0.9 * (1 - polyInOut((t - 0.7) / 0.3, 3));
}
function thrustScale(t) {
    t = clamp(t, 0, 1);
    if (t < 0.1) return expIn(t / 0.1);
    if (t < 0.85) return 1;
    return 1 - expIn((t - 0.85) / 0.15);
}

export class BrokenBiomeBladeHoldout extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Melee/BrokenBiomeBlade'; this.States = new Map(); }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 36; p.height = 36; p.aiStyle = -1; p.friendly = true; p.penetrate = -1;
        p.timeLeft = 60; p.tileCollide = false; p.damage = 0;
    }
    S(p) {
        const k = key(p); let s = this.States.get(k);
        if (!s) { s = { initialized: false, state: 0, timer: 0, mayAttune: false, item: null, slot: -1 }; this.States.set(k, s); }
        return s;
    }
    CanDamage() { return false; }
    AI(p) {
        const player = ownerOf(p);
        if (!player || player.dead === true || !heldIsBlade(player)) {
            const oldState = this.States.get(key(p));
            if (oldState && oldState.item) ReleaseBrokenBiomeHoldout(oldState.item, player, Math.floor(N(p.owner, -1)), Math.floor(N(p.whoAmI, -1)));
            p.active = false;
            return;
        }
        const s = this.S(p);
        if (!s.initialized) {
            const seed = ConsumeBrokenBiomeProjectileSeed(p);
            s.mayAttune = seed.mayAttune === true;
            s.item = player.HeldItem;
            s.slot = Math.floor(N(seed.slot, BrokenBiomeBladeSelectedSlot(player)));
            SwapBrokenBiomeBladeAttunements(s.item, player, s.slot);
            s.initialized = true;
            playVanilla(3, 42, p, 0);
            try {
                const z = BrokenBiomeZoneSnapshot(player);
                tl.log(`[CalamityPort BrokenBiomeBlade] holdout started; mayAttune=${s.mayAttune}; biome=${BrokenBiomeBiomeName(player)}; zones=desert:${z.desert},underworld:${z.underworld},snow:${z.snow},sky:${z.sky},corrupt:${z.corrupt},crimson:${z.crimson}; projectile=${Math.floor(N(p.whoAmI, -1))}; slot=${s.slot}.`);
            } catch (e) { }
        }
        // TLPro Android only exposes the interaction press as a short pulse during ItemCheck;
        // it does not reliably keep controlUseTile high for the full 120-tick channel.
        // Once a valid mobile interaction has spawned this holdout, latch the channel and
        // preserve Calamity's 120-tick stationary/grounded requirement. Movement, jumping,
        // death or switching away from the blade still cancels naturally.
        const canChannel = s.mayAttune && Math.floor(N(player.itemAnimation)) <= 0 && IsStandingForAttunement(player);
        if (!canChannel && s.state === 0) {
            try { tl.log(`[CalamityPort BrokenBiomeBlade] channel cancelled; ticks=${s.timer}; standing=${IsStandingForAttunement(player)}; itemAnimation=${Math.floor(N(player.itemAnimation))}.`); } catch (e) { }
            s.state = 1; p.timeLeft = 60;
        }
        if (s.state === 0) {
            try { player.heldProj = p.whoAmI; } catch (e) { }
            // Close mobile-safe equivalent of the official anticipation/thrust/bounceback curve.
            const t = clamp(s.timer / 120, 0, 1);
            let swordHeight;
            if (t < 0.85) swordHeight = 1 + 0.35 * Math.sin((t / 0.85) * PI * 0.5);
            else if (t < 0.95) swordHeight = 1.35 - 1.45 * expIn((t - 0.85) / 0.10);
            else swordHeight = -0.1 + 0.1 * Math.sin(((t - 0.95) / 0.05) * PI * 0.5);
            const pc = Terraria.PlayerCenter(player), d = N(Terraria.PlayerDirection(player), 1) || 1;
            setCenter(p, N(pc.X) + 16 * d, N(pc.Y) - 30 * swordHeight + 10);
            const rt = clamp((s.timer - 20) / 50, 0, 1);
            p.rotation = lerp(-PI / 4, 3 * PI / 4, rt);
            s.timer++;
            p.timeLeft = 60;
            if (s.timer === 1 || s.timer === 30 || s.timer === 60 || s.timer === 90) {
                try { tl.log(`[CalamityPort BrokenBiomeBlade] channel progress=${s.timer}/120; biome=${BrokenBiomeBiomeName(player)}.`); } catch (e) { }
            }
            if (s.timer >= 120) {
                const a = AttuneBrokenBiomeBlade(s.item, player, s.slot);
                s.state = 2; p.timeLeft = 120;
                playVanilla(3, 4, p, a === BrokenBiomeAttunement.DecaysRetort ? 0.1 : 0);
                try {
                    const z = BrokenBiomeZoneSnapshot(player);
                    tl.log(`[CalamityPort BrokenBiomeBlade] attuned=${AttunementName(a)}; biome=${BrokenBiomeBiomeName(player)}; channelTicks=${s.timer}; zones=desert:${z.desert},underworld:${z.underworld},snow:${z.snow},sky:${z.sky},corrupt:${z.corrupt},crimson:${z.crimson}; slot=${s.slot}; storedMain=${AttunementName(BrokenBiomeBladeState(s.item, player, s.slot).main)}.`);
                } catch (e) { }
                const c = Terraria.PlayerCenter(player);
                const dustType = a === BrokenBiomeAttunement.AridGrandeur ? 6 : (a === BrokenBiomeAttunement.BitingEmbrace ? 67 : (a === BrokenBiomeAttunement.DecaysRetort ? 173 : 75));
                dustBurst(N(c.X), N(c.Y) + 16, dustType, 14, 1.1, 3.5);
            }
        } else if (s.state === 1) {
            try { p.position.Y = N(p.position.Y) - 0.3 * (1 + N(p.timeLeft) / 60); } catch (e) { }
        }
    }
    OnKill(p) {
        const s = this.States.get(key(p));
        if (s && s.item) {
            const player = ownerOf(p);
            NormalizeAttunementsAfterHoldout(s.item, player, s.slot);
            ReleaseBrokenBiomeHoldout(s.item, player, Math.floor(N(p.owner, -1)), Math.floor(N(p.whoAmI, -1)));
        }
        this.States.delete(key(p));
    }
    PreDraw(p, lightColor) {
        const s = this.States.get(key(p)); if (!s) return false;
        if (s.state === 0) return s.timer > 6;
        if (s.state !== 1) return false;
        ItemTexture = loadTexture(ItemTexture, 'Textures/Items/Weapons/Melee/BrokenBiomeBlade.png');
        if (!ItemTexture) return false;
        const c = center(p), life = clamp(N(p.timeLeft) / 60, 0, 1), wave = Math.sin(PI + TAU * N(p.timeLeft) / 30);
        const col = Color.op_Multiply(lightColor || Color.White, life);
        drawTexture(ItemTexture, c.x, c.y, null, col, 0, ItemTexture.Width / 2, ItemTexture.Height / 2, Math.max(0.05, (2 - life) * Math.abs(wave)), wave < 0);
        return false;
    }
}

export class PureClarity extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Melee/BrokenBiomeBlade'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 48; p.height = 48; p.friendly = true; p.tileCollide = false; p.penetrate = -1; p.melee = true;
        p.scale = 1.25; p.timeLeft = 31; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.aiStyle = -1;
    }
    S(p, player) {
        const k = key(p);
        const seed = ConsumeBrokenBiomeProjectileSeed(p);
        let s = PureClarityStates.get(k);
        if (!s || seed.__freshSeed === true) {
            const a = aim(player, seed);
            s = {
                total: Math.max(1, Math.floor(N(seed.useAnimation, 30))),
                swingDir: N(seed.swingDir, -1) >= 0 ? 1 : -1,
                aimX: a.x,
                aimY: a.y,
                rotationOffset: 0,
                canHit: false,
                beamFired: false,
                initialized: false
            };
            PureClarityStates.set(k, s);
        }
        return s;
    }
    CanDamage(p) { const s = PureClarityStates.get(key(p)); return !!s && s.canHit; }
    ModifyDamageHitbox(p, hitbox) {
        const s = PureClarityStates.get(key(p));
        const player = ownerOf(p);
        if (!s || !player) return;
        const pc = Terraria.PlayerCenter(player);
        const a = N(p.rotation) + s.rotationOffset - PI / 4;
        const outset = 50 * N(p.scale, 1.25);
        const size = 48 * N(p.scale, 1.25);
        const hx = N(pc.X) + Math.cos(a) * outset;
        const hy = N(pc.Y) + Math.sin(a) * outset;
        hitbox.X = Math.floor(hx - size / 2); hitbox.Y = Math.floor(hy - size / 2);
        hitbox.Width = Math.floor(size); hitbox.Height = Math.floor(size);
    }
    AI(p) {
        const player = ownerOf(p); if (!player || player.dead === true || !heldIsBlade(player)) { endHeldAttack(p); return; }
        const item = player.HeldItem, itemState = BrokenBiomeBladeState(item, player);
        if (itemState.main !== BrokenBiomeAttunement.PureClarity) { endHeldAttack(p); return; }

        const s = this.S(p, player), pc = Terraria.PlayerCenter(player);
        if (!s.initialized) {
            p.timeLeft = s.total;
            const firstAim = norm(s.aimX, s.aimY, N(Terraria.PlayerDirection(player), 1), 0);
            const firstDirection = sign(firstAim.x, N(Terraria.PlayerDirection(player), 1));
            p.rotation = Math.atan2(firstAim.y, firstAim.x) + 65 * PI / 180;

            // Calamity keeps one BaseCustomUseStyleProjectile alive across consecutive
            // item-use cycles. Its RotationOffset therefore carries the previous swing's
            // endpoint into the next wind-up. TLPro spawns one held projectile per use,
            // so starting every new wrapper at zero made both alternating swings begin
            // from the same visual pose. Seed the official wind-up side explicitly:
            // +120/-120 degrees according to SwingDir * owner direction.
            s.rotationOffset = 120 * PI / 180 * s.swingDir * firstDirection;
            s.initialized = true;
            try { tl.log(`[CalamityPort BrokenBiomeBlade] Pure Clarity swing init; dir=${s.swingDir}; facing=${firstDirection}; startOffsetDeg=${Math.round(s.rotationOffset * 180 / PI)}; total=${s.total}; held=${Math.floor(N(p.whoAmI, -1))}.`); } catch (e) { }
        }

        const elapsed = clamp(s.total - Math.floor(N(p.timeLeft)), 0, s.total);
        const windupTicks = Math.max(1, Math.floor(s.total / 3));

        // Official Pure Clarity follows the live cursor during wind-up, then locks the
        // attack direction once the damaging swing begins.
        if (elapsed < windupTicks) {
            const live = aim(player, s);
            s.aimX = live.x;
            s.aimY = live.y;
        }

        const a0 = Math.atan2(s.aimY, s.aimX);
        const d = sign(s.aimX, N(Terraria.PlayerDirection(player), 1));
        try { Terraria.SetPlayerDirection(player, d); } catch (e) { }

        // Match Calamity's AngleLerp(..., 0.1f) without relying on a native Vector2/
        // angle helper that is not consistently exposed by TLPro.
        const targetRotation = a0 + 65 * PI / 180;
        let delta = (targetRotation - N(p.rotation)) % TAU;
        if (delta > PI) delta -= TAU;
        if (delta < -PI) delta += TAU;
        p.rotation = N(p.rotation) + delta * 0.1;

        if (elapsed < windupTicks) {
            s.canHit = false;
            const target = 120 * PI / 180 * s.swingDir * d;
            s.rotationOffset = lerp(s.rotationOffset, target, 0.2);
        } else {
            const swingMax = Math.max(1, s.total - windupTicks);
            const swingTime = elapsed - windupTicks;
            const ratio = clamp(swingTime / swingMax, 0, 1);
            s.canHit = swingTime > Math.floor(swingMax * 0.2) && swingTime < Math.floor(swingMax * 0.85);

            if (s.canHit && Math.random() < 0.5) {
                const finalRot = p.rotation + s.rotationOffset - PI / 4;
                const dist = Math.random() * 80;
                const px = N(pc.X) + Math.cos(finalRot) * dist;
                const py = N(pc.Y) + Math.sin(finalRot) * dist;
                dustBurst(px, py, Terraria.ID.DustID.CursedTorch, 1, 0.95 + Math.random() * 0.25, 1 + Math.random() * 1.1);
            }

            // The official projectile is fired at exactly 40% of the swing section and
            // aims at the CURRENT cursor position, not the direction captured at spawn.
            if (!s.beamFired && swingTime >= Math.floor(swingMax * 0.4)) {
                s.beamFired = true;
                const type = ModProjectile.getTypeByName('PurityProjection');
                if (type > 0 && Math.floor(N(Terraria.Main.myPlayer)) === Math.floor(N(p.owner))) {
                    try { PlayItemSound(43, Terraria.PlayerCenter(player), 0, 0.65); } catch (e) { }
                    const live = aim(player, s);
                    const beam = NewProjectile(sourceFrom(player, p), pc, Vector2.new(live.x * 14.5, live.y * 14.5), type, Math.floor(N(p.damage)), N(p.knockBack), p.owner, 0, 0, 0, null);
                    try { tl.log(`[CalamityPort BrokenBiomeBlade] Pure Clarity projection fired; projectile=${beam}; speed=14.5; owner=${Math.floor(N(p.owner))}; held=${Math.floor(N(p.whoAmI))}.`); } catch (e) { }
                }
            }

            // Calamity uses ExpInOutEasing(..., 1) as the target angle and then lerps
            // RotationOffset toward it by 0.2. The symmetric quadratic curve is the
            // TLPro-safe equivalent already used by this port for the same 150°->-120° arc.
            const ease = ratio < 0.5 ? 0.5 * Math.pow(ratio * 2, 2) : 1 - 0.5 * Math.pow((1 - ratio) * 2, 2);
            const from = 150 * s.swingDir * d * PI / 180;
            const to = 120 * -s.swingDir * d * PI / 180;
            const targetOffset = lerp(from, to, ease);
            s.rotationOffset = lerp(s.rotationOffset, targetOffset, 0.2);
        }

        // TLPro broad-phase adaptation: keep the native projectile AABB exactly on the
        // official 48x48 (scaled) damage box instead of leaving it centered on the owner.
        // This reaches the official outset without creating a giant rear-facing square.
        const hitRot = N(p.rotation) + s.rotationOffset - PI / 4;
        const hitOutset = 50 * N(p.scale, 1.25);
        const hitSize = 48 * N(p.scale, 1.25);
        const hitX = N(pc.X) + Math.cos(hitRot) * hitOutset;
        const hitY = N(pc.Y) + Math.sin(hitRot) * hitOutset;
        p.width = Math.max(8, Math.ceil(hitSize));
        p.height = Math.max(8, Math.ceil(hitSize));
        setCenter(p, hitX, hitY);

        setOwnerPose(player, p, p.rotation + s.rotationOffset, d);
    }
    OnHitNPC(p, npc) {
        try { tl.log(`[CalamityPort BrokenBiomeBlade] Pure Clarity blade hit; npc=${Math.floor(N(npc.whoAmI, -1))}; held=${Math.floor(N(p.whoAmI, -1))}.`); } catch (e) { }
    }
    OnKill(p) {
        PureClarityStates.delete(key(p));
        ReleaseBrokenBiomeHeldAttack(Math.floor(N(p.owner, -1)), Math.floor(N(p.whoAmI, -1)));
    }
    PreDraw(p, lightColor) {
        const s = PureClarityStates.get(key(p)); if (!s) return false;
        const player = ownerOf(p); if (!player) return false;
        ItemTexture = loadTexture(ItemTexture, 'Textures/Items/Weapons/Melee/BrokenBiomeBlade.png');
        if (!ItemTexture) return false;
        const pc = Terraria.PlayerCenter(player), d = N(Terraria.PlayerDirection(player), 1);
        // Calamity BaseCustomUseStyleProjectile.PreDraw: FlipAsSword is ONLY a left/right
        // sword flip. The downward part of the swing comes from FinalRotation around the
        // fixed SpriteOrigin (-5, 40); the texture itself is never vertically mirrored.
        const flipAsSword = d < 0;
        const drawRotation = N(p.rotation) + s.rotationOffset + (flipAsSword ? PI / 2 : 0);
        const originX = flipAsSword ? ItemTexture.Width + 5 : -5;
        drawTexture(ItemTexture, N(pc.X), N(pc.Y), null, lightColor || Color.White, drawRotation, originX, 40, N(p.scale, 1.25), flipAsSword);
        return false;
    }
}

export class PurityProjection extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Melee/BrokenBiomeBlade_PurityProjection'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 32; p.height = 32; p.aiStyle = -1; p.friendly = true; p.penetrate = 1; p.timeLeft = 45; p.melee = true; p.tileCollide = false;
    }
    S(p) {
        const k = key(p);
        let s = PurityProjectionStates.get(k);
        if (!s) { s = { history: [] }; PurityProjectionStates.set(k, s); }
        return s;
    }
    AI(p) {
        const s = this.S(p);
        const c = center(p);
        s.history.unshift({ x: c.x, y: c.y });
        if (s.history.length > 5) s.history.length = 5;

        // Official: first ten ticks pass through tiles and are invisible.
        if (N(p.timeLeft) < 35) p.tileCollide = true;
        const vx = N(p.velocity.X), vy = N(p.velocity.Y);
        p.rotation = Math.atan2(vy, vx) + PI / 4;
        addLight(c.x, c.y, 0.75, 1, 0.24);

        // One Cursed Torch dust per update, matching the official spawn frequency while
        // staying on the TLPro-safe dust path (no Main.dust[index] native access).
        dustBurst(c.x, c.y, Terraria.ID.DustID.CursedTorch, 1, 0.9, 0.6);
    }
    PreDraw(p, lightColor) {
        if (N(p.timeLeft) > 35) return false;
        const s = this.S(p);
        PurityTexture = loadTexture(PurityTexture, 'Textures/Projectiles/Melee/BrokenBiomeBlade_PurityProjection.png');
        if (!PurityTexture) return false;
        const ox = PurityTexture.Width / 2, oy = PurityTexture.Height / 2;
        const col = lightColor || Color.White;
        const hist = s.history || [];
        for (let i = hist.length - 1; i >= 1; i--) {
            const h = hist[i];
            const fade = clamp(1 - i / 6, 0.12, 0.82);
            drawTexture(PurityTexture, h.x, h.y, null, Color.op_Multiply(col, fade), N(p.rotation), ox, oy, N(p.scale, 1), false);
        }
        const c = center(p);
        drawTexture(PurityTexture, c.x, c.y, null, col, N(p.rotation), ox, oy, N(p.scale, 1), false);
        return false;
    }
    OnKill(p) {
        const c = center(p);
        const axis = N(p.rotation) - PI / 4;
        for (let i = 0; i <= 15; i++) {
            const amount = -0.5 + i / 15;
            const x = c.x + Math.cos(axis) * amount * 88;
            const y = c.y + Math.sin(axis) * amount * 88;
            dustBurst(x, y, Terraria.ID.DustID.CursedTorch, 1, 2, Math.max(0.8, len(N(p.velocity.X), N(p.velocity.Y)) * 0.08));
        }
        PurityProjectionStates.delete(key(p));
    }
}

export class BitingEmbrace extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Melee/BrokenBiomeBlade_BitingEmbraceSmall'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 75; p.height = 75; p.tileCollide = false; p.friendly = true; p.penetrate = -1; p.extraUpdates = 0; p.melee = true;
        p.usesIDStaticNPCImmunity = false; p.idStaticNPCHitCooldown = 0;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.aiStyle = -1;
    }
    S(p, player) {
        const k = key(p), seed = ConsumeBrokenBiomeProjectileSeed(p);
        let s = BitingEmbraceStates.get(k);
        if (!s || seed.__freshSeed === true) {
            const a = aim(player, seed), mode = clamp(Math.floor(N(seed.mode)), 0, 2), max = Math.max(1, Math.floor(N(seed.maxTime, mode === 0 ? 15 : mode === 1 ? 20 : 50)));
            const pc = Terraria.PlayerCenter(player);
            s = {
                mode,
                max,
                direction: a,
                baseRotation: Math.atan2(a.y, a.x),
                rotation: Math.atan2(a.y, a.x),
                previousRotation: Math.atan2(a.y, a.x),
                previousScale: 1,
                previousRatio: 0,
                previousAnchorX: N(pc.X),
                previousAnchorY: N(pc.Y),
                anchorX: N(pc.X),
                anchorY: N(pc.Y),
                initialized: false,
                timer: 0,
                lastDrawFrame: -1
            };
            BitingEmbraceStates.set(k, s);
        }
        return s;
    }
    AI(p) {
        const player = ownerOf(p); if (!player || player.dead === true || !heldIsBlade(player)) { endHeldAttack(p); return; }
        const s = this.S(p, player);
        if (!s.initialized) {
            try { tl.log(`[CalamityPort BrokenBiomeBlade] Biting init begin; mode=${s.mode}; max=${s.max}; held=${Math.floor(N(p.whoAmI, -1))}.`); } catch (e) { }
            p.timeLeft = s.max;
            if (s.mode === 0) {
                p.width = p.height = 75;
                try { PlayItemSound(1, p.Center, 0.05, 0.9); } catch (e) { }
            }
            else if (s.mode === 1) {
                p.width = p.height = 75;
                try { PlayItemSound(1, p.Center, -0.05, 1.0); } catch (e) { }
            }
            else {
                p.width = p.height = 75;
                // TLPro safety: the old port incorrectly called legacy sound type 3
                // (NPC hit) with style 103 here. That invalid pair crashes natively on
                // Android. Keep the attack sound on the validated item-sound bridge.
                try { PlayItemSound(1, p.Center, 0.12, 1.05); } catch (e) { }
                p.damage = Math.max(1, Math.floor(N(p.damage) * 1.15));
            }
            try { tl.log(`[CalamityPort BrokenBiomeBlade] Biting init; mode=${s.mode}; max=${s.max}; extraUpdates=0; safeItemSound=true; held=${Math.floor(N(p.whoAmI, -1))}.`); } catch (e) { }
            s.initialized = true;
        }
        p.friendly = true;
        s.previousRotation = s.rotation;
        s.previousScale = N(p.scale, 1);
        s.previousRatio = clamp(N(s.timer) / s.max, 0, 1);
        s.previousAnchorX = N(s.anchorX, N(Terraria.PlayerCenter(player).X));
        s.previousAnchorY = N(s.anchorY, N(Terraria.PlayerCenter(player).Y));

        s.timer = s.max - N(p.timeLeft);
        const ratio = clamp(s.timer / s.max, 0, 1), dsign = sign(s.direction.x, N(Terraria.PlayerDirection(player), 1));
        const swingDir = s.mode === 0 ? -dsign : (s.mode === 1 ? dsign : 0), width = s.mode === 0 ? 2.3 : 1.8;
        const factor = 1 - Math.pow(1 - ratio, 2);
        s.rotation = s.baseRotation + lerp(width / 2 * swingDir, -width / 2 * swingDir, factor);
        p.scale = 1 + Math.sin(ratio * PI) * 0.6;
        const pc = Terraria.PlayerCenter(player);
        s.anchorX = N(pc.X);
        s.anchorY = N(pc.Y);
        if (s.mode === 2) {
            const disp = thrustDisplace(ratio); p.scale = 1 + thrustScale(ratio) * 0.6;
            setCenter(p, N(pc.X) + s.direction.x * disp * 60, N(pc.Y) + s.direction.y * disp * 60);
            p.frameCounter = Math.floor(N(p.frameCounter)) + 1;
            if (Math.floor(N(p.frameCounter)) % 5 === 0 && Math.floor(N(p.frame)) < 5) p.frame = Math.floor(N(p.frame)) + 1;
            if (Math.random() < 0.22) dustBurst(N(pc.X) + s.direction.x * 40, N(pc.Y) + s.direction.y * 40, 135, 1, 1.1, 1.5);
        } else {
            setCenter(p, N(pc.X) + s.direction.x * 30, N(pc.Y) + s.direction.y * 30);
            if (Math.random() > 0.82) {
                const tip = { x: N(pc.X) + Math.cos(s.rotation) * 100 * N(p.scale), y: N(pc.Y) + Math.sin(s.rotation) * 100 * N(p.scale) };
                dustBurst(tip.x, tip.y, 67, 1, 1, 1.3);
            }
        }
        let broadStartX = N(pc.X);
        let broadStartY = N(pc.Y);
        let broadLength = (s.mode === 0 ? 102 : 128) * N(p.scale, 1);
        let broadHalfWidth = (s.mode === 0 ? 20 : 28) * N(p.scale, 1);
        if (s.mode === 2) {
            const d = thrustDisplace(ratio) * 60;
            broadStartX += s.direction.x * d;
            broadStartY += s.direction.y * d;
            const extended = Math.floor(N(p.frame)) >= 2;
            broadLength = (extended ? 204 : 132) * N(p.scale, 1);
            broadHalfWidth = (extended ? 46 : 34) * N(p.scale, 1);
        }
        setBladeBroadphase(
            p,
            broadStartX,
            broadStartY,
            broadStartX + Math.cos(s.rotation) * broadLength,
            broadStartY + Math.sin(s.rotation) * broadLength,
            broadHalfWidth + 4
        );
        p.rotation = s.rotation;
        addLight(N(pc.X), N(pc.Y), 0.75 * Math.sin(ratio * PI), 1 * Math.sin(ratio * PI), 1 * Math.sin(ratio * PI));
        setOwnerPose(player, p, s.rotation);
    }
    Colliding(p, myRect, targetRect) {
        const s = BitingEmbraceStates.get(key(p)); const player = ownerOf(p); if (!s || !player) return false;

        const ratio = clamp((s.max - N(p.timeLeft)) / s.max, 0, 1);
        const currentScale = N(p.scale, 1);
        const previousScale = N(s.previousScale, currentScale);
        const previousRatio = clamp(N(s.previousRatio, ratio), 0, 1);
        const currentAnchorX = N(s.anchorX, N(Terraria.PlayerCenter(player).X));
        const currentAnchorY = N(s.anchorY, N(Terraria.PlayerCenter(player).Y));
        const previousAnchorX = N(s.previousAnchorX, currentAnchorX);
        const previousAnchorY = N(s.previousAnchorY, currentAnchorY);
        const currentRotation = N(s.rotation);
        const previousRotation = N(s.previousRotation, currentRotation);

        const samples = 5;
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const sampleScale = lerp(previousScale, currentScale, t);
            const sampleRatio = lerp(previousRatio, ratio, t);
            const anchorX = lerp(previousAnchorX, currentAnchorX, t);
            const anchorY = lerp(previousAnchorY, currentAnchorY, t);
            const rotation = lerp(previousRotation, currentRotation, t);

            let length = (s.mode === 0 ? 102 : 128) * sampleScale;
            let halfWidth = (s.mode === 0 ? 20 : 28) * sampleScale;
            let sx = anchorX;
            let sy = anchorY;

            if (s.mode === 2) {
                const d = thrustDisplace(sampleRatio) * 60;
                sx += s.direction.x * d;
                sy += s.direction.y * d;
                const extended = Math.floor(N(p.frame)) >= 2;
                length = (extended ? 204 : 132) * sampleScale;
                halfWidth = (extended ? 46 : 34) * sampleScale;
            }

            if (segmentAabb(
                sx,
                sy,
                sx + Math.cos(rotation) * length,
                sy + Math.sin(rotation) * length,
                targetRect,
                halfWidth
            )) return true;
        }

        return false;
    }
    OnHitNPC(p, npc) {
        const s = BitingEmbraceStates.get(key(p)); if (!s) return;
        try { tl.log(`[CalamityPort BrokenBiomeBlade] Biting hit; mode=${s.mode}; npc=${Math.floor(N(npc.whoAmI, -1))}; held=${Math.floor(N(p.whoAmI, -1))}; areaHit=true.`); } catch (e) { }
        if (s.mode !== 2) return;
        if (!(WindChilledType > 0)) WindChilledType = Math.floor(N(ModBuff.getTypeByName('WindChilled')));
        if (WindChilledType > 0) try { npc['void AddBuff(int type, int time, bool quiet)'](WindChilledType, 180, false); } catch (e) { }
        try { npc['void AddBuff(int type, int time, bool quiet)'](Terraria.ID.BuffID.Frozen, 20, false); } catch (e) { }
    }
    OnKill(p) { BitingEmbraceStates.delete(key(p)); ReleaseBrokenBiomeHeldAttack(Math.floor(N(p.owner, -1)), Math.floor(N(p.whoAmI, -1))); }
    PreDraw(p, lightColor) {
        const s = BitingEmbraceStates.get(key(p)); const player = ownerOf(p); if (!s || !player) return false;
        ItemTexture = loadTexture(ItemTexture, 'Textures/Items/Weapons/Melee/BrokenBiomeBlade.png');
        ColdSmallTexture = loadTexture(ColdSmallTexture, 'Textures/Projectiles/Melee/BrokenBiomeBlade_BitingEmbraceSmall.png');
        ColdBigTexture = loadTexture(ColdBigTexture, 'Textures/Projectiles/Melee/BrokenBiomeBlade_BitingEmbraceBig.png');
        ColdThrustTexture = loadTexture(ColdThrustTexture, 'Textures/Projectiles/Melee/BrokenBiomeBlade_BitingEmbraceThrust.png');
        if (!ItemTexture) return false;
        const pc = Terraria.PlayerCenter(player), ratio = clamp((s.max - N(p.timeLeft)) / s.max, 0, 1), disp = s.mode === 2 ? thrustDisplace(ratio) * 60 : 0;
        const x = N(pc.X) + s.direction.x * disp, y = N(pc.Y) + s.direction.y * disp, drawRot = s.rotation + PI / 4;
        if (s.mode === 2) {
            const currentFrame = clamp(Math.floor(N(p.frame)), 0, 5);
            if (currentFrame !== s.lastDrawFrame) {
                s.lastDrawFrame = currentFrame;
                try { tl.log(`[CalamityPort BrokenBiomeBlade] Biting thrust draw frame=${currentFrame}; held=${Math.floor(N(p.whoAmI, -1))}.`); } catch (e) { }
            }
        }
        drawTexture(ItemTexture, x + Math.cos(s.rotation) * 10, y + Math.sin(s.rotation) * 10, null, lightColor || Color.White, drawRot, 0, ItemTexture.Height, N(p.scale), false);
        if (s.mode !== 2) {
            const blade = s.mode === 0 ? ColdSmallTexture : ColdBigTexture;
            if (blade) drawTexture(blade, x + Math.cos(s.rotation) * 28 * N(p.scale), y + Math.sin(s.rotation) * 28 * N(p.scale), null, Color.op_Multiply(Color.Lerp(Color.White, lightColor || Color.White, 0.5), 0.8), drawRot, 0, blade.Height, N(p.scale), false);
        } else if (ColdThrustTexture) {
            const frame = clamp(Math.floor(N(p.frame)), 0, 5), src = Rectangle.new(0, 116 * frame, 114, 114);
            drawTexture(ColdThrustTexture, x + s.direction.x * 28 * N(p.scale), y + s.direction.y * 28 * N(p.scale), src, Color.op_Multiply(Color.Lerp(Color.White, lightColor || Color.White, 0.5), 0.9), drawRot, 0, 114, N(p.scale), false);
        }
        return false;
    }
}

export class DecaysRetort extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Melee/BrokenBiomeBlade_DecaysRetort'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 84; p.height = 84; p.tileCollide = false; p.friendly = true; p.penetrate = -1; p.extraUpdates = 1; p.melee = true;
        p.usesIDStaticNPCImmunity = true; p.idStaticNPCHitCooldown = 10; p.aiStyle = -1;
    }
    S(p, player) {
        const k = key(p), seed = ConsumeBrokenBiomeProjectileSeed(p);
        let s = DecaysRetortStates.get(k);
        if (!s || seed.__freshSeed === true) {
            const a = aim(player, seed);
            s = {
                max: Math.max(1, Math.floor(N(seed.maxTime, 26))),
                canLunge: seed.canLunge === true,
                canBounce: true,
                direction: a,
                initialized: false,
                lungeApplied: false,
                bounceLogged: false,
                pendingBounce: null,
                pendingBounceWrites: 0
            };
            DecaysRetortStates.set(k, s);
        }
        return s;
    }
    AI(p) {
        const player = ownerOf(p); if (!player || player.dead === true || !heldIsBlade(player)) { endHeldAttack(p); return; }
        const s = this.S(p, player);
        if (!s.initialized) {
            p.timeLeft = s.max;
            p.rotation = Math.atan2(s.direction.y, s.direction.x);
            if (s.canLunge && Math.floor(N(Terraria.Main.myPlayer)) === Math.floor(N(p.owner))) {
                try {
                    player.velocity = Vector2.new(s.direction.x * 16, s.direction.y * 16);
                    s.lungeApplied = true;
                } catch (e) { }
            }
            try { PlayItemSound(103, p.Center, 0, 1); } catch (e) { }
            try { tl.log(`[CalamityPort BrokenBiomeBlade] Decay init; held=${Math.floor(N(p.whoAmI, -1))}; canLunge=${s.canLunge}; lungeApplied=${s.lungeApplied}; maxTime=${s.max}.`); } catch (e) { }
            s.initialized = true;
        }
        if (s.pendingBounce && s.pendingBounceWrites > 0 && Math.floor(N(Terraria.Main.myPlayer)) === Math.floor(N(p.owner))) {
            try {
                player.velocity = Vector2.new(s.pendingBounce.x, s.pendingBounce.y);
                s.pendingBounceWrites--;
                if (s.pendingBounceWrites <= 0) {
                    try { tl.log(`[CalamityPort BrokenBiomeBlade] Decay bounce applied in AI; held=${Math.floor(N(p.whoAmI, -1))}; vx=${N(s.pendingBounce.x).toFixed(2)}; vy=${N(s.pendingBounce.y).toFixed(2)}.`); } catch (e) { }
                    s.pendingBounce = null;
                }
            } catch (e) {
                try { tl.log(`[CalamityPort BrokenBiomeBlade] Decay bounce AI velocity write failed; ${e}.`); } catch (_) { }
                s.pendingBounce = null;
                s.pendingBounceWrites = 0;
            }
        }
        const timer = s.max - N(p.timeLeft), ratio = clamp(timer / s.max, 0, 1), wave = Math.sin(ratio * PI), pc = Terraria.PlayerCenter(player);
        p.scale = 1 + wave * 0.6;
        const sx = N(pc.X) + s.direction.x * wave * 60;
        const sy = N(pc.Y) + s.direction.y * wave * 60;
        const blade = 120 * N(p.scale);
        setBladeBroadphase(p, sx, sy, sx + s.direction.x * blade, sy + s.direction.y * blade, 12);
        addLight(sx, sy, 0.9 * wave, 0, 0.35 * wave);
        setOwnerPose(player, p, Math.atan2(s.direction.y, s.direction.x));
    }
    Colliding(p, myRect, targetRect) {
        const s = DecaysRetortStates.get(key(p)), player = ownerOf(p); if (!s || !player) return false;
        const ratio = clamp((s.max - N(p.timeLeft)) / s.max, 0, 1), wave = Math.sin(ratio * PI), pc = Terraria.PlayerCenter(player);
        const sx = N(pc.X) + s.direction.x * wave * 60;
        const sy = N(pc.Y) + s.direction.y * wave * 60;
        const blade = 120 * N(p.scale);
        return segmentAabb(sx, sy, sx + s.direction.x * blade, sy + s.direction.y * blade, targetRect, 12);
    }
    OnHitNPC(p, npc) {
        const s = DecaysRetortStates.get(key(p)), player = ownerOf(p); if (!s || !player || !s.canBounce || Math.floor(N(Terraria.Main.myPlayer)) !== Math.floor(N(p.owner))) return;
        const maxLife = Math.max(1, Math.floor(N(player.statLifeMax2, player.statLifeMax)));
        const oldLife = Math.floor(N(player.statLife));
        const heal = Math.max(0, Math.min(2, maxLife - oldLife));
        if (heal > 0) {
            try { player.statLife = oldLife + heal; player.HealEffect(heal, true); } catch (e) { }
        }
        const playerRect = Terraria.PlayerRect(player);
        let grounded = false;
        try {
            grounded = solidTerrainAt(
                N(playerRect.X) + 2,
                N(playerRect.Y) + N(playerRect.Height),
                Math.max(4, N(playerRect.Width) - 4),
                4
            );
        } catch (e) { }
        const bounce = 8 * (grounded ? 0.2 : 1);
        const bounceX = -s.direction.x * bounce;
        const bounceY = -s.direction.y * bounce;
        s.pendingBounce = { x: bounceX, y: bounceY };
        s.pendingBounceWrites = 2;
        try { player.velocity = Vector2.new(bounceX, bounceY); } catch (e) { }
        s.canBounce = false;
        try { player.SetImmuneTimeForAllTypes(10); } catch (e) { }
        if (!s.bounceLogged) {
            s.bounceLogged = true;
            try { tl.log(`[CalamityPort BrokenBiomeBlade] Decay bounce queued; held=${Math.floor(N(p.whoAmI, -1))}; npc=${Math.floor(N(npc?.whoAmI, -1))}; heal=${heal}; grounded=${grounded}; bounce=${bounce.toFixed(2)}; vx=${bounceX.toFixed(2)}; vy=${bounceY.toFixed(2)}.`); } catch (e) { }
        }
    }
    OnKill(p) { DecaysRetortStates.delete(key(p)); ReleaseBrokenBiomeHeldAttack(Math.floor(N(p.owner, -1)), Math.floor(N(p.whoAmI, -1))); }
    PreDraw(p, lightColor) {
        const s = DecaysRetortStates.get(key(p)), player = ownerOf(p); if (!s || !player) return false;
        ItemTexture = loadTexture(ItemTexture, 'Textures/Items/Weapons/Melee/BrokenBiomeBlade.png');
        DecayTexture = loadTexture(DecayTexture, 'Textures/Projectiles/Melee/BrokenBiomeBlade_DecaysRetort.png');
        if (!ItemTexture || !DecayTexture) return false;
        const ratio = clamp((s.max - N(p.timeLeft)) / s.max, 0, 1), wave = Math.sin(ratio * PI), pc = Terraria.PlayerCenter(player), x = N(pc.X) + s.direction.x * wave * 60, y = N(pc.Y) + s.direction.y * wave * 60, angle = Math.atan2(s.direction.y, s.direction.x), rot = angle + PI / 4;
        drawTexture(ItemTexture, x + s.direction.x * 10, y + s.direction.y * 10, null, lightColor || Color.White, rot, 0, ItemTexture.Height, N(p.scale), false);
        drawTexture(DecayTexture, x + s.direction.x * 24 * N(p.scale), y + s.direction.y * 24 * N(p.scale), null, Color.op_Multiply(Color.Lerp(Color.White, lightColor || Color.White, 0.5), 0.9), rot, 0, DecayTexture.Height, N(p.scale), false);
        return false;
    }
}

export class AridGrandeur extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Melee/BrokenBiomeBlade_AridGrandeur'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 70; p.height = 70; p.tileCollide = false; p.friendly = false; p.penetrate = -1; p.extraUpdates = 1; p.melee = true;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 30; p.timeLeft = 30; p.aiStyle = -1;
    }
    S(p, player) {
        const k = key(p), seed = ConsumeBrokenBiomeProjectileSeed(p);
        let s = AridGrandeurStates.get(k);
        if (!s || seed.__freshSeed === true) {
            const a = aim(player, seed);
            s = {
                shred: 0,
                pogoCooldown: 0,
                direction: a,
                initialized: false,
                warmup: 30,
                warmupLogged: false,
                hitCount: 0,
                pogoCount: 0,
                releaseGrace: 8,
                airborneGrace: 0,
                prevPogoTipX: null,
                prevPogoTipY: null,
                pogoContactCount: 0,
                pogoCheckCounter: 0,
                lastPogoCheckTick: -1,
                lastGrounded: false
            };
            AridGrandeurStates.set(k, s);
        }
        return s;
    }
    CanDamage(p) {
        const s = AridGrandeurStates.get(key(p));
        return !!s && s.warmup <= 0;
    }
    AI(p) {
        const player = ownerOf(p);
        if (!player || player.dead === true || !heldIsBlade(player) || BrokenBiomeBladeState(player.HeldItem, player).main !== BrokenBiomeAttunement.AridGrandeur) { endHeldAttack(p); return; }

        const s = this.S(p, player);
        if (!s.initialized) {
            try { PlayItemSound(90, p.Center, 0, 1); } catch (e) { }
            p.timeLeft = 30;
            s.initialized = true;
        }

        const held = player.channel === true || player.controlUseItem === true;
        if (held) s.releaseGrace = 8; else s.releaseGrace--;
        if (s.warmup > 0) s.warmup--;
        if (s.warmup <= 0) {
            p.friendly = true;
            if (!s.warmupLogged) {
                s.warmupLogged = true;
                try { tl.log(`[CalamityPort BrokenBiomeBlade] Arid active; held=${held}; channel=${player.channel === true}; controlUseItem=${player.controlUseItem === true}; projectile=${Math.floor(N(p.whoAmI, -1))}.`); } catch (e) { }
            }
            if (!held && s.releaseGrace <= 0) { endHeldAttack(p); return; }
            p.timeLeft = 2;
        } else {
            p.friendly = false;
        }

        s.shred = clamp(s.shred, 0, 500);
        const ratio = clamp(s.shred / 250, 0, 1);
        s.direction = aim(player, s);
        const angle = Math.atan2(s.direction.y, s.direction.x);
        const pc = Terraria.PlayerCenter(player);

        p.rotation = angle;
        p.scale = 1.33 + ratio;

        const bladeLength = 94 * N(p.scale);
        const bladeHalfWidth = 38 * N(p.scale);
        const tipX = N(pc.X) + s.direction.x * bladeLength;
        const tipY = N(pc.Y) + s.direction.y * bladeLength;
        setBladeBroadphase(p, N(pc.X), N(pc.Y), tipX, tipY, bladeHalfWidth);

        addLight(N(pc.X) + s.direction.x * 60, N(pc.Y) + s.direction.y * 60, ratio, 0.56 * ratio, 0.56 * ratio);

        const playerRect = Terraria.PlayerRect(player);
        const pogoDistance = 84 * N(p.scale);
        const tipXNow = N(pc.X) + s.direction.x * pogoDistance;
        const tipYNow = N(pc.Y) + s.direction.y * pogoDistance;
        const tipXPrev = s.prevPogoTipX == null ? tipXNow - s.direction.x * 18 : N(s.prevPogoTipX, tipXNow);
        const tipYPrev = s.prevPogoTipY == null ? tipYNow - s.direction.y * 18 : N(s.prevPogoTipY, tipYNow);
        s.prevPogoTipX = tipXNow;
        s.prevPogoTipY = tipYNow;

        const gameTick = Math.floor(N(Terraria.Main.GameUpdateCount, -1));
        s.pogoCheckCounter++;
        const logicalCheck = gameTick >= 0 ? s.lastPogoCheckTick !== gameTick : s.pogoCheckCounter % 2 === 0;

        let contact = false;
        let contactX = tipXNow;
        let contactY = tipYNow;
        let airborne = s.airborneGrace > 0;

        if (logicalCheck) {
            s.lastPogoCheckTick = gameTick;
            let grounded = false;
            try {
                grounded = solidTerrainAt(
                    N(playerRect.X) + 2,
                    N(playerRect.Y) + N(playerRect.Height),
                    Math.max(4, N(playerRect.Width) - 4),
                    4
                );
            } catch (e) { }
            s.lastGrounded = grounded;
            if (!grounded) s.airborneGrace = 8;
            else if (s.airborneGrace > 0) s.airborneGrace--;
            airborne = !grounded || s.airborneGrace > 0;

            if (airborne && s.pogoCooldown <= 0) {
                const margin = 14;
                const minX = Math.min(tipXPrev, tipXNow) - margin;
                const minY = Math.min(tipYPrev, tipYNow) - margin;
                const maxX = Math.max(tipXPrev, tipXNow) + margin;
                const maxY = Math.max(tipYPrev, tipYNow) + margin;
                contact = solidTerrainAt(
                    minX,
                    minY,
                    Math.max(12, maxX - minX),
                    Math.max(12, maxY - minY)
                );
            }
        }

        if (contact && Math.floor(N(Terraria.Main.myPlayer)) === Math.floor(N(p.owner))) {
            const beforeV = Terraria.PlayerVelocity(player);
            try {
                player.velocity = Vector2.new(-s.direction.x * 16, -s.direction.y * 16);
                player.fallStart = Math.floor(N(playerRect.Y) / 16);
            } catch (e) {
                try { tl.log(`[CalamityPort BrokenBiomeBlade] Arid pogo velocity write failed; ${e}.`); } catch (_) { }
            }
            s.pogoCooldown = 30;
            s.pogoCount++;
            BrokenBiomeBladeState(player.HeldItem, player).canLunge = 1;
            try { PlayItemSound(90, Vector2.new(contactX, contactY), -0.15, 1); } catch (e) { }
            dustBurst(contactX, contactY, 6, 11, 1.4, 4.5);
            const afterV = Terraria.PlayerVelocity(player);
            try { tl.log(`[CalamityPort BrokenBiomeBlade] Arid pogo; count=${s.pogoCount}; beforeY=${N(beforeV?.Y).toFixed(2)}; afterX=${N(afterV?.X).toFixed(2)}; afterY=${N(afterV?.Y).toFixed(2)}; scale=${N(p.scale).toFixed(2)}.`); } catch (e) { }
        }

        setOwnerPose(player, p, angle);
        try { player.itemTime = 2; player.itemAnimation = 2; } catch (e) { }
        s.shred = Math.max(0, s.shred - 1);
        s.pogoCooldown--;
    }
    Colliding(p, myRect, targetRect) {
        const s = AridGrandeurStates.get(key(p)), player = ownerOf(p);
        if (!s || !player) return false;
        const pc = Terraria.PlayerCenter(player);
        const bladeLength = 94 * N(p.scale);
        const bladeHalfWidth = 38 * N(p.scale);
        return segmentAabb(
            N(pc.X),
            N(pc.Y),
            N(pc.X) + s.direction.x * bladeLength,
            N(pc.Y) + s.direction.y * bladeLength,
            targetRect,
            bladeHalfWidth
        );
    }
    OnHitNPC(p, npc) {
        const s = AridGrandeurStates.get(key(p)), player = ownerOf(p);
        if (!s || !player || Math.floor(N(Terraria.Main.myPlayer)) !== Math.floor(N(p.owner))) return;
        if (s.pogoCooldown <= 0) {
            const before = s.shred;
            s.shred = clamp(s.shred + 62, 0, 500);
            s.pogoCooldown = 20;
            s.hitCount++;
            try { player.SetImmuneTimeForAllTypes(6); } catch (e) { }
            try { PlayNPCHitSound(30, p.Center, 0, 1); } catch (e) { }
            try { tl.log(`[CalamityPort BrokenBiomeBlade] Arid shred hit; count=${s.hitCount}; npc=${Math.floor(N(npc?.whoAmI, -1))}; shred=${before}->${s.shred}; scaleTarget=${(1.33 + clamp(s.shred / 250, 0, 1)).toFixed(2)}.`); } catch (e) { }
        }
    }
    OnKill(p) {
        try { PlayNPCHitSound(43, p.Center, 0, 1); } catch (e) { }
        AridGrandeurStates.delete(key(p));
        ReleaseBrokenBiomeHeldAttack(Math.floor(N(p.owner, -1)), Math.floor(N(p.whoAmI, -1)));
    }
    PreDraw(p, lightColor) {
        const s = AridGrandeurStates.get(key(p)), player = ownerOf(p);
        if (!s || !player) return false;
        ItemTexture = loadTexture(ItemTexture, 'Textures/Items/Weapons/Melee/BrokenBiomeBlade.png');
        AridTexture = loadTexture(AridTexture, 'Textures/Projectiles/Melee/BrokenBiomeBlade_AridGrandeur.png');
        AridExtraTexture = loadTexture(AridExtraTexture, 'Textures/Projectiles/Melee/BrokenBiomeBlade_AridGrandeurExtra.png');
        if (!ItemTexture || !AridTexture) return false;

        const pc = Terraria.PlayerCenter(player);
        const angle = Math.atan2(s.direction.y, s.direction.x);
        const rot = angle + PI / 4;
        const ratio = clamp(s.shred / 250, 0, 1);
        const scale = N(p.scale, 1.33);
        const time = N(Terraria.Main.GlobalTimeWrappedHourly);

        drawTexture(ItemTexture, N(pc.X) + s.direction.x * 10, N(pc.Y) + s.direction.y * 10, null, lightColor || Color.White, rot, 0, ItemTexture.Height, scale, false);
        drawTexture(AridTexture, N(pc.X) + s.direction.x * 32 * scale, N(pc.Y) + s.direction.y * 32 * scale, null, Color.op_Multiply(Color.Lerp(Color.White, lightColor || Color.White, 0.5), 0.9), rot, 0, AridTexture.Height, scale, false);

        if (AridExtraTexture) {
            const nx = -s.direction.y;
            const ny = s.direction.x;
            for (let i = 0; i < 4; i++) {
                const circle = Math.sin(time * 5 + i * PI / 2);
                const rr = rot + circle * PI / 10 - circle * PI / 7 * ratio;
                const straight = Math.sin(time * 7) * 10;
                const side = Math.sin(circle) * (20 + 40 * ratio);
                const x = N(pc.X) + s.direction.x * straight + nx * side;
                const y = N(pc.Y) + s.direction.y * straight + ny * side;
                drawTexture(AridExtraTexture, x, y, null, Color.op_Multiply(Color.Lerp(Color.White, lightColor || Color.White, 0.5), 0.8), rr, 0, AridExtraTexture.Height, scale, false);
            }
        }
        return false;
    }
}
