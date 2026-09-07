import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import {
    StateFor, ClearProjectile, GetPlayer, GetNPC, SourceFromProjectile,
    ProjectileRect, ProjectileCenter, NPCCenter, NPCIndex,
    NearestTarget, NearestTargetEntry, NearestTargets, HomeVelocity,
    RegisterLaserBurn, DroneBarrageSequence, TouchDrone, RemoveDrone, SetCooldown,
    TouchShortHook, RemoveShortHook
} from './../../../Core/DraedonTier1Runtime.js';

const { Vector2, Rectangle, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

let _droneBuffType = 0, _missileType = 0, _augerSlashType = 0, _shortExplosionType = 0, _staticBuffType = 0, _aerialLaserType = 0;
const DroneDraw = { tried: false, body: null, bodyGlow: null, tail: null, tailGlow: null };
const AugerSwingByOwner = new Map();

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function Clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, N(v))); }
function Rotate(v, a, s = 1) {
    const x = N(v.X), y = N(v.Y), c = Math.cos(a), q = Math.sin(a);
    return Vector2.new((x * c - y * q) * s, (x * q + y * c) * s);
}
function Kill(p) { try { p.Kill(); } catch (_) { try { p.active = false; } catch (__){ } } }
function CachedType(kind) {
    if (kind === 'droneBuff') return _droneBuffType || (_droneBuffType = Math.floor(N(ModBuff.getTypeByName('AqueousHunterDroneBuff'))));
    if (kind === 'missile') return _missileType || (_missileType = Math.floor(N(ModProjectile.getTypeByName('ShrimpPlasmaMissile'))));
    if (kind === 'augerSlash') return _augerSlashType || (_augerSlashType = Math.floor(N(ModProjectile.getTypeByName('AugerSlash'))));
    if (kind === 'shortExplosion') return _shortExplosionType || (_shortExplosionType = Math.floor(N(ModProjectile.getTypeByName('ShortCircuitExplosion'))));
    if (kind === 'staticBuff') return _staticBuffType || (_staticBuffType = Math.floor(N(ModBuff.getTypeByName('StaticDischarge'))));
    if (kind === 'aerialLaser') return _aerialLaserType || (_aerialLaserType = Math.floor(N(ModProjectile.getTypeByName('AerialTrackerLaser'))));
    return 0;
}
function Spawn(p, pos, vel, type, damage, kb, ai0 = 0, ai1 = 0, ai2 = 0) {
    try {
        return NewProjectile(
            SourceFromProjectile(p), pos, vel, type,
            Math.max(0, Math.floor(N(damage))), N(kb), Math.floor(N(p.owner)),
            N(ai0), N(ai1), N(ai2), null
        );
    } catch (_) { return -1; }
}
function AddStatic(npc, ticks) {
    const b = CachedType('staticBuff');
    if (b > 0 && npc) try { npc.AddBuff(b, Math.max(1, Math.floor(N(ticks))), false); } catch (_) { }
}
function DustBurst(p, count = 4, type = null, scale = .8) {
    const t = type ?? Terraria.ID.DustID.Electric;
    const r = ProjectileRect(p);
    const pos = Vector2.new(N(r.X), N(r.Y));
    const w = Math.max(1, Math.floor(N(r.Width, N(p.width, 1))));
    const h = Math.max(1, Math.floor(N(r.Height, N(p.height, 1))));
    for (let i = 0; i < count; i++) {
        try { NewDust(pos, w, h, t, (Math.random() - .5) * 3, (Math.random() - .5) * 3, 80, Color.White, scale); } catch (_) { }
    }
}
function LoadDroneDraw() {
    if (DroneDraw.tried) return DroneDraw.body && DroneDraw.tail;
    DroneDraw.tried = true;
    try { DroneDraw.body = tl.texture.load('Textures/Projectiles/DraedonsArsenal/ShrimpBody.png'); } catch (_) { }
    try { DroneDraw.bodyGlow = tl.texture.load('Textures/Projectiles/DraedonsArsenal/ShrimpBodyGlow.png'); } catch (_) { }
    try { DroneDraw.tail = tl.texture.load('Textures/Projectiles/DraedonsArsenal/ShrimpTail.png'); } catch (_) { }
    try { DroneDraw.tailGlow = tl.texture.load('Textures/Projectiles/DraedonsArsenal/ShrimpTailGlow.png'); } catch (_) { }
    return DroneDraw.body && DroneDraw.tail;
}

export class AerialTrackerProjectile extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/DraedonsArsenal/AerialTracker'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 52; p.height = 40; p.friendly = true; p.penetrate = -1; p.extraUpdates = 0;
        p.tileCollide = false; p.usesIDStaticNPCImmunity = true; p.idStaticNPCHitCooldown = 10;
    }
    OnSpawn(p) {
        const ai = new ProjAI(p);
        const stealth = N(ai[0]) >= 0.5;
        const curve = stealth ? (N(ai[1]) < 0 ? -1 : 1) : 0;
        const s = StateFor(p, { age: 0, returning: false, stealth, curve, nextLaser: stealth ? 25 : 19 });
        s.stealth = stealth; s.curve = curve; s.nextLaser = stealth ? 25 : 19;
    }
    AI(p) {
        const s = StateFor(p);
        const f = s.stealth ? 4 : 3;
        s.age += f;
        if (!s.stealth && s.age >= 5) p.tileCollide = true;
        if (s.stealth && s.age > 10 && s.age < 100) p.velocity = Rotate(p.velocity, -.029 * N(s.curve) * f, 1);
        if (!s.returning && s.age >= 55) { s.returning = true; p.tileCollide = false; }
        const pl = GetPlayer(p.owner);
        if (!pl) { Kill(p); return; }
        if (s.returning) {
            const pc = Terraria.PlayerCenter(pl), center = ProjectileCenter(p);
            const dx = N(pc.X) - N(center.X), dy = N(pc.Y) - N(center.Y), d = Math.sqrt(dx * dx + dy * dy);
            if (d > 3000) { Kill(p); return; }
            if (d > .001) {
                const lerp = s.stealth ? Clamp((s.age - 90) / 210) * 1.5 : Clamp((s.age - 60) / 240);
                const ix = dx / d * 6 * lerp, iy = dy / d * 6 * lerp, acc = .0012 * s.age * f;
                p.velocity = Vector2.new(N(p.velocity.X) + Math.sign(ix - N(p.velocity.X)) * acc, N(p.velocity.Y) + Math.sign(iy - N(p.velocity.Y)) * acc);
            }
            while (s.age >= s.nextLaser) { this.Fire(p, s); s.nextLaser += s.stealth ? 25 : 19; }
            if (d < 30) { Kill(p); return; }
            p.rotation = N(p.rotation) + .28 * f * Clamp((s.age - 30) / 270);
        } else p.rotation = N(p.rotation) + .15 * f;
    }
    Fire(p, s) {
        const lt = CachedType('aerialLaser'); if (!(lt > 0)) return;
        const center = ProjectileCenter(p);
        const targets = s.stealth ? NearestTargets(center, 800, 2) : (() => {
            const e = NearestTargetEntry(center, 600); return e ? [e] : [];
        })();
        for (const [, idx] of targets) {
            if (idx < 0) continue;
            Spawn(p, center, Vector2.Zero, lt, p.damage, p.knockBack, idx, 0, 0);
        }
    }
    OnTileCollide(p, old) {
        const s = StateFor(p); s.returning = true; p.tileCollide = false;
        let vx = N(p.velocity.X), vy = N(p.velocity.Y);
        if (vx !== N(old.X)) vx = -N(old.X); if (vy !== N(old.Y)) vy = -N(old.Y);
        p.velocity = Vector2.new(vx, vy); return false;
    }
    OnKill(p) { ClearProjectile(p); }
}

export class AerialTrackerLaser extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() { const p = this.Projectile; p.width = 2; p.height = 2; p.friendly = false; p.hostile = false; p.tileCollide = false; p.penetrate = -1; p.timeLeft = 15; p.alpha = 255; }
    OnSpawn(p) {
        const ai = new ProjAI(p);
        StateFor(p, { targetIndex: Math.floor(N(ai[0], -1)), registered: false });
    }
    AI(p) {
        const s = StateFor(p); if (s.registered) return; s.registered = true;
        const n = s.targetIndex >= 0 ? GetNPC(s.targetIndex) : null; if (!n || !n.active) return;
        RegisterLaserBurn(s.targetIndex, N(p.damage), p.owner);
        const a = ProjectileCenter(p), b = NPCCenter(n);
        for (let i = 1; i <= 6; i++) {
            const t = i / 7;
            try { NewDust(Vector2.new(N(a.X) + (N(b.X) - N(a.X)) * t, N(a.Y) + (N(b.Y) - N(a.Y)) * t), 2, 2, Terraria.ID.DustID.Electric, 0, 0, 80, Color.White, .65); } catch (_) { }
        }
    }
    PreDraw() { return false; }
    OnKill(p) { ClearProjectile(p); }
}

export class AqueousHunterDroneSummon extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetStaticDefaults() {
        try { Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true; } catch (_) { }
    }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 1; p.height = 1; p.netImportant = true; p.friendly = true; p.hostile = false;
        p.minionSlots = 0; p.timeLeft = 18000; p.penetrate = -1; p.minion = true;
        p.tileCollide = false; p.ignoreWater = true; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 5;
    }
    OnSpawn(p) {
        const ai = new ProjAI(p);
        const preferred = Math.max(0, Math.floor(N(ai[2])));
        const s = StateFor(p, { age: 0, burst: 0, burstDelay: 0, nextBurst: 40, lastBarrage: 0, target: -1, special: 0, specialAge: 0, formationIndex: preferred, slotArmed: false, firstAILogged: false, faceDir: 1, visualRot: 0, shotDamage: 0 });
        s.formationIndex = TouchDrone(p, preferred);
        if (!(N(p.originalDamage) > 0)) p.originalDamage = 24;
        if (!(N(s.shotDamage) > 0) && N(p.damage) > 1) s.shotDamage = Math.max(1, Math.floor(N(p.damage, 24)));
        p.minionSlots = 0; p.hide = false; p.alpha = 0; p.scale = 1;
        try { tl.log(`[CalamityPort DraedonDrone] OnSpawn reached; owner=${p.owner}; identity=${p.identity}; bootstrapSlots=0.`); } catch (_) { }
        p.netUpdate = true;
    }
    Check(p, pl) {
        if (!pl || !pl.active || pl.dead) {
            RemoveDrone(p);
            Kill(p);
            return false;
        }
        // Igual aos outros summons do port: o buff e o minion precisam existir juntos.
        // Se eu cancelar o buff pelo ícone, o drone para de atacar e morre na mesma atualização.
        const b = CachedType('droneBuff');
        let active = false;
        try { active = b > 0 && pl.FindBuffIndex(b) >= 0; } catch (_) { }
        if (!active) {
            RemoveDrone(p);
            try { p.friendly = false; p.damage = 0; } catch (_) { }
            Kill(p);
            return false;
        }
        // Mantém a vida curta igual um minion normal. Só a presença do buff renova o projétil.
        p.timeLeft = 2;
        return true;
    }
    AI(p) {
        const s = StateFor(p);
        const pl = GetPlayer(p.owner); if (!this.Check(p, pl)) return;
        s.age++;
        // Shoot() primes this after NewProjectile returns. Keep the scaled value in JS state because
        // TLPro may later rewrite the minion projectile's live damage while doing slot bookkeeping.
        if (!(N(s.shotDamage) > 0)) {
            const liveDamage = Math.floor(N(p.damage));
            const original = Math.floor(N(p.originalDamage));
            s.shotDamage = liveDamage > 1 ? liveDamage : (original > 1 ? original : 24);
        }
        // Refresh the pure-JS registry only often enough to keep its 12-tick lease alive.
        // This removes a Map/GameUpdateCount heartbeat from every single drone frame.
        if (s.age === 1 || s.age % 6 === 0) s.formationIndex = TouchDrone(p, s.formationIndex);
        if (!s.firstAILogged) { s.firstAILogged = true; try { tl.log(`[CalamityPort DraedonDrone] first AI reached; owner=${p.owner}; identity=${p.identity}.`); } catch (_) { } }
        // TLPro can cull a custom 4-slot minion during the same native spawn transaction.
        // Bootstrap at 0 slots, then restore the official 4-slot accounting after a few live AI ticks.
        if (!s.slotArmed && s.age >= 6) { p.minionSlots = 4; s.slotArmed = true; } else if (!s.slotArmed) p.minionSlots = 0;
        const seq = DroneBarrageSequence(p.owner);
        if (seq !== s.lastBarrage) { s.lastBarrage = seq; s.special = 33; s.specialAge = 0; s.burst = 0; }
        let target = s.target >= 0 ? GetNPC(s.target) : null;
        if (!target || !target.active || N(target.life) <= 0) target = null;
        if (!target || s.age % 20 === 0) {
            const e = NearestTargetEntry(ProjectileCenter(p), 2000);
            target = e ? e[2] : null; s.target = e ? e[1] : -1;
        }

        // The shrimp is a player-follow minion. Targets only control aiming/firing; they must not
        // pull the body to an enemy position. The old constant-speed seek controller overshot its
        // resting point forever, making velocity.X cross zero every few frames and visually flip
        // the shrimp left/right while it looked almost stationary.
        const center = ProjectileCenter(p), pc = Terraria.PlayerCenter(pl);
        const slot = Math.max(0, Math.floor(N(s.formationIndex)));
        const side = slot % 2 === 0 ? -1 : 1;
        const row = Math.floor(slot / 2);
        const tx = N(pc.X) + side * (82 + Math.min(row, 3) * 10);
        const ty = N(pc.Y) - 76 - row * 28;
        const dx = tx - N(center.X), dy = ty - N(center.Y), d = Math.sqrt(dx * dx + dy * dy);
        let vx = N(p.velocity.X), vy = N(p.velocity.Y);
        if (d > 1800) {
            // Fast return from off-screen without any projectile-array scan or inherited position write.
            const rd = d || 1;
            vx = (vx * 2 + dx / rd * 30) / 3;
            vy = (vy * 2 + dy / rd * 30) / 3;
        } else if (d > 7) {
            // Distance-scaled desired speed naturally reaches zero near the formation point, so the
            // minion settles instead of repeatedly crossing the destination and reversing direction.
            const speed = Math.min(10, Math.max(0.8, d * 0.105));
            const desiredX = dx / d * speed, desiredY = dy / d * speed;
            const inertia = d > 240 ? 7 : 4;
            vx = (vx * (inertia - 1) + desiredX) / inertia;
            vy = (vy * (inertia - 1) + desiredY) / inertia;
        } else {
            // Small dead-zone + damping removes the sub-pixel left/right jitter that was also
            // forcing the custom renderer to FlipHorizontally on alternating frames.
            vx *= 0.58; vy *= 0.58;
            if (Math.abs(vx) < 0.08) vx = 0;
            if (Math.abs(vy) < 0.08) vy = 0;
        }
        p.velocity = Vector2.new(vx, vy);

        // Facing has hysteresis. When resting, keep the previous direction unless an actual target
        // is clearly on the other side; never derive facing from near-zero velocity noise.
        let face = N(s.faceDir, 1) < 0 ? -1 : 1;
        if (target) {
            const tc = NPCCenter(target), targetDx = N(tc.X) - N(center.X);
            if (Math.abs(targetDx) > 18) face = targetDx < 0 ? -1 : 1;
        } else if (Math.abs(vx) > 0.45) face = vx < 0 ? -1 : 1;
        s.faceDir = face;
        p.spriteDirection = face;

        // Keep only a small smooth vertical bank. atan2(vy, vx) jumps by ~PI whenever vx changes
        // sign near zero, which was the second half of the visible "turning left/right" loop.
        const wantedRot = Clamp(vy / 12, -1, 1) * 0.12;
        s.visualRot = N(s.visualRot) * 0.82 + wantedRot * 0.18;
        p.rotation = s.visualRot;
        if (s.special > 0) {
            s.special--; s.specialAge++;
            if (s.specialAge % 3 === 1) {
                const ang = -Math.PI * .75 + (s.specialAge / 33) * Math.PI * 1.5;
                this.FireMissile(p, Rotate(Vector2.new(8, 0), ang, 1), s.target, true);
            }
            return;
        }
        if (target && s.age >= s.nextBurst && s.burst <= 0) { s.burst = 3; s.burstDelay = 0; s.nextBurst = s.age + 90; }
        if (s.burst > 0) {
            if (s.burstDelay <= 0 && target) {
                const tc = NPCCenter(target), now = ProjectileCenter(p);
                const ddx = N(tc.X) - N(now.X), ddy = N(tc.Y) - N(now.Y), dm = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
                this.FireMissile(p, Vector2.new(ddx / dm * 8, ddy / dm * 8), s.target, false);
                s.burst--; s.burstDelay = 8;
            } else s.burstDelay--;
        }
    }
    FireMissile(p, v, targetIndex, special) {
        const t = CachedType('missile'); if (!(t > 0)) return;
        const s = StateFor(p);
        const shotDamage = Math.max(1, Math.floor(N(s.shotDamage, 24)));
        // ai2 mirrors the intended damage so the missile can restore it if TLPro normalizes
        // the freshly-created custom projectile before/inside OnSpawn.
        Spawn(p, ProjectileCenter(p), v, t, shotDamage, 0, Math.floor(N(targetIndex, -1)), special ? 1 : 0, shotDamage);
    }
    PreDraw(p, lightColor) {
        try {
            if (!LoadDroneDraw()) return false;
            const draw = Terraria.Main.spriteBatch && Terraria.Main.spriteBatch[DrawTexture];
            if (typeof draw !== 'function') return false;
            const s = StateFor(p);
            const center = ProjectileCenter(p);
            const sx = N(Terraria.Main.screenPosition?.X), sy = N(Terraria.Main.screenPosition?.Y);
            const vx = N(p.velocity.X);
            const dir = N(s.faceDir, N(p.spriteDirection, 1)) < 0 ? -1 : 1;
            const effects = dir < 0 ? SpriteEffects.FlipHorizontally : SpriteEffects.None;
            const rot = N(p.rotation);
            const age = N(s.age);
            const speedBlend = Math.pow(Math.max(0, Math.min(1, Math.abs(vx) / 12)), 1.5);
            const tailRot = Math.sin(age * 0.1 / Math.PI) * 0.2 + speedBlend * 1.2 * dir;
            const shakeX = 3 * Math.sin(age * 0.35 / Math.PI) * dir;
            const shakeY = 7 * Math.sin(age * 0.05 / Math.PI);
            const visualX = N(center.X) + shakeX;
            const visualY = N(center.Y) + shakeY;
            const rawTailX = (30 - Math.abs(tailRot) * 15) * -dir;
            const rawTailY = 7 - Math.abs(tailRot) * 3;
            const c = Math.cos(rot), q = Math.sin(rot);
            const tailX = visualX + rawTailX * c - rawTailY * q;
            const tailY = visualY + rawTailX * q + rawTailY * c;
            const bodyPos = Vector2.new(visualX - sx, visualY - sy);
            const tailPos = Vector2.new(tailX - sx, tailY - sy);
            const tailOrigin = dir < 0 ? Vector2.new(N(DroneDraw.tail.Height), 0) : Vector2.Zero;
            const bodyOrigin = Vector2.new(N(DroneDraw.body.Width) * 0.5, N(DroneDraw.body.Height) * 0.5);
            let color = lightColor; try { color = p.GetAlpha(lightColor); } catch (_) { }
            const scale = Math.max(0.01, N(p.scale, 1));
            draw(DroneDraw.tail, tailPos, null, color, rot + tailRot, tailOrigin, scale, effects, 0);
            if (DroneDraw.tailGlow) draw(DroneDraw.tailGlow, tailPos, null, Color.White, rot + tailRot, tailOrigin, scale, effects, 0);
            const headRot = rot + Math.sin(age * 0.35 / Math.PI) * 0.1;
            draw(DroneDraw.body, bodyPos, null, color, headRot, bodyOrigin, scale, effects, 0);
            if (DroneDraw.bodyGlow) draw(DroneDraw.bodyGlow, bodyPos, null, Color.White, headRot, bodyOrigin, scale, effects, 0);
            return false;
        } catch (_) { return false; }
    }
    MinionContactDamage() { return false; }
    OnKill(p) { RemoveDrone(p); ClearProjectile(p); }
}

export class ShrimpPlasmaMissile extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 10; p.height = 10; p.friendly = true; p.tileCollide = false;
        p.ignoreWater = true; p.timeLeft = 300; p.extraUpdates = 0; p.penetrate = 1;
        p.armorPenetration = 15; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1;
        p.alpha = 255;
    }
    OnSpawn(p) {
        const ai = new ProjAI(p);
        const requestedDamage = Math.max(1, Math.floor(N(ai[2], N(p.damage, 1))));
        StateFor(p, { age: 0, target: Math.floor(N(ai[0], -1)), special: N(ai[1]) >= .5, shotDamage: requestedDamage });
        try { p.damage = requestedDamage; } catch (_) { }
        try { p.originalDamage = requestedDamage; } catch (_) { }
    }
    AI(p) {
        const s = StateFor(p);
        s.age++;
        if (s.age <= 2 && N(s.shotDamage) > 1 && Math.floor(N(p.damage)) !== Math.floor(N(s.shotDamage))) {
            try { p.damage = Math.floor(N(s.shotDamage)); } catch (_) { }
        }

        let n = s.target >= 0 ? GetNPC(s.target) : null;
        if (!n || !n.active || N(n.life) <= 0) {
            if (s.age % 6 === 1) {
                const e = NearestTargetEntry(ProjectileCenter(p), 900);
                n = e ? e[2] : null;
                s.target = e ? e[1] : -1;
            }
        }
        if (n) HomeVelocity(p, n, s.special ? 16 : 14, s.special ? 10 : 14);
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X));

        // No Calamity original o ShrimpPlasmaMissile não desenha uma bola/sprite próprio.
        // Deixei só um rastro leve de plasma pra aproximar o visual sem pesar o Android.
        if (s.age % 3 === 1) {
            const r = ProjectileRect(p);
            try { NewDust(Vector2.new(N(r.X), N(r.Y)), Math.max(1, N(r.Width, 10)), Math.max(1, N(r.Height, 10)), Terraria.ID.DustID.Electric, -N(p.velocity.X) * .04, -N(p.velocity.Y) * .04, 80, Color.new(90, 225, 255, 255), .72); } catch (_) { }
        }
    }
    OnHitNPC(p) { DustBurst(p, 7, Terraria.ID.DustID.Electric, .9); p.timeLeft = 1; }
    PreDraw() { return false; }
    OnKill(p) { ClearProjectile(p); }
}

export class AugerHoldout extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/DraedonsArsenal/AugerHoldout'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 100; p.height = 100; p.friendly = true; p.melee = true; p.penetrate = -1;
        p.tileCollide = false; p.ignoreWater = true; p.timeLeft = 2;
    }
    CanDamage() { return false; }
    OnSpawn(p) {
        const ai = new ProjAI(p);
        const owner = Math.floor(N(p.owner));
        const previous = AugerSwingByOwner.get(owner) || -1;
        const swingSign = previous > 0 ? -1 : 1;
        AugerSwingByOwner.set(owner, swingSign);
        let ax = N(p.velocity.X, 1), ay = N(p.velocity.Y), d = Math.sqrt(ax * ax + ay * ay) || 1;
        ax /= d; ay /= d;
        StateFor(p, { age: 0, buffed: N(ai[0]) >= .5, spawnedSlash: false, aimX: ax, aimY: ay, swingSign });
    }
    AI(p) {
        const s = StateFor(p);
        const pl = GetPlayer(p.owner);
        if (!pl) { Kill(p); return; }
        s.age++;
        p.timeLeft = 2;

        const c = Terraria.PlayerCenter(pl);
        let ax = N(s.aimX, 1), ay = N(s.aimY), d = Math.sqrt(ax * ax + ay * ay) || 1;
        ax /= d; ay /= d;
        try {
            const m = Terraria.Main.MouseWorld;
            const dx = N(m.X) - N(c.X), dy = N(m.Y) - N(c.Y), dm = Math.sqrt(dx * dx + dy * dy);
            if (dm > .001) { ax = dx / dm; ay = dy / dm; s.aimX = ax; s.aimY = ay; }
        } catch (_) { }

        // Faz o holdout realmente varrer ao redor da mão em vez de só flutuar na frente do player.
        const t = Clamp((s.age - 1) / 11, 0, 1);
        const eased = t * t * (3 - 2 * t);
        const swingAngle = (-1.35 + 2.70 * eased) * N(s.swingSign, 1);
        const swing = Rotate(Vector2.new(ax, ay), swingAngle, 1);
        const desired = Vector2.new(N(c.X) + N(swing.X) * 32, N(c.Y) + N(swing.Y) * 32);
        const now = ProjectileCenter(p);
        p.velocity = Vector2.new(N(desired.X) - N(now.X), N(desired.Y) - N(now.Y));
        p.rotation = Math.atan2(N(swing.Y), N(swing.X));
        try { p.spriteDirection = N(swing.X) < 0 ? -1 : 1; } catch (_) { }
        try { pl.itemTime = 2; pl.itemAnimation = 2; } catch (_) { }

        if (!s.spawnedSlash && s.age >= 6) {
            s.spawnedSlash = true;
            const slashType = CachedType('augerSlash');
            const mult = s.buffed ? 2.5 : 1;
            const slashDir = Rotate(Vector2.new(ax, ay), .22 * N(s.swingSign, 1), 1);
            Spawn(
                p,
                Vector2.new(N(c.X) + N(slashDir.X) * 42, N(c.Y) + N(slashDir.Y) * 42),
                Vector2.new(N(slashDir.X) * 25, N(slashDir.Y) * 25),
                slashType,
                N(p.damage) * mult,
                N(p.knockBack, 12),
                s.buffed ? 1 : 0,
                N(s.swingSign, 1),
                0
            );
            DustBurst(p, s.buffed ? 4 : 2, Terraria.ID.DustID.Electric, s.buffed ? 1 : .7);
        }
        if (s.age >= 12) Kill(p);
    }
    OnKill(p) { ClearProjectile(p); }
}

export class AugerPull extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() { const p = this.Projectile; p.width = 250; p.height = 250; p.friendly = false; p.hostile = false; p.tileCollide = false; p.timeLeft = 90; p.penetrate = -1; p.alpha = 255; }
    OnSpawn(p) { StateFor(p, { age: 0 }); }
    AI(p) {
        const s = StateFor(p); s.age++; if (s.age % 3 !== 1) return;
        const center = ProjectileCenter(p), targets = NearestTargets(center, 250, 16);
        for (const [, , n] of targets) {
            if (!n || n.boss === true) continue;
            const nc = NPCCenter(n), dx = N(center.X) - N(nc.X), dy = N(center.Y) - N(nc.Y), d = Math.sqrt(dx * dx + dy * dy);
            if (d < 1) continue;
            const pull = Clamp((250 - d) / 250, 0, 1) * 1.8;
            // Velocity is a hot primitive already used safely throughout the port; unlike Center/position,
            // it does not cause the Projectile->Entity reflection walk seen in the supplied log.
            try { n.velocity = Vector2.new(N(n.velocity.X) + dx / d * pull, N(n.velocity.Y) + dy / d * pull); } catch (_) { }
        }
        if (s.age % 9 === 1) DustBurst(p, 2, Terraria.ID.DustID.Electric, .7);
    }
    PreDraw() { return false; }
    OnKill(p) { ClearProjectile(p); }
}

export class AugerSlash extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/DraedonsArsenal/AugerSlash'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 120; p.height = 120; p.friendly = true; p.melee = true; p.penetrate = -1;
        p.tileCollide = false; p.ignoreWater = true; p.timeLeft = 25;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1;
    }
    OnSpawn(p) {
        const ai = new ProjAI(p), buffed = N(ai[0]) >= .5;
        StateFor(p, { age: 0, buffed, dirX: N(p.velocity.X, 1), dirY: N(p.velocity.Y) });
        p.scale = buffed ? 1.65 : 1.0;
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X));
        p.alpha = 0;
    }
    AI(p) {
        const s = StateFor(p);
        s.age++;
        p.velocity = Vector2.new(N(p.velocity.X) * .45, N(p.velocity.Y) * .45);
        if (s.age > 10) p.alpha = Math.floor(255 * Clamp((s.age - 10) / 15));
        if (s.age <= 8 && s.age % 2 === 0) DustBurst(p, 1, Terraria.ID.DustID.Electric, s.buffed ? .95 : .65);
    }
    OnHitNPC(p, n) {
        const s = StateFor(p);
        let dx = N(s.dirX, 1), dy = N(s.dirY), d = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= d; dy /= d;
        const force = s.buffed ? 18 : 12;
        try { n.velocity = Vector2.new(N(n.velocity.X) + dx * force, N(n.velocity.Y) + dy * force); } catch (_) { }
    }
    OnKill(p) { ClearProjectile(p); }
}

export class PulsePistolShot extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Typeless/ArcZap'; }
    SetDefaults() { const p = this.Projectile; p.width = 16; p.height = 16; p.friendly = false; p.magic = true; p.penetrate = -1; p.extraUpdates = 0; p.timeLeft = 360; p.tileCollide = false; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 20; p.scale = .45; }
    OnSpawn(p) {
        const ai = new ProjAI(p);
        StateFor(p, { age: 0, target: -1, lastTarget: -1, hitsLeft: 1, child: N(ai[0]) >= .5, started: false });
    }
    AI(p) {
        const s = StateFor(p); s.age++;
        let n = s.target >= 0 ? GetNPC(s.target) : null;
        if (!n || !n.active || N(n.life) <= 0) { s.target = -1; n = null; }
        if (s.age < 27) { p.friendly = false; p.velocity = Vector2.new(N(p.velocity.X) * .97, N(p.velocity.Y) * .97); }
        else {
            if (!n) {
                let e = NearestTargetEntry(ProjectileCenter(p), 2500, s.lastTarget); if (!e) e = NearestTargetEntry(ProjectileCenter(p), 2500, -1);
                n = e ? e[2] : null; s.target = e ? e[1] : -1;
                if (n) {
                    const pc = ProjectileCenter(p), nc = NPCCenter(n), dx = N(nc.X) - N(pc.X), dy = N(nc.Y) - N(pc.Y), d = Math.sqrt(dx * dx + dy * dy) || 1;
                    p.velocity = Vector2.new(dx / d * 10, dy / d * 10); s.started = true;
                }
            }
            if (n) { p.friendly = true; HomeVelocity(p, n, 15, 6); } else p.friendly = false;
        }
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X));
        if (s.age % 6 === 0) {
            const r = ProjectileRect(p); try { NewDust(Vector2.new(N(r.X), N(r.Y)), Math.max(1, N(r.Width, 16)), Math.max(1, N(r.Height, 16)), Terraria.ID.DustID.Electric, 0, 0, 100, Color.White, .5); } catch (_) { }
        }
    }
    OnHitNPC(p, npc) {
        const s = StateFor(p); const idx = NPCIndex(npc), killed = N(npc.life) <= 0;
        s.lastTarget = idx; s.target = -1; s.age = 0; s.hitsLeft = Math.max(0, N(s.hitsLeft, 1) - 1) + (killed ? 1 : 0);
        p.velocity = Vector2.new(N(p.velocity.X) * .8, N(p.velocity.Y) * .8);
        if (s.hitsLeft <= 0) {
            if (!s.child) {
                const t = p.type, base = Vector2.new(N(p.velocity.X), N(p.velocity.Y)), d = Math.sqrt(N(base.X) ** 2 + N(base.Y) ** 2) || 1;
                const norm = Vector2.new(N(base.X) / d * 5, N(base.Y) / d * 5), center = ProjectileCenter(p);
                for (const a of [-.3, .3]) Spawn(p, center, Rotate(norm, a, 1), t, Math.max(1, Math.floor(N(p.damage) / 4)), N(p.knockBack) / 2, 1, 0, 0);
            }
            p.friendly = false; p.timeLeft = 1;
        }
    }
    OnKill(p) { ClearProjectile(p); }
}

export class ShortCircuitShot extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() { const p = this.Projectile; p.width = 12; p.height = 12; p.timeLeft = 60; p.friendly = true; p.ranged = true; p.penetrate = 2; p.extraUpdates = 1; p.tileCollide = true; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.armorPenetration = 10; p.alpha = 255; }
    OnSpawn(p) { StateFor(p, { age: 0 }); DustBurst(p, 3, Terraria.ID.DustID.Electric, .75); }
    AI(p) {
        const s = StateFor(p); s.age++;
        p.velocity = Vector2.new(N(p.velocity.X) * .962, N(p.velocity.Y) * .962);
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X));
        if (s.age % 3 === 1) {
            const r = ProjectileRect(p);
            try { NewDust(Vector2.new(N(r.X), N(r.Y)), Math.max(1, N(r.Width, 12)), Math.max(1, N(r.Height, 12)), Terraria.ID.DustID.Electric, -N(p.velocity.X) * .04, -N(p.velocity.Y) * .04, 80, Color.White, .7); } catch (_) { }
        }
    }
    OnHitNPC(p, n) { AddStatic(n, 40); p.damage = Math.max(1, Math.floor(N(p.damage) * .7)); DustBurst(p, 2); }
    OnKill(p) { ClearProjectile(p); }
}

export class ShortCircuitHook extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/DraedonsArsenal/ShortCircuitHook'; }
    SetDefaults() { const p = this.Projectile; p.width = 14; p.height = 10; p.friendly = true; p.ranged = true; p.penetrate = 2; p.extraUpdates = 1; p.tileCollide = false; p.ownerHitCheck = true; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 15; p.armorPenetration = 10; p.timeLeft = 900; }
    OnSpawn(p) { TouchShortHook(p); StateFor(p, { mode: 0, age: 0, target: -1, targetRef: null, giveCooldown: false }); }
    AI(p) {
        TouchShortHook(p);
        const s = StateFor(p);
        const pl = GetPlayer(p.owner); if (!pl) { Kill(p); return; }
        const pc = Terraria.PlayerCenter(pl), center = ProjectileCenter(p);
        const dx = N(pc.X) - N(center.X), dy = N(pc.Y) - N(center.Y), dist = Math.sqrt(dx * dx + dy * dy);
        if (s.mode === 0) {
            s.age += 4.5; if (dist > 800 || s.age >= 90) { s.mode = 2; s.age = 0; p.penetrate = -1; }
        } else if (s.mode === 1) {
            s.age++;
            let n = s.targetRef || (s.target >= 0 ? GetNPC(s.target) : null);
            if (!n || !n.active) { s.giveCooldown = false; this.Explode(p); s.mode = 2; s.age = 0; p.extraUpdates = 1; s.targetRef = null; }
            else {
                const nc = NPCCenter(n), now = ProjectileCenter(p);
                p.velocity = Vector2.new(N(nc.X) - N(now.X), N(nc.Y) - N(now.Y));
                if (s.age >= 75) { this.Explode(p); s.mode = 2; s.age = 0; p.extraUpdates = 1; s.targetRef = null; }
            }
        } else {
            if (dist < 28) { if (s.giveCooldown) SetCooldown(p.owner, 'short', 300); Kill(p); return; }
            const d = dist || 1; p.velocity = Vector2.new((N(p.velocity.X) + dx / d * 20) * .5, (N(p.velocity.Y) + dy / d * 20) * .5);
        }
        const now = ProjectileCenter(p); p.rotation = Math.atan2(N(now.Y) - N(pc.Y), N(now.X) - N(pc.X));
        try { pl.itemTime = 4; pl.itemAnimation = 4; } catch (_) { }
    }
    Explode(p) { const t = CachedType('shortExplosion'); if (t > 0) Spawn(p, ProjectileCenter(p), Vector2.Zero, t, N(p.damage) * 8, 0, 0, 0, 0); }
    OnHitNPC(p, n) {
        const s = StateFor(p); AddStatic(n, 120);
        if (s.mode === 0) { s.mode = 1; s.age = 0; s.target = NPCIndex(n); s.targetRef = n; s.giveCooldown = true; p.penetrate = -1; p.extraUpdates = 0; p.velocity = Vector2.Zero; p.tileCollide = false; }
        else if (s.mode === 1 && s.targetRef === n && N(n.life) <= 0) s.giveCooldown = false;
    }
    OnTileCollide(p) { const s = StateFor(p); s.mode = 2; s.age = 0; p.penetrate = -1; p.tileCollide = false; return false; }
    OnKill(p) { RemoveShortHook(p); ClearProjectile(p); }
}

export class ShortCircuitExplosion extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() { const p = this.Projectile; p.width = 200; p.height = 200; p.friendly = true; p.ranged = true; p.tileCollide = false; p.penetrate = -1; p.timeLeft = 10; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.alpha = 255; }
    OnSpawn(p) { DustBurst(p, 10, Terraria.ID.DustID.Electric, 1.1); }
    OnHitNPC(p, n) { AddStatic(n, 300); p.damage = Math.max(1, Math.floor(N(p.damage) * .7)); }
    PreDraw() { return false; }
    OnKill(p) { ClearProjectile(p); }
}
