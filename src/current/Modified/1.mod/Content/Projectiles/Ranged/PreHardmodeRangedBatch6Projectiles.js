import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModTexture } from './../../../TL/ModTexture.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js';
import { CalamityFastVFX } from './../../../Core/Graphics/CalamityFastVFX.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = -1) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function player(owner) {
    const i = I(owner, -1); if (i < 0) return null;
    try { if (i === I(Terraria.Main.myPlayer, -2) && Terraria.Main.LocalPlayer) return Terraria.Main.LocalPlayer; } catch (_) { }
    try { return Terraria.Main.player.get_Item(i); } catch (_) { return null; }
}
function validPlayer(p) { return !!(p && p.active !== false && p.dead !== true); }
function src(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { return null; } }
function norm(v, speed = 1) { const x = N(v?.X), y = N(v?.Y), len = Math.sqrt(x * x + y * y) || 1; return Vector2.new(x / len * speed, y / len * speed); }
function dust(p, id, count = 1, scale = 0.8) { for (let i = 0; i < count; i++) try { NewDust(p.position, p.width, p.height, id, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 80, Color.White, scale); } catch (_) { } }
function liveAim(pl, fallback) {
    let a = norm(fallback || Vector2.new(N(Terraria.PlayerDirection(pl), 1), 0));
    try {
        const mouse = Terraria.Main.MouseWorld, center = pl.MountedCenter;
        const dx = N(mouse.X) - N(center.X), dy = N(mouse.Y) - N(center.Y);
        if (dx * dx + dy * dy > 4) a = norm(Vector2.new(dx, dy));
    } catch (_) { }
    return a;
}
function applyGunPose(pl, aim) {
    const dir = N(aim.X) < 0 ? -1 : 1;
    try { Terraria.SetPlayerDirection(pl, dir); } catch (_) { }
    try { pl.itemRotation = Math.atan2(N(aim.Y) * dir, N(aim.X) * dir); } catch (_) { }
    try {
        const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
        const grav = N(pl.gravDir, 1) < 0 ? -1 : 1;
        const rotation = (Math.atan2(N(aim.Y), N(aim.X)) - Math.PI / 2) * grav + (grav < 0 ? Math.PI : 0);
        pl.SetCompositeArmFront(true, stretch, rotation);
        pl.SetCompositeArmBack(true, stretch, rotation);
    } catch (_) { }
}

let GlowTexture = null, GlowOrigin = null, GlowChecked = false;
function glowTexture() {
    if (GlowTexture) return GlowTexture;
    if (GlowChecked) return null;
    GlowChecked = true;
    try {
        const t = new ModTexture('Textures/ExtraTextures/SmallGreyscaleCircle');
        if (t?.exists && t.asset?.Value) { GlowTexture = t.asset.Value; GlowOrigin = Vector2.new(N(GlowTexture.Width) * 0.5, N(GlowTexture.Height) * 0.5); }
    } catch (_) { }
    return GlowTexture;
}
let MagnaTexture = null;
function magnaTexture() { if (MagnaTexture) return MagnaTexture; try { MagnaTexture = tl.texture.load('Textures/Items/Weapons/Ranged/MagnaCannon.png'); } catch (_) { } return MagnaTexture; }
const MagnaBlue = Color.new(70, 125, 255, 110);
const MagnaCore = Color.new(135, 225, 255, 170);
const MagnaFull = Color.new(80, 245, 255, 185);
const BubbleBlue = Color.new(75, 210, 255, 115);
const BubbleCore = Color.new(180, 250, 255, 155);
function drawRing(cx, cy, radius, segments, width, color, phase = 0) {
    let lastX = cx + Math.cos(phase) * radius, lastY = cy + Math.sin(phase) * radius;
    for (let i = 1; i <= segments; i++) {
        const angle = phase + Math.PI * 2 * i / segments;
        const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius;
        CalamityFastVFX.DrawBeam(lastX, lastY, x, y, width, color); lastX = x; lastY = y;
    }
}

const MagnaHB = new Map(), MagnaAim = new Map();
export function RegisterMagnaAim(owner, aim) { MagnaAim.set(Number(owner), norm(aim)); }
export function MagnaHoldoutActive(owner) {
    const now = N(Terraria.Main.GameUpdateCount), last = N(MagnaHB.get(Number(owner)), -9999);
    if (now - last <= 3) return true;
    MagnaHB.delete(Number(owner)); return false;
}

export class MagnaCannonHoldout extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Ranged/MagnaCannon'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 56; p.height = 34; p.friendly = false; p.ranged = true; p.penetrate = -1;
        p.tileCollide = false; p.ignoreWater = true; p.timeLeft = 2; p.aiStyle = -1;
    }
    CanDamage() { return false; }
    OnSpawn(p) { FusionEntityData.GetProjectileBag(p, 'magna', () => ({ charge: 0, shots: 0, firing: false, timer: 0, full: false })); MagnaHB.set(Number(p.owner), N(Terraria.Main.GameUpdateCount)); }
    AI(p) {
        const pl = player(p.owner), state = FusionEntityData.GetProjectileBag(p, 'magna', () => ({ charge: 0, shots: 0, firing: false, timer: 0, full: false }));
        if (!validPlayer(pl)) { p.Kill(); return; }
        MagnaHB.set(Number(p.owner), N(Terraria.Main.GameUpdateCount));
        let aim = MagnaAim.get(Number(p.owner)) || norm(p.velocity);
        if (I(p.owner) === I(Terraria.Main.myPlayer)) aim = liveAim(pl, aim);
        MagnaAim.set(Number(p.owner), aim);

        const dir = N(aim.X) < 0 ? -1 : 1;
        p.direction = p.spriteDirection = dir; p.rotation = Math.atan2(N(aim.Y), N(aim.X));
        const grav = N(pl.gravDir, 1) < 0 ? -1 : 1;
        const base = Vector2.Add(pl.MountedCenter, Vector2.new(0, -5 * grav));
        p.Center = Vector2.Add(base, Vector2.Multiply(aim, 28)); p.timeLeft = 2;
        applyGunPose(pl, aim);
        try { pl.heldProj = p.whoAmI; pl.itemTime = 2; pl.itemAnimation = 2; } catch (_) { }

        const using = !!pl.channel || !!pl.controlUseItem;
        if (!state.firing && using) {
            if (state.shots < 20 && state.charge % 9 === 0) state.shots++;
            state.charge++;
            const tip = Vector2.Add(p.Center, Vector2.Multiply(aim, 28));
            const progress = Math.min(1, state.charge / 138);
            if (state.charge >= 10 && state.charge % 18 === 0) {
                try { FusionVFXSystem.SpawnSprite(tip, 'ring', 12 + 15 * progress, { r: 65, g: 125, b: 255, a: 125 }, 9, { priority: 1, fadeOut: 7, rotVel: 0.035 }); } catch (_) { }
            }
            if (state.charge >= 138) {
                state.shots = 20;
                if (!state.full) {
                    state.full = true;
                    dust(p, 226, 10, 1.1);
                    try { FusionVFXSystem.SpawnLayeredBurst(tip, 36, { r: 80, g: 235, b: 255, a: 215 }, 26, { sizeEnd: 74, priority: 2, variant: 2, fadeIn: 1, fadeOut: 20, rotVel: 0.05 }); } catch (_) { }
                    try { PlayItemSound(109, p.Center, 0, 0.4); } catch (_) { }
                }
            }
            return;
        }

        if (!state.firing) { state.firing = true; state.timer = 0; }
        if (state.shots <= 0) { p.Kill(); return; }
        state.timer--;
        if (state.timer <= 0 && I(p.owner) === I(Terraria.Main.myPlayer)) {
            const type = Number(ModProjectile.getTypeByName('MagnaShot') || 0);
            if (type > 0) {
                const spread = (Math.random() - 0.5) * Math.PI / 10, c = Math.cos(spread), s = Math.sin(spread);
                const velocity = Vector2.new((N(aim.X) * c - N(aim.Y) * s) * 12, (N(aim.X) * s + N(aim.Y) * c) * 12);
                const spawn = Vector2.Add(p.Center, Vector2.Multiply(aim, 28));
                NewProjectile(src(p), spawn, velocity, type, Math.max(1, I(p.damage, 25)), N(p.knockBack, 2.5) * (state.full ? 3 : 1), p.owner, 0, 0, 0, null);
                try { FusionVFXSystem.SpawnSprite(spawn, 'flare', state.full ? 22 : 16, state.full ? { r: 80, g: 230, b: 255, a: 210 } : { r: 70, g: 130, b: 255, a: 180 }, 8, { priority: 1, fadeOut: 6, rotation: Math.atan2(N(velocity.Y), N(velocity.X)), sizeY: 8 }); } catch (_) { }
                dust(p, 226, 3, 0.9); try { PlayItemSound(11, spawn, 0, 0.22); } catch (_) { }
            }
            state.shots--; state.timer = state.full ? 4 : 5;
        }
    }
    PreDraw(p, lightColor) {
        const state = FusionEntityData.GetProjectileBag(p, 'magna', () => ({ charge: 0, full: false }));
        const texture = magnaTexture();
        if (texture) {
            try {
                const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
                const position = Vector2.new(N(p.Center.X) - N(Terraria.Main.screenPosition.X), N(p.Center.Y) - N(Terraria.Main.screenPosition.Y) + N(p.gfxOffY));
                const origin = Vector2.new(N(texture.Width) * 0.5, N(texture.Height) * 0.5);
                const effects = I(p.spriteDirection, 1) < 0 ? SpriteEffects.FlipVertically : SpriteEffects.None;
                draw(texture, position, null, lightColor, N(p.rotation), origin, N(p.scale, 1), effects, 0);
            } catch (_) { }
        }
        const aim = MagnaAim.get(Number(p.owner)) || norm(p.velocity);
        const tip = Vector2.Add(p.Center, Vector2.Multiply(aim, 28));
        const progress = Math.min(1, Math.max(0, N(state.charge) / 138));
        if (progress > 0.03) {
            const tick = N(Terraria.Main.GameUpdateCount), pulse = 0.5 + 0.5 * Math.sin(tick * 0.2);
            const glow = glowTexture();
            if (glow && GlowOrigin) CalamityFastVFX.DrawGlow(glow, N(tip.X), N(tip.Y), GlowOrigin, 0.18 + progress * 0.38 + pulse * 0.04, state.full ? MagnaFull : MagnaBlue, tick * 0.01);
            drawRing(N(tip.X), N(tip.Y), 5 + progress * 12 + pulse * 2, 10, 0.9 + progress * 0.9, state.full ? MagnaFull : MagnaCore, tick * 0.035);
        }
        return false;
    }
    OnKill(p) { MagnaHB.delete(Number(p.owner)); MagnaAim.delete(Number(p.owner)); }
}

export class MagnaShot extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Ranged/MagnaShot'; }
    SetDefaults() { const p = this.Projectile; p.width = 5; p.height = 5; p.friendly = true; p.ranged = true; p.penetrate = 1; p.timeLeft = 300; p.extraUpdates = 1; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.aiStyle = -1; }
    AI(p) { p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + Math.PI / 2; if (N(p.timeLeft) % 3 === 0) dust(p, 226, 1, 0.55); if (N(p.timeLeft) % 6 === 0) try { FusionVFXSystem.SpawnSprite(p.Center, 'tiny', 8, { r: 80, g: 170, b: 255, a: 120 }, 9, { priority: 0, fadeOut: 7 }); } catch (_) { } }
    OnKill(p) { try { FusionVFXSystem.SpawnSprite(p.Center, 'bloom', 18, { r: 80, g: 190, b: 255, a: 170 }, 10, { priority: 1, fadeOut: 8 }); } catch (_) { } dust(p, 226, 3, 0.8); try { PlayItemSound(10, p.Center, 0, 0.16); } catch (_) { } }
}

export class PressurizedBubbleStream extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 12; p.height = 12; p.friendly = true; p.ranged = true; p.ignoreWater = true;
        p.penetrate = 3; p.timeLeft = 72; p.extraUpdates = 1; p.tileCollide = false;
        p.usesIDStaticNPCImmunity = true; p.idStaticNPCHitCooldown = 10; p.aiStyle = -1;
    }
    OnSpawn(p) {
        FusionEntityData.GetProjectileBag(p, 'reedBubble', () => ({
            startTick: I(Terraria.Main.GameUpdateCount, 0), launched: false,
            base: norm(p.velocity, 16), lastTick: -1, pulseTick: -9999
        }));
    }
    AI(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'reedBubble', () => ({ startTick: I(Terraria.Main.GameUpdateCount, 0), launched: false, base: norm(p.velocity, 16), lastTick: -1 }));
        const pl = player(p.owner), tick = I(Terraria.Main.GameUpdateCount, 0);
        if (!state.launched && validPlayer(pl)) {
            let aim = liveAim(pl, state.base);
            state.base = Vector2.Multiply(aim, 16);
            const dir = N(aim.X) < 0 ? -1 : 1, grav = N(pl.gravDir, 1) < 0 ? -1 : 1;
            const mouth = Vector2.new(N(pl.MountedCenter.X) + dir * 6, N(pl.MountedCenter.Y) - grav * 5);
            const elapsed = Math.max(0, tick - state.startTick), progress = Math.min(1, elapsed / 8);
            p.Center = Vector2.Add(mouth, Vector2.Multiply(aim, 42)); p.velocity = Vector2.Zero; p.tileCollide = false; p.scale = 0.4 + progress;
            if (tick !== state.lastTick) { state.lastTick = tick; if (elapsed % 2 === 0) dust(p, 33, 2, 0.70 + progress * 0.30); }
            if (elapsed < 8) return;
            state.launched = true; p.velocity = state.base; p.tileCollide = true;
            try { PlayItemSound(64, p.Center, 0, 0.25); } catch (_) { }
            try { FusionVFXSystem.SpawnSprite(p.Center, 'ring', 30, { r: 90, g: 220, b: 255, a: 190 }, 11, { priority: 1, fadeOut: 9 }); } catch (_) { }
            // Efeito garantido mesmo se o sprite VFX estiver indisponível no aparelho.
            dust(p, 33, 8, 1.05);
        }
        if (!state.launched) return;
        p.velocity = Vector2.Multiply(p.velocity, 0.985);
        if (tick !== state.lastTick) {
            state.lastTick = tick;
            if ((tick & 1) === 0) dust(p, 33, 2, 0.80);
            if (tick - N(state.pulseTick, -9999) >= 6) {
                state.pulseTick = tick;
                try { FusionVFXSystem.SpawnSprite(p.Center, 'ring', 18, { r: 90, g: 205, b: 255, a: 115 }, 8, { priority: 0, fadeOut: 7 }); } catch (_) { }
            }
        }
    }
    CanDamage(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'reedBubble', () => ({ launched: false }));
        return state.launched ? null : false;
    }
    PreDraw(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'reedBubble', () => ({ startTick: I(Terraria.Main.GameUpdateCount, 0), launched: false }));
        const tick = I(Terraria.Main.GameUpdateCount, 0), progress = state.launched ? 1 : Math.min(1, Math.max(0, (tick - state.startTick) / 8));
        const glow = glowTexture();
        if (glow && GlowOrigin) {
            const pulse = 0.5 + 0.5 * Math.sin(tick * 0.22);
            CalamityFastVFX.DrawGlow(glow, N(p.Center.X), N(p.Center.Y), GlowOrigin, 0.18 + progress * 0.25 + pulse * 0.035, BubbleBlue, 0);
            drawRing(N(p.Center.X), N(p.Center.Y), 5 + progress * 8, 9, 0.85 + progress * 0.7, BubbleCore, tick * 0.04);
        }
        return false;
    }
    OnHitNPC(p, npc) { const buff = Number(ModBuff.getTypeByName('RiptideDebuff') || 0); if (buff > 0) try { npc.AddBuff(buff, 120, false); } catch (_) { } }
    OnKill(p) { dust(p, 33, 8, 1); try { PlayItemSound(21, p.Center, 0, 0.2); } catch (_) { } }
}
