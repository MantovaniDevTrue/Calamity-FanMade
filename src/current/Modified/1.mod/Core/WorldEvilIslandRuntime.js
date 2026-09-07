import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { GetChestByIndex, GetChestItem, FillChestByIndex, FindChestIndexAt } from './OfficialSchematicRuntime.js';

// Literal TLPro port of CalamityMod.World.WorldEvilIsland.
// Source: World/WorldEvilIsland.cs. All numeric ranges, vanilla tile/wall IDs,
// house furniture styles, chest main items, placement bands and special-seed
// behavior are kept from the original implementation.

const CLOUD = 189;
const RAIN_CLOUD = 196;
const SNOW_CLOUD = 202;
const EBONSTONE = 22;
const CRIMSTONE = 204;
const CORRUPT_HARDENED_SAND = 398;
const CRIMSON_HARDENED_SAND = 399;
const CORRUPT_SANDSTONE = 400;
const CRIMSON_SANDSTONE = 401;
const EBONWOOD = 152;
const SHADEWOOD = 347;
const CORRUPTION_UNSAFE_WALL = 35;
const CRIMSON_UNSAFE_WALL = 174;
const WINDOW_WALL = 21;
const CONTAINERS = 21;

const UNLOCKED_CORRUPTION_STYLE = 19;
const UNLOCKED_CRIMSON_STYLE = 20;
const LOCKED_CORRUPTION_STYLE = 24;
const LOCKED_CRIMSON_STYLE = 25;
const BIOME_LOCK_STYLE_SHIFT = 5 * 36;

function FrameXAt(x, y) {
    if (!InWorld(x, y)) return -1;
    try {
        const index = y * N(Terraria.Main.maxTilesX, 4200) + x;
        return N(Terraria.TileData['short GetFrameX(int tileIndex)'](index), -1);
    } catch (e) { return -1; }
}
function SetFrameXAt(x, y, value) {
    if (!InWorld(x, y)) return false;
    try {
        const index = y * N(Terraria.Main.maxTilesX, 4200) + x;
        Terraria.TileData['void SetFrameX(int tileIndex, short frameX)'](index, N(value));
        return true;
    } catch (e) { return false; }
}
export function ReadWorldEvilBiomeChestState(chestX, chestY) {
    chestX = N(chestX, -1);
    chestY = N(chestY, -1);
    if (!InWorld(chestX, chestY) || TileTypeFast(chestX, chestY) !== CONTAINERS)
        return null;
    const frameX = FrameXAt(chestX, chestY);
    if (frameX < 0) return null;
    const style = Math.floor(frameX / 36);
    let kind = '';
    let locked = false;
    if (style === UNLOCKED_CORRUPTION_STYLE) kind = 'corruption';
    else if (style === UNLOCKED_CRIMSON_STYLE) kind = 'crimson';
    else if (style === LOCKED_CORRUPTION_STYLE) { kind = 'corruption'; locked = true; }
    else if (style === LOCKED_CRIMSON_STYLE) { kind = 'crimson'; locked = true; }
    else return { chestX, chestY, style, kind:'', locked:false, recognized:false };
    return { chestX, chestY, style, kind, locked, recognized:true };
}
export function EnsureWorldEvilBiomeChestLocked(chestX, chestY, kind) {
    chestX = N(chestX, -1);
    chestY = N(chestY, -1);
    kind = String(kind || '');
    let before = ReadWorldEvilBiomeChestState(chestX, chestY);
    if (!before || !before.recognized)
        return { ok:false, changed:false, method:'unrecognized', before, after:before };
    if (kind && before.kind !== kind)
        return { ok:false, changed:false, method:'kind-mismatch', before, after:before };
    if (before.locked)
        return { ok:true, changed:false, method:'already-locked', before, after:before };

    // Prefer Terraria's own lock routine. It knows the exact vanilla
    // unlocked->locked biome chest frame mapping and keeps us aligned with
    // native interaction logic on Android.
    try {
        const lock = Terraria.Chest['bool Lock(int X, int Y)'];
        if (typeof lock === 'function')
            lock(chestX, chestY);
    } catch (e) { }

    let after = ReadWorldEvilBiomeChestState(chestX, chestY);
    if (after && after.recognized && after.locked && after.kind === before.kind)
        return { ok:true, changed:true, method:'Chest.Lock', before, after };

    // Some TLPro builds expose Chest.Lock but do not write the packed tile
    // frames back. Fallback to the exact vanilla frame delta: unlocked styles
    // 19/20 -> locked styles 24/25, a +5*36 shift on all four 2x2 cells.
    let writes = 0;
    for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 2; dy++) {
            const x = chestX + dx, y = chestY + dy;
            if (TileTypeFast(x, y) !== CONTAINERS) continue;
            const fx = FrameXAt(x, y);
            if (fx < 0) continue;
            const style = Math.floor(fx / 36);
            const expectedUnlocked = before.kind === 'corruption'
                ? UNLOCKED_CORRUPTION_STYLE
                : UNLOCKED_CRIMSON_STYLE;
            if (style !== expectedUnlocked) continue;
            if (SetFrameXAt(x, y, fx + BIOME_LOCK_STYLE_SHIFT))
                writes++;
        }
    }
    after = ReadWorldEvilBiomeChestState(chestX, chestY);
    const ok = !!after && after.recognized && after.locked && after.kind === before.kind;
    return { ok, changed:ok && writes > 0, method:ok ? 'TileData-frame-lock' : 'lock-failed', writes, before, after };
}

const PlaceTile = Terraria.WorldGen['bool PlaceTile(int i, int j, int Type, bool mute, bool forced, int plr, int style)'];
const PlaceChest = Terraria.WorldGen['int PlaceChest(int x, int y, ushort type, bool notNearOtherChests, int style)'];

function N(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Trunc(v) { return v < 0 ? Math.ceil(v) : Math.floor(v); }
function Clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function Log(s) { try { tl.log(`[CalamityPort WorldEvilIsland] ${s}`); } catch (e) { } }
function InWorld(x, y) { return x >= 2 && y >= 2 && x < N(Terraria.Main.maxTilesX, 4200) - 2 && y < N(Terraria.Main.maxTilesY, 1200) - 2; }
function Tile(x, y) { if (!InWorld(x, y)) return null; try { return Terraria.Main.tile.get_Item(x, y); } catch (e) { try { return Terraria.Main.tile[x][y]; } catch (_) { return null; } } }
function Active(t) { try { return !!t && t['bool active()']() === true; } catch (e) { try { return !!t && t.active === true; } catch (_) { return false; } } }
function SetActive(t, v) { if (!t) return; try { t['void active(bool active)'](v === true); return; } catch (e) { } try { t.active = v === true; } catch (e) { } }
function SetHalf(t, v) { if (!t) return; try { t['void halfBrick(bool halfBrick)'](v === true); } catch (e) { } }
function SetSlope(t, v) { if (!t) return; try { t['void slope(byte slope)'](N(v)); } catch (e) { } }
function SetColor(t, v) { if (!t) return; try { t['void color(byte color)'](N(v)); } catch (e) { } }
function SetLiquidType(t, v) { if (!t) return; try { t['void liquidType(int liquidType)'](N(v)); } catch (e) { } }
function TileTypeFast(x, y) {
    if (!InWorld(x, y)) return -1;
    try { return N(Terraria.TileData['ushort GetType(int tileIndex)'](y * N(Terraria.Main.maxTilesX, 4200) + x), -1); } catch (e) { }
    const t = Tile(x, y); return t ? N(t.type, -1) : -1;
}
function SetTerrainTile(x, y, type) {
    const t = Tile(x, y); if (!t) return false;
    SetActive(t, true); t.type = N(type); return true;
}
function ClearTile(x, y) { const t = Tile(x, y); if (!t) return false; SetActive(t, false); return true; }
function SetHouseTile(x, y, type, wall = 0) {
    const t = Tile(x, y); if (!t) return false;
    SetActive(t, true); t.type = N(type); t.wall = N(wall); t.liquid = 0; SetLiquidType(t, 0); SetHalf(t, false); SetSlope(t, 0); return true;
}
function SetHouseAirWall(x, y, wall) {
    const t = Tile(x, y); if (!t) return false;
    SetActive(t, false); t.wall = N(wall); t.liquid = 0; SetLiquidType(t, 0); SetHalf(t, false); SetSlope(t, 0); return true;
}
function LerpValue(a, b, value) { if (a === b) return 0; return Clamp((value - a) / (b - a), 0, 1); }
function Convert01To010(v) { return Math.sin(Math.PI * Clamp(v, 0, 1)); }
function AperiodicSin(x, dx = 0, a = Math.PI, b = Math.E) { return (Math.sin(x * a + dx) + Math.sin(x * b + dx)) * 0.5; }

// Exact point-union equivalent of Calamity's CustomShapes.DistortedCircle.
// Native writes are deduplicated; repeated UnitApply calls in the C# source
// only re-apply the same SetTile action and therefore do not alter final state.
function DistortedCircle(cx, cy, radius, distortionFactor, action) {
    const offsetAngle = WorldGenRand.NextFloat(-10, 10);
    const maxX = N(Terraria.Main.maxTilesX, 4200);
    const points = new Map();
    for (let angle = 0; angle < 6.2831855; angle += 0.026389377) {
        const distortionQuantity = AperiodicSin(angle, offsetAngle, 1.5707964, 1.3591409) * distortionFactor;
        const currentRadius = Trunc(radius - distortionQuantity * radius);
        if (currentRadius <= 0) continue;
        const horizontalOffset = Trunc(Math.cos(angle) * currentRadius);
        const verticalOffset = Trunc(Math.sin(angle) * currentRadius);
        if (horizontalOffset === 0 || verticalOffset === 0) continue;
        const sx = Math.sign(horizontalOffset), sy = Math.sign(verticalOffset);
        for (let dx = 0; dx !== horizontalOffset; dx += sx) {
            for (let dy = 0; dy !== verticalOffset; dy += sy) {
                const x = cx + dx, y = cy + dy;
                if (!InWorld(x, y)) continue;
                const key = y * maxX + x;
                if (!points.has(key)) points.set(key, [x, y]);
            }
        }
    }
    for (const p of points.values()) action(p[0], p[1]);
    return points.size;
}

function Circle(cx, cy, rx, ry, action) {
    rx = Math.max(1, N(rx)); ry = Math.max(1, N(ry));
    let count = 0;
    const rx2 = rx * rx, ry2 = ry * ry, rhs = rx2 * ry2;
    for (let dx = -rx; dx <= rx; dx++) {
        for (let dy = -ry; dy <= ry; dy++) {
            if (dx * dx * ry2 + dy * dy * rx2 > rhs) continue;
            if (action(cx + dx, cy + dy) !== false) count++;
        }
    }
    return count;
}

function RandomCircular(rx, ry) {
    try {
        const v = WorldGenRand.NextVector2Circular(rx, ry);
        return { x: Number(v.X) || 0, y: Number(v.Y) || 0 };
    } catch (e) {
        const a = WorldGenRand.NextFloat(0, Math.PI * 2);
        const r = Math.sqrt(WorldGenRand.NextFloat(0, 1));
        return { x: Math.cos(a) * rx * r, y: Math.sin(a) * ry * r };
    }
}

function WorldSurfaceLow() {
    try {
        const n = Math.floor(Number(Terraria.WorldBuilding.GenVars.worldSurfaceLow));
        if (Number.isFinite(n) && n > 0) return n;
    } catch (e) { }
    return Math.floor(Number(Terraria.Main.worldSurface) || 250);
}
function IsDrunkWorldGen() { try { if (Terraria.WorldGen.drunkWorldGen === true) return true; } catch (e) { } try { return Terraria.Main.drunkWorld === true; } catch (e) { return false; } }
function IsCrimsonWorld() { try { return Terraria.WorldGen.crimson === true; } catch (e) { return false; } }

function SkyAreaClear(centerX, centerY) {
    const left = centerX - 80, top = centerY - 45;
    for (let x = left; x < left + 160; x++) {
        for (let y = top; y < top + 90; y++) {
            const type = TileTypeFast(x, y);
            if (type === CLOUD || type === RAIN_CLOUD || type === SNOW_CLOUD) return false;
        }
    }
    return true;
}

function FindPlacement(minRatio, maxRatio, direction) {
    const maxX = N(Terraria.Main.maxTilesX, 4200);
    const capY = WorldSurfaceLow() - 50;
    for (let attempt = 1; attempt <= 1000; attempt++) {
        let x = WorldGenRand.NextInt(Math.floor(maxX * minRatio), Math.floor(maxX * maxRatio));
        let y = WorldGenRand.NextInt(95, 126);
        y = Math.min(y, capY);
        if (!InWorld(x - 80, y - 45) || !InWorld(x + 79, y + 44)) continue;
        if (!SkyAreaClear(x, y)) continue;
        let shift = 0;
        while (shift < 320) {
            const t = Tile(x, y);
            if (!t || !Active(t)) break;
            x += direction;
            shift++;
            if (!InWorld(x, y)) break;
        }
        if (!InWorld(x - 116, y - 20) || !InWorld(x + 115, y + 60)) continue;
        return { found: true, x, y, attempts: attempt, shift };
    }
    return { found: false, reason: 'no-clear-sky-area', attempts: 1000 };
}

function FindChestInBounds(left, top, right, bottom) {
    for (let index = 0; index < 1000; index++) {
        const c = GetChestByIndex(index);
        if (!c) continue;
        const x = N(c.x, -1), y = N(c.y, -1);
        if (x >= left && x <= right && y >= top && y <= bottom) return { index, x, y };
    }
    return { index: -1, x: -1, y: -1 };
}


function SnapshotChestContents(chest) {
    const contents = [];
    if (!chest) return contents;
    for (let i = 0; i < 40; i++) {
        const item = GetChestItem(chest, i);
        if (!item) continue;
        const type = N(item.type, 0);
        const stack = N(item.stack, 0);
        if (type <= 0 || stack <= 0) continue;
        let prefix = 0;
        try { prefix = N(item.prefix, 0); } catch (e) { prefix = 0; }
        contents.push({ type, stack, prefix });
    }
    return contents;
}

function ClearNativeChestContents(chest) {
    if (!chest) return 0;
    let cleared = 0;
    for (let i = 0; i < 40; i++) {
        const item = GetChestItem(chest, i);
        if (!item) continue;
        const type = N(item.type, 0);
        const stack = N(item.stack, 0);
        if (type <= 0 && stack <= 0) continue;
        let ok = false;
        try { item['void TurnToAir()'](); ok = true; } catch (e) { }
        if (!ok) {
            try { item.type = 0; item.stack = 0; ok = true; } catch (e) { }
        }
        if (ok) cleared++;
    }
    return cleared;
}

function SyncNativeLootThroughInventoryStorage(chestIndex) {
    const chest = GetChestByIndex(chestIndex);
    if (!chest) return { loot: [], synced: 0 };
    const loot = SnapshotChestContents(chest);
    if (loot.length <= 0) return { loot, synced: 0 };
    const synced = FillChestByIndex(chestIndex, loot);
    return { loot, synced };
}

function MergePreservedItems(nativeLoot, preserved, contain) {
    const out = [];
    for (const e of nativeLoot || []) {
        if (out.length >= 40) break;
        out.push(e);
    }
    // The Phase 12.72 compatibility fallback injected one guaranteed main item
    // into Main.chest. Its value can survive natively even when the mobile UI
    // shows an empty chest. Drop only that first known fallback copy, while
    // preserving every other item a player may have placed into the chest.
    let skippedFallbackMainItem = false;
    for (const e of preserved || []) {
        if (!skippedFallbackMainItem && N(e.type, 0) === contain) {
            skippedFallbackMainItem = true;
            continue;
        }
        if (out.length >= 40) break;
        out.push(e);
    }
    return out;
}

function AddOfficialBuriedChest(i, t, corrupt, bounds) {
    const contain = corrupt ? 1571 : 1569;
    const style = corrupt ? 19 : 20;
    let method = 'none', ok = false;
    try {
        // Exact Terraria member used by CalamityMod.World.WorldEvilIsland:
        // AddBuriedChest(i, t - 3, contain, false, style, false, 0).
        const add = Terraria.WorldGen['bool AddBuriedChest(int i, int j, int mainItemInChest, bool notNearOtherChests, int chestStyle, bool trySlope, ushort chestTileType)'];
        if (typeof add === 'function') {
            ok = add(i, t - 3, contain, false, style, false, 0) === true;
            method = 'WorldGen.AddBuriedChest';
        }
    } catch (e) { }

    let chest = FindChestInBounds(bounds.left, bounds.top, bounds.right, bounds.bottom);
    if (chest.index >= 0) {
        const sync = SyncNativeLootThroughInventoryStorage(chest.index);
        const kind = corrupt ? 'corruption' : 'crimson';
        const lock = EnsureWorldEvilBiomeChestLocked(chest.x, chest.y, kind);
        if (method === 'WorldGen.AddBuriedChest') {
            Log(`native buried chest generated; kind=${kind}; chest=${chest.x},${chest.y}; lootSlots=${sync.loot.length}; inventorySynced=${sync.synced}; locked=${lock.ok}; lockMethod=${lock.method}.`);
        }
        return {
            ...chest,
            ok: true,
            method,
            nativeLootSlots: sync.loot.length,
            inventorySynced: sync.synced,
            lootVersion: method === 'WorldGen.AddBuriedChest' && sync.loot.length > 0 && sync.synced >= sync.loot.length ? 2 : 0,
            locked: lock.ok === true,
            lockMethod: String(lock.method || '')
        };
    }

    // Compatibility fallback. This is not considered complete official loot
    // and is deliberately marked lootVersion 0 so the post-load repair can
    // rebuild it through the exact native AddBuriedChest path.
    try {
        if (typeof PlaceChest === 'function') {
            const idx = N(PlaceChest(i, t, CONTAINERS, false, style), -1);
            if (idx >= 0) {
                const filled = FillChestByIndex(idx, [{ type: contain, stack: 1, prefix: -1 }]);
                const c = GetChestByIndex(idx);
                const chestX = c ? N(c.x, i) : i;
                const chestY = c ? N(c.y, t - 1) : t - 1;
                const lock = EnsureWorldEvilBiomeChestLocked(chestX, chestY, corrupt ? 'corruption' : 'crimson');
                return {
                    index: idx,
                    x: chestX,
                    y: chestY,
                    ok: true,
                    method: 'PlaceChest-main-item-fallback',
                    filled,
                    nativeLootSlots: 0,
                    inventorySynced: filled,
                    lootVersion: 0,
                    locked: lock.ok === true,
                    lockMethod: String(lock.method || '')
                };
            }
        }
    } catch (e) { }
    return { index: -1, x: -1, y: -1, ok: false, method, nativeLootSlots: 0, inventorySynced: 0, lootVersion: 0 };
}

function PlaceHouse(i, j, corrupt) {
    const type = corrupt ? EBONWOOD : SHADEWOOD;
    const wall = corrupt ? CORRUPTION_UNSAFE_WALL : CRIMSON_UNSAFE_WALL;
    let houseDirection = 1;
    if (WorldGenRand.NextBool()) houseDirection = -1;
    const largerRandValue = WorldGenRand.NextInt(7, 12);
    const smallerRandValue = WorldGenRand.NextInt(5, 7);
    let vectorY = j;
    const probeX = i + (largerRandValue + 2) * houseDirection;
    for (let k = j - 15; k < j + 30; k++) {
        const t = Tile(probeX, k);
        if (t && Active(t)) { vectorY = k - 1; break; }
    }

    let minX = Math.max(0, i - largerRandValue - 1);
    let maxX = Math.min(N(Terraria.Main.maxTilesX, 4200), i + largerRandValue + 1);
    let minY = Math.max(0, vectorY - smallerRandValue - 1);
    let maxY = Math.min(N(Terraria.Main.maxTilesY, 1200), vectorY + 2);
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY - 1; y < maxY + 1; y++) {
            if (y === minY - 1 && (x === minX || x === maxX)) continue;
            SetHouseTile(x, y, type, 0);
        }
    }

    minX = Math.max(0, i - largerRandValue);
    maxX = Math.min(N(Terraria.Main.maxTilesX, 4200), i + largerRandValue);
    minY = Math.max(0, vectorY - smallerRandValue);
    maxY = Math.min(N(Terraria.Main.maxTilesY, 1200), vectorY + 1);
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y < maxY; y++) {
            if (y === minY && (x === minX || x === maxX)) continue;
            const t = Tile(x, y);
            if (t && N(t.wall) === 0) SetHouseAirWall(x, y, wall);
        }
    }

    let xPos = i + (largerRandValue + 1) * houseDirection;
    const floorProbeY = vectorY;
    for (let x = xPos - 2; x <= xPos + 2; x++) {
        ClearTile(x, floorProbeY); ClearTile(x, floorProbeY - 1); ClearTile(x, floorProbeY - 2);
    }
    try { if (typeof PlaceTile === 'function') PlaceTile(xPos, floorProbeY, 10, true, false, -1, corrupt ? 1 : 10); } catch (e) { }

    xPos = i + (largerRandValue + 1) * -houseDirection - houseDirection;
    for (let y = minY; y <= maxY + 1; y++) SetHouseTile(xPos, y, type, 0);

    const bounds = { left: minX - 2, top: minY - 3, right: maxX + 2, bottom: maxY + 2 };
    const chest = AddOfficialBuriedChest(i, floorProbeY, corrupt, bounds);

    const wallXMin = i - Math.floor(largerRandValue / 2) + 1;
    const wallXMax = i + Math.floor(largerRandValue / 2) - 1;
    const wallYSize = largerRandValue > 10 ? 2 : 1;
    const wallYRange = Math.floor((minY + maxY) / 2) - 1;
    for (let x = wallXMin - wallYSize; x <= wallXMin + wallYSize; x++) for (let y = wallYRange - 1; y <= wallYRange + 1; y++) { const t = Tile(x, y); if (t) t.wall = WINDOW_WALL; }
    for (let x = wallXMax - wallYSize; x <= wallXMax + wallYSize; x++) for (let y = wallYRange - 1; y <= wallYRange + 1; y++) { const t = Tile(x, y); if (t) t.wall = WINDOW_WALL; }

    const furnitureX = i + (Math.floor(largerRandValue / 2) + 1) * -houseDirection;
    try { if (typeof PlaceTile === 'function') PlaceTile(furnitureX, maxY - 1, 14, true, false, -1, corrupt ? 1 : 8); } catch (e) { }
    try { if (typeof PlaceTile === 'function') PlaceTile(furnitureX - 2, maxY - 1, 15, true, false, 0, corrupt ? 2 : 11); } catch (e) { }
    const chairBottom = Tile(furnitureX - 2, maxY - 1), chairTop = Tile(furnitureX - 2, maxY - 2);
    if (chairBottom) chairBottom.frameX = N(chairBottom.frameX) + 18;
    if (chairTop) chairTop.frameX = N(chairTop.frameX) + 18;
    try { if (typeof PlaceTile === 'function') PlaceTile(furnitureX + 2, maxY - 1, 15, true, false, 0, corrupt ? 2 : 11); } catch (e) { }

    return { houseDirection, largerRandValue, smallerRandValue, chest };
}

function PlaceIsland(i, j, corrupt) {
    const leftOffset = 86, rightOffset = 86, maxVerticalOffset = 24;
    const evilSandstone = corrupt ? CORRUPT_SANDSTONE : CRIMSON_SANDSTONE;
    const hardened = corrupt ? CORRUPT_HARDENED_SAND : CRIMSON_HARDENED_SAND;
    const stone = corrupt ? EBONSTONE : CRIMSTONE;
    const cloudPositions = [];
    let terrainWrites = 0;

    for (let dx = -leftOffset; dx < rightOffset;) {
        const completion = Convert01To010(LerpValue(-leftOffset - 22, rightOffset + 22, dx));
        const verticalOffset = Trunc(completion * maxVerticalOffset);
        const cx = i + dx, cy = j + verticalOffset;
        const radius = WorldGenRand.NextInt(22, 26) - Trunc((1 - completion) * 15);
        terrainWrites += DistortedCircle(cx, cy, radius, 0.1, (x, y) => SetTerrainTile(x, y, CLOUD));
        cloudPositions.push({ x: cx, y: cy });
        dx += WorldGenRand.NextInt(21, 26);
    }

    Circle(i, j - 4, Math.floor((leftOffset + rightOffset - 30) / 2), 16, (x, y) => { ClearTile(x, y); return true; });

    for (const point of cloudPositions) {
        let ox = point.x, oy = point.y, guard = 0;
        while (guard++ < 80) {
            const t = Tile(Trunc(ox), Trunc(oy));
            if (t && Active(t)) break;
            oy += 1;
        }
        for (let k = 0; k < 3; k++) {
            const radius = WorldGenRand.NextInt(6, 9);
            const rnd = RandomCircular(radius, radius);
            const cx = ox + rnd.x * 0.75;
            const cy = oy + rnd.y * 0.75 - radius * 0.4 + 5;
            terrainWrites += Circle(Trunc(cx), Trunc(cy), Math.floor(radius / 2), Math.floor(radius / 2), (x, y) => SetTerrainTile(x, y, CLOUD));
        }
    }

    for (let dx = -leftOffset + 10; dx < rightOffset - 10; dx++) {
        const completion = Convert01To010(LerpValue(-leftOffset - 22, rightOffset + 22, dx));
        const verticalOffset = Trunc((1 - completion) * maxVerticalOffset);
        for (let dy = -5; dy < maxVerticalOffset + 13 - verticalOffset; dy++) {
            const t = Tile(i + dx, j + dy);
            if (t && !Active(t)) { SetTerrainTile(i + dx, j + dy, evilSandstone); terrainWrites++; }
        }
    }

    const borderPoints = [];
    for (let dx = -leftOffset + 14; dx < rightOffset - 14; dx++) {
        let borderY = j - 10;
        while (TileTypeFast(i + dx, borderY) !== CLOUD) {
            borderY++;
            if (borderY > j + 35) break;
        }
        if (borderY < j + 35) borderPoints.push({ x: i + dx, y: borderY });
    }
    if (borderPoints.length > 0) {
        for (let l = 0; l < 10; l++) {
            const border = borderPoints[WorldGenRand.NextInt(0, borderPoints.length)];
            const theta = WorldGenRand.NextFloat(-0.4, 0.4);
            const moveX = -Math.sin(theta), moveY = Math.cos(theta);
            for (let m = 0; m < 4; m++) {
                const rnd = RandomCircular(5, 5);
                const cx = Trunc(border.x + rnd.x + moveX * m * 3);
                const cy = Trunc(border.y + rnd.y + moveY * m * 3);
                terrainWrites += DistortedCircle(cx, cy, WorldGenRand.NextInt(8, 10) - m, 0.4, (x, y) => SetTerrainTile(x, y, evilSandstone));
            }
        }
    }

    for (let n = 0; n < 12; n++) {
        let radius = WorldGenRand.NextInt(6, 8);
        let tileType = hardened;
        const bx = i + WorldGenRand.NextInt(-leftOffset + 20, rightOffset - 20);
        const by = j + WorldGenRand.NextInt(-3, 12);
        let generate = n <= 4;
        if (!generate && by > j + 3) {
            radius -= WorldGenRand.NextInt(0, 3);
            tileType = stone;
            generate = true;
        }
        if (generate) terrainWrites += DistortedCircle(bx, by, radius, 0.35, (x, y) => SetTerrainTile(x, y, tileType));
    }

    const surfacePoints = [];
    for (let dx = -leftOffset + 24; dx < rightOffset - 24; dx++) {
        if (Math.abs(dx) < 15) continue;
        let surface = j - 15, hitCloud = false;
        let t = Tile(i + dx, surface);
        while (t && !Active(t)) {
            surface++;
            if (TileTypeFast(i + dx, surface) === CLOUD) { hitCloud = true; break; }
            if (surface > j + 35) break;
            t = Tile(i + dx, surface);
        }
        if (!hitCloud && surface < j + 35) surfacePoints.push({ x: i + dx, y: surface });
    }
    if (surfacePoints.length > 0) {
        for (let k = 0; k < 4; k++) {
            const p = surfacePoints[WorldGenRand.NextInt(0, surfacePoints.length)];
            const sourceType = TileTypeFast(p.x, p.y);
            terrainWrites += Circle(p.x, p.y + 5, WorldGenRand.NextInt(8, 10), WorldGenRand.NextInt(8, 10), (x, y) => SetTerrainTile(x, y, sourceType));
        }
    }

    const start = { x: i + WorldGenRand.NextInt(-leftOffset + 28, rightOffset - 28), y: j + WorldGenRand.NextInt(8, 14) };
    const rot = WorldGenRand.NextFloat(-0.36, -0.14);
    const sign = WorldGenRand.NextBool() ? 1 : -1;
    const length = WorldGenRand.NextFloat(18, 25);
    const end = { x: start.x + Math.cos(rot) * sign * length, y: start.y + Math.sin(rot) * sign * length };
    const rndMid = RandomCircular(6, 6);
    const middle = { x: (start.x + end.x) * 0.5 + rndMid.x, y: (start.y + end.y) * 0.5 + rndMid.y };
    for (let k = 0; k < 25; k++) {
        const t = k / 24;
        const omt = 1 - t;
        // The official source intentionally returns to oreStartPosition.
        const px = omt * omt * start.x + 2 * omt * t * middle.x + t * t * start.x;
        const py = omt * omt * start.y + 2 * omt * t * middle.y + t * t * start.y;
        const strength = 1 + (4 - 1) * Convert01To010(k / 25);
        const r = Math.max(1, Trunc(strength));
        terrainWrites += Circle(Trunc(px), Trunc(py), r, r, (x, y) => SetTerrainTile(x, y, stone));
    }

    const paint = corrupt ? 10 : 1;
    let painted = 0;
    for (let dx = -leftOffset - 30; dx < rightOffset + 30; dx++) {
        for (let dy = -8; dy < 55; dy++) {
            if (TileTypeFast(i + dx, j + dy) !== CLOUD) continue;
            const t = Tile(i + dx, j + dy); if (!t) continue;
            SetColor(t, paint); painted++;
        }
    }

    const house = PlaceHouse(i, j, corrupt);
    return {
        generated: true,
        kind: corrupt ? 'corruption' : 'crimson',
        x: i,
        y: j,
        chestX: house.chest.x,
        chestY: house.chest.y,
        chestIndex: house.chest.index,
        chestMethod: house.chest.method,
        chestOK: house.chest.ok === true,
        chestNativeLootSlots: N(house.chest.nativeLootSlots, 0),
        chestInventorySynced: N(house.chest.inventorySynced, 0),
        chestLootVersion: N(house.chest.lootVersion, 0),
        terrainWrites,
        cloudPainted: painted,
        houseDirection: house.houseDirection,
        houseWidthSeed: house.largerRandValue,
        houseHeightSeed: house.smallerRandValue
    };
}


// Repairs Phase 12.72 worlds whose island chest had to use the compatibility
// PlaceChest path because the native AddBuriedChest member was looked up with
// the wrong parameter names. The exact member exposed by this TLPro build is:
// bool AddBuriedChest(int i, int j, int mainItemInChest, bool notNearOtherChests,
//                     int chestStyle, bool trySlope, ushort chestTileType)
// Recreating an EMPTY fallback chest through the native method restores both
// the guaranteed evil-island weapon and Terraria's normal buried-chest extras.
export function RepairWorldEvilIslandChest(entry) {
    const kind = String(entry && entry.kind || '');
    const corrupt = kind === 'corruption';
    const contain = corrupt ? 1571 : 1569;
    const style = corrupt ? 19 : 20;
    const islandX = N(entry && entry.x, -1);
    let chestX = N(entry && entry.chestX, -1);
    let chestY = N(entry && entry.chestY, -1);
    let chestIndex = N(entry && entry.chestIndex, -1);
    const oldMethod = String(entry && entry.chestMethod || '');
    if (islandX < 0 || chestX < 0 || chestY < 0)
        return { repaired:false, reason:'missing-metadata' };

    let chest = chestIndex >= 0 ? GetChestByIndex(chestIndex) : null;
    if (!chest || N(chest.x,-2) !== chestX || N(chest.y,-2) !== chestY) {
        try { chestIndex = N(FindChestIndexAt(chestX, chestY), -1); } catch (e) { chestIndex = -1; }
        chest = chestIndex >= 0 ? GetChestByIndex(chestIndex) : null;
    }
    if (!chest)
        return { repaired:false, reason:'chest-not-found' };

    // Native AddBuriedChest is the exact behavior called by the PC Calamity
    // source. If an older package already produced native loot, simply push
    // the actual native slots through TLPro's proven InventoryStorage bridge.
    // This handles mobile worlds where Main.chest contains items but the UI
    // inventory did not receive them.
    if (oldMethod === 'WorldGen.AddBuriedChest') {
        const sync = SyncNativeLootThroughInventoryStorage(chestIndex);
        if (sync.loot.length > 0 && sync.synced >= sync.loot.length) {
            const lock = EnsureWorldEvilBiomeChestLocked(chestX, chestY, kind);
            Log(`native chest loot resynced through InventoryStorage; kind=${kind}; chest=${chestX},${chestY}; lootSlots=${sync.loot.length}; synced=${sync.synced}; locked=${lock.ok}; lockMethod=${lock.method}.`);
            return {
                repaired:true,
                reason:'native-loot-inventory-resync',
                method:'WorldGen.AddBuriedChest',
                chestIndex, chestX, chestY,
                lootSlots:sync.loot.length,
                synced:sync.synced,
                lootVersion:2
            };
        }
    }

    let add = null;
    try {
        add = Terraria.WorldGen['bool AddBuriedChest(int i, int j, int mainItemInChest, bool notNearOtherChests, int chestStyle, bool trySlope, ushort chestTileType)'];
    } catch (e) { add = null; }
    if (typeof add !== 'function') {
        // Do not invent Terraria's secondary buried-chest table. Keep the
        // exact guaranteed Calamity item and leave lootVersion incomplete so
        // a later compatible runtime can retry the native path.
        const filled = FillChestByIndex(chestIndex, [{ type:contain, stack:1, prefix:-1 }]);
        return {
            repaired:filled > 0,
            reason:filled > 0 ? 'main-item-only-native-unavailable' : 'native-method-unavailable',
            chestIndex, chestX, chestY, filled,
            method:'InventoryStorage-main-item-fallback',
            lootVersion:0
        };
    }

    // Phase 12.72/12.72.1 can leave the guaranteed fallback item in the
    // native Chest.item array while the TLPro chest UI displays zero items.
    // Therefore native IsChestEmpty is intentionally NOT used as a repair
    // gate. Snapshot the old chest, preserve any player-added items, clear the
    // native inventory, then rebuild it through the exact PC call.
    const oldContents = SnapshotChestContents(chest);

    // IMPORTANT TLPro/mobile chest rule: clear the same InventoryStorage bridge
    // used by every confirmed shrine before asking Terraria to destroy/rebuild
    // the chest. Clearing only Main.chest.item leaves TLPro's UI-side storage
    // alive, causing Chest.DestroyChest() to return false even when the chest
    // looks empty on screen. FillChestByIndex(index, []) constructs
    // InventoryStorage(index) and SyncToChest(), so both representations are
    // cleared through the exact path already proven by all shrine chests.
    let storageCleared = false;
    try {
        FillChestByIndex(chestIndex, []);
        storageCleared = true;
    } catch (e) { storageCleared = false; }
    ClearNativeChestContents(chest);

    let destroyed = false;
    try { destroyed = Terraria.Chest['bool DestroyChest(int X, int Y)'](chestX, chestY) === true; } catch (e) { destroyed = false; }
    if (!destroyed) {
        // Do not keep retrying native-array-only clears. Put the guaranteed
        // official Calamity main item into the existing chest through the same
        // InventoryStorage + SyncToChest path as the shrines. This is visibly
        // correct on TLPro and keeps lootVersion incomplete so a later native
        // rebuild can still add Terraria's secondary buried-chest loot.
        const restoreContents = oldContents.length > 0 ? oldContents.slice(0, 40) : [];
        let hasMain = false;
        for (const e of restoreContents) if (N(e.type,0) === contain) { hasMain = true; break; }
        if (!hasMain && restoreContents.length < 40) restoreContents.unshift({ type:contain, stack:1, prefix:-1 });
        const restore = FillChestByIndex(chestIndex, restoreContents);
        const lock = EnsureWorldEvilBiomeChestLocked(chestX, chestY, kind);
        Log(`legacy chest could not be destroyed after InventoryStorage clear; direct shrine-style fill applied; kind=${kind}; chest=${chestX},${chestY}; storageCleared=${storageCleared}; filled=${restore}; locked=${lock.ok}; lockMethod=${lock.method}.`);
        return { repaired:restore > 0, reason:restore > 0 ? 'direct-inventory-storage-fill' : 'destroy-legacy-chest-failed', chestIndex, chestX, chestY, restored:restore, method:'InventoryStorage-direct', lootVersion:0, locked:lock.ok, lockMethod:lock.method };
    }

    for (let dx=0; dx<2; dx++) for (let dy=0; dy<2; dy++) ClearTile(chestX+dx, chestY+dy);

    // Phase 12.72 fallback PlaceChest(i,t,...) produced top-left y=t-1.
    // The original C# calls AddBuriedChest(i,t-3,...), therefore oldY-2.
    const officialInputY = chestY - 2;
    let ok = false;
    try { ok = add(islandX, officialInputY, contain, false, style, false, 0) === true; } catch (e) { ok = false; }

    let created = FindChestInBounds(islandX-24, chestY-10, islandX+24, chestY+14);
    if (ok && created.index >= 0) {
        const c = GetChestByIndex(created.index);
        const nativeLoot = SnapshotChestContents(c);
        if (nativeLoot.length > 0) {
            const merged = MergePreservedItems(nativeLoot, oldContents, contain);
            const synced = FillChestByIndex(created.index, merged);
            if (synced >= nativeLoot.length) {
                const lock = EnsureWorldEvilBiomeChestLocked(created.x, created.y, kind);
                Log(`legacy fallback chest rebuilt through native AddBuriedChest; kind=${kind}; old=${chestX},${chestY}; new=${created.x},${created.y}; index=${created.index}; nativeLootSlots=${nativeLoot.length}; visibleSynced=${synced}; preservedExtras=${Math.max(0, merged.length-nativeLoot.length)}; locked=${lock.ok}; lockMethod=${lock.method}.`);
                return {
                    repaired:true,
                    reason:'native-rebuild-and-inventory-sync',
                    method:'WorldGen.AddBuriedChest',
                    chestIndex:created.index,
                    chestX:created.x,
                    chestY:created.y,
                    lootSlots:nativeLoot.length,
                    synced,
                    preservedExtras:Math.max(0, merged.length-nativeLoot.length),
                    lootVersion:2
                };
            }
        }
    }

    // Last-resort restoration if the native call cannot run after world load.
    // This preserves the old data and the guaranteed Calamity main item but
    // explicitly does not claim the vanilla secondary loot is complete.
    try {
        if (typeof PlaceChest === 'function') {
            const idx = N(PlaceChest(islandX, chestY + 1, CONTAINERS, false, style), -1);
            if (idx >= 0) {
                let restored = oldContents.slice(0, 40);
                let hasMain = false;
                for (const e of restored) if (N(e.type,0) === contain) { hasMain = true; break; }
                if (!hasMain && restored.length < 40) restored.unshift({ type:contain, stack:1, prefix:-1 });
                const filled = FillChestByIndex(idx, restored);
                const c = GetChestByIndex(idx);
                const rx = c ? N(c.x,islandX) : islandX, ry = c ? N(c.y,chestY) : chestY;
                Log(`native rebuild unavailable after removal; legacy chest restored; kind=${kind}; position=${rx},${ry}; filled=${filled}.`);
                return {
                    repaired:filled>0,
                    reason:filled>0?'legacy-restored-main-item-only':'restore-fill-failed',
                    method:'PlaceChest-main-item-fallback',
                    chestIndex:idx, chestX:rx, chestY:ry, filled, lootVersion:0
                };
            }
        }
    } catch (e) { }
    return { repaired:false, reason:'native-regeneration-failed' };
}

export const WorldEvilIslandRuntime = {
    Generate() {
        const started = Date.now();
        const drunk = IsDrunkWorldGen();
        const crimsonWorld = IsCrimsonWorld();
        const islands = [];
        const tasks = drunk
            ? [
                { corrupt: true, min: 0.1, max: 0.2, direction: 1 },
                { corrupt: false, min: 0.8, max: 0.9, direction: -1 }
            ]
            : [
                crimsonWorld
                    ? { corrupt: true, min: 0.1, max: 0.3, direction: 1 }
                    : { corrupt: false, min: 0.7, max: 0.9, direction: -1 }
            ];

        for (const task of tasks) {
            const placement = FindPlacement(task.min, task.max, task.direction);
            if (!placement.found) {
                const result = { generated: false, reason: placement.reason, drunk, crimsonWorld, islands, attempts: placement.attempts, elapsedMs: Date.now() - started };
                Log(`generated=false; reason=${result.reason}; attempts=${placement.attempts}; drunk=${drunk}; crimsonWorld=${crimsonWorld}.`);
                return result;
            }
            const island = PlaceIsland(placement.x, placement.y, task.corrupt);
            island.searchAttempts = placement.attempts;
            island.edgeShift = placement.shift;
            islands.push(island);
            Log(`island=${island.kind}; center=${island.x},${island.y}; chest=${island.chestX},${island.chestY}; chestMethod=${island.chestMethod}; chestOK=${island.chestOK}; attempts=${island.searchAttempts}; writes=${island.terrainWrites}.`);
        }

        const result = {
            generated: islands.length === tasks.length,
            reason: islands.length === tasks.length ? 'placed' : 'incomplete',
            drunk,
            crimsonWorld,
            islands,
            elapsedMs: Date.now() - started,
            source: 'CalamityMod.World.WorldEvilIsland/direct-after-vanilla'
        };
        Log(`generated=${result.generated}; count=${islands.length}; variant=${drunk ? 'drunk-both' : (crimsonWorld ? 'corruption-island-in-crimson-world' : 'crimson-island-in-corruption-world')}; elapsed=${result.elapsedMs}ms.`);
        return result;
    }
};
