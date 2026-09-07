import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { TileData } from './../../TL/Modules/TileData.js';
import {
    GetChestByIndex,
    GetChestItem,
    FillChestByIndex,
    FindChestIndexAt,
    ResolveVanillaItemID
} from './../../Core/OfficialSchematicRuntime.js';
import {
    ReadWorldEvilBiomeChestState,
    EnsureWorldEvilBiomeChestLocked
} from './../../Core/WorldEvilIslandRuntime.js';

// Phase 12.72.5:
// WorldEvilIsland.cs does NOT create a normal surface chest. It deliberately
// asks vanilla Terraria for chest style 19/20 with Scourge/Vampire Knives,
// which are the locked Corruption/Crimson biome chests. On this TLPro build a
// locked biome chest can incorrectly open an EMPTY mobile inventory panel.
// Treating that empty panel as missing loot was therefore wrong.
//
// This system restores the original progression contract:
//   - the island biome chest remains locked before Plantera;
//   - the matching biome key is required;
//   - the key is consumed only when Chest.Unlock succeeds;
//   - the first click unlocks, the next click opens the real chest;
//   - the guaranteed Calamity/vanilla main weapon is repaired only AFTER the
//     chest has legitimately unlocked and only if it is actually missing.

const ROOT = 'calamity:structure:worldEvilIsland:';
const CONTAINERS = 21;
const MAX_ITEMS = 40;

function N(v, f = 0) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : f;
}
function Log(s) {
    try { tl.log(`[CalamityPort WorldEvilIslandChest] ${s}`); } catch (e) { }
}
function Tell(text, r = 220, g = 220, b = 220) {
    try {
        Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'](String(text), r, g, b);
    } catch (e) { }
}
function Player() {
    const index = N(Terraria.Main.myPlayer, -1);
    if (index < 0) return null;
    try { return Terraria.Main.player.get_Item(index); }
    catch (e) {
        try { return Terraria.Main.player[index]; }
        catch (_) { return null; }
    }
}
function Snapshot(chest) {
    const out = [];
    if (!chest) return out;
    for (let i = 0; i < MAX_ITEMS; i++) {
        const item = GetChestItem(chest, i);
        if (!item) continue;
        const type = N(item.type, 0);
        const stack = N(item.stack, 0);
        if (type <= 0 || stack <= 0) continue;
        let prefix = -1;
        try { prefix = N(item.prefix, -1); } catch (e) { prefix = -1; }
        out.push({ type, stack, prefix });
    }
    return out;
}
function MainItemType(kind) {
    // Exact contain values from CalamityMod.World.WorldEvilIsland.cs.
    return kind === 'corruption' ? 1571 : 1569;
}
function KeyItemType(kind) {
    // Vanilla biome keys for the exact chest style selected by Calamity.
    return kind === 'corruption'
        ? ResolveVanillaItemID('CorruptionKey', 1534)
        : ResolveVanillaItemID('CrimsonKey', 1535);
}

function DetectLockedBiomeChestCell(x, y, suppliedType = CONTAINERS) {
    if (N(suppliedType, -1) !== CONTAINERS)
        return null;
    // Normalize arbitrary 2x2 cell -> top-left using the cell's local 18px
    // frame position, then ask the shared runtime for the actual biome chest
    // state. The shared helper understands both unlocked 19/20 and locked
    // 24/25 styles.
    let tile = null;
    try { tile = new TileData(N(x), N(y)); } catch (e) { return null; }
    try {
        if (N(tile.type, -1) !== CONTAINERS)
            return null;
        const frameX = N(tile.frameX, -1);
        const frameY = N(tile.frameY, -1);
        if (frameX < 0 || frameY < 0)
            return null;
        const frameLocalX = ((frameX % 36) + 36) % 36;
        const frameLocalY = ((frameY % 36) + 36) % 36;
        const chestX = N(x) - (frameLocalX >= 18 ? 1 : 0);
        const chestY = N(y) - (frameLocalY >= 18 ? 1 : 0);
        const state = ReadWorldEvilBiomeChestState(chestX, chestY);
        if (!state || !state.recognized || !state.locked)
            return null;
        return {
            index: -1,
            prefix: `${ROOT}detected:${chestX}:${chestY}:`,
            kind: state.kind,
            chestX,
            chestY,
            method: 'locked-biome-style-fallback',
            style: state.style
        };
    } catch (e) {
        return null;
    }
}

function DetectLockedBiomeChestAt(chestX, chestY) {
    return DetectLockedBiomeChestCell(chestX, chestY, CONTAINERS);
}
function MatchingIsland(chestX, chestY) {
    if (WorldDB.get(ROOT + 'generated') === true) {
        const count = Math.max(0, Math.min(2, N(WorldDB.get(ROOT + 'count'), 0)));
        for (let i = 0; i < count; i++) {
            const p = ROOT + i + ':';
            const x = N(WorldDB.get(p + 'chestX'), -1);
            const y = N(WorldDB.get(p + 'chestY'), -1);
            if (x === chestX && y === chestY) {
                return {
                    index: i,
                    prefix: p,
                    kind: String(WorldDB.get(p + 'kind') || ''),
                    chestX: x,
                    chestY: y,
                    method: String(WorldDB.get(p + 'chestMethod') || '')
                };
            }
        }
    }
    return DetectLockedBiomeChestAt(chestX, chestY);
}
function MatchingIslandCell(x, y) {
    if (WorldDB.get(ROOT + 'generated') === true) {
        const count = Math.max(0, Math.min(2, N(WorldDB.get(ROOT + 'count'), 0)));
        for (let i = 0; i < count; i++) {
            const p = ROOT + i + ':';
            const chestX = N(WorldDB.get(p + 'chestX'), -1);
            const chestY = N(WorldDB.get(p + 'chestY'), -1);
            if (chestX < 0 || chestY < 0) continue;
            if (x >= chestX && x < chestX + 2 && y >= chestY && y < chestY + 2) {
                return {
                    index: i,
                    prefix: p,
                    kind: String(WorldDB.get(p + 'kind') || ''),
                    chestX,
                    chestY,
                    method: String(WorldDB.get(p + 'chestMethod') || '')
                };
            }
        }
    }
    return DetectLockedBiomeChestCell(x, y, CONTAINERS);
}
function PlanteraDowned() {
    try { return !!Terraria.NPC.downedPlantBoss; }
    catch (e) { return false; }
}
function TryIsLocked(island) {
    if (!island) return false;

    // Tile frames are authoritative. Do not trust the Phase 12.77 `unlocked`
    // flag first: that build could set it from an already-open style 19/20
    // chest before a real native lock had ever existed.
    const state = ReadWorldEvilBiomeChestState(island.chestX, island.chestY);
    if (state && state.recognized)
        return state.locked === true;

    try {
        const fn = Terraria.Chest['bool IsLocked(int x, int y)'];
        if (typeof fn === 'function')
            return !!fn(island.chestX, island.chestY);
    } catch (e) { }
    try {
        if (typeof Terraria.Chest.IsLocked === 'function')
            return !!Terraria.Chest.IsLocked(island.chestX, island.chestY);
    } catch (e) { }
    return WorldDB.get(island.prefix + 'unlocked') !== true;
}
function TryUnlock(island) {
    let callResult = null;
    try {
        const fn = Terraria.Chest['bool Unlock(int X, int Y)'];
        if (typeof fn === 'function')
            callResult = fn(island.chestX, island.chestY);
    } catch (e) { }
    if (callResult === null) {
        try {
            if (typeof Terraria.Chest.Unlock === 'function')
                callResult = Terraria.Chest.Unlock(island.chestX, island.chestY);
        } catch (e) { }
    }
    // Never consume the biome key solely because the bridge returned truthy.
    // Verify that the locked tile style/state actually changed. This covers
    // TLPro builds where a bridged Unlock call returns success but the tile
    // frame remains locked.
    try { return TryIsLocked(island) === false; }
    catch (e) { return false; }
}
function InventoryItem(player, index) {
    let inv = null;
    try { inv = player.inventory; } catch (e) { return null; }
    if (!inv) return null;
    try {
        if (typeof inv.get_Item === 'function')
            return inv.get_Item(index);
    } catch (e) { }
    try { return inv[index]; } catch (e) { return null; }
}
function FindKeySlot(player, keyType) {
    for (let i = 0; i < 59; i++) {
        const item = InventoryItem(player, i);
        if (!item) continue;
        if (N(item.type, 0) === keyType && N(item.stack, 0) > 0)
            return { index: i, item };
    }
    return null;
}
function ConsumeOne(slot) {
    if (!slot || !slot.item) return false;
    const item = slot.item;
    const stack = N(item.stack, 0);
    if (stack <= 0) return false;
    if (stack > 1) {
        try { item.stack = stack - 1; return true; } catch (e) { return false; }
    }
    try { item['void TurnToAir()'](); return true; } catch (e) { }
    try { item.type = 0; item.stack = 0; return true; } catch (e) { return false; }
}
function CloseChest(player) {
    if (!player) return;
    try { player.chest = -1; } catch (e) { }
}
function EnsureOfficialMainItem(island) {
    let chestIndex = -1;
    try { chestIndex = N(FindChestIndexAt(island.chestX, island.chestY), -1); } catch (e) { chestIndex = -1; }
    if (chestIndex < 0) return { chestIndex: -1, filled: 0, slots: 0, reason: 'missing-chest-entity' };
    const chest = GetChestByIndex(chestIndex);
    if (!chest) return { chestIndex, filled: 0, slots: 0, reason: 'missing-chest-object' };
    const contents = Snapshot(chest);
    const mainType = MainItemType(island.kind);
    if (contents.some(e => N(e.type, 0) === mainType))
        return { chestIndex, filled: 0, slots: contents.length, reason: 'main-item-present' };
    if (contents.length >= MAX_ITEMS)
        return { chestIndex, filled: 0, slots: contents.length, reason: 'full-no-main-item' };
    contents.unshift({ type: mainType, stack: 1, prefix: -1 });
    const filled = FillChestByIndex(chestIndex, contents);
    return { chestIndex, filled, slots: contents.length, reason: filled > 0 ? 'main-item-restored' : 'fill-failed' };
}
function ChestName(kind) {
    return kind === 'corruption' ? 'Corruption Chest' : 'Crimson Chest';
}
function KeyName(kind) {
    return kind === 'corruption' ? 'Corruption Key' : 'Crimson Key';
}

export class WorldEvilIslandChestRepairSystem extends ModSystem {
    constructor() {
        super();
        this.Poll = 10;
        this.LastNotice = 0;
        this.LastForcedIndex = -1;
        this.StyleFallbackLogged = false;
        this.LockAuditDone = false;
        this.FallbackScanIndex = 0;
        this.FallbackFound = 0;
    }
    OnWorldLoad() {
        this.Poll = 10;
        this.LastNotice = 0;
        this.LastForcedIndex = -1;
        this.StyleFallbackLogged = false;
        // Native biome-chest frame state is persisted in the world itself. Once a metadata
        // audit has succeeded, do not wake the 8000-slot fallback scan on later instances.
        this.LockAuditDone = WorldDB.Instance && N(WorldDB.get(ROOT + 'nativeAuditVersion'), 0) >= 1;
        this.FallbackScanIndex = 0;
        this.FallbackFound = 0;
    }
    OnWorldUnload() {
        this.Poll = 10;
        this.LastNotice = 0;
        this.LastForcedIndex = -1;
        this.StyleFallbackLogged = false;
        this.LockAuditDone = false;
        this.FallbackScanIndex = 0;
        this.FallbackFound = 0;
    }
    Notice(text, r = 220, g = 220, b = 220) {
        const now = Date.now();
        if (now - this.LastNotice < 900) return;
        this.LastNotice = now;
        Tell(text, r, g, b);
    }
    NormalizeSavedIsland(prefix, kind, chestX, chestY, source) {
        kind = String(kind || '');
        chestX = N(chestX, -1);
        chestY = N(chestY, -1);
        if ((kind !== 'corruption' && kind !== 'crimson') || chestX < 0 || chestY < 0)
            return false;

        const state = ReadWorldEvilBiomeChestState(chestX, chestY);
        if (!state || !state.recognized || state.kind !== kind) {
            Log(`lock audit skipped unrecognized chest; source=${source}; kind=${kind}; chest=${chestX},${chestY}; style=${state ? state.style : -1}.`);
            return false;
        }

        const version = N(WorldDB.get(prefix + 'lockVersion'), 0);
        const savedUnlocked = WorldDB.get(prefix + 'unlocked') === true;

        // Once v2 has established a real native locked state, an unlocked
        // 19/20 frame seen later is a legitimate vanilla unlock. Never relock it.
        if (!state.locked && version >= 2 && savedUnlocked) {
            Log(`lock audit preserved legitimate unlock; source=${source}; kind=${kind}; chest=${chestX},${chestY}; style=${state.style}.`);
            return true;
        }

        if (state.locked) {
            WorldDB.set(prefix + 'lockVersion', 2);
            WorldDB.set(prefix + 'unlocked', false);
            Log(`lock audit confirmed native locked frame; source=${source}; kind=${kind}; chest=${chestX},${chestY}; style=${state.style}.`);
            return true;
        }

        const result = EnsureWorldEvilBiomeChestLocked(chestX, chestY, kind);
        if (result.ok) {
            WorldDB.set(prefix + 'lockVersion', 2);
            WorldDB.set(prefix + 'unlocked', false);
            Log(`normalized unlocked island chest to native lock; source=${source}; kind=${kind}; chest=${chestX},${chestY}; beforeStyle=${result.before ? result.before.style : -1}; afterStyle=${result.after ? result.after.style : -1}; method=${result.method}.`);
            return true;
        }

        Log(`native lock normalization FAILED; source=${source}; kind=${kind}; chest=${chestX},${chestY}; method=${result.method}.`);
        return false;
    }
    AuditMetadataLocks() {
        if (WorldDB.get(ROOT + 'generated') !== true)
            return false;
        const count = Math.max(0, Math.min(2, N(WorldDB.get(ROOT + 'count'), 0)));
        let touched = 0;
        for (let i = 0; i < count; i++) {
            const prefix = ROOT + i + ':';
            const kind = String(WorldDB.get(prefix + 'kind') || '');
            const chestX = N(WorldDB.get(prefix + 'chestX'), -1);
            const chestY = N(WorldDB.get(prefix + 'chestY'), -1);
            if (this.NormalizeSavedIsland(prefix, kind, chestX, chestY, 'metadata'))
                touched++;
        }
        const ok = count > 0 && touched > 0;
        if (ok)
            WorldDB.set(ROOT + 'nativeAuditVersion', 1);
        // Phase 13.13.0.6 mobile I/O fix:
        // this audit runs on the first in-world update and only mutates Calamity metadata.
        // DatabaseManager.Save() decodes + re-encodes the complete sidecar file and cost ~520 ms
        // on-device in the world-entry profiler. Keep the changes in memory and let the normal
        // PreSaveAndQuit path persist them; chest tile state itself is stored by Terraria.
        Log(`native lock audit complete from metadata; islands=${count}; recognized=${touched}; metadataSave=deferred.`);
        return ok;
    }
    AuditFallbackBatch() {
        const batch = 96;
        const worldSurface = Number(Terraria.Main.worldSurface || 300);
        let processed = 0;
        while (this.FallbackScanIndex < 8000 && processed < batch) {
            const idx = this.FallbackScanIndex++;
            processed++;
            const chest = GetChestByIndex(idx);
            if (!chest) continue;
            const chestX = N(chest.x, -1), chestY = N(chest.y, -1);
            if (chestX < 0 || chestY < 0 || chestY >= worldSurface - 10)
                continue;
            const state = ReadWorldEvilBiomeChestState(chestX, chestY);
            if (!state || !state.recognized)
                continue;
            const expectedMain = MainItemType(state.kind);
            const contents = Snapshot(chest);
            if (!contents.some(e => N(e.type, 0) === expectedMain))
                continue;
            const prefix = `${ROOT}detected:${chestX}:${chestY}:`;
            if (this.NormalizeSavedIsland(prefix, state.kind, chestX, chestY, 'sky-main-item-fallback'))
                this.FallbackFound++;
        }
        if (this.FallbackScanIndex >= 8000) {
            try { WorldDB.Instance.Save(); } catch (e) { }
            Log(`metadata-free native lock audit complete; matchingSkyChests=${this.FallbackFound}.`);
            return true;
        }
        return false;
    }
    EnsureNativeLockAudit() {
        if (this.LockAuditDone || !WorldDB.Instance)
            return;
        if (N(WorldDB.get(ROOT + 'nativeAuditVersion'), 0) >= 1) {
            this.LockAuditDone = true;
            return;
        }

        // Fresh-world worldgen is authoritative in the current TLPro port. The island chest
        // coordinates are persisted by worldgen, so the only allowed gameplay audit is the
        // tiny metadata-based check below. Never fall back to enumerating up to 8000 chest
        // slots in a live world: legacy worlds with missing metadata are intentionally left
        // untouched rather than paying a background recovery cost.
        if (WorldDB.get(ROOT + 'generated') === true)
            this.AuditMetadataLocks();

        this.LockAuditDone = true;
    }
    HandleRightClick(player, i, j, type) {
        if (!WorldDB.Instance || N(type, -1) !== CONTAINERS)
            return null;
        const island = MatchingIslandCell(N(i), N(j));
        if (!island)
            return null;
        if (island.method === 'locked-biome-style-fallback' && !this.StyleFallbackLogged) {
            this.StyleFallbackLogged = true;
            Log(`metadata-independent locked style detected; kind=${island.kind}; style=${N(island.style, -1)}; chest=${island.chestX},${island.chestY}.`);
        }

        const locked = TryIsLocked(island);
        if (!locked) {
            if (WorldDB.get(island.prefix + 'unlocked') !== true) {
                WorldDB.set(island.prefix + 'unlocked', true);
                try { WorldDB.Instance.Save(); } catch (e) { }
            }
            return null;
        }

        // TLPro can open an empty InventoryStorage panel for these still-locked
        // biome chest styles. Cancel that path and reproduce vanilla gating.
        CloseChest(player);

        if (!PlanteraDowned()) {
            this.Notice('This biome chest cannot be opened until Plantera has been defeated.', 220, 120, 160);
            Log(`blocked locked ${island.kind} chest before Plantera; chest=${island.chestX},${island.chestY}.`);
            return false;
        }

        const keyType = KeyItemType(island.kind);
        const keySlot = FindKeySlot(player, keyType);
        if (!keySlot) {
            this.Notice(`${KeyName(island.kind)} required.`, 220, 180, 90);
            Log(`blocked locked ${island.kind} chest without key; keyType=${keyType}; chest=${island.chestX},${island.chestY}.`);
            return false;
        }

        if (!TryUnlock(island)) {
            this.Notice(`${ChestName(island.kind)} could not be unlocked.`, 230, 100, 100);
            Log(`unlock call failed; kind=${island.kind}; chest=${island.chestX},${island.chestY}; keyType=${keyType}.`);
            return false;
        }

        const consumed = ConsumeOne(keySlot);
        const repair = EnsureOfficialMainItem(island);
        WorldDB.set(island.prefix + 'unlocked', true);
        WorldDB.set(island.prefix + 'lockVersion', 1);
        if (repair.reason === 'main-item-present' || repair.filled > 0)
            WorldDB.set(island.prefix + 'lootVersion', 4);
        try { WorldDB.Instance.Save(); } catch (e) { }

        this.Notice(`${ChestName(island.kind)} unlocked. Open it again.`, 120, 230, 150);
        Log(`unlocked=${true}; kind=${island.kind}; chest=${island.chestX},${island.chestY}; keyType=${keyType}; keyConsumed=${consumed}; chestIndex=${repair.chestIndex}; lootSlots=${repair.slots}; fill=${repair.filled}; reason=${repair.reason}.`);
        // Match vanilla interaction cadence: first click consumes the key and
        // unlocks the tile. A second click opens the now-unlocked chest.
        return false;
    }
    Update() {
        if (!WorldDB.Instance)
            return;
        this.EnsureNativeLockAudit();
        if (this.Poll-- > 0)
            return;
        this.Poll = 4;

        const player = Player();
        if (!player)
            return;
        const openIndex = N(player.chest, -1);
        if (openIndex < 0) {
            this.LastForcedIndex = -1;
            return;
        }
        const chest = GetChestByIndex(openIndex);
        if (!chest)
            return;
        const chestX = N(chest.x, -1);
        const chestY = N(chest.y, -1);
        const island = MatchingIsland(chestX, chestY);
        if (!island)
            return;

        if (TryIsLocked(island)) {
            // Safety net for builds where GlobalTile.RightClick runs after the
            // mobile chest UI has already been instantiated.
            CloseChest(player);
            if (this.LastForcedIndex !== openIndex) {
                this.LastForcedIndex = openIndex;
                const phase = PlanteraDowned() ? `needs ${KeyName(island.kind)}` : 'Plantera not defeated';
                Log(`closed TLPro empty locked-chest UI; kind=${island.kind}; index=${openIndex}; chest=${chestX},${chestY}; reason=${phase}.`);
            }
            return;
        }

        this.LastForcedIndex = -1;
        if (N(WorldDB.get(island.prefix + 'lockVersion'), 0) >= 2 && WorldDB.get(island.prefix + 'unlocked') !== true) {
            WorldDB.set(island.prefix + 'unlocked', true);
            try { WorldDB.Instance.Save(); } catch (e) { }
            Log(`native unlock observed after v2 lock normalization; kind=${island.kind}; chest=${chestX},${chestY}.`);
        }
    }
}
