import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { FillChestByIndex, GetChestByIndex } from './OfficialSchematicRuntime.js';
import { FillGiantHiveChestByIndex } from './GiantHiveRuntime.js';

// Calamity base planetoids, adapted from World/Planets/*.cs.
// This phase intentionally excludes the post-Moon Lord Luminite/Exodium planetoids.
const DIRT = 0;
const STONE = 1;
const GRASS = 2;
const LIFE_CRYSTAL = 12;
const MUD = 59;
const JUNGLE_GRASS = 60;
const HIVE = 225;
const HONEY_BLOCK = 229;
const CHEST = 21;
const DIRT_WALL = 2;
const MUD_WALL = 15;
const HIVE_WALL = 86;
const MAIN_STONE_WALL = 54;
const GRASS_STONE_WALL = 55;
const HEART_STONE_WALL = 56;
const HONEY_LIQUID = 2;
const SKY_EXCLUDED = new Set([189, 196, 202]);
const MAX_MAIN_TRIES = 96;
const MAX_SMALL_TRIES = 180;


function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = 0) { return Math.floor(N(v, f)); }
function Clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function Log(s) { try { tl.log(`[CalamityPort Planetoids] ${s}`); } catch (e) {} }
function Key(x, y) { return `${I(x)},${I(y)}`; }
function InWorld(x, y, margin = 8) {
    return x >= margin && y >= margin && x < I(Terraria.Main.maxTilesX) - margin && y < I(Terraria.Main.maxTilesY) - margin;
}
function TileAt(x, y) { try { return Terraria.Main.tile.get_Item(I(x), I(y)); } catch (e) { return null; } }
function Active(t) { try { return !!t && t['bool active()']() === true; } catch (e) { return false; } }
function SetActive(t, v) { try { t['void active(bool active)'](v === true); } catch (e) {} }
function TryCall(t, signature, value) {
    try { if (t && typeof t[signature] === 'function') { t[signature](value); return true; } } catch (e) {}
    return false;
}
function ClearTile(t, wall = 0, liquid = 0, liquidType = 0) {
    SetActive(t, false);
    t.type = 0;
    t.frameX = -1;
    t.frameY = -1;
    t.wall = wall;
    t.liquid = Clamp(I(liquid), 0, 255);
    TryCall(t, 'void liquidType(int liquidType)', liquidType);
    TryCall(t, 'void halfBrick(bool halfBrick)', false);
    TryCall(t, 'void slope(byte slope)', 0);
}
function SolidTile(t, type, wall = 0) {
    SetActive(t, true);
    t.type = I(type);
    t.frameX = -1;
    t.frameY = -1;
    t.wall = I(wall);
    t.liquid = 0;
    TryCall(t, 'void liquidType(int liquidType)', 0);
    TryCall(t, 'void halfBrick(bool halfBrick)', false);
    TryCall(t, 'void slope(byte slope)', 0);
}
function Put(plan, x, y, type, wall, priority = 0, active = true, liquid = 0, liquidType = 0) {
    x = I(x); y = I(y);
    if (!InWorld(x, y, 5)) return;
    const k = Key(x, y), old = plan.get(k);
    if (!old || priority >= old.p)
        plan.set(k, { x, y, type: I(type), wall: I(wall), p: priority, active: active === true, liquid: I(liquid), liquidType: I(liquidType) });
}
function Circle(plan, cx, cy, radius, type, wall, priority = 1, active = true) {
    const rr = radius * radius;
    for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++)
            if (dx * dx + dy * dy <= rr) Put(plan, cx + dx, cy + dy, type, wall, priority, active);
}
function BlobbyCircle(plan, cx, cy, radius, type, wall, priority = 1, active = true, roughness = 0.11) {
    const sectors = 24;
    const radii = new Array(sectors);
    for (let i = 0; i < sectors; i++) radii[i] = radius * WorldGenRand.NextFloat(1 - roughness, 1 + roughness);
    const maxR = Math.ceil(radius * (1 + roughness));
    for (let dy = -maxR; dy <= maxR; dy++) {
        for (let dx = -maxR; dx <= maxR; dx++) {
            const d2 = dx * dx + dy * dy;
            if (d2 > maxR * maxR) continue;
            let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2;
            const pos = a / (Math.PI * 2) * sectors;
            const i0 = Math.floor(pos) % sectors, i1 = (i0 + 1) % sectors, f = pos - Math.floor(pos);
            const localR = radii[i0] * (1 - f) + radii[i1] * f;
            if (d2 <= localR * localR) Put(plan, cx + dx, cy + dy, type, wall, priority, active);
        }
    }
}
function CarveCircle(plan, cx, cy, radius, wall = 0, priority = 8, liquidChance = 0, liquidType = 0) {
    const rr = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > rr) continue;
        const liquid = liquidChance > 0 && WorldGenRand.NextChance(liquidChance) ? 255 : 0;
        Put(plan, cx + dx, cy + dy, 0, wall, priority, false, liquid, liquid > 0 ? liquidType : 0);
    }
}
function BlobPatch(plan, cx, cy, radius, type, wall, priority = 5) {
    BlobbyCircle(plan, cx, cy, Math.max(2, I(radius)), type, wall, priority, true, 0.22);
}
function Tunnel(plan, x1, y1, x2, y2, width, wall, priority = 9) {
    const dx = x2 - x1, dy = y2 - y1;
    const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / 2));
    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        CarveCircle(plan, Math.round(x1 + dx * t), Math.round(y1 + dy * t), width, wall, priority);
    }
}
function ApplyCell(c) {
    const t = TileAt(c.x, c.y);
    if (!t) return { modified: 0, solids: 0, cleared: 0, liquids: 0 };
    if (c.active) {
        SolidTile(t, c.type, c.wall);
        return { modified: 1, solids: 1, cleared: 0, liquids: 0 };
    }
    ClearTile(t, c.wall, c.liquid, c.liquidType);
    return { modified: 1, solids: 0, cleared: 1, liquids: c.liquid > 0 ? 1 : 0 };
}
function ApplyPlan(plan) {
    const stats = { modified: 0, solids: 0, cleared: 0, liquids: 0 };
    for (const c of plan.values()) {
        const q = ApplyCell(c);
        stats.modified += q.modified; stats.solids += q.solids; stats.cleared += q.cleared; stats.liquids += q.liquids;
    }
    return stats;
}
function Bounds(plan) {
    let left = 1e9, right = -1e9, top = 1e9, bottom = -1e9;
    for (const c of plan.values()) { left = Math.min(left, c.x); right = Math.max(right, c.x); top = Math.min(top, c.y); bottom = Math.max(bottom, c.y); }
    return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}
function RectsOverlap(a, b, pad = 0) {
    return !(a.right + pad < b.left || a.left - pad > b.right || a.bottom + pad < b.top || a.top - pad > b.bottom);
}
function CandidateRect(x, y, radius) {
    const r = radius + 12;
    return { left: x - r, top: y - r, right: x + r, bottom: y + r };
}
function AreaClearEnough(x, y, radius, occupied) {
    const rect = CandidateRect(x, y, radius);
    if (!InWorld(rect.left, rect.top, 5) || !InWorld(rect.right, rect.bottom, 5)) return false;
    for (const o of occupied) if (RectsOverlap(rect, o, 8)) return false;

    // Coarse scan first: the official source rejects floating-island cloud tiles and
    // locations containing more than two solid tiles. Mobile uses a bounded 6-tile
    // stride here so failed candidates do not cause giant native bridge scans.
    let active = 0;
    for (let yy = rect.top; yy <= rect.bottom; yy += 6) {
        for (let xx = rect.left; xx <= rect.right; xx += 6) {
            const t = TileAt(xx, yy); if (!t) continue;
            if (Active(t)) {
                const type = I(t.type, 0);
                if (SKY_EXCLUDED.has(type)) return false;
                active++;
                if (active > 2) return false;
            }
        }
    }
    return true;
}
function FindCandidate(xMin, xMax, yMin, yMax, radius, occupied, tries) {
    xMin = Clamp(I(xMin), radius + 20, I(Terraria.Main.maxTilesX) - radius - 21);
    xMax = Clamp(I(xMax), xMin + 1, I(Terraria.Main.maxTilesX) - radius - 20);
    yMin = Clamp(I(yMin), radius + 10, I(Terraria.Main.maxTilesY) - radius - 21);
    yMax = Clamp(I(yMax), yMin + 1, I(Terraria.Main.maxTilesY) - radius - 20);
    for (let a = 0; a < tries; a++) {
        const x = WorldGenRand.NextInt(xMin, xMax + 1), y = WorldGenRand.NextInt(yMin, yMax + 1);
        if (AreaClearEnough(x, y, radius, occupied)) return { x, y, rect: CandidateRect(x, y, radius), attempts: a + 1 };
    }
    return null;
}
function ConvertSurface(plan, centerX, centerY, radius, fromTypes, toType) {
    const rr = (radius + 3) * (radius + 3);
    for (let y = centerY - radius - 3; y <= centerY + radius + 3; y++) for (let x = centerX - radius - 3; x <= centerX + radius + 3; x++) {
        const k = Key(x, y), c = plan.get(k);
        if (!c || !c.active || !fromTypes.has(c.type)) continue;
        if ((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY) > rr) continue;
        const above = plan.get(Key(x, y - 1));
        if (!above || !above.active) Put(plan, x, y, toType, c.wall, c.p + 2, true);
    }
}
function Vein(plan, cx, cy, r, type, wall) {
    const angle = WorldGenRand.NextFloat(0, Math.PI * 2);
    const length = WorldGenRand.NextInt(Math.max(7, r), Math.max(8, r * 2));
    const width = WorldGenRand.NextInt(1, 3);
    const x2 = cx + Math.round(Math.cos(angle) * length), y2 = cy + Math.round(Math.sin(angle) * length);
    const dx = x2 - cx, dy = y2 - cy, steps = Math.max(1, length);
    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        Circle(plan, Math.round(cx + dx * t), Math.round(cy + dy * t), width, type, wall, 7, true);
    }
}
function OppositeCopperOre() {
    try { return I(Terraria.WorldBuilding.GenVars.copper, 7) === 7 ? 166 : 7; } catch (e) { return 166; }
}
function OppositeIronOre() {
    try { return I(Terraria.WorldBuilding.GenVars.iron, 6) === 6 ? 167 : 6; } catch (e) { return 167; }
}
function WorldCopperBar() {
    try { return I(Terraria.WorldBuilding.GenVars.copper, 7) === 7 ? 20 : 703; } catch (e) { return 20; }
}
function WorldIronBar() {
    try { return I(Terraria.WorldBuilding.GenVars.iron, 6) === 6 ? 22 : 704; } catch (e) { return 22; }
}
function Choose(a) { return a[WorldGenRand.NextInt(0, a.length)]; }
function SetChestTiles(x, y, style, wall = 0) {
    const base = style * 36;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const t = TileAt(x + dx, y + dy); if (!t) continue;
        SetActive(t, true); t.type = CHEST; t.frameX = base + dx * 18; t.frameY = dy * 18; t.wall = wall; t.liquid = 0;
        TryCall(t, 'void liquidType(int liquidType)', 0); TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    }
}
function PlaceChestSafe(x, y, style, supportType, wall = 0) {
    x = I(x); y = I(y);
    for (let dx = 0; dx < 2; dx++) { const t = TileAt(x + dx, y + 2); if (t) SolidTile(t, supportType, wall); }
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const t = TileAt(x + dx, y + dy); if (t) ClearTile(t, wall); }
    let idx = -1;
    try {
        const placeChest = Terraria.WorldGen['int PlaceChest(int x, int y, ushort type, bool notNearOtherChests, int style)'];
        if (typeof placeChest === 'function') idx = I(placeChest(x, y + 1, CHEST, false, style), -1);
    } catch (e) {}
    if (idx < 0) {
        SetChestTiles(x, y, style, wall);
        try { idx = I(Terraria.Chest['int CreateChest(int X, int Y, int id)'](x, y, -1), -1); } catch (e) {}
    }
    return idx;
}
function FillMudChest(chestIndex) {
    const contents = [[Choose([187, 268, 277]), 1, -1]];
    if (WorldGenRand.NextInt(0, 3) <= 1) contents.push([Choose([WorldCopperBar(), WorldIronBar()]), WorldGenRand.NextInt(7, 15)]);
    else contents.push([73, WorldGenRand.NextInt(2, 4)]);
    if (WorldGenRand.NextBool()) contents.push([Choose([2327, 289, 302, 299, 305, 2346]), WorldGenRand.NextInt(1, 4)]);
    else contents.push([188, WorldGenRand.NextInt(3, 7)]);
    if (WorldGenRand.NextBool()) contents.push([Choose([42, 279]), WorldGenRand.NextInt(50, 100)]);
    else contents.push([Choose([168, 166]), WorldGenRand.NextInt(5, 10)]);
    if (WorldGenRand.NextBool()) contents.push([2350, WorldGenRand.NextInt(1, 4)]);
    else contents.push([282, WorldGenRand.NextInt(18, 36)]);
    return FillChestByIndex(chestIndex, contents);
}
function PlaceLifeCrystal(x, y) {
    // Vanilla Life Crystal is a 2x2 frame-important tile. Manual framing avoids
    // relying on an AddLifeCrystal reflection lookup that is not stable on TLPro.
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const t = TileAt(x + dx, y + dy); if (!t) return false;
        SetActive(t, true); t.type = LIFE_CRYSTAL; t.frameX = dx * 18; t.frameY = dy * 18; t.liquid = 0;
        TryCall(t, 'void liquidType(int liquidType)', 0); TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    }
    return true;
}
function BuildMainPlanet(x, y, radius) {
    const plan = new Map();
    BlobbyCircle(plan, x, y, radius, DIRT, DIRT_WALL, 1, true, 0.08);
    const coreRadius = Math.floor(radius * WorldGenRand.NextFloat(0.75, 0.85));
    BlobbyCircle(plan, x, y, coreRadius, STONE, MAIN_STONE_WALL, 3, true, 0.08);
    for (let n = WorldGenRand.NextInt(30, 40); n > 0; n--) {
        const a = WorldGenRand.NextFloat(0, Math.PI * 2), rr = coreRadius + WorldGenRand.NextInt(-2, 3);
        BlobPatch(plan, x + Math.round(Math.cos(a) * rr), y + Math.round(Math.sin(a) * rr), WorldGenRand.NextInt(2, 5), STONE, MAIN_STONE_WALL, 4);
    }
    for (let n = WorldGenRand.NextInt(80, 110); n > 0; n--) {
        const a = WorldGenRand.NextFloat(0, Math.PI * 2), rr = Math.sqrt(WorldGenRand.NextFloat()) * Math.max(3, coreRadius - 3);
        BlobPatch(plan, x + Math.round(Math.cos(a) * rr), y + Math.round(Math.sin(a) * rr), WorldGenRand.NextInt(2, 5), DIRT, DIRT_WALL, 5);
    }
    const caves = WorldGenRand.NextInt(8, 14);
    for (let n = 0; n < caves; n++) {
        const a = WorldGenRand.NextFloat(0, Math.PI * 2), rr = Math.sqrt(WorldGenRand.NextFloat()) * radius * 0.72;
        const cx = x + Math.round(Math.cos(a) * rr), cy = y + Math.round(Math.sin(a) * rr);
        const a2 = WorldGenRand.NextFloat(0, Math.PI * 2), len = WorldGenRand.NextInt(10, 24);
        Tunnel(plan, cx, cy, cx + Math.round(Math.cos(a2) * len), cy + Math.round(Math.sin(a2) * len), WorldGenRand.NextInt(3, 6), MAIN_STONE_WALL, 9);
    }
    const labLeftSide = WorldGenRand.NextBool();
    const corridorLength = Math.floor(radius * WorldGenRand.NextFloat(0.7, 0.8));
    Tunnel(plan, x, y, x + (labLeftSide ? corridorLength : -corridorLength), y, 5, MAIN_STONE_WALL, 10);
    // Record the laboratory center for the next Draedon-lab phase. The natural
    // planet remains intact in this build; the official schematic can overwrite
    // this bounded center later without regenerating the shell.
    ConvertSurface(plan, x, y, radius, new Set([DIRT]), GRASS);
    return { plan, labLeftSide, coreRadius, reservedLab: { left: x - 24, top: y - 16, width: 49, height: 33 } };
}
function BuildGrassPlanet(x, y, radius) {
    const plan = new Map();
    BlobbyCircle(plan, x, y, radius, DIRT, DIRT_WALL, 1, true, 0.10);
    const coreRadius = Math.floor(radius * WorldGenRand.NextFloat(0.74, 0.82));
    BlobbyCircle(plan, x, y, coreRadius, STONE, GRASS_STONE_WALL, 3, true, 0.10);
    const stonePatches = Math.floor(radius * 0.4 * 0.6), dirtPatches = Math.floor(radius * 0.4);
    for (let n = 0; n < stonePatches; n++) {
        const a = WorldGenRand.NextFloat(0, Math.PI * 2), rr = WorldGenRand.NextFloat(coreRadius, radius);
        BlobPatch(plan, x + Math.round(Math.cos(a) * rr), y + Math.round(Math.sin(a) * rr), WorldGenRand.NextInt(2, 5), STONE, GRASS_STONE_WALL, 5);
    }
    for (let n = 0; n < dirtPatches; n++) {
        const a = WorldGenRand.NextFloat(0, Math.PI * 2), rr = Math.sqrt(WorldGenRand.NextFloat()) * coreRadius;
        BlobPatch(plan, x + Math.round(Math.cos(a) * rr), y + Math.round(Math.sin(a) * rr), WorldGenRand.NextInt(2, 5), DIRT, DIRT_WALL, 6);
    }
    const ores = [OppositeCopperOre(), OppositeIronOre()];
    const strokes = radius > 20 ? 3 : 2;
    for (let n = 0; n < strokes; n++) Vein(plan, x, y, Math.floor(radius * 0.7), Choose(ores), GRASS_STONE_WALL);
    ConvertSurface(plan, x, y, radius, new Set([DIRT]), GRASS);
    return { plan, coreRadius, oreTypes: ores };
}
function BuildHeartPlanet(x, y, radius) {
    const plan = new Map();
    BlobbyCircle(plan, x, y, radius, STONE, HEART_STONE_WALL, 1, true, 0.10);
    const gem = Choose([67, 66]);
    BlobPatch(plan, x, y, WorldGenRand.NextInt(3, 5), gem, HEART_STONE_WALL, 4);
    const moss = Choose([182, 179, 183, 181]);
    ConvertSurface(plan, x, y, radius, new Set([STONE]), moss);
    const width = WorldGenRand.NextInt(3, 5) * 2, height = WorldGenRand.NextInt(5, 8);
    const left = x - Math.floor(width / 2), top = y - Math.floor(height / 2);
    const gold = WorldGenRand.NextBool(), brick = gold ? 45 : 177, wall = gold ? 10 : 47;
    for (let yy = top; yy < top + height; yy++) for (let xx = left; xx < left + width; xx++) {
        const edge = xx === left || yy === top || xx === left + width - 1 || yy === top + height - 1;
        Put(plan, xx, yy, edge ? brick : 0, wall, 10, edge);
    }
    return { plan, lifeCrystalX: x - 1, lifeCrystalY: y + 1, gem, moss };
}
function BuildMudPlanet(x, y, radius) {
    const plan = new Map();
    BlobbyCircle(plan, x, y, radius, MUD, MUD_WALL, 1, true, 0.10);
    for (let n = WorldGenRand.NextInt(3, 9); n > 0; n--) {
        const a = WorldGenRand.NextFloat(0, Math.PI * 2), rr = Math.sqrt(WorldGenRand.NextFloat()) * Math.max(3, radius - 3);
        BlobPatch(plan, x + Math.round(Math.cos(a) * rr), y + Math.round(Math.sin(a) * rr), WorldGenRand.NextInt(2, 5), STONE, MUD_WALL, 4);
    }
    ConvertSurface(plan, x, y, radius, new Set([MUD]), JUNGLE_GRASS);
    let variant = 'plain', chest = null;
    if (WorldGenRand.NextBool()) {
        variant = 'hive';
        const blobs = WorldGenRand.NextInt(3, 6), inner = radius * 0.55;
        for (let n = 0; n < blobs; n++) {
            const cx = x + WorldGenRand.NextInt(-Math.floor(inner), Math.floor(inner) + 1), cy = y + WorldGenRand.NextInt(-Math.floor(inner), Math.floor(inner) + 1);
            CarveCircle(plan, cx, cy, WorldGenRand.NextInt(Math.max(3, Math.floor(radius * 0.4)), Math.max(4, Math.floor(radius * 0.6)) + 1), HIVE_WALL, 8, 1 / 7, HONEY_LIQUID);
        }
        // One-tile hive shell around the carved chamber.
        const snapshot = Array.from(plan.values()).filter(c => !c.active && c.wall === HIVE_WALL);
        for (const c of snapshot) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
            const k = Key(c.x + dx, c.y + dy), q = plan.get(k);
            if (q && q.active && (q.type === MUD || q.type === JUNGLE_GRASS)) Put(plan, c.x + dx, c.y + dy, HIVE, MUD_WALL, 7, true);
        }
        chest = { x: x - 1, y: y + Math.max(1, Math.floor(radius * 0.15)), style: 29, support: HIVE, wall: HIVE_WALL, honey: true };
    } else if (WorldGenRand.NextInt(0, 4) <= 2) {
        variant = 'cavern';
        const caveRadius = Math.max(3, Math.floor(radius * WorldGenRand.NextFloat(0.35, 0.5)));
        CarveCircle(plan, x, y, caveRadius, MUD_WALL, 8, WorldGenRand.NextFloat(1 / 3.5, 1 / 2.2), 0);
        chest = { x: x - 1, y: y + Math.max(1, caveRadius - 2), style: 17, support: MUD, wall: MUD_WALL, honey: false };
    }
    return { plan, variant, chest };
}
function PrepareOne(kind, x, y, radius) {
    let built;
    if (kind === 'main') built = BuildMainPlanet(x, y, radius);
    else if (kind === 'grass') built = BuildGrassPlanet(x, y, radius);
    else if (kind === 'heart') built = BuildHeartPlanet(x, y, radius);
    else built = BuildMudPlanet(x, y, radius);
    return {
        kind, x, y, radius, built,
        entries: Array.from(built.plan.values()),
        cursor: 0,
        bounds: Bounds(built.plan),
        stats: { modified: 0, solids: 0, cleared: 0, liquids: 0 }
    };
}
function FinishPrepared(prepared, occupied) {
    const { kind, x, y, radius, built, bounds, stats } = prepared;
    occupied.push(CandidateRect(x, y, radius));
    let chest = null, lifeCrystal = false;
    if (kind === 'mud' && built.chest) {
        const c = built.chest, idx = PlaceChestSafe(c.x, c.y, c.style, c.support, c.wall);
        if (idx >= 0) {
            const filled = c.honey ? FillGiantHiveChestByIndex(idx) : FillMudChest(idx);
            const native = GetChestByIndex(idx);
            chest = { x: native ? I(native.x, c.x) : c.x, y: native ? I(native.y, c.y) : c.y, index: idx, filled, style: c.style };
        }
    }
    if (kind === 'heart') lifeCrystal = PlaceLifeCrystal(built.lifeCrystalX, built.lifeCrystalY);
    return { kind, x, y, radius, bounds, chest, lifeCrystal, variant: built.variant || '', labLeftSide: built.labLeftSide === true, reservedLab: built.reservedLab || null, ...stats };
}
function BuildJobs(maxX) {
    const grassTarget = Math.max(1, Math.floor(maxX / 750));
    const heartTarget = Math.max(1, Math.floor(maxX / 1500));
    const mudTarget = Math.max(1, Math.floor(maxX / 1000));
    const jobs = [{ kind: 'main' }];
    for (let i = 0; i < heartTarget; i++) jobs.push({ kind: 'heart' });
    for (let i = 0; i < grassTarget; i++) jobs.push({ kind: 'grass' });
    for (let i = 0; i < mudTarget; i++) jobs.push({ kind: 'mud' });
    return { jobs, targets: { main: 1, heart: heartTarget, grass: grassTarget, mud: mudTarget } };
}
function CandidateForJob(job, maxX, occupied) {
    if (job.kind === 'main') {
        const radius = 54;
        const c = FindCandidate(maxX / 2 - 300, maxX / 2 + 300, 128, 134, radius, occupied, MAX_MAIN_TRIES);
        return c ? { ...c, radius } : null;
    }
    if (job.kind === 'heart') {
        const radius = WorldGenRand.NextInt(6, 10);
        const c = FindCandidate(maxX * 0.15, maxX * 0.85, 70, 100, radius, occupied, MAX_SMALL_TRIES);
        return c ? { ...c, radius } : null;
    }
    if (job.kind === 'grass') {
        const radius = WorldGenRand.NextInt(16, 24);
        const c = FindCandidate(maxX * 0.25, maxX * 0.75, 100, 130, radius, occupied, MAX_SMALL_TRIES);
        return c ? { ...c, radius } : null;
    }
    const radius = WorldGenRand.NextInt(12, 19);
    const c = FindCandidate(maxX * 0.25, maxX * 0.75, 100, 130, radius, occupied, MAX_SMALL_TRIES);
    return c ? { ...c, radius } : null;
}
function ResultFromSession(session) {
    const main = session.planets.find(p => p.kind === 'main') || null;
    const counts = {
        main: main ? 1 : 0,
        heart: session.planets.filter(p => p.kind === 'heart').length,
        grass: session.planets.filter(p => p.kind === 'grass').length,
        mud: session.planets.filter(p => p.kind === 'mud').length
    };
    return {
        generated: session.planets.length > 0,
        planets: session.planets,
        counts,
        targetCounts: session.targets,
        mainX: main ? main.x : -1,
        mainY: main ? main.y : -1,
        mainRadius: main ? main.radius : 54,
        mainLabReserved: !!(main && main.reservedLab),
        source: 'official-Calamity-World/Planets-base/post-load-incremental-v1',
        elapsedMs: Date.now() - session.started
    };
}

export const PlanetoidRuntime = {
    CreateSession(context = {}) {
        const maxX = I(context.maxX, I(Terraria.Main.maxTilesX));
        const built = BuildJobs(maxX);
        return { started: Date.now(), maxX, jobs: built.jobs, targets: built.targets, jobIndex: 0, occupied: [], planets: [], current: null, done: false };
    },
    StepSession(session, tileBudget = 600) {
        if (!session || session.done) return { done: true, result: session ? ResultFromSession(session) : null, applied: 0 };
        let applied = 0;
        while (applied < tileBudget) {
            if (!session.current) {
                if (session.jobIndex >= session.jobs.length) {
                    session.done = true;
                    const result = ResultFromSession(session);
                    Log(`incremental complete main=${result.counts.main}/${result.targetCounts.main} heart=${result.counts.heart}/${result.targetCounts.heart} grass=${result.counts.grass}/${result.targetCounts.grass} mud=${result.counts.mud}/${result.targetCounts.mud} total=${result.planets.length} elapsed=${result.elapsedMs}ms.`);
                    return { done: true, result, applied };
                }
                const job = session.jobs[session.jobIndex++];
                const c = CandidateForJob(job, session.maxX, session.occupied);
                if (!c) { Log(`candidate skipped kind=${job.kind}; no safe sky position found.`); continue; }
                session.current = PrepareOne(job.kind, c.x, c.y, c.radius);
                Log(`incremental start kind=${job.kind} center=${c.x},${c.y} radius=${c.radius} cells=${session.current.entries.length}.`);
            }
            const cur = session.current;
            while (cur.cursor < cur.entries.length && applied < tileBudget) {
                const q = ApplyCell(cur.entries[cur.cursor++]);
                cur.stats.modified += q.modified; cur.stats.solids += q.solids; cur.stats.cleared += q.cleared; cur.stats.liquids += q.liquids;
                applied++;
            }
            if (cur.cursor < cur.entries.length) break;
            session.planets.push(FinishPrepared(cur, session.occupied));
            Log(`incremental planet complete kind=${cur.kind} center=${cur.x},${cur.y} modified=${cur.stats.modified}.`);
            session.current = null;
        }
        return { done: false, applied };
    },
    Generate(context) {
        const session = this.CreateSession(context);
        let guard = 0, step;
        do { step = this.StepSession(session, 1000000); } while (!step.done && guard++ < 1000);
        return step.result || ResultFromSession(session);
    }
};
