import { Terraria } from './../TL/ModImports.js';

const CachedClumps = new Map();
const ClumpModes = new Map();
function ClumpKey(proj) {
    if (!proj)
        return -1;
    const value = Number(proj.whoAmI);
    return Number.isFinite(value) ? Math.floor(value) : -1;
}

export function SetFungalClumpMode(proj, vanityOnly) {
    const key = ClumpKey(proj);
    if (key < 0)
        return;
    ClumpModes.set(key, {
        owner: Number(proj.owner),
        type: Number(proj.type),
        vanityOnly: vanityOnly === true
    });
}

export function IsFungalClumpVanity(proj, fallback = false) {
    const key = ClumpKey(proj);
    const data = ClumpModes.get(key);
    if (data && Number(data.owner) === Number(proj.owner) && Number(data.type) === Number(proj.type)) {
        return data.vanityOnly === true;
    }
    return fallback === true;
}

export function GetFungalClumpModeName(proj, fallback = false) {
    return IsFungalClumpVanity(proj, fallback) ? 'vanity' : 'functional';
}

export function ClearFungalClumpMode(proj) {
    const key = ClumpKey(proj);
    if (key >= 0)
        ClumpModes.delete(key);
}

const PendingFungalHeals = new Map();
const FungalHealStats = new Map();
function HealKey(index) {
    const value = Number(index);
    return Number.isFinite(value) ? Math.floor(value) : -1;
}

function StatsFor(owner) {
    const key = Number(owner);
    let stats = FungalHealStats.get(key);
    if (!stats) {
        stats = { spawned: 0, delivered: 0, emergency: 0, expired: 0 };
        FungalHealStats.set(key, stats);
    }
    return stats;
}

export function RegisterPendingFungalHeal(index, playerIndex, amount) {
    const key = HealKey(index);
    if (key < 0)
        return false;
    const owner = Number(playerIndex);
    PendingFungalHeals.set(key, {
        playerIndex: Number.isFinite(owner) ? Math.floor(owner) : 0,
        amount: Math.max(1, Math.floor(Number(amount) || 1)),
        age: 0
    });
    StatsFor(owner).spawned++;
    return true;
}

export function ResolvePendingFungalHeal(proj) {
    if (!proj)
        return null;
    const key = HealKey(proj.whoAmI);
    const data = PendingFungalHeals.get(key);
    if (!data)
        return null;
    data.age = Number(data.age || 0) + 1;
    PendingFungalHeals.set(key, data);
    return data;
}

export function CompletePendingFungalHeal(proj, healed = 0, emergency = false) {
    if (!proj)
        return;
    const key = HealKey(proj.whoAmI);
    const data = PendingFungalHeals.get(key);
    PendingFungalHeals.delete(key);
    if (!data)
        return;
    const stats = StatsFor(data.playerIndex);
    if (Number(healed) > 0)
        stats.delivered++;
    if (emergency === true)
        stats.emergency++;
}

export function ClearPendingFungalHeal(proj, expired = false) {
    if (!proj)
        return;
    const key = HealKey(proj.whoAmI);
    const data = PendingFungalHeals.get(key);
    PendingFungalHeals.delete(key);
    if (data && expired === true)
        StatsFor(data.playerIndex).expired++;
}

export function GetFungalHealDiagnostics(owner) {
    const playerIndex = Number(owner);
    let pending = 0;
    for (const data of PendingFungalHeals.values()) {
        if (Number(data.playerIndex) === playerIndex)
            pending++;
    }
    const stats = StatsFor(playerIndex);
    return {
        pending,
        spawned: Number(stats.spawned || 0),
        delivered: Number(stats.delivered || 0),
        emergency: Number(stats.emergency || 0),
        expired: Number(stats.expired || 0)
    };
}

function IsMatchingClump(proj, owner, type) {
    return !!proj && !!proj.active &&
        Number(proj.owner) === Number(owner) &&
        Number(proj.type) === Number(type);
}

export function GetCachedFungalClump(owner, type) {
    const index = Number(CachedClumps.get(Number(owner)));
    if (!Number.isFinite(index) || index < 0 || index >= 1000)
        return null;
    try {
        const proj = Terraria.Main.projectile[index];
        if (IsMatchingClump(proj, owner, type))
            return proj;
    } catch (e) { }
    CachedClumps.delete(Number(owner));
    return null;
}

export function RegisterFungalClump(proj) {
    if (!proj)
        return;
    const owner = Number(proj.owner);
    const index = Number(proj.whoAmI);
    if (Number.isFinite(owner) && Number.isFinite(index) && index >= 0) {
        CachedClumps.set(owner, index);
    }
}

export function UnregisterFungalClump(proj) {
    if (!proj)
        return;
    const owner = Number(proj.owner);
    const index = Number(proj.whoAmI);
    if (Number(CachedClumps.get(owner)) === index)
        CachedClumps.delete(owner);
    ClearFungalClumpMode(proj);
}

export function FindOrCacheFungalClump(owner, type) {
    const cached = GetCachedFungalClump(owner, type);
    if (cached)
        return cached;
    let first = null;
    for (let i = 0; i < 1000; i++) {
        try {
            const proj = Terraria.Main.projectile[i];
            if (!IsMatchingClump(proj, owner, type))
                continue;
            if (!first) {
                first = proj;
                CachedClumps.set(Number(owner), Number(proj.whoAmI));
            } else {
                proj.timeLeft = 0;
            }
        } catch (e) { }
    }
    return first;
}
