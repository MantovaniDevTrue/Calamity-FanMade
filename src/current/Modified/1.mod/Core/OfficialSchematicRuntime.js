import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';

const KillTile = Terraria.WorldGen['void KillTile(int i, int j, bool fail, bool effectOnly, bool noItem)'];
const TREE_TYPES = new Set([5, 80, 323]);
const CHEST_TILE = 21;
const CHEST_TILE_2 = 467;
const CHEST_TILES = new Set([CHEST_TILE, CHEST_TILE_2]);
const MAX_CHESTS = 1000;
const MAX_CHEST_ITEMS = 40;

// Terraria 1.4.4 vanilla IDs used by the official Calamity Mechanic Shed loot table.
// Named enum access is attempted first; these values keep the TLPro mobile runtime
// compatible when a member is not exported by its NativeClass wrapper.
const MECHANIC_ITEM_IDS = Object.freeze({
    Toolbox: 1923,
    ActuationAccessory: 3624,
    BrickLayer: 2214,
    ExtendoGrip: 2215,
    PaintSprayer: 2216,
    PortableCementMixer: 2217,
    BuilderPotion: 2325,
    GoldCoin: 73
});

function IsActive(tile) {
    try { return tile != null && tile['bool active()']() === true; } catch (e) { return false; }
}
function SetActive(tile, value) {
    tile['void active(bool active)'](value === true);
}
function Bit(value, index) { return ((Number(value) >>> index) & 1) !== 0; }
function Unpack(value, start, width) { return (Number(value) >>> start) & ((1 << width) - 1); }
function TryCall(target, signature, value) {
    try { target[signature](value); return true; } catch (e) { return false; }
}
function InWorld(x, y) {
    return x >= 2 && y >= 2 && x < Number(Terraria.Main.maxTilesX) - 2 && y < Number(Terraria.Main.maxTilesY) - 2;
}
function Log(message) {
    try { tl.log(`[CalamityPort OfficialSchematics] ${message}`); } catch (e) { }
}

function NativeAt(collection, index, typedSignature = '') {
    if (!collection)
        return null;
    index = Math.floor(Number(index));
    if (!Number.isFinite(index) || index < 0)
        return null;

    // TLPro exposes Terraria's true native arrays (Main.npc, Main.projectile,
    // Main.chest and Chest.item) most reliably through direct array indexing.
    try {
        const direct = collection[index];
        if (direct != null)
            return direct;
    } catch (e) { }
    try {
        if (typeof collection.get_Item === 'function') {
            const value = collection.get_Item(index);
            if (value != null)
                return value;
        }
    } catch (e) { }
    if (typedSignature) {
        try {
            const getter = collection[typedSignature];
            if (typeof getter === 'function') {
                const value = getter(index);
                if (value != null)
                    return value;
            }
        } catch (e) { }
    }
    return null;
}

function NativeSetAt(collection, index, value, typedSignature = '') {
    if (!collection)
        return false;
    index = Math.floor(Number(index));
    if (!Number.isFinite(index) || index < 0)
        return false;
    try {
        collection[index] = value;
        const check = collection[index];
        if (check != null)
            return true;
    } catch (e) { }
    try {
        if (typeof collection.set_Item === 'function') {
            collection.set_Item(index, value);
            return true;
        }
    } catch (e) { }
    if (typedSignature) {
        try {
            const setter = collection[typedSignature];
            if (typeof setter === 'function') {
                setter(index, value);
                return true;
            }
        } catch (e) { }
    }
    return false;
}

export function GetChestByIndex(index) {
    return NativeAt(Terraria.Main.chest, index, 'Chest get_Item(int index)');
}

export function GetChestItem(chest, index) {
    if (!chest)
        return null;
    let items = null;
    try { items = chest.item; } catch (e) { }
    return NativeAt(items, index, 'Item get_Item(int index)');
}

function EnsureChestItem(chest, index) {
    let item = GetChestItem(chest, index);
    if (item)
        return item;
    let items = null;
    try { items = chest.item; } catch (e) { }
    if (!items)
        return null;
    try { item = Terraria.Item.new(); } catch (e) { item = null; }
    if (!item)
        return null;
    if (!NativeSetAt(items, index, item, 'void set_Item(int index, Item value)'))
        return null;
    return GetChestItem(chest, index) || item;
}

export function ResolveVanillaItemID(name, fallback) {
    try {
        const value = Number(Terraria.ID.ItemID[name]);
        if (Number.isFinite(value) && value > 0)
            return value;
    } catch (e) { }
    return Number(fallback) || 0;
}

function CreateChestItem(type, stack = 1, prefix = -1) {
    type = Math.floor(Number(type) || 0);
    if (!(type > 0))
        return null;
    let item = null;
    try {
        item = Terraria.Item.new();
        item['void .ctor()']();
        item['void SetDefaults(int Type, ItemVariant variant)'](type, null);
        item.stack = Math.max(1, Math.floor(Number(stack) || 1));
        if (prefix != null) {
            try { item['bool Prefix(int prefixWeWant)'](Math.floor(Number(prefix))); } catch (e) { }
        }
    } catch (e) {
        return null;
    }
    return Number(item.type) === type && Number(item.stack) > 0 ? item : null;
}

export function FillChestByIndex(chestIndex, contents) {
    chestIndex = Math.floor(Number(chestIndex));
    if (!Number.isFinite(chestIndex) || chestIndex < 0 || !Array.isArray(contents))
        return 0;

    let storage = null;
    try {
        storage = Terraria.InventoryStorage.new();
        storage['void .ctor(int chest)'](chestIndex);
    } catch (e) {
        Log(`InventoryStorage construction failed for chest ${chestIndex}: ${e}.`);
        return 0;
    }

    let filled = 0;
    for (let i = 0; i < contents.length && i < MAX_CHEST_ITEMS; i++) {
        const entry = contents[i];
        const type = Array.isArray(entry) ? entry[0] : entry?.type;
        const stack = Array.isArray(entry) ? entry[1] : entry?.stack;
        const prefix = Array.isArray(entry) ? (entry.length >= 3 ? entry[2] : -1) : (entry?.prefix === undefined ? -1 : entry.prefix);
        const item = CreateChestItem(type, stack, prefix);
        if (!item)
            continue;
        try {
            storage.item[i] = item;
            filled++;
        } catch (e) {
            Log(`InventoryStorage slot ${i} write failed for chest ${chestIndex}: ${e}.`);
        }
    }

    try {
        storage.SyncToChest();
    } catch (e) {
        Log(`InventoryStorage.SyncToChest failed for chest ${chestIndex}: ${e}.`);
        return 0;
    }
    return filled;
}

export function EnsureChestAt(x, y) {
    x = Math.floor(Number(x));
    y = Math.floor(Number(y));
    let chestIndex = FindChestIndexAt(x, y);
    let created = false;
    if (chestIndex < 0) {
        try {
            chestIndex = Number(Terraria.Chest['int CreateChest(int X, int Y, int id)'](x, y, -1));
            created = chestIndex >= 0;
        } catch (e) {
            chestIndex = -1;
        }
    }
    return { chestIndex, created };
}

export function FillMechanicChestByIndex(chestIndex) {
    const gizmos = [
        ResolveVanillaItemID('BrickLayer', MECHANIC_ITEM_IDS.BrickLayer),
        ResolveVanillaItemID('ExtendoGrip', MECHANIC_ITEM_IDS.ExtendoGrip),
        ResolveVanillaItemID('PaintSprayer', MECHANIC_ITEM_IDS.PaintSprayer),
        ResolveVanillaItemID('PortableCementMixer', MECHANIC_ITEM_IDS.PortableCementMixer)
    ];
    return FillChestByIndex(chestIndex, [
        [ResolveVanillaItemID('Toolbox', MECHANIC_ITEM_IDS.Toolbox), 1],
        [ResolveVanillaItemID('ActuationAccessory', MECHANIC_ITEM_IDS.ActuationAccessory), 1],
        [gizmos[WorldGenRand.NextInt(0, gizmos.length)], 1],
        [ResolveVanillaItemID('BuilderPotion', MECHANIC_ITEM_IDS.BuilderPotion), WorldGenRand.NextInt(1, 3)],
        [ResolveVanillaItemID('GoldCoin', MECHANIC_ITEM_IDS.GoldCoin), WorldGenRand.NextInt(1, 3)]
    ]);
}

function Decode(entry) {
    const packed = Number(entry[6]) >>> 0;
    return {
        tile: Number(entry[0]) || 0,
        wall: Number(entry[1]) || 0,
        liquid: Number(entry[2]) || 0,
        liquidType: Number(entry[3]) || 0,
        frameX: Number(entry[4]) || 0,
        frameY: Number(entry[5]) || 0,
        hasTile: Bit(packed, 0),
        isActuated: Bit(packed, 1),
        hasActuator: Bit(packed, 2),
        tileColor: Unpack(packed, 3, 5),
        wallColor: Unpack(packed, 8, 5),
        tileFrameNumber: Unpack(packed, 13, 2),
        wallFrameNumber: Unpack(packed, 15, 2),
        wallFrameX: Unpack(packed, 17, 4),
        wallFrameY: Unpack(packed, 21, 3),
        halfBlock: Bit(packed, 24),
        slope: Unpack(packed, 25, 3),
        wireData: Unpack(packed, 28, 4),
        keepTile: Number(entry[7]) === 1,
        keepWall: Number(entry[8]) === 1
    };
}

const DecodedPaletteCache = new WeakMap();
function GetDecodedPalette(schematic) {
    let cached = DecodedPaletteCache.get(schematic);
    if (cached) return cached;
    cached = schematic.palette.map(Decode);
    DecodedPaletteCache.set(schematic, cached);
    return cached;
}

function ApplyWallState(tile, meta) {
    if (meta.keepWall)
        return;
    tile.wall = meta.wall;
    TryCall(tile, 'void wallColor(byte wallColor)', meta.wallColor);
    TryCall(tile, 'void wallFrameNumber(byte wallFrameNumber)', meta.wallFrameNumber);
    TryCall(tile, 'void wallFrameX(int wallFrameX)', meta.wallFrameX);
    TryCall(tile, 'void wallFrameY(int wallFrameY)', meta.wallFrameY);
}

function ApplyTileState(tile, meta) {
    if (meta.keepTile)
        return;
    SetActive(tile, meta.hasTile);
    tile.type = meta.tile;
    tile.frameX = meta.frameX;
    tile.frameY = meta.frameY;
    tile.liquid = meta.liquid;
    TryCall(tile, 'void liquidType(int liquidType)', meta.liquidType);
    TryCall(tile, 'void halfBrick(bool halfBrick)', meta.halfBlock);
    TryCall(tile, 'void slope(byte slope)', meta.slope);
    TryCall(tile, 'void color(byte color)', meta.tileColor);
    TryCall(tile, 'void frameNumber(byte frameNumber)', meta.tileFrameNumber);
    TryCall(tile, 'void actuator(bool actuator)', meta.hasActuator);
    TryCall(tile, 'void inActive(bool inActive)', meta.isActuated);
    TryCall(tile, 'void wire(bool wire)', (meta.wireData & 1) !== 0);
    TryCall(tile, 'void wire2(bool wire2)', (meta.wireData & 2) !== 0);
    TryCall(tile, 'void wire3(bool wire3)', (meta.wireData & 4) !== 0);
    TryCall(tile, 'void wire4(bool wire4)', (meta.wireData & 8) !== 0);
}

function ClearTargetCell(x, y, meta) {
    if (meta.keepTile)
        return;
    const tile = Terraria.Main.tile.get_Item(x, y);
    if (!tile || !IsActive(tile))
        return;
    if (CHEST_TILES.has(Number(tile.type)))
        return;
    try { KillTile(x, y, false, false, true); }
    catch (e) { try { SetActive(tile, false); } catch (_) { } }
}

function ClearTrees(schematic, cornerX, cornerY) {
    for (let y = 0; y < schematic.height; y++) {
        for (let x = 0; x < schematic.width; x++) {
            const worldX = cornerX + x, worldY = cornerY + y;
            const tile = Terraria.Main.tile.get_Item(worldX, worldY);
            if (tile && IsActive(tile) && TREE_TYPES.has(Number(tile.type))) {
                try { KillTile(worldX, worldY, false, false, true); } catch (e) { }
            }
        }
    }
}

function FillItem(item, type, stack) {
    type = Math.floor(Number(type) || 0);
    if (!item || !(type > 0))
        return false;
    let defaultsApplied = false;
    try {
        if (typeof item.SetDefaults === 'function') {
            item.SetDefaults(type);
            defaultsApplied = true;
        }
    } catch (e) { }
    if (!defaultsApplied) {
        try {
            item['void SetDefaults(int Type)'](type);
            defaultsApplied = true;
        } catch (e) { }
    }
    if (!defaultsApplied) {
        try {
            item['void SetDefaults(int Type, ItemVariant variant)'](type, null);
            defaultsApplied = true;
        } catch (e) { }
    }
    if (!defaultsApplied)
        return false;
    try {
        if (typeof item.Prefix === 'function') item.Prefix(-1);
        else item['bool Prefix(int prefixWeWant)'](-1);
    } catch (e) { }
    try { item.stack = Math.max(1, Math.floor(Number(stack) || 1)); }
    catch (e) { return false; }
    return Number(item.type) === type && Number(item.stack) > 0;
}

export function IsChestEmpty(chest) {
    if (!chest)
        return true;
    for (let i = 0; i < MAX_CHEST_ITEMS; i++) {
        const item = GetChestItem(chest, i);
        if (item && Number(item.type) > 0 && Number(item.stack) > 0)
            return false;
    }
    return true;
}

export function FillMechanicChest(chest) {
    if (!chest)
        return 0;
    const x = Math.floor(Number(chest.x));
    const y = Math.floor(Number(chest.y));
    if (!Number.isFinite(x) || !Number.isFinite(y))
        return 0;
    const chestIndex = FindChestIndexAt(x, y);
    return chestIndex >= 0 ? FillMechanicChestByIndex(chestIndex) : 0;
}

export function FindChestIndexAt(x, y) {
    x = Math.floor(Number(x));
    y = Math.floor(Number(y));
    if (!Number.isFinite(x) || !Number.isFinite(y))
        return -1;
    try { return Number(Terraria.Chest['int FindChest(int X, int Y)'](x, y)); } catch (e) { return -1; }
}

export function EnsureAndFillMechanicChest(x, y, onlyIfEmpty = true) {
    x = Math.floor(Number(x));
    y = Math.floor(Number(y));
    const ensured = EnsureChestAt(x, y);
    const chestIndex = ensured.chestIndex;
    if (chestIndex < 0)
        return { success: false, chestIndex: -1, created: ensured.created, filled: 0, reason: 'chest-registration-failed' };
    const chest = GetChestByIndex(chestIndex);
    if (!chest)
        return { success: false, chestIndex, created: ensured.created, filled: 0, reason: 'native-chest-access-failed' };
    if (onlyIfEmpty && !IsChestEmpty(chest))
        return { success: true, chestIndex, created: ensured.created, filled: 0, reason: 'already-has-items' };
    const filled = FillMechanicChestByIndex(chestIndex);
    return { success: filled === 5, chestIndex, created: ensured.created, filled, reason: filled === 5 ? 'filled' : 'partial-fill' };
}

export function IsMechanicShedChestPosition(x, y) {
    x = Math.floor(Number(x));
    y = Math.floor(Number(y));
    if (!InWorld(x, y) || !InWorld(x - 3, y + 1) || !InWorld(x + 3, y + 1))
        return false;
    try {
        const chestTile = Terraria.Main.tile.get_Item(x, y);
        if (!chestTile || !IsActive(chestTile) || Number(chestTile.type) !== CHEST_TILE)
            return false;
        if (Number(chestTile.frameX) !== 396 || Number(chestTile.frameY) !== 0 || Number(chestTile.wall) !== 231)
            return false;
        const lamp = Terraria.Main.tile.get_Item(x - 2, y);
        const left0 = Terraria.Main.tile.get_Item(x - 3, y + 1);
        const left1 = Terraria.Main.tile.get_Item(x - 2, y + 1);
        const left2 = Terraria.Main.tile.get_Item(x - 1, y + 1);
        return !!(
            lamp && IsActive(lamp) && Number(lamp.type) === 42 && Number(lamp.frameY) === 666 &&
            left0 && IsActive(left0) && Number(left0.type) === 283 && Number(left0.frameX) === 0 && Number(left0.frameY) === 0 &&
            left1 && IsActive(left1) && Number(left1.type) === 283 && Number(left1.frameX) === 18 && Number(left1.frameY) === 0 &&
            left2 && IsActive(left2) && Number(left2.type) === 283 && Number(left2.frameX) === 36 && Number(left2.frameY) === 0
        );
    } catch (e) {
        return false;
    }
}

export function FindExistingMechanicShedChest() {
    for (let i = 0; i < MAX_CHESTS; i++) {
        const chest = GetChestByIndex(i);
        if (!chest)
            continue;
        const x = Math.floor(Number(chest.x));
        const y = Math.floor(Number(chest.y));
        if (Number.isFinite(x) && Number.isFinite(y) && IsMechanicShedChestPosition(x, y))
            return { chestIndex: i, chest, x, y };
    }
    return null;
}

export const OfficialSchematicRuntime = {
    AnchorToCorner(schematic, point, anchor) {
        let x = Math.floor(Number(point.x) || 0), y = Math.floor(Number(point.y) || 0);
        if (anchor === 'topCenter' || anchor === 'center' || anchor === 'bottomCenter') x -= Math.floor(schematic.width / 2);
        else if (anchor === 'topRight' || anchor === 'centerRight' || anchor === 'bottomRight') x -= schematic.width;
        if (anchor === 'centerLeft' || anchor === 'center' || anchor === 'centerRight') y -= Math.floor(schematic.height / 2);
        else if (anchor === 'bottomLeft' || anchor === 'bottomCenter' || anchor === 'bottomRight') y -= schematic.height;
        return { x, y };
    },

    Place(schematic, point, anchor = 'topLeft', fillChest = null, protectionPadding = 0, ignoreReservedOverlap = false, singlePassWorldgen = false) {
        const corner = this.AnchorToCorner(schematic, point, anchor);
        const rect = { left: corner.x, top: corner.y, right: corner.x + schematic.width, bottom: corner.y + schematic.height };
        if (!InWorld(rect.left, rect.top) || !InWorld(rect.right, rect.bottom))
            return { generated: false, reason: 'out-of-world', ...rect };
        if (ignoreReservedOverlap !== true && !OfficialStructureMap.CanPlace(rect, protectionPadding))
            return { generated: false, reason: 'reserved-overlap', ...rect };

        const decodedPalette = GetDecodedPalette(schematic);
        const writeStarted = Date.now();
        const chestMarkers = [];

        if (singlePassWorldgen === true) {
            // v25 mobile worldgen fast path: the old placer crossed the JS->IL2CPP Main.tile
            // bridge three times for every schematic cell (tree clear, target clear, final
            // write). Vernal Pass is 57k+ cells, so those redundant reads dominate its time.
            // Keep one native Tile wrapper while preserving those three operations per cell.
            for (let y = 0; y < schematic.height; y++) {
                const row = schematic.rows[y];
                for (let x = 0; x < schematic.width; x++) {
                    const meta = decodedPalette[row[x]];
                    const worldX = corner.x + x, worldY = corner.y + y;
                    const tile = Terraria.Main.tile.get_Item(worldX, worldY);
                    if (!tile) continue;

                    if (IsActive(tile) && TREE_TYPES.has(Number(tile.type))) {
                        try { KillTile(worldX, worldY, false, false, true); } catch (e) { }
                    }
                    if (!meta.keepTile && IsActive(tile) && !CHEST_TILES.has(Number(tile.type))) {
                        try { KillTile(worldX, worldY, false, false, true); }
                        catch (e) { try { SetActive(tile, false); } catch (_) { } }
                    }

                    ApplyTileState(tile, meta);
                    ApplyWallState(tile, meta);
                    if (!meta.keepTile && meta.hasTile && CHEST_TILES.has(meta.tile) && meta.frameX % 36 === 0 && meta.frameY === 0)
                        chestMarkers.push({ x: worldX, y: worldY });
                }
            }
        } else {
            // Stable legacy path remains byte-for-byte in behavior for every other schematic.
            ClearTrees(schematic, corner.x, corner.y);
            for (let y = 0; y < schematic.height; y++)
                for (let x = 0; x < schematic.width; x++)
                    ClearTargetCell(corner.x + x, corner.y + y, decodedPalette[schematic.rows[y][x]]);

            for (let y = 0; y < schematic.height; y++) {
                for (let x = 0; x < schematic.width; x++) {
                    const meta = decodedPalette[schematic.rows[y][x]];
                    const worldX = corner.x + x, worldY = corner.y + y;
                    const tile = Terraria.Main.tile.get_Item(worldX, worldY);
                    ApplyTileState(tile, meta);
                    ApplyWallState(tile, meta);
                    if (!meta.keepTile && meta.hasTile && CHEST_TILES.has(meta.tile) && meta.frameX % 36 === 0 && meta.frameY === 0)
                        chestMarkers.push({ x: worldX, y: worldY });
                }
            }
        }
        const writeMs = Date.now() - writeStarted;
        const chestStarted = Date.now();

        // Chest entities are registered only after all four chest tiles have been written.
        // This mirrors the completed-object state expected by Terraria's chest registry.
        let chestCount = 0;
        let chestFilledSlots = 0;
        let chestX = -1, chestY = -1;
        for (const marker of chestMarkers) {
            const ensured = EnsureChestAt(marker.x, marker.y);
            let filled = 0;
            let reason = ensured.chestIndex >= 0 ? 'registered' : 'chest-registration-failed';
            if (ensured.chestIndex >= 0 && typeof fillChest === 'function') {
                try {
                    filled = Math.max(0, Math.floor(Number(fillChest(ensured.chestIndex, marker)) || 0));
                    reason = filled > 0 ? 'filled' : 'fill-returned-zero';
                } catch (e) {
                    reason = `fill-error:${e}`;
                }
            }
            if (ensured.chestIndex >= 0) {
                chestCount++;
                chestFilledSlots += filled;
                chestX = marker.x;
                chestY = marker.y;
            }
            Log(`chest marker ${marker.x},${marker.y}: index=${ensured.chestIndex}, created=${ensured.created}, filled=${filled}, reason=${reason}.`);
        }
        const chestMs = Date.now() - chestStarted;
        OfficialStructureMap.Reserve(schematic.name, rect, protectionPadding);
        return {
            generated: true,
            ...rect,
            width: schematic.width,
            height: schematic.height,
            chestCount,
            chestMarkerCount: chestMarkers.length,
            chestFilledSlots,
            chestX,
            chestY,
            protectionPadding,
            writeMs,
            chestMs
        };
    }
};
