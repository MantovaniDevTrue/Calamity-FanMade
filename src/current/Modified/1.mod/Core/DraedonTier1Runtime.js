import { Terraria, Modules } from './../TL/ModImports.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC, ScanFrozenCubeNPCs } from './FrozenCubeTargetRuntime.js';

const { Vector2, Rectangle } = Modules;
const States = new Map();
const LaserBurns = new Map();
const SecondaryDown = new Map();
const Cooldowns = new Map();
const AugerBuffed = new Map();
const DroneBarrageSeq = new Map();
const DroneRegistry = new Map();
const ShortHookRegistry = new Map();
let lastScanTick = -1;

function N(v, f = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
}

export function GameTick() {
    try { return Math.floor(N(Terraria.Main.GameUpdateCount)); }
    catch (_) { return 0; }
}

export function OwnerIndex(player) {
    try { return Math.max(0, Math.floor(N(Terraria.PlayerIndex(player), N(Terraria.Main.myPlayer)))); }
    catch (_) { return 0; }
}

// Projectile.whoAmI and position/Center are inherited from Entity on this TLPro build.
// Reading any of them from a Projectile NativeObject can enumerate Projectile -> Entity -> Object.
// owner, identity and type are declared directly on Projectile and are the same key used by
// FusionEntityData / the compiled projectile dispatcher.
export function ProjectileKey(p) {
    if (!p) return '-1:-1:-1';
    return `${Math.floor(N(p.owner, -1))}:${Math.floor(N(p.identity, -1))}:${Math.floor(N(p.type, -1))}`;
}

export function ProjectileRect(p) {
    if (!p) return Rectangle.new(0, 0, 0, 0);
    try {
        const getRect = p['Rectangle getRect()']; // declared directly by Terraria.Projectile
        if (typeof getRect === 'function') {
            const r = getRect();
            if (r) return r;
        }
    } catch (_) { }
    // Never fall back to p.position/p.Center here: those inherited members are the source
    // of the reflection storm this runtime is specifically designed to avoid.
    return Rectangle.new(0, 0, Math.max(0, N(p.width)), Math.max(0, N(p.height)));
}

export function ProjectileCenter(p) {
    const r = ProjectileRect(p);
    return Vector2.new(N(r.X) + N(r.Width) * 0.5, N(r.Y) + N(r.Height) * 0.5);
}

export function NPCRect(npc) {
    if (!npc) return Rectangle.new(0, 0, 0, 0);
    try {
        const getRect = npc['Rectangle getRect()']; // declared directly by Terraria.NPC
        if (typeof getRect === 'function') {
            const r = getRect();
            if (r) return r;
        }
    } catch (_) { }
    return Rectangle.new(0, 0, 0, 0);
}

export function NPCCenter(npc) {
    const r = NPCRect(npc);
    return Vector2.new(N(r.X) + N(r.Width) * 0.5, N(r.Y) + N(r.Height) * 0.5);
}

export function NPCIndex(npc) {
    if (!npc) return -1;
    for (const idx of FrozenCubeTrackedIndices()) {
        if (FrozenCubeNPC(idx) === npc) return idx;
    }
    // OnHit callbacks can hand us an NPC before the compact registry has reached that slot.
    // One bounded refresh is cheaper and safer than touching inherited npc.whoAmI.
    ScanFrozenCubeNPCs(16);
    for (const idx of FrozenCubeTrackedIndices()) {
        if (FrozenCubeNPC(idx) === npc) return idx;
    }
    return -1;
}

export function GetNPC(index) {
    const i = Math.floor(N(index, -1));
    if (i < 0 || i >= 200) return null;
    let npc = FrozenCubeNPC(i);
    if (npc) return npc;
    ScanFrozenCubeNPCs(8);
    return FrozenCubeNPC(i);
}

function StateOwnerMap(owner, create = false) {
    const o = Math.floor(N(owner, -1));
    if (o < 0) return null;
    let map = States.get(o);
    if (!map && create) { map = new Map(); States.set(o, map); }
    return map;
}

export function StateFor(p, defaults = null) {
    if (!p) return defaults ? { ...defaults } : {};
    const owner = Math.floor(N(p.owner, -1));
    const identity = Math.floor(N(p.identity, -1));
    const type = Math.floor(N(p.type, -1));
    if (owner < 0 || identity < 0) return defaults ? { ...defaults } : {};
    const map = StateOwnerMap(owner, true);
    let entry = map.get(identity);
    if (!entry || entry.type !== type) {
        entry = { type, state: defaults ? { ...defaults } : {} };
        map.set(identity, entry);
    }
    return entry.state;
}

// Tier 1 projectile state is initialized from ai0/ai1/ai2 in OnSpawn.
// Keep this export as a no-op compatibility shim for older payload references.
export function SeedProjectile(index, data) { return false; }

export function ClearProjectile(p) {
    if (!p) return;
    const owner = Math.floor(N(p.owner, -1));
    const identity = Math.floor(N(p.identity, -1));
    const map = StateOwnerMap(owner, false);
    if (!map || identity < 0) return;
    map.delete(identity);
    if (map.size === 0) States.delete(owner);
}

export function HasActiveProjectileState() {
    return States.size > 0;
}

export function GetProjectile(index) {
    const i = Math.floor(N(index, -1));
    if (i < 0 || i >= 1000) return null;
    // get_Item avoids the ambiguous JS array-index bridge used by the first Tier 1 build.
    try {
        const getter = Terraria.Main.projectile && Terraria.Main.projectile['Projectile get_Item(int index)'];
        if (typeof getter === 'function') return getter(i) || null;
    } catch (_) { }
    try { return Terraria.Main.projectile.get_Item(i) || null; }
    catch (_) { return null; }
}

export function PrimeDroneShotDamage(index, damage, originalDamage = 24) {
    const p = GetProjectile(index);
    if (!p) return false;
    const shot = Math.max(1, Math.floor(N(damage, originalDamage)));
    const base = Math.max(1, Math.floor(N(originalDamage, 24)));
    try { p.damage = shot; } catch (_) { }
    try { p.originalDamage = base; } catch (_) { }
    const s = StateFor(p, {});
    s.shotDamage = shot;
    return true;
}

export function GetPlayer(owner) {
    const i = Math.floor(N(owner, -1));
    if (i < 0 || i >= 255) return null;
    try {
        if (i === Math.floor(N(Terraria.Main.myPlayer, -2))) return Terraria.Main.LocalPlayer;
    } catch (_) { }
    try {
        const getter = Terraria.Main.player && Terraria.Main.player['Player get_Item(int index)'];
        if (typeof getter === 'function') return getter(i) || null;
    } catch (_) { }
    try { return Terraria.Main.player.get_Item(i) || null; }
    catch (_) { return null; }
}

export function SourceFromProjectile(p) {
    // Terraria.Projectile in TLPro does not expose GetSource_FromThis. Probing that missing
    // member enumerates the entire Projectile inheritance chain. Subprojectile source metadata
    // does not affect gameplay here, so use the proven reflection-free source directly.
    try { return null; } catch (_) { return null; }
}

export function IsChaseable(n) {
    try { return !!(n && n.active && N(n.life) > 0 && n.friendly !== true && n.dontTakeDamage !== true); }
    catch (_) { return false; }
}

export function RefreshTargets(budget = 8, minInterval = 4) {
    const t = GameTick();
    const interval = Math.max(1, Math.floor(N(minInterval, 4)));
    // Persistent minions used to keep the compact NPC registry scanning native slots every frame.
    // Four ticks is still responsive for homing, while cutting the long-lived JS->native scan rate
    // to at most 15 Hz. Same-tick calls from missiles remain coalesced as before.
    if (lastScanTick >= 0 && t - lastScanTick < interval) return;
    lastScanTick = t;
    ScanFrozenCubeNPCs(Math.max(1, Math.min(16, Math.floor(N(budget, 8)))));
}

export function NearestTargetEntry(center, range = 900, excludeIndex = -1) {
    RefreshTargets(12);
    let best = null;
    let bestD = N(range, 900) ** 2;
    for (const idx of FrozenCubeTrackedIndices()) {
        if (idx === excludeIndex) continue;
        const n = FrozenCubeNPC(idx);
        if (!IsChaseable(n)) continue;
        const c = NPCCenter(n);
        const dx = N(c.X) - N(center.X);
        const dy = N(c.Y) - N(center.Y);
        const d = dx * dx + dy * dy;
        if (d < bestD) {
            bestD = d;
            best = [bestD, idx, n];
        }
    }
    return best;
}

export function NearestTarget(center, range = 900, excludeIndex = -1) {
    const entry = NearestTargetEntry(center, range, excludeIndex);
    return entry ? entry[2] : null;
}

export function NearestTargets(center, range = 900, count = 2) {
    RefreshTargets(12);
    const limit = Math.max(1, Math.floor(N(count, 2)));
    const best = [];
    const max = N(range, 900) ** 2;
    for (const idx of FrozenCubeTrackedIndices()) {
        const n = FrozenCubeNPC(idx);
        if (!IsChaseable(n)) continue;
        const c = NPCCenter(n);
        const dx = N(c.X) - N(center.X);
        const dy = N(c.Y) - N(center.Y);
        const d = dx * dx + dy * dy;
        if (d > max) continue;
        // Keep only the requested nearest entries. This avoids building + sorting an array
        // containing every active NPC for attacks that normally need just 2 targets.
        let pos = best.length;
        while (pos > 0 && best[pos - 1][0] > d) pos--;
        if (pos >= limit && best.length >= limit) continue;
        best.splice(pos, 0, [d, idx, n]);
        if (best.length > limit) best.pop();
    }
    return best;
}

export function HomeVelocity(p, target, speed = 12, inertia = 14) {
    if (!p || !target) return false;
    const pc = ProjectileCenter(p);
    const nc = NPCCenter(target);
    const dx = N(nc.X) - N(pc.X);
    const dy = N(nc.Y) - N(pc.Y);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.001) return false;
    const vx = (N(p.velocity.X) * (inertia - 1) + dx / d * speed) / inertia;
    const vy = (N(p.velocity.Y) * (inertia - 1) + dy / d * speed) / inertia;
    p.velocity = Vector2.new(vx, vy);
    return true;
}

// Pure-JS drone lifetime registry. owner + identity are direct Projectile fields, so this
// follows the same reflection-free identity model as FusionEntityData.
function DroneMap(owner, create = false) {
    const o = Math.floor(N(owner, -1));
    if (o < 0) return null;
    let map = DroneRegistry.get(o);
    if (!map && create) { map = new Map(); DroneRegistry.set(o, map); }
    return map;
}

function PruneDrones(owner, maxAge = 12) {
    const map = DroneMap(owner, false);
    if (!map) return 0;
    const now = GameTick();
    for (const [identity, state] of map) {
        if (now - N(state && state.tick, now) > maxAge) map.delete(identity);
    }
    if (map.size === 0) DroneRegistry.delete(Math.floor(N(owner, -1)));
    return map.size;
}

export function RegisterDroneSpawn(owner, slot, formationIndex = 0) { return false; }

export function TouchDrone(p, preferredFormation = null) {
    if (!p) return 0;
    const owner = Math.floor(N(p.owner, -1));
    const identity = Math.floor(N(p.identity, -1));
    if (owner < 0 || identity < 0) return 0;
    const map = DroneMap(owner, true);
    const now = GameTick();
    let state = map.get(identity);
    if (!state) {
        const preferred = Math.floor(N(preferredFormation, -1));
        state = { tick: now, formationIndex: preferred >= 0 ? preferred : map.size };
        map.set(identity, state);
    } else if (N(state.tick, -1) !== now) {
        state.tick = now;
    }
    return Math.max(0, Math.floor(N(state.formationIndex)));
}

export function RemoveDrone(p) {
    if (!p) return;
    const owner = Math.floor(N(p.owner, -1));
    const identity = Math.floor(N(p.identity, -1));
    const map = DroneMap(owner, false);
    if (!map || identity < 0) return;
    map.delete(identity);
    if (map.size === 0) DroneRegistry.delete(owner);
}

export function DroneCount(owner, maxAge = 12) { return PruneDrones(owner, maxAge); }

function PruneShortHook(owner, maxAge = 12) {
    const o = Math.floor(N(owner, -1));
    const state = ShortHookRegistry.get(o);
    if (!state) return false;
    if (GameTick() - N(state.tick, 0) > maxAge) { ShortHookRegistry.delete(o); return false; }
    return true;
}

export function TouchShortHook(p) {
    if (!p) return false;
    const owner = Math.floor(N(p.owner, -1));
    const identity = Math.floor(N(p.identity, -1));
    if (owner < 0 || identity < 0) return false;
    const now = GameTick();
    let state = ShortHookRegistry.get(owner);
    if (!state) {
        state = { identity, tick: now };
        ShortHookRegistry.set(owner, state);
    } else if (Math.floor(N(state.identity, -2)) !== identity || N(state.tick, -1) !== now) {
        state.identity = identity;
        state.tick = now;
    }
    return true;
}

export function RemoveShortHook(p) {
    if (!p) return;
    const owner = Math.floor(N(p.owner, -1));
    const identity = Math.floor(N(p.identity, -1));
    const state = ShortHookRegistry.get(owner);
    if (state && Math.floor(N(state.identity, -2)) === identity) ShortHookRegistry.delete(owner);
}

export function ShortHookActive(owner, maxAge = 12) { return PruneShortHook(owner, maxAge); }

export function RegisterLaserBurn(targetIndex, laserDamage, owner) {
    const idx = Math.floor(N(targetIndex, -1));
    if (idx < 0 || idx >= 200) return;
    const add = Math.max(1, Math.floor(N(laserDamage) * 0.2));
    let b = LaserBurns.get(idx);
    if (!b) b = { timer: 300, damage: 0, stacks: 0, owner: Math.floor(N(owner)) };
    else b.timer = Math.max(1, b.timer - b.stacks * 2);
    b.damage += add;
    b.stacks++;
    b.owner = Math.floor(N(owner, b.owner));
    LaserBurns.set(idx, b);
}

function Strike(npc, damage, owner) {
    if (!npc || damage <= 0) return;
    try {
        npc['double StrikeNPC(int Damage, float knockBack, int hitDirection, bool crit, bool noEffect, bool fromNet, int owner)'](
            Math.max(1, Math.floor(damage)), 0, 0, false, false, false, Math.floor(N(owner))
        );
    } catch (_) {
        try { npc.StrikeNPC(Math.max(1, Math.floor(damage)), 0, 0, false, false, false); }
        catch (__){ }
    }
}

export function TickLaserBurns() {
    for (const [idx, b] of LaserBurns) {
        const n = FrozenCubeNPC(idx);
        if (!IsChaseable(n)) {
            LaserBurns.delete(idx);
            continue;
        }
        b.timer--;
        const lethalThreshold = Math.max(1, N(n.life, 1) * 1.5);
        if (b.timer <= 0 || N(b.damage) >= lethalThreshold) {
            Strike(n, b.damage, b.owner);
            LaserBurns.delete(idx);
        }
    }
}

export function SetSecondaryDown(owner, down) {
    const o = Math.floor(N(owner));
    const v = !!down;
    if (SecondaryDown.get(o) !== v) SecondaryDown.set(o, v);
}

export function IsSecondaryDown(owner) {
    return SecondaryDown.get(Math.floor(N(owner))) === true;
}

function CD(owner, name) { return `${Math.floor(N(owner))}:${name}`; }
let LastCooldownPruneTick = -9999;

export function Cooldown(owner, name) {
    const now = GameTick();
    const until = Math.floor(N(Cooldowns.get(CD(owner, name)), 0));
    return Math.max(0, until - now);
}

export function SetCooldown(owner, name, ticks) {
    const duration = Math.max(0, Math.floor(N(ticks)));
    Cooldowns.set(CD(owner, name), GameTick() + duration);
}

export function TickCooldowns() {
    const now = GameTick();
    // Cooldowns are absolute expiry ticks, so there is no reason to rewrite every entry at 60 Hz.
    if (now - LastCooldownPruneTick < 60) return;
    LastCooldownPruneTick = now;
    for (const [k, until] of Cooldowns) {
        if (N(until, 0) <= now) Cooldowns.delete(k);
    }
}

export function SetAugerBuffed(owner, value = true) {
    AugerBuffed.set(Math.floor(N(owner)), !!value);
}

export function ConsumeAugerBuffed(owner) {
    const o = Math.floor(N(owner));
    const yes = AugerBuffed.get(o) === true;
    if (yes) AugerBuffed.set(o, false);
    return yes;
}

export function AugerBuffedReady(owner) {
    return AugerBuffed.get(Math.floor(N(owner))) === true;
}

export function RequestDroneBarrage(owner) {
    const o = Math.floor(N(owner));
    if (Cooldown(o, 'drone') > 0) return false;
    DroneBarrageSeq.set(o, (DroneBarrageSeq.get(o) || 0) + 1);
    SetCooldown(o, 'drone', 450);
    return true;
}

export function DroneBarrageSequence(owner) {
    return DroneBarrageSeq.get(Math.floor(N(owner))) || 0;
}

export function ClearWorldDraedonRuntime() {
    States.clear();
    LaserBurns.clear();
    SecondaryDown.clear();
    Cooldowns.clear();
    AugerBuffed.clear();
    DroneBarrageSeq.clear();
    DroneRegistry.clear();
    ShortHookRegistry.clear();
    lastScanTick = -1;
}
