import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const PlaySound = Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'];

// Mobile hotpath cache. Nearby feathers share one native target query for a few ticks
// instead of every feather crossing the JS/native bridge independently.
const TargetCellCache = new Map();
const CELL_SIZE = 64;
const TARGET_RANGE = 150;
const TARGET_RANGE_SQ = TARGET_RANGE * TARGET_RANGE;
const RETAIN_BY_CADENCE = {
    4: Math.pow(20 / 21, 4),
    6: Math.pow(20 / 21, 6),
    8: Math.pow(20 / 21, 8),
};
let lastCachePruneTick = -1;
let RegisteredType = 0;
let cachedOwnedCount = 0;
let nextOwnedCountTick = -1;

function quickTarget(index, center) {
    if (!(index >= 0 && index < 200)) return null;
    let npc = null;
    try { npc = Terraria.Main.npc[index]; } catch (e) { }
    if (!npc || !npc.active || npc.friendly || npc.dontTakeDamage || Number(npc.life) <= 0) return null;
    const nc = npc.Center;
    const dx = Number(nc.X) - Number(center.X);
    const dy = Number(nc.Y) - Number(center.Y);
    if (dx * dx + dy * dy > TARGET_RANGE_SQ) return null;
    return npc;
}

function resolveFound(found) {
    if (found === null || found === undefined) return -1;
    try {
        if (found.active !== undefined) {
            const i = Math.floor(Number(found.whoAmI));
            if (i >= 0 && i < 200) return i;
        }
    } catch (e) { }
    const i = Math.floor(Number(found));
    return i >= 0 && i < 200 ? i : -1;
}

function sharedTarget(projectile, center, tick) {
    const cx = Math.floor(Number(center.X) / CELL_SIZE);
    const cy = Math.floor(Number(center.Y) / CELL_SIZE);
    const key = `${cx}:${cy}`;
    const cached = TargetCellCache.get(key);
    if (cached && tick < cached.expires) {
        if (cached.index < 0) return null;
        const npc = quickTarget(cached.index, center);
        if (npc) return npc;
    }

    let index = -1;
    try { index = resolveFound(projectile.FindTargetWithinRange(TARGET_RANGE, true)); } catch (e) { }
    const npc = quickTarget(index, center);
    TargetCellCache.set(key, { index: npc ? index : -1, expires: tick + 8 });

    // Bound module-level cache growth across long play sessions/world travel.
    if (tick !== lastCachePruneTick && tick % 120 === 0) {
        lastCachePruneTick = tick;
        for (const [k, value] of TargetCellCache) {
            if (!value || tick - Number(value.expires || 0) > 120) TargetCellCache.delete(k);
        }
        if (TargetCellCache.size > 128) TargetCellCache.clear();
    }
    return npc;
}

function ownedFeatherCount(tick) {
    if (tick < nextOwnedCountTick) return cachedOwnedCount;
    nextOwnedCountTick = tick + 12;
    try {
        const owner = Terraria.Main.player[Math.floor(Number(Terraria.Main.myPlayer))];
        const count = owner && RegisteredType > 0 ? Number(owner.ownedProjectileCounts[RegisteredType]) : 0;
        cachedOwnedCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    } catch (e) {
        cachedOwnedCount = 0;
    }
    return cachedOwnedCount;
}


export class StickyFeatherAero extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/StickyFeather';
        this.AIType = 514;
    }

    SetStaticDefaults() {
        RegisteredType = Math.floor(Number(this.Type) || 0);
        try { Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type] = true; } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 10;
        p.height = 10;
        p.friendly = true;
        p.tileCollide = false;
        p.timeLeft = 360;
        p.penetrate = 3;
        p.alpha = 255;
        p.aiStyle = 93;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
        if (!(RegisteredType > 0)) RegisteredType = Math.floor(Number(p.type) || 0);
    }

    AI(p) {
        const timeLeft = Math.floor(Number(p.timeLeft));
        // The old path rewrote tileCollide every single tick after this threshold.
        if (timeLeft === 319) p.tileCollide = true;

        // Stagger expensive homing work across feathers. Velocity persists between samples,
        // and the blend below is mathematically adjusted to approximate the original
        // 20/21 per-tick steering over the whole skipped interval.
        const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
        const id = Math.max(0, Math.floor(Number(p.whoAmI) || 0));
        const count = ownedFeatherCount(tick);
        const cadence = count >= 56 ? 8 : (count >= 28 ? 6 : 4);
        if (((tick + id) % cadence) !== 0) return;

        const center = p.Center;
        const target = sharedTarget(p, center, tick);
        if (!target) return;

        const tc = target.Center;
        const dx = Number(tc.X) - Number(center.X);
        const dy = Number(tc.Y) - Number(center.Y);
        const distanceSq = dx * dx + dy * dy;
        if (!(distanceSq > 0.0001) || distanceSq > TARGET_RANGE_SQ) return;
        const length = Math.sqrt(distanceSq);

        const velocity = p.velocity;
        const vx = Number(velocity.X) || 0;
        const vy = Number(velocity.Y) || 0;
        const currentSpeed = Math.sqrt(vx * vx + vy * vy) || 2;
        const desiredSpeed = Math.min(12, Math.max(currentSpeed, 2));
        const desiredX = dx / length * desiredSpeed;
        const desiredY = dy / length * desiredSpeed;
        const retain = RETAIN_BY_CADENCE[cadence] || RETAIN_BY_CADENCE[4];
        const steer = 1 - retain;
        p.velocity = Vector2.new(vx * retain + desiredX * steer, vy * retain + desiredY * steer);
    }

    OnKill(p) {
        // Preserve impact feedback while scaling purely cosmetic work when a large swarm
        // expires together. This avoids sound/dust spikes without changing damage or hits.
        const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
        const count = ownedFeatherCount(tick);
        const id = Math.max(0, Math.floor(Number(p.whoAmI) || 0));
        const divisor = count >= 56 ? 8 : (count >= 28 ? 4 : (count >= 14 ? 2 : 1));
        if ((id % divisor) !== 0) return;

        try { PlaySound(2, p.Center, 14, 0); } catch (e) { }
        if (typeof NewDust !== 'function') return;
        const dustCount = count >= 56 ? 1 : (count >= 28 ? 2 : (count >= 14 ? 3 : 5));
        for (let i = 0; i < dustCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            try {
                const index = NewDust(p.position, 18, 18, 206, Math.cos(angle) * speed, Math.sin(angle) * speed, 100, null, 0.85 + Math.random() * 0.65);
                if (index >= 0 && index < 6000 && (i & 1) === 0) {
                    const dust = Terraria.Main.dust[index];
                    if (dust) dust.noGravity = true;
                }
            } catch (e) { }
        }
    }
}
