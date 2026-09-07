import { Terraria, Modules } from './../TL/ModImports.js';

const { Vector2 } = Modules;
const OwnedCountFallbackCache = new Map();
export function Length(x, y) {
    return Math.sqrt(Number(x) * Number(x) + Number(y) * Number(y));
}

export function Normalize(x, y, speed = 1) {
    const len = Math.max(0.001, Length(x, y));
    return Vector2.new(Number(x) / len * speed, Number(y) / len * speed);
}

export function ValidTarget(npc, projectile = null) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.life) <= 0 || Number(npc.lifeMax) <= 5)
        return false;
    try {
        if (!npc.CanBeChasedBy(projectile, false))
            return false;
    } catch (e) { }
    return true;
}

export function FindTarget(center, range = 800, projectile = null) {
    let best = null, bestSq = range * range;
    for (let i = 0; i < 200; i++) {
        let npc = null;
        try {
            npc = Terraria.Main.npc[i];
        } catch (e) { }
        if (!ValidTarget(npc, projectile))
            continue;
        const dx = Number(npc.Center.X) - Number(center.X), dy = Number(npc.Center.Y) - Number(center.Y);
        const ds = dx * dx + dy * dy;
        if (ds < bestSq) {
            bestSq = ds;
            best = npc;
        }
    }
    return best;
}

export function CountOwned(player, type) {
    const wanted = Math.floor(Number(type));
    if (!player || !(wanted > 0))
        return 0;
    // TLPro can temporarily report 0 in ownedProjectileCounts for modded minions even
    // while their projectile is still active. Trust positive native counts, but when it
    // says 0 fall back to an actual projectile scan before removing a summon buff.
    try {
        const nativeCount = Number(player.ownedProjectileCounts[wanted]);
        if (Number.isFinite(nativeCount) && nativeCount > 0)
            return Math.max(0, Math.floor(nativeCount));
    } catch (e) { }
    const owner = Math.floor(Number(Terraria.PlayerIndex(player)));
    const tick = Number(Terraria.Main.GameUpdateCount || 0);
    const key = `${owner}:${wanted}`;
    const cached = OwnedCountFallbackCache.get(key);
    if (cached && tick >= Number(cached.tick) && tick < Number(cached.next))
        return Number(cached.count) || 0;
    let count = 0;
    for (let i = 0; i < 1000; i++) {
        let p = null;
        try {
            p = Terraria.Main.projectile[i];
        } catch (e) { }
        if (p && p.active && Number(p.owner) === owner && Number(p.type) === wanted)
            count++;
    }
    OwnedCountFallbackCache.set(key, { tick, next: tick + 6, count });
    return count;
}

export function FindTargetCached(center, state, range = 800, projectile = null, scanInterval = 8, key = 'target') {
    if (!state || typeof state !== 'object')
        return FindTarget(center, range, projectile);
    const indexKey = `${key}Index`;
    const nextKey = `${key}NextScan`;
    const rangeSq = Number(range) * Number(range);
    let index = Math.floor(Number(state[indexKey] ?? -1));
    if (index >= 0 && index < 200) {
        let npc = null;
        try {
            npc = Terraria.Main.npc[index];
        } catch (e) { }
        if (ValidTarget(npc, projectile)) {
            const dx = Number(npc.Center.X) - Number(center.X);
            const dy = Number(npc.Center.Y) - Number(center.Y);
            if (dx * dx + dy * dy <= rangeSq)
                return npc;
        }
        state[indexKey] = -1;
    }
    const tick = Number(Terraria.Main.GameUpdateCount || 0);
    if (tick < Number(state[nextKey] || 0))
        return null;
    state[nextKey] = tick + Math.max(1, Math.floor(Number(scanInterval) || 1));
    const found = FindTarget(center, range, projectile);
    state[indexKey] = found ? Number(found.whoAmI) : -1;
    return found;
}
