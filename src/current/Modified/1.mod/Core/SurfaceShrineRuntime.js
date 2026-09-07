import { Terraria } from './../TL/ModImports.js';
import { ModItem } from './../TL/ModItem.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { SurfaceShrineSchematic } from './../Data/OfficialSchematics/SurfaceShrineSchematic.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import {
    OfficialSchematicRuntime,
    FillChestByIndex,
    ResolveVanillaItemID
} from './OfficialSchematicRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';

const DUNGEON_TILES = new Set([
    ResolveTileID('BlueDungeonBrick', 41),
    ResolveTileID('GreenDungeonBrick', 43),
    ResolveTileID('PinkDungeonBrick', 44)
]);
const LIHZAHRD_BRICK = ResolveTileID('LihzahrdBrick', 226);
const LIHZAHRD_WALL = ResolveWallID('LihzahrdBrickUnsafe', 87);
const SUNKEN_AVOID_TILES = new Set([Number(BiomeAnchorTiles.SunkenEutrophic), 385]);
const SURFACE_NORMAL_TILES = new Set([
    ResolveTileID('Dirt', 0),
    ResolveTileID('Stone', 1),
    ResolveTileID('ClayBlock', 40),
    ResolveTileID('Sand', 53)
]);
const SURFACE_DESERT_WALLS = new Set([
    ResolveWallID('HardenedSand', 187),
    ResolveWallID('Sandstone', 216)
]);
const LIVING_WOOD_TILE = ResolveTileID('LivingWood', 191);
const LEAF_BLOCK_TILE = ResolveTileID('LeafBlock', 192);
const SAND_TILE = ResolveTileID('Sand', 53);
const HARDENED_SAND_TILE = ResolveTileID('HardenedSand', 397);
const CONTAINERS_TILE = ResolveTileID('Containers', 21);
const CONTAINERS2_TILE = ResolveTileID('Containers2', 467);

function ResolveTileID(name, fallback) {
    try {
        const value = Number(Terraria.ID.TileID[name]);
        if (Number.isFinite(value) && value >= 0)
            return value;
    } catch (e) { }
    return Number(fallback) || 0;
}
function ResolveWallID(name, fallback) {
    try {
        const value = Number(Terraria.ID.WallID[name]);
        if (Number.isFinite(value) && value >= 0)
            return value;
    } catch (e) { }
    return Number(fallback) || 0;
}
function IsActive(tile) { try { return tile != null && tile['bool active()']() === true; } catch (e) { return false; } }
function Clamp(v, min, max) { return Math.max(min, Math.min(max, Math.floor(Number(v) || 0))); }
function InWorld(x, y) { return x >= 2 && y >= 2 && x < Number(Terraria.Main.maxTilesX) - 2 && y < Number(Terraria.Main.maxTilesY) - 2; }
function Log(message) { try { tl.log(`[CalamityPort SurfaceShrine] ${message}`); } catch (e) { } }

function ShouldAvoidShrineTile(tile, careAboutLiquids = true) {
    if (!tile)
        return true;
    if (careAboutLiquids && Number(tile.liquid) > 0)
        return true;
    const type = Number(tile.type) || 0;
    const wall = Number(tile.wall) || 0;
    if (DUNGEON_TILES.has(type) || type === LIHZAHRD_BRICK || wall === LIHZAHRD_WALL)
        return true;
    if (SUNKEN_AVOID_TILES.has(type))
        return true;
    return false;
}

function IsInsidePlannedSunkenCell(sunkenPlacement, x, y) {
    if (!sunkenPlacement)
        return false;
    const localX = Math.floor(Number(x) - Number(sunkenPlacement.left));
    const localY = Math.floor(Number(y) - Number(sunkenPlacement.top));
    const width = Math.floor(Number(sunkenPlacement.width) || 0);
    const height = Math.floor(Number(sunkenPlacement.height) || 0);
    if (localX < 0 || localY < 0 || localX >= width || localY >= height)
        return false;
    return OrganicBiomePlanner.SunkenPlanCode(localX, localY, width, height) > 0;
}

function QuickInspectSurfaceShrineArea(left, top, sunkenPlacement = null) {
    const width = SurfaceShrineSchematic.width;
    const height = SurfaceShrineSchematic.height;
    let normalTiles = 0;
    let activeTiles = 0;
    let canGenerate = true;
    // Four-tile stride is only a rejection filter. Every promising candidate
    // still passes through the complete official 56x36 validation below.
    for (let x = left; x < left + width; x += 4) {
        for (let y = top; y < top + height; y += 4) {
            if (!InWorld(x, y)) {
                canGenerate = false;
                continue;
            }
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (IsInsidePlannedSunkenCell(sunkenPlacement, x, y) || ShouldAvoidShrineTile(tile, false))
                canGenerate = false;
            if (!tile)
                continue;
            const type = Number(tile.type) || 0;
            const wall = Number(tile.wall) || 0;
            if (IsActive(tile)) {
                activeTiles++;
                if (SURFACE_NORMAL_TILES.has(type))
                    normalTiles++;
            }
            if (SURFACE_DESERT_WALLS.has(wall))
                canGenerate = false;
        }
    }
    return { canGenerate, normalTiles, activeTiles, ratio: activeTiles > 0 ? normalTiles / activeTiles : 0 };
}

function InspectSurfaceShrineArea(left, top, sunkenPlacement = null) {
    const width = SurfaceShrineSchematic.width;
    const height = SurfaceShrineSchematic.height;
    let normalTiles = 0;
    let activeTiles = 0;
    let canGenerate = true;
    for (let x = left; x < left + width; x++) {
        for (let y = top; y < top + height; y++) {
            if (!InWorld(x, y)) {
                canGenerate = false;
                continue;
            }
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (IsInsidePlannedSunkenCell(sunkenPlacement, x, y) || ShouldAvoidShrineTile(tile, false))
                canGenerate = false;
            if (!tile)
                continue;
            const type = Number(tile.type) || 0;
            const wall = Number(tile.wall) || 0;
            if (IsActive(tile)) {
                activeTiles++;
                if (SURFACE_NORMAL_TILES.has(type))
                    normalTiles++;
            }
            if (SURFACE_DESERT_WALLS.has(wall))
                canGenerate = false;
        }
    }
    return { canGenerate, normalTiles, activeTiles, ratio: activeTiles > 0 ? normalTiles / activeTiles : 0 };
}

function FindSurfaceGroundY(x, shrineTop) {
    const maxY = Math.min(shrineTop - 1, Math.floor(Number(Terraria.Main.worldSurface) || shrineTop) + 120);
    for (let y = 10; y <= maxY; y++) {
        if (!InWorld(x, y))
            continue;
        const tile = Terraria.Main.tile.get_Item(x, y);
        if (!tile || !IsActive(tile))
            continue;
        const type = Number(tile.type) || 0;
        if (type === LIVING_WOOD_TILE || type === LEAF_BLOCK_TILE)
            continue;
        return y;
    }
    return -1;
}

function FindSurfaceShrineTunnel(left, top) {
    const centerX = left + Math.floor(SurfaceShrineSchematic.width * 0.5);
    const groundY = FindSurfaceGroundY(centerX, top);
    if (!(groundY >= 10))
        return null;
    for (let y = groundY; y < top; y++) {
        const tile = Terraria.Main.tile.get_Item(centerX, y);
        if (!tile)
            return null;
        const type = Number(tile.type) || 0;
        if (type === SAND_TILE || type === CONTAINERS_TILE || type === CONTAINERS2_TILE)
            return null;
    }
    const startY = groundY + 10;
    const endY = top - 1;
    if (endY < startY)
        return null;
    const rect = { left: centerX, top: startY, right: centerX + 1, bottom: endY + 1 };
    if (!OfficialStructureMap.CanPlace(rect, 2))
        return null;
    return { x: centerX, startY, endY, groundY, length: endY - startY + 1, rect };
}

function DeactivateTile(tile) {
    if (!tile)
        return false;
    const type = Number(tile.type) || 0;
    if (type === LIVING_WOOD_TILE || type === LEAF_BLOCK_TILE)
        return false;
    try { tile['void active(bool active)'](false); } catch (e) { return false; }
    try { tile.type = 0; } catch (e) { }
    try { tile.frameX = -1; tile.frameY = -1; } catch (e) { }
    try { tile['void halfBrick(bool halfBrick)'](false); } catch (e) { }
    try { tile['void slope(byte slope)'](0); } catch (e) { }
    return true;
}

function CarveSurfaceShrineTunnel(tunnel) {
    if (!tunnel)
        return 0;
    let cleared = 0;
    for (let y = tunnel.startY; y <= tunnel.endY; y++) {
        const center = Terraria.Main.tile.get_Item(tunnel.x, y);
        if (DeactivateTile(center))
            cleared++;
        for (const side of [-1, 1]) {
            const adjacent = Terraria.Main.tile.get_Item(tunnel.x + side, y);
            if (adjacent && IsActive(adjacent) && Number(adjacent.type) === SAND_TILE)
                adjacent.type = HARDENED_SAND_TILE;
        }
    }
    return cleared;
}

export function FillSurfaceShrineChestByIndex(chestIndex) {
    const potionTypes = [
        ResolveVanillaItemID('RecallPotion', 2350),
        ResolveVanillaItemID('CalmingPotion', 2326),
        ResolveVanillaItemID('SwiftnessPotion', 290)
    ];
    let zenith = false;
    try { zenith = Terraria.Main.zenithWorld === true; } catch (e) { }
    const potion = zenith ? ResolveVanillaItemID('Sake', 2266) : potionTypes[WorldGenRand.NextInt(0, potionTypes.length)];
    return FillChestByIndex(chestIndex, [
        [Number(ModItem.getTypeByName('TrinketofChi') || 0), 1, -1],
        [ResolveVanillaItemID('PinkGel', 3111), WorldGenRand.NextInt(12, 16), -1],
        [ResolveVanillaItemID('Torch', 8), WorldGenRand.NextInt(50, 61), -1],
        [ResolveVanillaItemID('GoldCoin', 73), WorldGenRand.NextInt(2, 5), -1],
        [zenith ? ResolveVanillaItemID('RestorationPotion', 227) : ResolveVanillaItemID('LesserHealingPotion', 28), WorldGenRand.NextInt(10, 13), -1],
        [potion, WorldGenRand.NextInt(10, 13), -1],
        [zenith ? ResolveVanillaItemID('GasTrap', 5346) : ResolveVanillaItemID('Mushroom', 5), zenith ? 1 : WorldGenRand.NextInt(5, 10), -1]
    ]);
}

export const SurfaceShrineRuntime = {
    Generate(context, sunkenPlacement = null) {
        const maxX = Math.floor(Number(context?.maxX) || Number(Terraria.Main.maxTilesX) || 4200);
        const maxY = Math.floor(Number(context?.maxY) || Number(Terraria.Main.maxTilesY) || 1200);
        const width = SurfaceShrineSchematic.width;
        const height = SurfaceShrineSchematic.height;
        let worldSurface = Math.floor(Number(Terraria.Main.worldSurface) || maxY * 0.25);
        let remixWorld = false;
        try { remixWorld = Terraria.Main.remixWorld === true; } catch (e) { }
        const leftMin = Clamp(Math.floor(maxX * 0.20), 20, maxX - width - 20);
        const leftMax = Clamp(Math.floor(maxX * 0.80) - width, leftMin + 1, maxX - width - 20);
        const centerLeft = Math.floor(maxX * 0.40);
        const centerRight = Math.floor(maxX * 0.60);
        if (!(leftMax > leftMin))
            return { generated: false, reason: 'surface-search-bounds-invalid' };
        let attempts = 0, left = leftMin, top = worldSurface + 25, inspection = null, tunnel = null;
        let found = false;
        const xStep = 8;
        const candidates = [];
        for (let x = leftMin; x <= leftMax; x += xStep) {
            if (x > centerLeft && x < centerRight)
                continue;
            candidates.push(x);
        }
        if (candidates.length === 0)
            return { generated: false, reason: 'surface-search-candidates-empty' };
        const start = WorldGenRand.NextInt(0, candidates.length);
        const normalDepthStart = WorldGenRand.NextInt(0, 25);
        const remixTopMin = Clamp(Math.floor(maxY * 0.65), 20, maxY - height - 20);
        const remixTopMax = Clamp(Math.floor(maxY * 0.70), remixTopMin + 1, maxY - height - 20);
        const remixSpan = Math.max(1, remixTopMax - remixTopMin);
        const depthCount = remixWorld ? Math.min(40, remixSpan) : 25;

        for (let depthIndex = 0; depthIndex < depthCount && !found; depthIndex++) {
            const depth = 25 + ((normalDepthStart + depthIndex) % 25);
            const remixOffset = (normalDepthStart + depthIndex) % remixSpan;
            top = remixWorld ? remixTopMin + remixOffset : Clamp(worldSurface + depth, 20, maxY - height - 20);
            for (let i = 0; i < candidates.length; i++) {
                attempts++;
                left = candidates[(start + i) % candidates.length];
                const quick = QuickInspectSurfaceShrineArea(left, top, sunkenPlacement);
                if (!quick.canGenerate || quick.ratio < 0.70)
                    continue;
                inspection = InspectSurfaceShrineArea(left, top, sunkenPlacement);
                const rect = { left, top, right: left + width, bottom: top + height };
                if (!inspection.canGenerate || inspection.ratio < 0.80 || !OfficialStructureMap.CanPlace(rect, 4))
                    continue;
                tunnel = remixWorld ? null : FindSurfaceShrineTunnel(left, top);
                if (!remixWorld && !tunnel)
                    continue;
                found = true;
                break;
            }
        }
        if (!found || !inspection || !inspection.canGenerate || inspection.ratio < 0.80 || (!remixWorld && !tunnel))
            return { generated: false, reason: 'no-valid-surface-shrine-location', attempts, remixWorld };
        const result = OfficialSchematicRuntime.Place(SurfaceShrineSchematic, { x: left, y: top }, 'topLeft', FillSurfaceShrineChestByIndex, 4);
        let tunnelCleared = 0;
        if (result.generated && tunnel)
            tunnelCleared = CarveSurfaceShrineTunnel(tunnel);
        result.anchorX = left;
        result.anchorY = top;
        result.attempts = attempts;
        result.normalTileCount = inspection.normalTiles;
        result.activeTileCount = inspection.activeTiles;
        result.normalTileRatio = inspection.ratio;
        result.remixWorld = remixWorld;
        result.tunnelX = tunnel ? tunnel.x : -1;
        result.tunnelStartY = tunnel ? tunnel.startY : -1;
        result.tunnelEndY = tunnel ? tunnel.endY : -1;
        result.tunnelLength = tunnel ? tunnel.length : 0;
        result.tunnelCleared = tunnelCleared;
        result.source = 'CalamityMod/World/UndergroundShrines.cs::PlaceSurfaceShrine + Schematics/Shrine_Surface.csch + bounded-delayed-mobile-safe-placement';
        Log(`generated=${result.generated}, topLeft=${left},${top}, attempts=${attempts}, normalRatio=${inspection.ratio}, tunnel=${tunnel ? `${tunnel.x}:${tunnel.startY}-${tunnel.endY}` : 'remix-none'}, chestCount=${result.chestCount || 0}.`);
        return result;
    }
};
