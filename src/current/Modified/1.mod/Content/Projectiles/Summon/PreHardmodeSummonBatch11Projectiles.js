import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = -1) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function setArray(holder, name, index, value) {
    try {
        let arr = holder[name], need = I(index, 0) + 1, len = N(arr?.Length, N(arr?.length));
        if (len < need) {
            arr = arr.cloneResized(need);
            holder[name] = arr;
        }
        try { arr.set_Item(I(index, 0), value); }
        catch (_) { arr['void SetValue(Object value, int index)'](value, I(index, 0)); }
        return true;
    }
    catch (_) { return false; }
}
function owner(p) {
    const i = I(p.owner);
    try { return i === I(Terraria.Main.myPlayer, -2) ? Terraria.Main.LocalPlayer : Terraria.Main.player.get_Item(i); }
    catch (_) { return null; }
}
function npcAt(i) { try { return Terraria.Main.npc.get_Item(I(i)); } catch (_) { return null; } }
function valid(n) {
    try { return !!n && n.active !== false && n.friendly !== true && n.townNPC !== true && n.dontTakeDamage !== true && N(n.life) > 0; }
    catch (_) { return false; }
}
function center(e) { try { return e.Center; } catch (_) { return Vector2.Zero; } }
function norm(v, s = 1) {
    const x = N(v?.X), y = N(v?.Y), l = Math.sqrt(x * x + y * y) || 1;
    return Vector2.new(x / l * s, y / l * s);
}
function source(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { return null; } }
function keepBuff(p,pl,buffType){if(!pl||pl.active===false||pl.dead===true){try{p.Kill();}catch(_){p.active=false;}return false;}if(!(buffType>0)){try{p.Kill();}catch(_){p.active=false;}return false;}let idx=-1;try{idx=pl.FindBuffIndex(buffType);}catch(_){}if(idx<0){try{p.Kill();}catch(_){p.active=false;}return false;}p.timeLeft=2;return true;}
function armMinionDamage(p, fallback) {
    const st = FusionEntityData.GetProjectileBag(p, 'recentMinionDamage', () => ({
        baseDamage: Math.max(1, I(N(p.damage) > 0 ? p.damage : (N(p.originalDamage) > 0 ? p.originalDamage : fallback), fallback))
    }));
    if (!(N(st.baseDamage) > 0))
        st.baseDamage = Math.max(1, I(N(p.damage) > 0 ? p.damage : (N(p.originalDamage) > 0 ? p.originalDamage : fallback), fallback));
    p.damage = Math.max(1, I(st.baseDamage, fallback));
    if (!(N(p.originalDamage) > 0))
        p.originalDamage = p.damage;
    p.friendly = true;
    p.hostile = false;
    p.minion = true;
    return st;
}
function acquire(p, st, range) {
    const now = I(Terraria.Main.GameUpdateCount, 0);
    if (now < I(st.nextScan, 0) && valid(st.target))
        return st.target;
    st.nextScan = now + 10;
    st.target = null;
    try {
        const found = p.FindTargetWithinRange(range, true);
        if (found && found.active !== undefined) {
            if (valid(found)) st.target = found;
        }
        else {
            const n = npcAt(found);
            if (valid(n)) st.target = n;
        }
    }
    catch (_) { }
    if (valid(st.target))
        return st.target;
    const c = center(p);
    let best = null, d2 = range * range;
    for (let i = 0; i < 200; i++) {
        const n = npcAt(i);
        if (!valid(n)) continue;
        const q = center(n), dx = N(q.X) - N(c.X), dy = N(q.Y) - N(c.Y), v = dx * dx + dy * dy;
        if (v < d2) { d2 = v; best = n; }
    }
    st.target = best;
    return st.target;
}
function wrapAngle(a) {
    while (a <= -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
}
function angleTowards(current, target, maxStep) {
    const diff = wrapAngle(target - current);
    if (diff > maxStep) return current + maxStep;
    if (diff < -maxStep) return current - maxStep;
    return target;
}
function remap(v, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMax;
    const t = Math.max(0, Math.min(1, (v - inMin) / (inMax - inMin)));
    return outMin + (outMax - outMin) * t;
}
function easeInOutCubic(t) {
    t = Math.max(0, Math.min(1, t));
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function vdist2(a, b) {
    const dx = N(a.X) - N(b.X), dy = N(a.Y) - N(b.Y);
    return dx * dx + dy * dy;
}
function vlerp(a, b, t) {
    return Vector2.new(N(a.X) + (N(b.X) - N(a.X)) * t, N(a.Y) + (N(b.Y) - N(a.Y)) * t);
}
function predictiveVelocity(from, target, speed) {
    const tc = center(target);
    const tv = target?.velocity || Vector2.Zero;
    const dx = N(tc.X) - N(from.X), dy = N(tc.Y) - N(from.Y);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const time = speed > 0 ? dist / speed : 0;
    const aim = Vector2.new(dx + N(tv.X) * time, dy + N(tv.Y) * time);
    return norm(aim, speed);
}
function predictiveVelocityPC(from, target, speed) {
    const tc = center(target), tv = target?.velocity || Vector2.Zero;
    let previousTime = 0;
    let tx = N(tc.X), ty = N(tc.Y);
    for (let i = 0; i < 4; i++) {
        const dx = tx - N(from.X), dy = ty - N(from.Y);
        const time = Math.sqrt(dx * dx + dy * dy) / Math.max(0.001, speed);
        tx += N(tv.X) * (time - previousTime);
        ty += N(tv.Y) * (time - previousTime);
        previousTime = time;
    }
    return norm(Vector2.new(tx - N(from.X), ty - N(from.Y)), speed);
}
function randomSineFunction(x) { return Math.sin(3 * x) + Math.cos(5 * x) + 2 * Math.sin(0.5 * x); }
function targetFromIndex(index) { const n = npcAt(index); return valid(n) ? n : null; }
function acquireMinionTargetIndex(p, pl, st) {
    const now = I(Terraria.Main.GameUpdateCount, 0);
    const pc = center(pl);
    let current = I(st.targetIndex, -1), currentNpc = targetFromIndex(current);
    const range = currentNpc ? 1200 : 960, rangeSq = range * range;
    if (currentNpc) {
        const tc = center(currentNpc), dx = N(tc.X) - N(pc.X), dy = N(tc.Y) - N(pc.Y);
        if (dx * dx + dy * dy > 1200 * 1200) { currentNpc = null; current = -1; }
    }
    if (currentNpc && now < I(st.nextScan, 0)) return current;
    if (!currentNpc && now < I(st.nextScan, 0)) return -1;
    st.nextScan = now + 8;
    try {
        if (pl.HasMinionAttackTargetNPC) {
            const selected = I(pl.MinionAttackTargetNPC, -1), n = targetFromIndex(selected);
            if (n) {
                const tc = center(n), dx = N(tc.X) - N(pc.X), dy = N(tc.Y) - N(pc.Y);
                if (dx * dx + dy * dy <= 1200 * 1200) { st.targetIndex = selected; return selected; }
            }
        }
    } catch (_) { }
    let best = -1, bestSq = rangeSq;
    for (let i = 0; i < 200; i++) {
        const n = npcAt(i); if (!valid(n)) continue;
        const tc = center(n), dx = N(tc.X) - N(pc.X), dy = N(tc.Y) - N(pc.Y), d2 = dx * dx + dy * dy;
        if (d2 < bestSq) { bestSq = d2; best = i; }
    }
    st.targetIndex = best;
    return best;
}
function antiClump(p) {
    const tick = I(Terraria.Main.GameUpdateCount, 0);
    if ((tick + I(p.whoAmI, 0)) % 4 !== 0) return;
    for (let i = 0; i < 1000; i++) {
        let q = null; try { q = Terraria.Main.projectile.get_Item(i); } catch (_) { continue; }
        if (!q || q.active === false || I(q.whoAmI, -2) === I(p.whoAmI, -1) || I(q.owner, -2) !== I(p.owner, -1) || I(q.type, -2) !== I(p.type, -1)) continue;
        const dx = N(p.Center.X) - N(q.Center.X), dy = N(p.Center.Y) - N(q.Center.Y), d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < 24 * 24) {
            const d = Math.sqrt(d2) || 1;
            p.velocity = Vector2.new(N(p.velocity.X) + dx / d * 0.25, N(p.velocity.Y) + dy / d * 0.25);
        }
    }
}
function idlePosition(p, pl) {
    let pc = center(pl);
    try { pc = pl.MountedCenter; } catch (_) { }
    const pos = Math.max(0, N(p.minionPos, 0));
    const row = Math.ceil(pos / 2);
    const side = (I(pos, 0) % 2 === 0) ? -1 : 1;
    return Vector2.new(N(pc.X) + 50 * row * side, N(pc.Y) - 60 + row * 15);
}
function orbitOwnerPoint(p, pl, radius = 52, yOffset = -56, speed = 0.035) {
    let pc = center(pl); try { pc = pl.MountedCenter; } catch (_) { }
    const tick = I(Terraria.Main.GameUpdateCount, 0);
    const slot = Math.max(0, N(p.minionPos, I(p.identity, I(p.whoAmI, 0))));
    const phase = tick * speed + slot * 1.77;
    return Vector2.new(N(pc.X) + Math.cos(phase) * radius, N(pc.Y) + yOffset + Math.sin(phase) * radius * 0.55);
}

export class EnchantedKnifeSummon extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/EnchantedKnifeSummon';
        this.BuffType = 0;
        this.ShotType = 0;
    }
    SetStaticDefaults() {
        try { Terraria.Main.projPet[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type] = true; } catch (_) { }
    }
    PostSetupContent() {
        this.BuffType = Number(ModBuff.getTypeByName('EnchantedKnifeStaffBuff') || 0);
        this.ShotType = Number(ModProjectile.getTypeByName('EnchantedKnifeStaffProjectile') || 0);
    }
    SetDefaults() {
        const p = this.Projectile;
        p.width = p.height = 32;
        p.friendly = true;
        p.hostile = false;
        p.minion = true;
        p.minionSlots = 1;
        p.penetrate = -1;
        p.tileCollide = false;
        p.ignoreWater = true;
        p.timeLeft = 18000;
        p.netImportant = true;
        p.aiStyle = -1;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 10;
    }
    OnSpawn(p) {
        FusionEntityData.GetProjectileBag(p, 'enchantedKnifeStable2', () => ({
            target: null,
            nextScan: 0,
            targetId: -1,
            swingCenterX: Number.NaN,
            swingCenterY: Number.NaN,
            swingTimer: Math.floor(Math.random() * 40),
            swingDir: Math.random() < 0.5 ? -1 : 1,
            dashTimer: Math.floor(Math.random() * 30),
            lastShotTick: -999
        }));
        armMinionDamage(p, 10);
        p.netUpdate = true;
    }
    AcquireTarget(p, pl, st) {
        const tick = I(Terraria.Main.GameUpdateCount, 0);
        if (tick < I(st.nextScan, 0) && valid(st.target)) return st.target;
        st.nextScan = tick + 10;
        st.target = null;
        try {
            if (pl.HasMinionAttackTargetNPC) {
                const forced = npcAt(I(pl.MinionAttackTargetNPC, -1));
                if (valid(forced)) st.target = forced;
            }
        } catch (_) { }
        if (!valid(st.target)) {
            try {
                const found = p.FindTargetWithinRange(1200, true);
                if (found && found.active !== undefined) st.target = valid(found) ? found : null;
                else {
                    const n = npcAt(found);
                    if (valid(n)) st.target = n;
                }
            } catch (_) { }
        }
        return valid(st.target) ? st.target : null;
    }
    AI(p) {
        const pl = owner(p);
        if (!(this.BuffType > 0)) this.BuffType = Number(ModBuff.getTypeByName('EnchantedKnifeStaffBuff') || 0);
        if (!keepBuff(p, pl, this.BuffType)) return;
        armMinionDamage(p, 10);

        const st = FusionEntityData.GetProjectileBag(p, 'enchantedKnifeStable2', () => ({
            target: null, nextScan: 0, targetId: -1,
            swingCenterX: Number.NaN, swingCenterY: Number.NaN,
            swingTimer: 0, swingDir: 1, dashTimer: 0, lastShotTick: -999
        }));
        const tick = I(Terraria.Main.GameUpdateCount, 0), pc = center(pl), c = center(p);
        const target = this.AcquireTarget(p, pl, st);

        if (!target) {
            st.targetId = -1;
            st.swingCenterX = Number.NaN;
            st.swingCenterY = Number.NaN;
            const dest = orbitOwnerPoint(p, pl, 52 + Math.min(24, Math.max(0, N(p.minionPos, 0)) * 6), -58, 0.032);
            const dx = N(dest.X) - N(c.X), dy = N(dest.Y) - N(c.Y), dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1800) {
                p.Center = pc;
                p.velocity = Vector2.Zero;
                p.netUpdate = true;
            } else if (dist > 3) {
                const desired = norm(Vector2.new(dx, dy), Math.min(11, Math.max(2.2, dist * 0.12)));
                p.velocity = Vector2.new(N(p.velocity.X) * 0.84 + N(desired.X) * 0.16, N(p.velocity.Y) * 0.84 + N(desired.Y) * 0.16);
            } else {
                p.velocity = Vector2.new(N(p.velocity.X) * 0.9, N(p.velocity.Y) * 0.9);
            }
            if (Math.hypot(N(p.velocity.X), N(p.velocity.Y)) > 0.15)
                p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + Math.PI / 2;
            return;
        }

        const tid = I(target.whoAmI, -1), tc = center(target);
        if (tid !== I(st.targetId, -1) || !Number.isFinite(N(st.swingCenterX)) || !Number.isFinite(N(st.swingCenterY))) {
            st.targetId = tid;
            const radius = Math.max(120, Math.sqrt(N(target.width, 1) * N(target.width, 1) + N(target.height, 1) * N(target.height, 1)) * 0.5 + 120);
            const angle = Math.random() * Math.PI * 2;
            const start = Vector2.new(N(tc.X) + Math.cos(angle) * radius, N(tc.Y) + Math.sin(angle) * radius);
            p.Center = start;
            p.velocity = Vector2.Zero;
            st.swingCenterX = N(start.X);
            st.swingCenterY = N(start.Y);
            st.swingTimer = Math.random() < 0.5 ? -(2 + Math.floor(Math.random() * 29)) : 41 + Math.floor(Math.random() * 30);
            st.swingDir = st.swingTimer <= 0 ? 1 : -1;
            st.dashTimer = Math.floor(Math.random() * 30);
            p.netUpdate = true;
        }

        // Cheap TLPro version of the PC AttackState: keep a swing center, orbit 40 px around it,
        // and only use the native target finder every 10 ticks.
        st.swingCenterX += N(p.velocity.X);
        st.swingCenterY += N(p.velocity.Y);
        p.velocity = Vector2.new(N(p.velocity.X) * 0.9, N(p.velocity.Y) * 0.9);
        const swingCenter = Vector2.new(N(st.swingCenterX), N(st.swingCenterY));
        const predictive = predictiveVelocity(swingCenter, target, 15);
        const baseAngle = Math.atan2(N(predictive.Y), N(predictive.X));
        const sign = N(tc.X) >= N(swingCenter.X) ? 1 : -1;
        const swingProgress = Math.max(0, Math.min(1, (N(st.swingTimer) - 10) / 20));
        const swingRotation = (-Math.PI / 2 + Math.PI * easeInOutCubic(swingProgress)) * sign;
        const orbitAngle = baseAngle + swingRotation;
        p.Center = Vector2.new(N(swingCenter.X) + Math.cos(orbitAngle) * 40, N(swingCenter.Y) + Math.sin(orbitAngle) * 40);
        p.rotation = Math.atan2(N(p.Center.Y) - N(swingCenter.Y), N(p.Center.X) - N(swingCenter.X)) + Math.PI / 2;

        const previous = N(st.swingTimer, 0);
        st.swingTimer += N(st.swingDir, 1) >= 0 ? 1 : -1;
        if (st.swingTimer >= 40) { st.swingTimer = 40; st.swingDir = -1; }
        else if (st.swingTimer <= 0) { st.swingTimer = 0; st.swingDir = 1; }

        const crossedMid = (previous < 20 && st.swingTimer >= 20) || (previous > 20 && st.swingTimer <= 20);
        if (crossedMid && I(st.lastShotTick, -999) !== tick && I(p.owner) === I(Terraria.Main.myPlayer)) {
            st.lastShotTick = tick;
            if (!(this.ShotType > 0)) this.ShotType = Number(ModProjectile.getTypeByName('EnchantedKnifeStaffProjectile') || 0);
            if (this.ShotType > 0) {
                const shotVelocity = predictiveVelocity(swingCenter, target, 15);
                const spawn = Vector2.new(N(swingCenter.X) + N(norm(shotVelocity, 40).X), N(swingCenter.Y) + N(norm(shotVelocity, 40).Y));
                const id = NewProjectile(source(p), spawn, shotVelocity, this.ShotType, Math.max(1, I(p.damage, 10)), N(p.knockBack, 2), p.owner, 0, 0, 0, null);
                try { const q = Terraria.Main.projectile.get_Item(I(id)); if (q) { q.originalDamage = Math.max(1, I(p.originalDamage, p.damage)); q.netUpdate = true; } } catch (_) { }
            }
        }

        st.dashTimer++;
        if (vdist2(swingCenter, tc) > 320 * 320 && st.dashTimer >= 30) {
            st.dashTimer = 0;
            p.velocity = predictiveVelocity(swingCenter, target, 16);
        }
    }
    CanDamage() { return false; }
    MinionContactDamage() { return false; }
}
export class EnchantedKnifeStaffProjectile extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/EnchantedKnifeStaffProjectile'; }
    SetStaticDefaults() { setArray(Terraria.ID.ProjectileID.Sets, 'MinionShot', this.Type, true); }
    SetDefaults() {
        const p = this.Projectile;
        p.width = p.height = 32;
        p.friendly = true;
        p.hostile = false;
        p.penetrate = 1;
        p.tileCollide = false;
        p.ignoreWater = true;
        p.timeLeft = 90;
        p.aiStyle = -1;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 10;
    }
    OnSpawn(p) { p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + Math.PI / 2; p.netUpdate = true; }
    AI(p) { p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + Math.PI / 2; }
    OnHitNPC(p) { p.penetrate = 0; p.timeLeft = Math.min(I(p.timeLeft, 3), 3); }
}

const CnidarianHB = new Map();
export function CnidarianActive(o) {
    const now = I(Terraria.Main.GameUpdateCount, 0), t = I(CnidarianHB.get(Number(o)), -9999);
    if (now - t <= 3) return true;
    CnidarianHB.delete(Number(o));
    return false;
}
export class CnidarianJellyfishOnTheString extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/CnidarianJellyfishOnTheString'; this.SparkType = 0; this.TagBuff = 0; }
    PostSetupContent() { this.SparkType = Number(ModProjectile.getTypeByName('CnidarianSpark') || 0); this.TagBuff = Number(ModBuff.getTypeByName('CnidarianSummonTagBuff') || 0); }
    SetDefaults() { const p = this.Projectile; p.width = p.height = 28; p.scale = 1.15; p.friendly = true; p.hostile = false; p.penetrate = -1; p.extraUpdates = 1; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 20; p.ignoreWater = true; p.tileCollide = false; p.timeLeft = 20; p.aiStyle = -1; }
    OnSpawn(p) { CnidarianHB.set(Number(p.owner), I(Terraria.Main.GameUpdateCount, 0)); FusionEntityData.GetProjectileBag(p, 'cnidarian', () => ({ age: 0, last: Vector2.Zero, nextZap: 180 })); }
    AI(p) { const pl = owner(p), s = FusionEntityData.GetProjectileBag(p, 'cnidarian', () => ({ age: 0, last: Vector2.Zero, nextZap: 180 })); if (!pl || pl.dead) { p.Kill(); return; } s.age++; CnidarianHB.set(Number(p.owner), I(Terraria.Main.GameUpdateCount, 0)); if (pl.channel || pl.controlUseItem) p.timeLeft = 20; const pc = center(pl), c = center(p), m = Terraria.Main.MouseWorld, dx = N(m.X) - N(pc.X), dy = N(m.Y) - N(pc.Y), d = Math.sqrt(dx * dx + dy * dy) || 1, max = 380, dest = d > max ? Vector2.new(N(pc.X) + dx / d * max, N(pc.Y) + dy / d * max) : m; s.last = c; p.Center = Vector2.new(N(c.X) + (N(dest.X) - N(c.X)) * .18, N(c.Y) + (N(dest.Y) - N(c.Y)) * .18); p.rotation = Math.atan2(N(p.Center.Y) - N(pc.Y), N(p.Center.X) - N(pc.X)) - Math.PI / 2; try { pl.heldProj = p.whoAmI; pl.itemTime = 2; pl.itemAnimation = 2; } catch (_) { } if (s.age % s.nextZap === s.nextZap - 1 && I(p.owner) === I(Terraria.Main.myPlayer)) { if (!(this.SparkType > 0)) this.SparkType = Number(ModProjectile.getTypeByName('CnidarianSpark') || 0); if (this.SparkType > 0) { const targets = []; for (let i = 0; i < 200 && targets.length < 3; i++) { const n = npcAt(i); if (!valid(n)) continue; const q = center(n), x = N(q.X) - N(p.Center.X), y = N(q.Y) - N(p.Center.Y); if (x * x + y * y < 300 * 300) targets.push(n); } for (const n of targets) { const q = center(n), v = norm(Vector2.new(N(q.X) - N(p.Center.X), N(q.Y) - N(p.Center.Y)), 10); NewProjectile(source(p), p.Center, v, this.SparkType, Math.max(1, Math.floor(N(p.damage, 8) * .5)), N(p.knockBack, 3), p.owner, N(n.whoAmI), 0, 0, null); } } } }
    OnHitNPC(p, n) { const pl = owner(p); if (pl) try { pl.MinionAttackTargetNPC = n.whoAmI; } catch (_) { } if (!(this.TagBuff > 0)) this.TagBuff = Number(ModBuff.getTypeByName('CnidarianSummonTagBuff') || 0); if (this.TagBuff > 0) try { n.AddBuff(this.TagBuff, 240, false); } catch (_) { } }
    OnKill(p) { CnidarianHB.delete(Number(p.owner)); }
}
export class CnidarianSpark extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/CnidarianSpark'; }
    SetStaticDefaults() { setArray(Terraria.ID.ProjectileID.Sets, 'MinionShot', this.Type, true); }
    SetDefaults() { const p = this.Projectile; p.width = p.height = 6; p.friendly = true; p.hostile = false; p.ignoreWater = true; p.penetrate = 1; p.timeLeft = 15; p.tileCollide = false; p.aiStyle = -1; }
    AI(p) { const n = npcAt(p.ai.val0); if (!valid(n)) { p.Kill(); return; } p.Center = Vector2.new(N(p.Center.X) + (N(center(n).X) - N(p.Center.X)) * .4, N(p.Center.Y) + (N(center(n).Y) - N(p.Center.Y)) * .4); p.velocity = Vector2.Zero; }
}
