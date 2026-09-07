import { Terraria, Modules } from './../TL/ModImports.js';
import { FusionEntityData } from './FusionEntityData.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './FrozenCubeTargetRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const AttachedClams = new Map();

function ProjectileCenterXY(projectile) {
    if (!projectile) return { X: 0, Y: 0 };
    try {
        const rect = projectile['Rectangle getRect()']();
        if (rect) return { X: Number(rect.X) + Number(rect.Width) * 0.5, Y: Number(rect.Y) + Number(rect.Height) * 0.5 };
    } catch (e) { }
    return { X: 0, Y: 0 };
}
export function NPCRect(npc) {
    if (!npc)
        return null;
    try {
        const rect = npc['Rectangle getRect()']();
        if (rect)
            return rect;
    } catch (e) { }
    return null;
}

export function NPCCenter(npc) {
    const rect = NPCRect(npc);
    if (!rect)
        return null;
    return Vector2.new(Number(rect.X) + Number(rect.Width) * 0.5, Number(rect.Y) + Number(rect.Height) * 0.5);
}

export function NPCIndex(npc) {
    if (!npc)
        return -1;
    try {
        const value = Math.floor(Number(npc.whoAmI));
        if (Number.isFinite(value) && value >= 0 && value < 200)
            return value;
    } catch (e) { }
    for (const index of FrozenCubeTrackedIndices())
        if (FrozenCubeNPC(index) === npc)
            return Number(index);
    ScanFrozenCubeNPCs(4);
    for (const index of FrozenCubeTrackedIndices())
        if (FrozenCubeNPC(index) === npc)
            return Number(index);
    return -1;
}

export function IsValidTarget(npc, projectile = null) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.life) <= 0 || Number(npc.lifeMax) <= 5)
        return false;
    try {
        if (!npc['bool CanBeChasedBy(object attacker, bool ignoreDontTakeDamage)'](projectile, false))
            return false;
    } catch (e) { }
    return NPCRect(npc) !== null;
}

export function AcquireTargetIndex(projectile, player, range = 600, state = null, refresh = 10, requireLineOfSight = false) {
    const tick = Number(Terraria.Main.GameUpdateCount || 0);
    const rangeSq = Number(range) * Number(range);
    const projectileCenter = ProjectileCenterXY(projectile);
    const px = Number(projectileCenter.X);
    const py = Number(projectileCenter.Y);
    if (state) {
        const cached = Math.floor(Number(state.targetIndex ?? -1));
        if (cached >= 0 && cached < 200 && tick < Number(state.nextTargetScan || 0)) {
            const npc = FrozenCubeNPC(cached);
            const center = NPCCenter(npc);
            if (IsValidTarget(npc, projectile) && center) {
                const dx = Number(center.X) - px;
                const dy = Number(center.Y) - py;
                if (dx * dx + dy * dy <= rangeSq)
                    return cached;
            }
        }
    }
    let best = -1;
    let bestDistance = rangeSq;
    try {
        if (player && player.HasMinionAttackTargetNPC) {
            const selected = Math.floor(Number(player.MinionAttackTargetNPC));
            if (selected >= 0 && selected < 200) {
                let npc = FrozenCubeNPC(selected);
                if (!npc) { ScanFrozenCubeNPCs(2); npc = FrozenCubeNPC(selected); }
                const center = NPCCenter(npc);
                if (IsValidTarget(npc, projectile) && center) {
                    const dx = Number(center.X) - px;
                    const dy = Number(center.Y) - py;
                    if (dx * dx + dy * dy <= rangeSq * 2.25)
                        best = selected;
                }
            }
        }
    } catch (e) { }
    if (best < 0) {
        ScanFrozenCubeNPCs(4);
        const slots = FrozenCubeTrackedIndices();
        for (let k = 0; k < slots.length; k++) {
            const i = Number(slots[k]);
            const npc = FrozenCubeNPC(i);
            if (!IsValidTarget(npc, projectile))
                continue;
            const center = NPCCenter(npc);
            if (!center)
                continue;
            const dx = Number(center.X) - px;
            const dy = Number(center.Y) - py;
            const distance = dx * dx + dy * dy;
            if (distance >= bestDistance)
                continue;
            if (requireLineOfSight) {
                const rect = NPCRect(npc);
                try {
                    if (!Terraria.Collision.CanHitLine(projectile.position, projectile.width, projectile.height, Vector2.new(Number(rect.X), Number(rect.Y)), Number(rect.Width), Number(rect.Height)))
                        continue;
                } catch (e) { }
            }
            bestDistance = distance;
            best = i;
        }
    }

    if (state) {
        state.targetIndex = best;
        state.nextTargetScan = tick + Math.max(1, Math.floor(Number(refresh) || 10));
    }
    return best;
}
export function DirectionTo(from, to, speed, fallbackX = 1, fallbackY = 0) {
    const dx = Number(to.X) - Number(from.X);
    const dy = Number(to.Y) - Number(from.Y);
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!(length > 0.001))
        return Vector2.new(fallbackX * speed, fallbackY * speed);
    return Vector2.new(dx / length * speed, dy / length * speed);
}

export function ProjectileSource(projectile, owner = null, item = null) {
    try {
        const source = projectile && projectile.GetProjectileSource_FromThis();
        if (source)
            return source;
    } catch (e) { }
    if (owner) {
        try {
            const held = item || owner.HeldItem;
            const source = owner.GetProjectileSource_Item(held);
            if (source)
                return source;
        } catch (e) { }
    }
    return null;
}

export function SpawnProjectile(source, position, velocity, type, damage, knockBack, owner, ai0 = 0, ai1 = 0, ai2 = 0) {
    if (!source || !(Number(type) > 0))
        return -1;
    try {
        return NewProjectile(source, position, velocity, Math.floor(Number(type)), Math.max(1, Math.floor(Number(damage) || 1)), Number(knockBack) || 0, Math.max(0, Math.floor(Number(owner) || 0)), Number(ai0) || 0, Number(ai1) || 0, Number(ai2) || 0, null);
    } catch (e) {
        return -1;
    }
}

export function RegisterAttachedClam(projectile, npcIndex, weight = 1) {
    const index = Math.floor(Number(npcIndex));
    if (!(index >= 0 && index < 200) || !projectile)
        return;
    const tick = Number(Terraria.Main.GameUpdateCount || 0);
    const bag = FusionEntityData.GetProjectileBag(projectile, 'snapClamRegister', () => ({ tick: -1 }));
    if (Number(bag.tick) === tick)
        return;
    bag.tick = tick;
    let entry = AttachedClams.get(index);
    if (!entry || Number(entry.tick) !== tick)
        entry = { tick, weight: 0 };
    entry.weight += Math.max(1, Math.floor(Number(weight) || 1));
    AttachedClams.set(index, entry);
}

export function GetAttachedClamWeight(npc) {
    const index = NPCIndex(npc);
    if (index < 0)
        return 0;
    const tick = Number(Terraria.Main.GameUpdateCount || 0);
    const entry = AttachedClams.get(index);
    if (!entry || tick - Number(entry.tick) > 1)
        return 0;
    if ((tick & 127) === 0) {
        for (const [key, value] of AttachedClams)
            if (tick - Number(value.tick) > 2)
                AttachedClams.delete(key);
    }
    return Math.max(0, Math.floor(Number(entry.weight) || 0));
}
