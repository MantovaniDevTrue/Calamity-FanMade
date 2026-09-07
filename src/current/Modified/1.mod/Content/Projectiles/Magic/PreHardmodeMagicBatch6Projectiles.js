import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModTexture } from './../../../TL/ModTexture.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js';
import { CalamityFastVFX } from './../../../Core/Graphics/CalamityFastVFX.js';
import { FrozenCubeNPC, ScanFrozenCubeNPCs } from './../../../Core/FrozenCubeTargetRuntime.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';

const { Vector2, Color, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = -1) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function player(owner) {
    const i = I(owner, -1);
    if (i < 0) return null;
    try { if (i === I(Terraria.Main.myPlayer, -2) && Terraria.Main.LocalPlayer) return Terraria.Main.LocalPlayer; } catch (_) { }
    try { return Terraria.Main.player.get_Item(i); } catch (_) { return null; }
}
function validPlayer(p) { return !!(p && p.active !== false && p.dead !== true); }
function validNpc(n) { return !!(n && n.active && N(n.life) > 0 && n.friendly !== true && n.dontTakeDamage !== true); }
function src(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { return null; } }
function norm(v, speed = 1) { const x = N(v?.X), y = N(v?.Y), l = Math.sqrt(x * x + y * y) || 1; return Vector2.new(x / l * speed, y / l * speed); }
function rot(v, angle, scale = 1) { const x = N(v?.X), y = N(v?.Y), c = Math.cos(angle), s = Math.sin(angle); return Vector2.new((x * c - y * s) * scale, (x * s + y * c) * scale); }
function dust(p, id, count = 1, scale = 0.8) { for (let i = 0; i < count; i++) try { NewDust(p.position, p.width, p.height, id, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 80, Color.White, scale); } catch (_) { } }
function setArray(holder, name, index, value) {
    try {
        let a = holder[name], need = I(index, 0) + 1, len = N(a?.Length, N(a?.length, 0));
        if (len < need) { a = a.cloneResized(need); holder[name] = a; }
        try { a['void SetValue(Object value, int index)'](value, I(index, 0)); return true; } catch (_) { }
        try { a.set_Item(I(index, 0), value); return true; } catch (_) { }
    } catch (_) { }
    return false;
}
function liveAim(pl, fallback) {
    let a = norm(fallback || Vector2.new(N(Terraria.PlayerDirection(pl), 1), 0));
    try {
        const mouse = Terraria.Main.MouseWorld, center = pl.MountedCenter;
        const dx = N(mouse.X) - N(center.X), dy = N(mouse.Y) - N(center.Y);
        if (dx * dx + dy * dy > 4) a = norm(Vector2.new(dx, dy));
    } catch (_) { }
    return a;
}
function applyArms(pl, a, both = true) {
    const dir = N(a.X) < 0 ? -1 : 1;
    try { Terraria.SetPlayerDirection(pl, dir); } catch (_) { }
    try { pl.itemRotation = Math.atan2(N(a.Y) * dir, N(a.X) * dir); } catch (_) { }
    try {
        const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
        const grav = N(pl.gravDir, 1) < 0 ? -1 : 1;
        const angle = (Math.atan2(N(a.Y), N(a.X)) - Math.PI / 2) * grav + (grav < 0 ? Math.PI : 0);
        pl.SetCompositeArmFront(true, stretch, angle);
        if (both) pl.SetCompositeArmBack(true, stretch, angle);
    } catch (_) { }
}

let GlowTexture = null, GlowOrigin = null, GlowChecked = false;
function glowTexture() {
    if (GlowTexture) return GlowTexture;
    if (GlowChecked) return null;
    GlowChecked = true;
    try {
        const t = new ModTexture('Textures/ExtraTextures/SmallGreyscaleCircle');
        if (t?.exists && t.asset?.Value) {
            GlowTexture = t.asset.Value;
            GlowOrigin = Vector2.new(N(GlowTexture.Width) * 0.5, N(GlowTexture.Height) * 0.5);
        }
    } catch (_) { }
    return GlowTexture;
}
const CyanEdge = Color.new(45, 160, 255, 95);
const CyanCore = Color.new(110, 215, 255, 150);
const CoralEdge = Color.new(255, 105, 80, 100);
const CoralCore = Color.new(255, 180, 125, 165);
const OrangeGlow = Color.new(255, 95, 35, 130);
const OrangeCore = Color.new(255, 205, 100, 175);
function drawRing(cx, cy, radius, segments, width, color, phase = 0) {
    let lastX = cx + Math.cos(phase) * radius, lastY = cy + Math.sin(phase) * radius;
    for (let i = 1; i <= segments; i++) {
        const a = phase + Math.PI * 2 * i / segments;
        const x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius;
        CalamityFastVFX.DrawBeam(lastX, lastY, x, y, width, color);
        lastX = x; lastY = y;
    }
}

const CoralHB = new Map(), CoralAim = new Map();
export function RegisterCoralAim(owner, aim) { CoralAim.set(Number(owner), norm(aim)); }
export function CoralSpoutActive(owner) {
    const now = N(Terraria.Main.GameUpdateCount), t = N(CoralHB.get(Number(owner)), -9999);
    if (now - t <= 3) return true;
    CoralHB.delete(Number(owner)); return false;
}

export class CoralSpoutHoldout extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 30; p.height = 30; p.friendly = false; p.magic = true;
        p.ignoreWater = true; p.tileCollide = false; p.timeLeft = 2; p.aiStyle = -1;
    }
    CanDamage() { return false; }
    OnSpawn(p) { FusionEntityData.GetProjectileBag(p, 'coralSpout', () => ({ charge: 0 })); CoralHB.set(Number(p.owner), N(Terraria.Main.GameUpdateCount)); }
    AI(p) {
        const pl = player(p.owner), state = FusionEntityData.GetProjectileBag(p, 'coralSpout', () => ({ charge: 0 }));
        if (!validPlayer(pl)) { p.Kill(); return; }
        CoralHB.set(Number(p.owner), N(Terraria.Main.GameUpdateCount));
        let aim = CoralAim.get(Number(p.owner)) || norm(p.velocity);
        if (I(p.owner) === I(Terraria.Main.myPlayer)) aim = liveAim(pl, aim);
        CoralAim.set(Number(p.owner), aim);
        p.Center = Vector2.Add(pl.MountedCenter, Vector2.Multiply(aim, 40));
        p.velocity = Vector2.Zero; p.rotation = Math.atan2(N(aim.Y), N(aim.X)); p.timeLeft = 2;
        applyArms(pl, aim, true);
        try { pl.heldProj = p.whoAmI; pl.itemTime = 25; pl.itemAnimation = 25; } catch (_) { }

        const using = !!pl.channel || !!pl.controlUseItem;
        if (using) {
            state.charge++;
            const muzzle = p.Center, progress = Math.min(1, state.charge / 50);
            if (state.charge % 12 === 0) {
                try { FusionVFXSystem.SpawnSprite(muzzle, 'ring', 12 + 16 * progress, state.charge >= 75 ? { r: 255, g: 120, b: 90, a: 145 } : { r: 50, g: 160, b: 255, a: 135 }, 10, { priority: 1, fadeOut: 8, rotVel: 0.04 }); } catch (_) { }
            }
            if (state.charge === 75) {
                try { FusionVFXSystem.SpawnLayeredBurst(muzzle, 34, { r: 255, g: 135, b: 95, a: 205 }, 24, { sizeEnd: 68, priority: 2, variant: 2, fadeIn: 1, fadeOut: 18, rotVel: 0.05 }); } catch (_) { }
                dust(p, 6, 8, 1); try { PlayItemSound(30, pl.MountedCenter, 0, 0.18); } catch (_) { }
            }
            return;
        }

        if (I(p.owner) === I(Terraria.Main.myPlayer)) {
            if (state.charge >= 75) {
                const type = Number(ModProjectile.getTypeByName('ManaChargedCoral') || 0);
                if (type > 0) NewProjectile(src(p), Vector2.Add(pl.MountedCenter, Vector2.Multiply(aim, 30)), Vector2.Multiply(aim, 35), type, Math.max(1, I(N(p.damage, 9) * 7)), N(p.knockBack, 2), p.owner, 0, 0, 0, null);
                try { FusionVFXSystem.SpawnLayeredBurst(p.Center, 42, { r: 255, g: 130, b: 95, a: 220 }, 24, { sizeEnd: 78, priority: 2, variant: 2, fadeIn: 1, fadeOut: 18 }); } catch (_) { }
                dust(p, 6, 10, 1); try { PlayItemSound(42, pl.MountedCenter, 0, 0.3); } catch (_) { }
            } else {
                const progress = Math.min(1, N(state.charge) / 50);
                const spread = Math.PI / 2 * (1 - Math.pow(progress, 1.5) * 0.95);
                const speed = 10 + 15 * progress;
                const damage = Math.max(1, I(N(p.damage, 9) + 6 * progress * progress));
                const type = Number(ModProjectile.getTypeByName('CoralSpike') || 0);
                for (let i = 0; i < 5 && type > 0; i++) {
                    const offset = -spread / 2 + spread * i / 4;
                    const velocity = rot(aim, offset, speed);
                    NewProjectile(src(p), Vector2.Add(pl.MountedCenter, Vector2.Multiply(norm(velocity), 30)), velocity, type, damage, N(p.knockBack, 2), p.owner, progress, 0, 0, null);
                }
                try { FusionVFXSystem.SpawnLayeredBurst(p.Center, 20 + 16 * progress, { r: 50, g: 160, b: 255, a: 180 }, 16, { sizeEnd: 38 + 20 * progress, priority: 1, variant: 1, fadeIn: 1, fadeOut: 12 }); } catch (_) { }
                dust(p, 33, 6, 0.9); try { PlayItemSound(167, pl.MountedCenter, 0, 0.18); } catch (_) { }
            }
        }
        p.Kill();
    }
    PreDraw(p) {
        const pl = player(p.owner), state = FusionEntityData.GetProjectileBag(p, 'coralSpout', () => ({ charge: 0 }));
        if (!validPlayer(pl)) return false;
        const aim = CoralAim.get(Number(p.owner)) || norm(p.velocity);
        const progress = Math.min(1, Math.max(0, N(state.charge) / 50));
        const fullProgress = Math.min(1, Math.max(0, (N(state.charge) - 75) / 15));
        const spread = Math.PI / 2 * (1 - Math.pow(progress, 1.5) * 0.95);
        const length = 250 + 110 * progress;
        const origin = pl.MountedCenter;
        const tick = N(Terraria.Main.GameUpdateCount);
        const pulse = 0.5 + 0.5 * Math.sin(tick * 0.18);
        const edge = N(state.charge) >= 75 ? CoralEdge : CyanEdge;
        const core = N(state.charge) >= 75 ? CoralCore : CyanCore;

        // Live, stateless telegraph: every beam follows the current cursor this frame.
        // This replaces the old queued SpawnLine objects that visually froze behind the aim.
        const beams = 9;
        for (let i = 0; i < beams; i++) {
            const t = i / (beams - 1);
            const offset = -spread * 0.5 + spread * t;
            const direction = rot(aim, offset, length);
            const endX = N(origin.X) + N(direction.X), endY = N(origin.Y) + N(direction.Y);
            const centerWeight = 1 - Math.abs(t * 2 - 1);
            CalamityFastVFX.DrawBeam(N(origin.X), N(origin.Y), endX, endY, 0.8 + centerWeight * (1.2 + progress * 0.8), centerWeight > 0.72 ? core : edge);
        }
        const muzzle = Vector2.Add(origin, Vector2.Multiply(aim, 40));
        const radius = 7 + progress * 7 + pulse * 2 + fullProgress * 4;
        drawRing(N(muzzle.X), N(muzzle.Y), radius, 10, 1.0 + progress * 0.6, N(state.charge) >= 75 ? CoralCore : CyanCore, tick * 0.035);
        const texture = glowTexture();
        if (texture && GlowOrigin) CalamityFastVFX.DrawGlow(texture, N(muzzle.X), N(muzzle.Y), GlowOrigin, 0.22 + progress * 0.22 + pulse * 0.04, N(state.charge) >= 75 ? CoralEdge : CyanEdge, tick * 0.01);
        return false;
    }
    OnKill(p) { CoralHB.delete(Number(p.owner)); CoralAim.delete(Number(p.owner)); }
}

export class CoralSpike extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Magic/CoralSpike'; }
    SetDefaults() { const p = this.Projectile; p.width = 30; p.height = 30; p.friendly = true; p.magic = true; p.penetrate = 1; p.timeLeft = 360; p.tileCollide = true; p.ignoreWater = true; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 10; p.aiStyle = -1; }
    AI(p) { p.velocity = Vector2.Multiply(p.velocity, 0.96); p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + Math.PI / 2; const speed = Math.sqrt(N(p.velocity.X) ** 2 + N(p.velocity.Y) ** 2); if (speed < 2) p.Kill(); else if (N(p.timeLeft) % 3 === 0) dust(p, 33, 1, 0.65); }
    OnKill(p) { dust(p, 33, 4, 0.8); }
}

export class ManaChargedCoral extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Magic/ManaChargedCoral'; }
    SetStaticDefaults() { setArray(Terraria.Main, 'projFrames', this.Type, 3); }
    SetDefaults() { const p = this.Projectile; p.width = 30; p.height = 30; p.friendly = true; p.magic = true; p.penetrate = -1; p.timeLeft = 360; p.tileCollide = true; p.ignoreWater = true; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 10; p.aiStyle = -1; }
    OnSpawn(p) { FusionEntityData.GetProjectileBag(p, 'manaCoral', () => ({ age: 0, stuck: false, target: -1, off: Vector2.Zero, charge: 0, returning: false })); }
    CanDamage(p) { const s = FusionEntityData.GetProjectileBag(p, 'manaCoral', () => ({ stuck: false, returning: false })); return s.stuck || s.returning ? false : null; }
    AI(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'manaCoral', () => ({ age: 0, stuck: false, target: -1, off: Vector2.Zero, charge: 0, returning: false }));
        s.age++;
        const pl = player(p.owner); if (!validPlayer(pl)) { p.Kill(); return; }
        p.frameCounter = N(p.frameCounter) + 1; if (N(p.frameCounter) >= 6) { p.frame = (N(p.frame) + 1) % 3; p.frameCounter = 0; }
        if (s.stuck) {
            const n = FrozenCubeNPC(s.target);
            if (validNpc(n) && s.charge < 180) { p.Center = Vector2.Add(n.Center, s.off); p.velocity = Vector2.Zero; p.tileCollide = false; s.charge++; return; }
            s.returning = true; s.stuck = false;
        }
        if (s.returning) {
            p.tileCollide = false;
            const d = Vector2.new(N(pl.MountedCenter.X) - N(p.Center.X), N(pl.MountedCenter.Y) - N(p.Center.Y));
            const length = Math.sqrt(N(d.X) ** 2 + N(d.Y) ** 2) || 1;
            p.velocity = Vector2.new(N(d.X) / length * 16, N(d.Y) / length * 16);
            if (length < 24) {
                const add = Math.max(10, Math.min(150, Math.floor(10 + s.charge * 140 / 180)));
                try { pl.statMana = Math.min(N(pl.statManaMax2, N(pl.statMana) + add), N(pl.statMana) + add); pl.ManaEffect(add); } catch (_) { }
                p.Kill();
            }
            return;
        }
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + Math.PI / 2;
        p.velocity = Vector2.new(N(p.velocity.X) * 0.995, Math.min(18, N(p.velocity.Y) + 0.12));
        if (s.age % 4 === 0) dust(p, 33, 1, 0.8);
    }
    OnHitNPC(p, npc) {
        const s = FusionEntityData.GetProjectileBag(p, 'manaCoral', () => ({ stuck: false, target: -1, off: Vector2.Zero, charge: 0, returning: false }));
        if (s.stuck || s.returning) return;
        s.stuck = true; s.target = I(npc.whoAmI, -1); s.off = Vector2.new(N(p.Center.X) - N(npc.Center.X), N(p.Center.Y) - N(npc.Center.Y));
        p.velocity = Vector2.Zero; p.tileCollide = false; p.damage = 0; ScanFrozenCubeNPCs(2);
    }
    OnTileCollide(p) { const s = FusionEntityData.GetProjectileBag(p, 'manaCoral', () => ({ returning: false })); s.returning = true; p.tileCollide = false; return false; }
}

export class FlareBoltProjectile extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Magic/FlareBoltProjectile'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 16; p.height = 16; p.friendly = true; p.magic = true; p.penetrate = -1;
        p.timeLeft = 500; p.extraUpdates = 2; p.tileCollide = false;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.aiStyle = -1;
    }
    OnSpawn(p) {
        FusionEntityData.GetProjectileBag(p, 'flareBolt', () => ({ startTick: I(Terraria.Main.GameUpdateCount, 0), launched: false, launchTick: 0, endX: 0, endY: 0, lastTick: -1 }));
    }
    AI(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'flareBolt', () => ({ startTick: I(Terraria.Main.GameUpdateCount, 0), launched: false, launchTick: 0, endX: 0, endY: 0, lastTick: -1 }));
        const pl = player(p.owner); if (!validPlayer(pl)) { p.Kill(); return; }
        const tick = I(Terraria.Main.GameUpdateCount, 0);
        const chargeTicks = 40;
        if (!s.launched) {
            const aim = liveAim(pl, p.velocity);
            const elapsed = Math.max(0, tick - s.startTick);
            const progress = Math.min(1, elapsed / chargeTicks);
            p.Center = Vector2.Add(pl.MountedCenter, Vector2.Multiply(aim, 48));
            p.velocity = Vector2.Zero; p.tileCollide = false; p.scale = 0.2 + 1.3 * progress;
            p.rotation = N(p.rotation) + 0.08 * (N(aim.X) < 0 ? -1 : 1);
            applyArms(pl, aim, false);
            if (tick !== s.lastTick) {
                s.lastTick = tick;
                if (elapsed % 5 === 0) dust(p, 6, 1, 0.65 + progress * 0.4);
            }
            if (elapsed < chargeTicks) return;

            let mouse = Vector2.Add(pl.MountedCenter, Vector2.Multiply(aim, 260));
            try { mouse = Terraria.Main.MouseWorld || mouse; } catch (_) { }
            s.endX = N(mouse.X); s.endY = N(mouse.Y); s.launchTick = tick; s.launched = true;
            const dx = s.endX - N(p.Center.X), dy = s.endY - N(p.Center.Y), dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = Math.max(4, Math.min(18, dist * 0.0165));
            p.velocity = Vector2.new(dx / dist * speed, dy / dist * speed); p.tileCollide = true; p.scale = 1.5;
            try { FusionVFXSystem.SpawnLayeredBurst(p.Center, 28, { r: 255, g: 95, b: 35, a: 210 }, 18, { sizeEnd: 64, priority: 2, variant: 2, fadeIn: 1, fadeOut: 13 }); } catch (_) { }
            dust(p, 6, 10, 1.1); try { PlayItemSound(20, p.Center, 0.3, 0.32); } catch (_) { }
            return;
        }

        const dx = s.endX - N(p.Center.X), dy = s.endY - N(p.Center.Y), dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const desired = Vector2.new(dx / dist * Math.max(1.5, Math.sqrt(N(p.velocity.X) ** 2 + N(p.velocity.Y) ** 2)), dy / dist * Math.max(1.5, Math.sqrt(N(p.velocity.X) ** 2 + N(p.velocity.Y) ** 2)));
        p.velocity = Vector2.new(N(p.velocity.X) * 0.88 + N(desired.X) * 0.07, N(p.velocity.Y) * 0.88 + N(desired.Y) * 0.07);
        p.rotation = N(p.rotation) + 0.3 * (N(p.velocity.X) >= 0 ? 1 : -1);
        if (tick !== s.lastTick) { s.lastTick = tick; if ((tick - s.launchTick) % 3 === 0) dust(p, 6, 1, 0.8); }
        if (tick - s.launchTick >= 108) p.Kill();
    }
    PreDraw(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'flareBolt', () => ({ startTick: I(Terraria.Main.GameUpdateCount, 0), launched: false }));
        const tick = I(Terraria.Main.GameUpdateCount, 0);
        const progress = s.launched ? 1 : Math.min(1, Math.max(0, (tick - s.startTick) / 40));
        const texture = glowTexture();
        if (texture && GlowOrigin) {
            const pulse = 0.5 + 0.5 * Math.sin(tick * 0.25);
            CalamityFastVFX.DrawGlow(texture, N(p.Center.X), N(p.Center.Y), GlowOrigin, 0.22 + progress * 0.28 + pulse * 0.05, OrangeGlow, N(p.rotation));
            if (!s.launched) drawRing(N(p.Center.X), N(p.Center.Y), 8 + progress * 13, 10, 1.1 + progress, OrangeCore, tick * 0.05);
        }
        return true;
    }
    OnHitNPC(p, npc) { try { npc.AddBuff(Terraria.ID.BuffID.OnFire, 90, false); } catch (_) { } p.damage = Math.max(1, Math.floor(N(p.damage) * Math.max(0.1, 1 - N(p.numHits) * 0.18))); }
    PreKill(p) {
        if (I(p.owner) === I(Terraria.Main.myPlayer)) {
            const type = Number(ModProjectile.getTypeByName('FireImplosion') || 0);
            if (type > 0) NewProjectile(src(p), p.Center, Vector2.Zero, type, Math.max(1, Math.floor(N(p.damage) * 0.75)), N(p.knockBack), p.owner, 0, 0, 0, null);
        }
        dust(p, 6, 10, 1.1); return true;
    }
}

export class FireImplosion extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() { const p = this.Projectile; p.width = 10; p.height = 10; p.friendly = true; p.magic = true; p.penetrate = -1; p.tileCollide = false; p.ignoreWater = true; p.timeLeft = 20; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 8; p.aiStyle = -1; }
    OnSpawn(p) { const c = p.Center; try { p['void Resize(int newWidth, int newHeight)'](96, 96); } catch (_) { p.width = 96; p.height = 96; p.Center = c; } try { FusionVFXSystem.SpawnLayeredBurst(c, 34, { r: 255, g: 100, b: 55, a: 205 }, 18, { sizeEnd: 76, priority: 2, variant: 2, fadeIn: 1, fadeOut: 14 }); } catch (_) { } dust(p, 6, 12, 1.1); try { PlayItemSound(14, c, 0, 0.35); } catch (_) { } }
    CanDamage(p) { return N(p.timeLeft) >= 15 ? null : false; }
    AI(p) { p.scale = 1 + (20 - N(p.timeLeft)) * 0.04; }
    OnHitNPC(p, npc) { try { npc.AddBuff(Terraria.ID.BuffID.OnFire, 90, false); } catch (_) { } }
}

let HellwingBatTexture = null;
function hellwingBatTexture() {
    if (HellwingBatTexture) return HellwingBatTexture;
    try {
        const t = new ModTexture('Textures/Projectiles/Magic/HellwingBat');
        if (t?.exists && t.asset?.Value) {
            HellwingBatTexture = t.asset.Value;
            return HellwingBatTexture;
        }
    } catch (_) { }
    try {
        HellwingBatTexture = tl.texture.load('Textures/Projectiles/Magic/HellwingBat.png');
        return HellwingBatTexture;
    } catch (_) { return null; }
}
function scaledColor(color, mult) {
    const m = Math.max(0, Math.min(1, N(mult, 1)));
    const clamp = v => Math.max(0, Math.min(255, Math.round(N(v) * m)));
    try { return Color.new(clamp(color.R), clamp(color.G), clamp(color.B), clamp(color.A)); }
    catch (_) { return color; }
}
function hellwingFlareDust(p, scalar) {
    try {
        let flareId = 6;
        try { flareId = I(Terraria.ID.DustID.Flare, 6); } catch (_) { }
        const transparent = (() => { try { return Color.Transparent; } catch (_) { return Color.White; } })();
        const index = NewDust(p.position, I(p.width, 36), I(p.height, 36), flareId,
            N(p.velocity.X) * 0.2, N(p.velocity.Y) * 0.2, 100, transparent, 1);
        let d = null;
        try { d = Terraria.Main.dust.get_Item(I(index, -1)); } catch (_) { }
        if (!d) return;

        let scale = N(d.scale, 1);
        let vx = N(d.velocity?.X), vy = N(d.velocity?.Y);
        if (Math.random() < 1 / 3) {
            try { d.noGravity = true; } catch (_) { }
            scale *= 2;
            vx *= 2; vy *= 2;
        } else {
            scale *= 1.5;
        }
        vx *= 1.2; vy *= 1.2;
        try { d.velocity = Vector2.new(vx, vy); } catch (_) { }
        try { d.scale = scale * N(scalar, 1); } catch (_) { }
    } catch (_) { }
}

export class HellwingBat extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Magic/HellwingBat'; }
    SetStaticDefaults() {
        setArray(Terraria.Main, 'projFrames', this.Type, 12);
        try { setArray(Terraria.ID.ProjectileID.Sets, 'TrailCacheLength', this.Type, 4); } catch (_) { }
        try { setArray(Terraria.ID.ProjectileID.Sets, 'TrailingMode', this.Type, 0); } catch (_) { }
    }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 36; p.height = 36; p.friendly = true; p.magic = true;
        p.ignoreWater = true; p.tileCollide = false; p.penetrate = 1;
        p.extraUpdates = 1; p.timeLeft = 45; p.aiStyle = -1;
    }
    OnSpawn(p) {
        // Mobile perf: 2 updates/tick em vez de 4. Dobramos a velocidade e usamos
        // metade do timeLeft para preservar aproximadamente distância e duração do PC.
        try { p.velocity = Vector2.Multiply(p.velocity, 2); } catch (_) { }
        FusionEntityData.GetProjectileBag(p, 'hellwingBat', () => ({ flare: 0, trail: [], visualTick: -1, dustTick: -1 }));
    }
    AI(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'hellwingBat', () => ({ flare: 0, trail: [], visualTick: -1, dustTick: -1 }));
        const tick = I(Terraria.Main.GameUpdateCount, 0);

        // Histórico visual só uma vez por game tick. Evita fazer array churn em cada
        // extra update, mas mantém as quatro posições usadas no desenho do trail.
        if (tick !== I(state.visualTick, -1)) {
            state.visualTick = tick;
            try {
                const c = p.Center;
                state.trail.unshift({ x: N(c.X), y: N(c.Y) });
                if (state.trail.length > 4) state.trail.length = 4;
            } catch (_) { }
            try {
                const a = Math.max(0, 255 - N(p.alpha));
                Terraria.Lighting.AddLight(p.Center, a * 0.25 / 255, a * 0.05 / 255, a * 0.05 / 255);
            } catch (_) { }
        }

        // Com 2 updates/tick, 3 updates por frame visual reproduzem os ~1.5 ticks
        // do original (6 updates com extraUpdates=3).
        p.frameCounter = N(p.frameCounter) + 1;
        if (N(p.frameCounter) > 2) {
            p.frame = N(p.frame) + 1;
            p.frameCounter = 0;
        }
        if (N(p.frame) >= 12) p.frame = 0;

        // Timer condensado pela metade para manter o flare começando no mesmo tempo real.
        const timer = N(state.flare);
        if (timer > 3) {
            let scalar = 1;
            if (timer === 4) scalar = 0.25;
            else if (timer === 5) scalar = 0.5;
            else if (timer === 6) scalar = 0.75;
            state.flare = timer + 1;
            // Poeira no máximo uma vez por game tick por morcego.
            if (tick !== I(state.dustTick, -1) && Math.random() < 0.55) {
                state.dustTick = tick;
                hellwingFlareDust(p, scalar);
            }
        } else {
            state.flare = timer + 1;
        }

        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) - Math.PI / 2;
    }
    PreDraw(p, lightColor) {
        const texture = hellwingBatTexture();
        if (!texture) return true;
        try {
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            if (!draw) return true;

            const frameHeight = Math.max(1, Math.floor(N(texture.Height) / 12));
            const frame = Math.max(0, Math.min(11, I(p.frame, 0)));
            const source = Rectangle.new(0, frame * frameHeight, I(texture.Width, 1), frameHeight);
            const origin = Vector2.new(N(texture.Width) * 0.5, frameHeight * 0.5);
            let alphaColor = lightColor;
            try { alphaColor = p.GetAlpha(lightColor); } catch (_) { }

            const state = FusionEntityData.GetProjectileBag(p, 'hellwingBat', () => ({ flare: 0, trail: [] }));
            const trail = Array.isArray(state.trail) && state.trail.length ? state.trail : [{ x: N(p.Center.X), y: N(p.Center.Y) }];
            const count = Math.min(4, trail.length);
            const sx = N(Terraria.Main.screenPosition?.X), sy = N(Terraria.Main.screenPosition?.Y);
            const gfx = N(p.gfxOffY), rotation = N(p.rotation), scale = N(p.scale, 1);
            const effects = I(p.spriteDirection, 1) === -1 ? SpriteEffects.FlipHorizontally : SpriteEffects.None;

            // DrawAfterimagesCentered mode 0: 100%, 75%, 50%, 25%.
            for (let i = 0; i < count; i++) {
                const entry = trail[i];
                const mult = (4 - i) / 4;
                const pos = Vector2.new(N(entry.x) - sx, N(entry.y) - sy + gfx);
                draw(texture, pos, source, scaledColor(alphaColor, mult), rotation, origin, scale, effects, 0);
            }
            return false;
        } catch (_) { return true; }
    }
    OnHitNPC(p, npc) { try { npc.AddBuff(Terraria.ID.BuffID.OnFire, 240, false); } catch (_) { } }
}
