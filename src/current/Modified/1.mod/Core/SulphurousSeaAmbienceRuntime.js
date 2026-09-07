import { Terraria } from './../TL/ModImports.js';
import { ModItem } from './../TL/ModItem.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { EnsureChestAt, FillChestByIndex, FindChestIndexAt, GetChestByIndex, IsChestEmpty, ResolveVanillaItemID } from './OfficialSchematicRuntime.js';

const ECHO_BLOCK = 541; // legacy proxy only; new ambience is metadata-only
const CHEST_TILE = 21;
const SAND = Number(BiomeAnchorTiles.SulphurousSand);
const SANDSTONE = 396;
const HARDENED = 397;
const SHALE = 404;
const HOST_TYPES = new Set([SAND, SANDSTONE, HARDENED, SHALE]);
const NativePlaceChest = Terraria.WorldGen['int PlaceChest(int x, int y, ushort type, bool notNearOtherChests, int style)'];

const AMBIENCE = Object.freeze({
    crate: [
        { texture: 'PirateCrate4', width: 2, height: 2, originX: 0, originY: 1, drawYOffset: 2 },
        { texture: 'PirateCrate5', width: 2, height: 2, originX: 0, originY: 1, drawYOffset: 2 },
        { texture: 'PirateCrate6', width: 2, height: 2, originX: 0, originY: 1, drawYOffset: 2 }
    ],
    geyser: [
        { texture: 'SteamGeyser1', width: 2, height: 2, originX: 0, originY: 1, drawYOffset: 2 },
        { texture: 'SteamGeyser2', width: 2, height: 2, originX: 0, originY: 1, drawYOffset: 2 },
        { texture: 'SteamGeyser3', width: 2, height: 2, originX: 0, originY: 1, drawYOffset: 2 }
    ],
    stalagmite: [
        { texture: 'SulphurousStalacmite1', width: 1, height: 2, originX: 0, originY: 1, drawYOffset: 2 },
        { texture: 'SulphurousStalacmite2', width: 1, height: 2, originX: 0, originY: 1, drawYOffset: 2 },
        { texture: 'SulphurousStalacmite3', width: 1, height: 3, originX: 0, originY: 2, drawYOffset: 2 },
        { texture: 'SulphurousStalacmite4', width: 1, height: 3, originX: 0, originY: 2, drawYOffset: 2 },
        { texture: 'SulphurousStalacmite5', width: 1, height: 4, originX: 0, originY: 3, drawYOffset: 2 },
        { texture: 'SulphurousStalacmite6', width: 1, height: 4, originX: 0, originY: 3, drawYOffset: 2 }
    ],
    fossil: [
        { texture: 'SulphuricFossil1', width: 3, height: 2, originX: 1, originY: 1, drawYOffset: 0 },
        { texture: 'SulphuricFossil2', width: 3, height: 2, originX: 1, originY: 1, drawYOffset: 0 },
        { texture: 'SulphuricFossil3', width: 3, height: 2, originX: 1, originY: 1, drawYOffset: 0 }
    ],
    rib: [
        { texture: 'SulphurousRib1', width: 1, height: 4, originX: 0, originY: 3, drawYOffset: 2 },
        { texture: 'SulphurousRib2', width: 1, height: 3, originX: 0, originY: 2, drawYOffset: 2 },
        { texture: 'SulphurousRib3', width: 1, height: 2, originX: 0, originY: 1, drawYOffset: 2 },
        { texture: 'SulphurousRib4', width: 1, height: 3, originX: 0, originY: 2, drawYOffset: 2 },
        { texture: 'SulphurousRib5', width: 1, height: 1, originX: 0, originY: 0, drawYOffset: 2 }
    ],
    stalactite: [
        { texture: 'SulphurousStalactite1', width: 1, height: 2, originX: 0, originY: 0, drawYOffset: -2 },
        { texture: 'SulphurousStalactite2', width: 1, height: 2, originX: 0, originY: 0, drawYOffset: -2 },
        { texture: 'SulphurousStalactite3', width: 1, height: 3, originX: 0, originY: 0, drawYOffset: -2 },
        { texture: 'SulphurousStalactite4', width: 1, height: 3, originX: 0, originY: 0, drawYOffset: -2 },
        { texture: 'SulphurousStalactite5', width: 1, height: 4, originX: 0, originY: 0, drawYOffset: -2 },
        { texture: 'SulphurousStalactite6', width: 1, height: 4, originX: 0, originY: 0, drawYOffset: -2 }
    ]
});

function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function InWorld(x, y, margin = 3) { return x >= margin && y >= margin && x < I(Terraria.Main.maxTilesX) - margin && y < I(Terraria.Main.maxTilesY) - margin; }
function TileAt(x, y) { try { return InWorld(x, y, 1) ? Terraria.Main.tile.get_Item(I(x), I(y)) : null; } catch (e) { return null; } }
function Active(t) { try { return !!t && t['bool active()']() === true; } catch (e) { return false; } }
function SetActive(t, v) { try { t['void active(bool active)'](v === true); } catch (e) { } }
function TryCall(t, sig, v) { try { if (t && typeof t[sig] === 'function') { t[sig](v); return true; } } catch (e) { } return false; }
function NativeBoolAt(a, i) { i = I(i, -1); if (!a || i < 0) return false; try { if (typeof a.get_Item === 'function') return a.get_Item(i) === true; } catch (e) { } try { const g = a['bool get_Item(int index)']; if (typeof g === 'function') return g(i) === true; } catch (e) { } return false; }
// During fresh worldgen the caller already owns a typed snapshot of this entire band. Reuse it
// for all candidate scans and touch Main.tile only when an object/chest actually mutates a cell.
let ScanAccessor = null;
let VisualOccupied = null;
const TileSolidCache = new Map();
function ScanActive(x,y){ try { if (ScanAccessor?.active) return ScanAccessor.active(I(x),I(y))===true; } catch(e){} const t=TileAt(x,y); return !!t&&Active(t); }
function ScanType(x,y){ try { if (ScanAccessor?.type) return I(ScanAccessor.type(I(x),I(y)),-1); } catch(e){} const t=TileAt(x,y); return t?I(t.type,-1):-1; }
function ScanLiquid(x,y){ try { if (ScanAccessor?.liquid) return I(ScanAccessor.liquid(I(x),I(y)),0); } catch(e){} const t=TileAt(x,y); return t?I(t.liquid,0):0; }
function ScanSet(x,y,a,type=null,wall=null,liquid=null){ try { if(ScanAccessor?.set) ScanAccessor.set(I(x),I(y),a===true,type,wall,liquid); } catch(e){} }
function Host(x,y){ return ScanActive(x,y)&&HOST_TYPES.has(ScanType(x,y)); }
function Solid(x, y) { if (!ScanActive(x,y)) return false; const type=ScanType(x,y); let nativeSolid=TileSolidCache.get(type); if(nativeSolid===undefined){nativeSolid=NativeBoolAt(Terraria.Main.tileSolid,type)===true;TileSolidCache.set(type,nativeSolid);} if(nativeSolid)return true; return HOST_TYPES.has(type) || type === 0 || type === 1 || type === 53 || type === 112 || type === 234 || type === ECHO_BLOCK; }
function CellKey(x,y){return `${I(x)},${I(y)}`;}
function Empty(x, y) { return InWorld(x,y,1) && !ScanActive(x,y) && !(VisualOccupied?.has(CellKey(x,y))); }
function Water(x, y) { if (!InWorld(x,y,1) || ScanActive(x,y)) return false; if (ScanAccessor?.liquid) return ScanLiquid(x,y)>0; const t=TileAt(x,y); if(!t)return false; let liquidType=0; try { liquidType=I(t['byte liquidType()'](),0); } catch(e){ try{liquidType=I(t.liquidType,0);}catch(_){} } return I(t.liquid,0)>0&&liquidType===0; }
function ActualX(local, atLeft) { return atLeft ? I(local) : I(Terraria.Main.maxTilesX) - 1 - I(local); }
function Log(s) { try { tl.log(`[CalamityPort SulphAmbience] ${s}`); } catch (e) { } }
function Pick(a) { return a[WorldGenRand.NextInt(0, a.length)]; }
function Custom(name) { try { return I(ModItem.getTypeByName(name), 0); } catch (e) { return 0; } }
function VItem(name, fallback) { return ResolveVanillaItemID(name, fallback); }

function CanOccupy(left, top, width, height) {
    if (!InWorld(left, top) || !InWorld(left + width - 1, top + height - 1)) return false;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (!Empty(left + x, top + y)) return false;
    return true;
}
function SupportsFloor(left, top, width, height) { const y = top + height; for (let x = 0; x < width; x++) if (!Solid(left + x, y)) return false; return true; }
function SupportsCeiling(left, top, width) { const y = top - 1; for (let x = 0; x < width; x++) if (!Solid(left + x, y)) return false; return true; }
function SetProxyCell(x, y) {
    const t = TileAt(x, y); if (!t) return false;
    const liquid = I(t.liquid, 0); let liquidType = 0; try { liquidType = I(t['byte liquidType()'](), 0); } catch (e) { }
    // Ambience is rendered from immutable WorldDB metadata. Do not leave an invisible vanilla
    // tile behind: Echo proxies were mineable/collidable and could leak vanilla behavior.
    SetActive(t, false); t.type = 0; t.frameX = 0; t.frameY = 0; t.liquid = liquid;
    TryCall(t, 'void liquidType(int liquidType)', liquidType);
    TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    TryCall(t, 'void invisibleBlock(bool invisibleBlock)', false); TryCall(t, 'void actuator(bool actuator)', false); TryCall(t, 'void inActive(bool inActive)', false);
    VisualOccupied?.add(CellKey(x,y));
    ScanSet(x,y,false,0,null,liquid);
    return true;
}
function PlaceAmbientObject(kind, variant, anchorX, anchorY, objects) {
    const list = AMBIENCE[kind]; if (!list || variant < 0 || variant >= list.length) return null;
    const d = list[variant]; const left = I(anchorX) - d.originX, top = I(anchorY) - d.originY;
    if (!CanOccupy(left, top, d.width, d.height)) return null;
    if (kind === 'stalactite') { if (!SupportsCeiling(left, top, d.width)) return null; }
    else if (!SupportsFloor(left, top, d.width, d.height)) return null;
    for (let y = 0; y < d.height; y++) for (let x = 0; x < d.width; x++) SetProxyCell(left + x, top + y);
    const out = { kind, variant: variant + 1, left, top, width: d.width, height: d.height, drawYOffset: d.drawYOffset, texture: d.texture };
    objects.push(out); return out;
}

function PlaceAmbience(context, placement) {
    const width = I(placement.width), yStart = I(placement.yStart), depth = I(placement.blockDepth), atLeft = placement.atLeft === true;
    let rockLayer = I(Terraria.Main.rockLayer, yStart + depth + 40);
    try { if (Terraria.Main.remixWorld === true) rockLayer = I(Terraria.Main.UnderworldLayer, rockLayer); } catch (e) { }
    const y0 = Math.max(3, yStart - 140), y1 = Math.min(I(context.maxY) - 4, rockLayer, yStart + depth + 80);
    const objects = []; const counts = { crate: 0, geyser: 0, stalagmite: 0, fossil: 0, rib: 0, stalactite: 0 };
    let hostCells = 0;
    for (let localX = 0; localX < width; localX++) {
        const x = ActualX(localX, atLeft); if (x < 4 || x >= I(context.maxX) - 5) continue;
        for (let y = y0; y < y1; y++) {
            if (!Host(x, y)) continue;
            hostCells++;
            if (Water(x, y - 1)) {
                if (WorldGenRand.NextBool(25)) { const o = PlaceAmbientObject('crate', WorldGenRand.NextInt(0, 3), x, y - 1, objects); if (o) counts.crate++; }
                if (WorldGenRand.NextBool(18)) { const o = PlaceAmbientObject('geyser', WorldGenRand.NextInt(0, 3), x, y - 1, objects); if (o) counts.geyser++; }
                if (WorldGenRand.NextBool(12)) { const o = PlaceAmbientObject('stalagmite', WorldGenRand.NextInt(0, 6), x, y - 1, objects); if (o) counts.stalagmite++; }
                if (WorldGenRand.NextBool(15)) { const o = PlaceAmbientObject('fossil', WorldGenRand.NextInt(0, 3), x, y - 1, objects); if (o) counts.fossil++; }
                if (WorldGenRand.NextBool(18)) { const o = PlaceAmbientObject('rib', WorldGenRand.NextInt(0, 5), x, y - 1, objects); if (o) counts.rib++; }
            }
            if (Water(x, y + 1) && WorldGenRand.NextBool(12)) {
                const o = PlaceAmbientObject('stalactite', WorldGenRand.NextInt(0, 6), x, y + 1, objects); if (o) counts.stalactite++;
            }
        }
    }
    return { objects, counts, hostCells, modified: objects.reduce((n, o) => n + o.width * o.height, 0) };
}

function ClearCell(x, y, wall = null) {
    const t = TileAt(x, y); if (!t) return;
    SetActive(t, false); t.frameX = 0; t.frameY = 0; t.liquid = 0; if (wall != null) t.wall = I(wall);
    TryCall(t, 'void liquidType(int liquidType)', 0); TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    TryCall(t, 'void invisibleBlock(bool invisibleBlock)', false); TryCall(t, 'void actuator(bool actuator)', false); TryCall(t, 'void inActive(bool inActive)', false);
    ScanSet(x,y,false,I(t.type,0),wall,0);
}
function SetChestTiles(left, top) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const t = TileAt(left + dx, top + dy); if (!t) continue;
        SetActive(t, true); t.type = CHEST_TILE; t.frameX = dx * 18; t.frameY = dy * 18; t.liquid = 0;
        TryCall(t, 'void liquidType(int liquidType)', 0); TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0); TryCall(t, 'void invisibleBlock(bool invisibleBlock)', false);
        ScanSet(left+dx,top+dy,true,CHEST_TILE,null,0);
    }
}

function MarkChestSnapshot(left, top) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) ScanSet(left + dx, top + dy, true, CHEST_TILE, null, 0);
}

function BuildRustyChestContents(specialName) {
    const special = Custom(specialName);
    const hadal = Custom('HadalStew'), sulphur = Custom('SulphurskinPotion');
    const potions = [hadal, VItem('WaterWalkingPotion', 232), VItem('ShinePotion', 298), VItem('GillsPotion', 291), VItem('FlipperPotion', 292)].filter(v => v > 0);
    const contents = [];
    if (special > 0) contents.push([special, 1]);
    contents.push([VItem('Torch', 8), WorldGenRand.NextInt(15, 30)]);
    if (sulphur > 0 && WorldGenRand.NextBool()) contents.push([sulphur, WorldGenRand.NextInt(4, 8)]);
    if (potions.length && WorldGenRand.NextBool()) contents.push([Pick(potions), WorldGenRand.NextInt(1, 3)]);
    if (potions.length && WorldGenRand.NextBool()) contents.push([Pick(potions), WorldGenRand.NextInt(1, 3)]);
    if (WorldGenRand.NextBool(3)) contents.push([VItem('Flipper', 187), 1]);
    contents.push([VItem('GoldCoin', 73), WorldGenRand.NextInt(2, 5)]);
    return contents;
}

function TryNativePlaceChest(left, top) {
    left = I(left); top = I(top);
    if (typeof NativePlaceChest !== 'function') return -1;
    try { return I(NativePlaceChest(left, top + 1, CHEST_TILE, false, 0), -1); } catch (e) { return -1; }
}

export function EnsureVisibleRustyChestAt(left, top, specialName = '', kind = 'unknown', onlyIfEmpty = true) {
    left = I(left); top = I(top);
    if (!InWorld(left, top) || !InWorld(left + 1, top + 2)) return { success: false, index: -1, filled: 0, reason: 'out-of-world' };

    let idx = FindChestIndexAt(left, top);
    let created = false;
    let method = 'existing';

    if (idx < 0) {
        // Recreate with the same native WorldGen.PlaceChest path used by the already-stable
        // Abyss shrines / labs.  This gives TLPro a real interactive chest tile instead of
        // relying on a hand-built 2x2 proxy.
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) ClearCell(left + dx, top + dy);
        idx = TryNativePlaceChest(left, top);
        if (idx >= 0) { created = true; method = 'WorldGen.PlaceChest'; }
    }

    if (idx < 0) {
        // Last-resort compatibility path for runtimes where PlaceChest is unavailable.
        SetChestTiles(left, top);
        const ensured = EnsureChestAt(left, top);
        idx = I(ensured.chestIndex, -1);
        created = ensured.created === true;
        method = 'manual-fallback';
    } else {
        // Make sure an old 13.02 manual chest cannot remain invisible/actuated.
        SetChestTiles(left, top);
    }

    if (idx < 0) return { success: false, index: -1, filled: 0, reason: 'registry-create-failed' };
    const chest = GetChestByIndex(idx);
    if (!chest) return { success: false, index: idx, filled: 0, reason: 'registry-read-failed' };
    let filled = 0;
    if (!onlyIfEmpty || IsChestEmpty(chest)) filled = FillChestByIndex(idx, BuildRustyChestContents(specialName));
    return { success: true, index: idx, filled, created, method, kind, left, top, reason: filled > 0 ? 'native-ready-and-filled' : 'native-ready' };
}

function PlaceRustyChestAt(left, top, specialName, kind) {
    left = I(left); top = I(top);
    if (!InWorld(left, top) || !InWorld(left + 1, top + 2)) return null;
    if (!Solid(left, top + 2) || !Solid(left + 1, top + 2)) return null;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (!Empty(left + dx, top + dy)) return null;

    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) ClearCell(left + dx, top + dy);

    let idx = TryNativePlaceChest(left, top);
    let method = 'WorldGen.PlaceChest';
    if (idx < 0) {
        SetChestTiles(left, top);
        const ensured = EnsureChestAt(left, top);
        idx = I(ensured.chestIndex, -1);
        method = 'manual-fallback';
    }
    if (idx < 0) return null;
    MarkChestSnapshot(left, top);

    const special = Custom(specialName);
    const filled = FillChestByIndex(idx, BuildRustyChestContents(specialName));
    return { kind, left, top, index: idx, specialName, specialType: special, filled, method };
}
function AddChestWithLootNear(i, j, specialName, kind) {
    i = I(i); j = I(j); const maxY = I(Terraria.Main.maxTilesY) - 210;
    while (j < maxY && !Solid(i, j)) j++;
    if (j >= maxY) return null;
    return PlaceRustyChestAt(i - 1, j - 2, specialName, kind);
}

function GenerateTreasureChest(context, placement) {
    const width = I(placement.width), yStart = I(placement.yStart), atLeft = placement.atLeft === true;
    let local = I(width * 0.36 * 0.5) + WorldGenRand.NextInt(-8, 9);
    for (let shift = 0; shift < 120; shift++) {
        const x = ActualX(local, atLeft); let sy = yStart - 100; let found = -1;
        for (let d = 0; d <= 300 && sy + d < I(context.maxY) - 4; d++) if (Solid(x, sy + d)) { found = sy + d; break; }
        if (found < 0) { local += 1; continue; }
        const startY = found; let dig = 0;
        while (dig < 80) {
            const a = Solid(x, startY + dig), b = Solid(x + 1, startY + dig);
            if (dig >= 32 && (!a || !b)) break;
            dig++;
        }
        if (dig >= 80) { local += 1; continue; }
        let cy = startY + dig - 12; let safe = 0;
        while (safe++ < 120) {
            let closed = true;
            for (let dx = -2; dx < 4 && closed; dx++) for (let dy = -1; dy < 3; dy++) if (!Active(TileAt(x + dx, cy - dy))) { closed = false; break; }
            if (closed) break; cy++;
        }
        // Dig the two-by-two chest pocket and keep the official unsafe Sulphurous wall proxy.
        for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) ClearCell(x + dx, cy - dy, 2);
        const chest = AddChestWithLootNear(x + 1, cy + 1, 'EffigyOfDecay', 'treasure');
        if (!chest) { local += 1; continue; }
        // Official surface marker: two columns of Sulphurous Sandstone around the original surface point.
        for (let dx = 0; dx < 2; dx++) for (let dy = -1; dy < 3; dy++) {
            const t = TileAt(x + dx, startY + dy); if (!t) continue;
            if (!Active(t)) continue; t.type = SANDSTONE; t.liquid = 0; TryCall(t, 'void liquidType(int liquidType)', 0);
        }
        return chest;
    }
    return null;
}

function GenerateOpenAirChest(context, placement) {
    const width = I(placement.width), yStart = I(placement.yStart), atLeft = placement.atLeft === true; const depthMap = [];
    for (let local = 60; local < width - 50; local++) {
        const x = ActualX(local, atLeft), y = yStart + 11; let dy = 0;
        while (y + dy < I(context.maxY) - 212) { const t = TileAt(x, y + dy); if (!t) break; if (Active(t) || I(t.liquid, 0) <= 0) dy++; else break; }
        depthMap.push({ local, x, y: Active(TileAt(x, y)) ? y + dy : 0 });
    }
    if (depthMap.length < 25) return null;
    for (let a = 0; a < 400; a++) {
        const idx = WorldGenRand.NextInt(10, depthMap.length - 10), cur = depthMap[idx]; if (!cur || cur.y <= 0) continue;
        const ly = depthMap[idx - 1]?.y || 0, ry = depthMap[idx + 1]?.y || 0, average = Math.floor((ly + cur.y + ry) / 3);
        if (Math.abs(average - cur.y) >= 3) continue;
        const currentY = cur.y + 3, left = cur.x - 1, top = currentY - 2;
        let blocked = false; for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) if (Active(TileAt(left + dx, top + dy))) blocked = true;
        if (blocked) continue;
        for (let dx = -1; dx < 3; dx++) { const t = TileAt(cur.x + dx, currentY + 1); if (!t) continue; SetActive(t, true); t.type = SAND; t.liquid = 0; TryCall(t, 'void liquidType(int liquidType)', 0); }
        const chest = PlaceRustyChestAt(left, top, 'BrokenWaterFilter', 'openAir'); if (chest) return chest;
    }
    return null;
}

function GenerateScrapPileChest(context, placement, scraps) {
    if (!Array.isArray(scraps) || scraps.length === 0) return null;
    for (let i = 0; i < 800; i++) {
        const s = scraps[WorldGenRand.NextInt(0, scraps.length)]; if (!s) continue;
        const x = I(s.x, I(s.left) + Math.floor(I(s.width) / 2)) + WorldGenRand.NextInt(-25 - Math.floor(i / 12), 25 + Math.floor(i / 12));
        const y = I(s.y, I(s.top) + I(s.height)) + WorldGenRand.NextInt(-16 - Math.floor(i / 25), 4 + Math.floor(i / 25));
        if (Solid(x, y)) continue;
        const chest = AddChestWithLootNear(x, y, 'RustyBeaconPrototype', 'scrap'); if (chest) return chest;
    }
    return null;
}

function GenerateDeepWaterChest(context, placement) {
    const width = I(placement.width), yStart = I(placement.yStart), depth = I(placement.blockDepth), atLeft = placement.atLeft === true;
    for (let i = 0; i < 400; i++) {
        const x = ActualX(WorldGenRand.NextInt(60, Math.max(61, width - 60)), atLeft);
        let y = yStart + WorldGenRand.NextInt(Math.max(1, depth - 150), Math.max(2, depth - 60));
        if (Solid(x, y)) continue;
        while (y < I(context.maxY) - 210) { if (!Solid(x, y)) y++; else { y -= 3; break; } }
        if (y >= yStart + depth - 60) continue;
        const chest = AddChestWithLootNear(x, y, 'ScionsCurio', 'deepWater'); if (chest) return chest;
    }
    return null;
}


function TwoWideFloor(left, floorY) {
    return Solid(left, floorY) && Solid(left + 1, floorY);
}
function TwoByTwoClear(left, top) {
    if (!InWorld(left, top) || !InWorld(left + 1, top + 2)) return false;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (Active(TileAt(left + dx, top + dy))) return false;
    return true;
}
function AnyWaterInPocket(left, top) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const t = TileAt(left + dx, top + dy);
        if (t && !Active(t) && I(t.liquid, 0) > 0) return true;
    }
    return false;
}
function FallbackFloorScan(context, placement, localMin, localMax, yMin, yMax, specialName, kind, preferWater = false) {
    const atLeft = placement.atLeft === true;
    localMin = Math.max(3, I(localMin)); localMax = Math.min(I(placement.width) - 4, I(localMax));
    yMin = Math.max(3, I(yMin)); yMax = Math.min(I(context.maxY) - 4, I(yMax));
    if (localMax <= localMin || yMax <= yMin) return null;

    // Two passes: first preserve the official underwater/open-water intent, then relax only
    // the liquid requirement.  Geometry and the 2-wide solid floor remain mandatory.
    for (let pass = 0; pass < 2; pass++) {
        const needWater = preferWater && pass === 0;
        for (let y = yMin; y <= yMax; y++) {
            const phase = (y - yMin) & 1;
            for (let local = localMin + phase; local <= localMax; local += 2) {
                const x0 = ActualX(local, atLeft);
                const left = atLeft ? x0 : x0 - 1;
                const top = y;
                if (!TwoByTwoClear(left, top) || !TwoWideFloor(left, top + 2)) continue;
                if (needWater && !AnyWaterInPocket(left, top)) continue;
                const chest = PlaceRustyChestAt(left, top, specialName, kind);
                if (chest) return chest;
            }
        }
        if (!preferWater) break;
    }
    return null;
}

function FallbackTreasureChest(context, placement) {
    const width = I(placement.width), yStart = I(placement.yStart), atLeft = placement.atLeft === true;
    const center = Math.max(18, Math.floor(width * 0.36 * 0.5));
    const localMin = Math.max(10, center - 45), localMax = Math.min(width - 12, center + 70);
    const yMin = Math.max(12, yStart - 30), yMax = Math.min(I(context.maxY) - 215, yStart + 115);

    // Buried treasure fallback: find a 2x3 fully-solid pocket under the island, carve only
    // the 2x2 chest volume and leave its floor intact.
    for (let y = yMin; y <= yMax; y++) {
        for (let local = localMin; local <= localMax; local++) {
            const x0 = ActualX(local, atLeft);
            const left = atLeft ? x0 : x0 - 1;
            let solidBox = true;
            for (let dy = 0; dy < 3 && solidBox; dy++) for (let dx = 0; dx < 2; dx++) {
                if (!Solid(left + dx, y + dy)) { solidBox = false; break; }
            }
            if (!solidBox) continue;
            for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) ClearCell(left + dx, y + dy, 2);
            const chest = PlaceRustyChestAt(left, y, 'EffigyOfDecay', 'treasure');
            if (chest) {
                // Small official-style sandstone marker near the local surface.
                for (let sy = Math.max(3, yStart - 8); sy <= Math.min(yStart + 14, y - 1); sy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const t = TileAt(left + dx, sy); if (!t || !Active(t)) continue;
                        t.type = SANDSTONE; t.liquid = 0; TryCall(t, 'void liquidType(int liquidType)', 0);
                    }
                }
                return chest;
            }
        }
    }
    return null;
}

function FallbackOpenAirChest(context, placement) {
    const width = I(placement.width), yStart = I(placement.yStart), depth = I(placement.blockDepth);
    return FallbackFloorScan(context, placement, 55, width - 45, yStart + 8, yStart + Math.max(35, Math.floor(depth * 0.55)), 'BrokenWaterFilter', 'openAir', true);
}

function FallbackScrapPileChest(context, placement, scraps) {
    if (!Array.isArray(scraps) || scraps.length === 0) return null;
    const atLeft = placement.atLeft === true;
    for (const s of scraps) {
        if (!s) continue;
        const worldCenter = I(s.x, I(s.left) + Math.floor(I(s.width) / 2));
        const localCenter = atLeft ? worldCenter : I(Terraria.Main.maxTilesX) - 1 - worldCenter;
        const yCenter = I(s.y, I(s.top) + I(s.height));
        const chest = FallbackFloorScan(context, placement, localCenter - 55, localCenter + 55, yCenter - 30, yCenter + 45, 'RustyBeaconPrototype', 'scrap', true);
        if (chest) return chest;
    }
    return null;
}

function FallbackDeepWaterChest(context, placement) {
    const width = I(placement.width), yStart = I(placement.yStart), depth = I(placement.blockDepth);
    const y0 = yStart + Math.max(25, depth - 175);
    const y1 = yStart + Math.max(40, depth - 52);
    return FallbackFloorScan(context, placement, 55, width - 55, y0, y1, 'ScionsCurio', 'deepWater', true);
}

function AddUniqueKind(out, chest) {
    if (!chest) return false;
    if (out.some(c => String(c.kind || '') === String(chest.kind || ''))) return false;
    out.push(chest); return true;
}

export function CompleteMissingRustyChests(context, placement, scraps = [], existing = []) {
    const out = Array.isArray(existing) ? existing.slice() : [];
    const have = new Set(out.map(c => String(c?.kind || '')));
    const added = [];
    const tryAdd = (kind, fn) => {
        if (have.has(kind)) return;
        const c = fn();
        if (c) { out.push(c); added.push(c); have.add(kind); Log(`completion placed ${kind} chest at ${c.left},${c.top} via ${c.method || 'fallback'}.`); }
        else Log(`completion could not place ${kind} chest.`);
    };

    tryAdd('treasure', () => FallbackTreasureChest(context, placement));
    tryAdd('openAir', () => FallbackOpenAirChest(context, placement));
    tryAdd('scrap', () => FallbackScrapPileChest(context, placement, scraps));
    tryAdd('deepWater', () => FallbackDeepWaterChest(context, placement));
    return { chests: out, added, requested: 4, generated: out.length, filledSlots: added.reduce((n, c) => n + I(c.filled), 0) };
}

function GenerateChests(context, placement, scraps) {
    const chests = [];
    const fallbackKinds = [];

    let treasure = GenerateTreasureChest(context, placement);
    if (!treasure) { treasure = FallbackTreasureChest(context, placement); if (treasure) fallbackKinds.push('treasure'); }
    AddUniqueKind(chests, treasure);

    // Official Calamity settles water here. TLPro does not expose CalamityUtils.SettleWater,
    // so the following placement routines retain the official random pass and then use a
    // bounded geometry scan against the final post-Abyss terrain.
    let openAir = GenerateOpenAirChest(context, placement);
    if (!openAir) { openAir = FallbackOpenAirChest(context, placement); if (openAir) fallbackKinds.push('openAir'); }
    AddUniqueKind(chests, openAir);

    let scrap = GenerateScrapPileChest(context, placement, scraps);
    if (!scrap) { scrap = FallbackScrapPileChest(context, placement, scraps); if (scrap) fallbackKinds.push('scrap'); }
    AddUniqueKind(chests, scrap);

    let deep = GenerateDeepWaterChest(context, placement);
    if (!deep) { deep = FallbackDeepWaterChest(context, placement); if (deep) fallbackKinds.push('deepWater'); }
    AddUniqueKind(chests, deep);

    return {
        chests,
        requested: 4,
        generated: chests.length,
        filledSlots: chests.reduce((n, c) => n + I(c.filled), 0),
        fallbackKinds
    };
}

export const SulphurousSeaAmbienceRuntime = {
    Generate(context, placement, scraps = [], accessor = null) {
        const started = Date.now();
        ScanAccessor = accessor || null;
        VisualOccupied = new Set();
        try {
        const ambience = PlaceAmbience(context, placement);
        const chestResult = GenerateChests(context, placement, scraps);
        const result = {
            ambience: ambience.objects,
            ambienceCounts: ambience.counts,
            ambienceHostCells: ambience.hostCells,
            chests: chestResult.chests,
            chestsRequested: chestResult.requested,
            chestsGenerated: chestResult.generated,
            chestFilledSlots: chestResult.filledSlots,
            chestFallbackKinds: chestResult.fallbackKinds || [],
            modified: ambience.modified,
            source: 'official-Calamity-SulphurousSea.PlaceAmbience+GenerateChests',
            elapsedMs: Date.now() - started
        };
        Log(`generated ambience=${result.ambience.length} (crate=${ambience.counts.crate}, geyser=${ambience.counts.geyser}, stalagmite=${ambience.counts.stalagmite}, fossil=${ambience.counts.fossil}, rib=${ambience.counts.rib}, stalactite=${ambience.counts.stalactite}), rustyChests=${result.chestsGenerated}/${result.chestsRequested}, fallbacks=${(result.chestFallbackKinds || []).join(',') || 'none'}, filledSlots=${result.chestFilledSlots}, elapsed=${result.elapsedMs}ms.`);
        return result;
        } finally { ScanAccessor = null; VisualOccupied = null; }
    },
    Definitions: AMBIENCE
};
