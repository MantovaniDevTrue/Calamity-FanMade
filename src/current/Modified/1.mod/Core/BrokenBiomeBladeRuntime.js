import { Terraria, Modules } from './../TL/ModImports.js';
const { Vector2 } = Modules;
import { PlayerDB } from './../TL/PlayerDB.js';

export const BrokenBiomeAttunement = Object.freeze({ None: -1, PureClarity: 0, AridGrandeur: 1, BitingEmbrace: 2, DecaysRetort: 3 });
const SAVE_KEY = 'calamity:brokenBiomeBlade:attunements:v1';
// IMPORTANT: do not key mutable item gameplay state by the IL2CPP NativeObject wrapper.
// TLPro may expose a fresh JS wrapper for the same Terraria.Item on later callbacks.
// Player + inventory slot is stable across HoldItem/Shoot/projectile callbacks and mirrors
// the fact that Calamity stores attunements on the concrete item instance.
const SlotStates = new Map();
const FallbackItemStates = new Map();
const PendingBySlot = new Map();
const ProjectileSeeds = new Map();
let ProjectileSeedSerial = 0;
const HoldoutLocks = new Map();
// At most one Broken Biome Blade attack-held projectile may exist per owner.
// This JS-side gate is required on TLPro because ownedProjectileCounts can lag behind
// NewProjectile and projectile wrappers may be recreated between hooks.
const HeldAttackLocks = new Map();
let BrokenBiomeBladeType = 0;

function N(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function clampAttune(v) { v = Math.floor(N(v, -1)); return v < -1 ? -1 : (v > 3 ? 3 : v); }
function inventory(player) { try { return Array.from(player.inventory || []); } catch (e) { return []; } }
function ownerIndex(player) { try { return Math.max(0, Math.floor(N(Terraria.PlayerIndex(player), N(Terraria.Main.myPlayer)))); } catch (e) { return 0; } }
function currentTick() { try { return Math.floor(N(Terraria.Main.GameUpdateCount, -1)); } catch (e) { return -1; } }

export function BrokenBiomeBladeSelectedSlot(player) {
    if (!player) return -1;
    try {
        const slot = Math.floor(N(player.selectedItem, -1));
        if (slot >= 0 && slot <= 58) return slot;
    } catch (e) { }
    return -1;
}

function slotKey(player, slotOverride = -1) {
    if (!player) return null;
    const owner = ownerIndex(player);
    const slot = slotOverride >= 0 ? Math.floor(N(slotOverride, -1)) : BrokenBiomeBladeSelectedSlot(player);
    if (slot < 0) return null;
    return { key: `${owner}:${slot}`, owner, slot };
}

function freshState(owner = -1, slot = -1) {
    return {
        owner, slot,
        main: -1, secondary: -1,
        combo: 0, comboReset: 0, comboResetUntilTick: -1,
        pureSwingDir: 1,
        canLunge: 1,
        rightDown: false, rightWasDown: false, inputSource: '', lastInputTick: -1,
        holdoutActive: false, holdoutOwner: -1, holdoutIndex: -1, holdoutStartedTick: -1,
        lastAppliedMain: -999
    };
}

function normalizeTimedState(state) {
    if (!state) return state;
    const tick = currentTick();
    if (state.main === BrokenBiomeAttunement.BitingEmbrace && state.comboResetUntilTick >= 0 && tick >= state.comboResetUntilTick) {
        state.combo = 0;
        state.comboReset = 0;
        state.comboResetUntilTick = -1;
    }
    return state;
}

export function SetBrokenBiomeBladeType(type) { BrokenBiomeBladeType = Math.max(0, Math.floor(N(type))); }

export function BrokenBiomeBladeState(item, player = null, slotOverride = -1) {
    const info = slotKey(player, slotOverride);
    if (info) {
        let state = SlotStates.get(info.key);
        if (!state) {
            state = freshState(info.owner, info.slot);
            if (PendingBySlot.has(info.slot)) {
                const saved = PendingBySlot.get(info.slot) || {};
                state.main = clampAttune(saved.main);
                state.secondary = clampAttune(saved.secondary);
                if (state.main === state.secondary) state.secondary = -1;
                PendingBySlot.delete(info.slot);
            }
            SlotStates.set(info.key, state);
        }
        state.owner = info.owner;
        state.slot = info.slot;
        return normalizeTimedState(state);
    }

    if (!item) return freshState();
    let state = FallbackItemStates.get(item);
    if (!state) {
        state = freshState();
        FallbackItemStates.set(item, state);
    }
    return normalizeTimedState(state);
}

export function SwapBrokenBiomeBladeAttunements(item, player = null, slotOverride = -1) {
    const s = BrokenBiomeBladeState(item, player, slotOverride);
    const t = s.main; s.main = s.secondary; s.secondary = t;
    return s;
}

function zoneFlagValue(value) {
    try {
        if (value === true || value === 1) return true;
        if (value === false || value === 0 || value == null) return false;
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric !== 0;
        const text = String(value).trim().toLowerCase();
        if (text === 'true' || text === '1') return true;
        if (text === 'false' || text === '0' || text === '') return false;
        return !!value;
    } catch (e) { return false; }
}

export function BrokenBiomeZoneSnapshot(player) {
    if (!player) return { desert: false, underworld: false, snow: false, sky: false, corrupt: false, crimson: false };
    let desert = false, underworld = false, snow = false, sky = false, corrupt = false, crimson = false;
    try { desert = zoneFlagValue(player.ZoneDesert); } catch (e) { }
    try { underworld = zoneFlagValue(player.ZoneUnderworldHeight); } catch (e) { }
    try { snow = zoneFlagValue(player.ZoneSnow); } catch (e) { }
    try { sky = zoneFlagValue(player.ZoneSkyHeight); } catch (e) { }
    try { corrupt = zoneFlagValue(player.ZoneCorrupt); } catch (e) { }
    try { crimson = zoneFlagValue(player.ZoneCrimson); } catch (e) { }
    return { desert, underworld, snow, sky, corrupt, crimson };
}

export function AttunementForBiome(player) {
    // Exact precedence used by the official BrokenBiomeBladeHoldout.Attune():
    // Default -> Hot -> Cold -> Evil. Later matches intentionally win.
    const z = BrokenBiomeZoneSnapshot(player);
    let a = BrokenBiomeAttunement.PureClarity;
    if (z.desert || z.underworld) a = BrokenBiomeAttunement.AridGrandeur;
    if (z.snow || z.sky) a = BrokenBiomeAttunement.BitingEmbrace;
    if (z.corrupt || z.crimson) a = BrokenBiomeAttunement.DecaysRetort;
    return a;
}

export function AttuneBrokenBiomeBlade(item, player, slotOverride = -1) {
    const s = BrokenBiomeBladeState(item, player, slotOverride);
    const target = AttunementForBiome(player);
    // Mirrors BrokenBiomeBladeHoldout.Attune: if the target was the old main
    // (now in secondary after the initial swap), undo the slot ordering cleanly.
    if (s.secondary === target) {
        s.secondary = s.main;
        s.main = target;
    } else s.main = target;
    if (s.main === s.secondary) s.secondary = -1;
    return target;
}

export function NormalizeAttunementsAfterHoldout(item, player = null, slotOverride = -1) {
    const s = BrokenBiomeBladeState(item, player, slotOverride);
    if (s.main === -1 && s.secondary !== -1) {
        s.main = s.secondary;
        s.secondary = -1;
    }
}

export function AttunementName(id) {
    switch (clampAttune(id)) {
        case 0: return 'Pure Clarity';
        case 1: return 'Arid Grandeur';
        case 2: return 'Biting Embrace';
        case 3: return "Decay's Retort";
        default: return 'None';
    }
}

export function BrokenBiomeBladeMultiplier(id) {
    switch (clampAttune(id)) {
        case 0: return 34 / 38;
        case 1: return 38 / 38;
        case 2: return 38 / 38;
        case 3: return 45 / 38;
        default: return 1;
    }
}

export function MarkBrokenBiomeComboUsed(state, durationTicks = 50) {
    if (!state) return;
    state.comboReset = 1;
    const tick = currentTick();
    state.comboResetUntilTick = tick >= 0 ? tick + Math.max(1, Math.floor(N(durationTicks, 50))) : -1;
}

export function SeedBrokenBiomeProjectile(index, owner, data) {
    const i = Math.floor(N(index, -1)); if (i < 0) return;
    const payload = Object.assign({}, data || {});
    payload.__freshSeed = true;
    payload.__seedToken = ++ProjectileSeedSerial;
    ProjectileSeeds.set(`${Math.floor(N(owner, 0))}:${i}`, payload);
}
export function ConsumeBrokenBiomeProjectileSeed(proj) {
    if (!proj) return {};
    const key = `${Math.floor(N(proj.owner, 0))}:${Math.floor(N(proj.whoAmI, -1))}`;
    if (!ProjectileSeeds.has(key)) return {};
    const s = ProjectileSeeds.get(key) || {};
    ProjectileSeeds.delete(key);
    return s;
}


function projectileAt(index) {
    const i = Math.floor(N(index, -1));
    if (i < 0) return null;
    try { return Terraria.Main.projectile.get_Item(i) || null; } catch (e) { }
    return null;
}

function heldLockMatchesProjectile(lock, projectile) {
    if (!lock || !projectile) return false;
    if (projectile.active !== true) return false;
    if (Math.floor(N(projectile.owner, -2)) !== Math.floor(N(lock.owner, -1))) return false;
    if (Math.floor(N(projectile.type, -2)) !== Math.floor(N(lock.type, -1))) return false;
    // Do not compare Projectile.identity on TLPro. The IL2CPP wrapper may expose an
    // unstable identity value between callbacks even while whoAmI still names the
    // same live projectile slot. owner + whoAmI(index) + type is stable for the
    // lifetime of an active projectile and is sufficient for this single-owner gate.
    return true;
}

export function RegisterBrokenBiomeHeldAttack(owner, index, type, attunement = -1) {
    const ownerKey = Math.floor(N(owner, -1));
    const projectileIndex = Math.floor(N(index, -1));
    const projectileType = Math.floor(N(type, -1));
    if (ownerKey < 0 || projectileIndex < 0 || projectileType <= 0) return false;
    HeldAttackLocks.set(ownerKey, {
        owner: ownerKey,
        index: projectileIndex,
        type: projectileType,
        attunement: clampAttune(attunement),
        startedTick: currentTick()
    });
    return true;
}

export function BrokenBiomeHeldAttackActive(owner) {
    const ownerKey = Math.floor(N(owner, -1));
    if (ownerKey < 0) return false;
    const lock = HeldAttackLocks.get(ownerKey);
    if (!lock) return false;
    const projectile = projectileAt(lock.index);
    if (!heldLockMatchesProjectile(lock, projectile)) {
        HeldAttackLocks.delete(ownerKey);
        return false;
    }
    return true;
}

export function ReleaseBrokenBiomeHeldAttack(owner, index = -1) {
    const ownerKey = Math.floor(N(owner, -1));
    if (ownerKey < 0) return false;
    const lock = HeldAttackLocks.get(ownerKey);
    if (!lock) return false;
    const wantedIndex = Math.floor(N(index, -1));
    if (wantedIndex >= 0 && lock.index >= 0 && wantedIndex !== lock.index) return false;
    HeldAttackLocks.delete(ownerKey);
    return true;
}

export function StopBrokenBiomeHeldAttack(owner, reason = 'replace') {
    const ownerKey = Math.floor(N(owner, -1));
    if (ownerKey < 0) return false;
    const lock = HeldAttackLocks.get(ownerKey);
    if (!lock) return false;

    // Clear the lock before Kill(); OnKill is allowed to call Release again.
    HeldAttackLocks.delete(ownerKey);
    const projectile = projectileAt(lock.index);
    if (!heldLockMatchesProjectile(lock, projectile)) return false;

    try {
        projectile.Kill();
        try { tl.log(`[CalamityPort BrokenBiomeBlade] previous held attack killed; owner=${ownerKey}; index=${lock.index}; type=${lock.type}; reason=${reason}.`); } catch (_) { }
        return true;
    } catch (e) {
        try { projectile.active = false; } catch (_) { }
        try { tl.log(`[CalamityPort BrokenBiomeBlade] previous held attack deactivated fallback; owner=${ownerKey}; index=${lock.index}; reason=${reason}; error=${e}.`); } catch (_) { }
        return true;
    }
}

export function SetBrokenBiomeRightDown(item, player, down, source = '') {
    const s = BrokenBiomeBladeState(item, player);
    s.rightWasDown = s.rightDown;
    s.rightDown = !!down;
    s.inputSource = String(source || '');
    s.lastInputTick = currentTick();
    return s;
}

export function BrokenBiomeRightDown(item, player = null) {
    return BrokenBiomeBladeState(item, player).rightDown === true;
}

export function TryClaimBrokenBiomeHoldout(item, player = null, owner = -1) {
    const ownerKey = Math.floor(N(owner, -1));
    if (ownerKey < 0) return false;
    const tick = currentTick();
    const lock = HoldoutLocks.get(ownerKey);
    if (lock) {
        // Stale-lock escape hatch only. A normal holdout releases from OnKill / early kill.
        if (!(tick >= 0 && lock.startedTick >= 0 && tick - lock.startedTick > 600)) return false;
        HoldoutLocks.delete(ownerKey);
    }
    HoldoutLocks.set(ownerKey, { item: item || null, index: -1, startedTick: tick });
    return true;
}

export function BindBrokenBiomeHoldoutIndex(item, player, owner, index) {
    const ownerKey = Math.floor(N(owner, -1));
    if (ownerKey < 0) return;
    const current = HoldoutLocks.get(ownerKey) || { item: item || null, index: -1, startedTick: -1 };
    current.item = item || current.item || null;
    current.index = Math.floor(N(index, -1));
    current.startedTick = currentTick();
    HoldoutLocks.set(ownerKey, current);
}

export function ReleaseBrokenBiomeHoldout(item, player = null, owner = -1, index = -1) {
    const ownerKey = Math.floor(N(owner, -1));
    if (ownerKey < 0) return;
    const lock = HoldoutLocks.get(ownerKey);
    if (!lock) return;
    const wantedIndex = Math.floor(N(index, -1));
    // Do not let an obsolete projectile release a newer holdout lock.
    if (wantedIndex >= 0 && lock.index >= 0 && wantedIndex !== lock.index) return;
    HoldoutLocks.delete(ownerKey);
}

export function BrokenBiomeHoldoutActive(item, player = null, owner = -1) {
    const ownerKey = Math.floor(N(owner, -1));
    return ownerKey >= 0 && HoldoutLocks.has(ownerKey);
}

export function BrokenBiomeBiomeName(player) {
    const a = AttunementForBiome(player);
    if (a === BrokenBiomeAttunement.AridGrandeur) return 'hot';
    if (a === BrokenBiomeAttunement.BitingEmbrace) return 'cold';
    if (a === BrokenBiomeAttunement.DecaysRetort) return 'evil';
    return 'default';
}

export function IsStandingForAttunement(player) {
    if (!player || player.dead === true || player.active === false) return false;
    try { if (player.mount && player.mount.Active === true) return false; } catch (e) { }
    const velocity = Terraria.PlayerVelocity(player);
    if (Math.abs(N(velocity?.X)) > 0.05 || Math.abs(N(velocity?.Y)) > 0.05) return false;
    try {
        const r = Terraria.PlayerRect(player);
        const pos = Vector2.new(N(r.X) - 3, N(r.Y) + N(r.Height) + 1);
        const solid = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
        if (typeof solid === 'function') return !!solid(pos, Math.max(1, Math.floor(N(r.Width) + 6)), 3);
    } catch (e) { }
    return Math.abs(N(velocity?.Y)) <= 0.05;
}

export function LoadBrokenBiomeBladeStates() {
    PendingBySlot.clear();
    try {
        const raw = PlayerDB.get(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(String(raw));
        if (!Array.isArray(data)) return;
        for (const e of data) {
            const slot = Math.floor(N(e?.slot, -1));
            if (slot < 0 || slot > 58) continue;
            PendingBySlot.set(slot, { main: clampAttune(e?.main), secondary: clampAttune(e?.secondary) });
        }
    } catch (e) { try { tl.log(`[CalamityPort BrokenBiomeBlade] attunement load ignored: ${e}`); } catch (_) { } }
}

export function SaveBrokenBiomeBladeStates(player) {
    if (!player || !(BrokenBiomeBladeType > 0)) return;
    try {
        const owner = ownerIndex(player);
        const arr = inventory(player);
        const out = [];
        for (let slot = 0; slot < arr.length; slot++) {
            const item = arr[slot]; // arr is a plain JS copy, never a NativeObject[index] access.
            if (!item || Math.floor(N(item.type)) !== BrokenBiomeBladeType) continue;
            const key = `${owner}:${slot}`;
            let s = SlotStates.get(key);
            if (!s && PendingBySlot.has(slot)) {
                const saved = PendingBySlot.get(slot) || {};
                s = freshState(owner, slot);
                s.main = clampAttune(saved.main);
                s.secondary = clampAttune(saved.secondary);
            }
            if (!s) s = freshState(owner, slot);
            out.push({ slot, main: clampAttune(s.main), secondary: clampAttune(s.secondary) });
        }
        PlayerDB.set(SAVE_KEY, JSON.stringify(out));
    } catch (e) { try { tl.log(`[CalamityPort BrokenBiomeBlade] attunement save ignored: ${e}`); } catch (_) { } }
}

export function ClearBrokenBiomeBladeRuntime() {
    SlotStates.clear(); FallbackItemStates.clear(); PendingBySlot.clear(); ProjectileSeeds.clear(); HoldoutLocks.clear(); HeldAttackLocks.clear();
}
