import { Terraria } from './../TL/ModImports.js';
import { ModItem } from './../TL/ModItem.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { MechanicShedSchematic } from './../Data/OfficialSchematics/MechanicShedSchematic.js';
import { DesertShrineSchematic } from './../Data/OfficialSchematics/DesertShrineSchematic.js';
import { GraniteShrineSchematic } from './../Data/OfficialSchematics/GraniteShrineSchematic.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import {
    OfficialSchematicRuntime,
    FillMechanicChestByIndex,
    FillChestByIndex,
    ResolveVanillaItemID
} from './OfficialSchematicRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';

const SNOW_BLOCK = 147;
const DESERT_TILES = new Set([
    ResolveTileID('DesertFossil', 404),
    ResolveTileID('Sand', 53),
    ResolveTileID('HardenedSand', 397),
    ResolveTileID('Sandstone', 396)
]);
// Unsafe sandstone/hardened-sand walls define the vanilla Underground Desert.
// GenVars.UndergroundDesertLocation is available during world generation but is
// not guaranteed to survive after the world has been loaded, so these IDs are
// also used by the delayed repair fallback.
const DESERT_WALLS = new Set([187, 216]);
const DESERT_BOUND_TILES = new Set([
    53, 112, 116, 234,
    396, 397, 398, 399, 400, 401, 402, 403, 404
]);
const DUNGEON_TILES = new Set([
    ResolveTileID('BlueDungeonBrick', 41),
    ResolveTileID('GreenDungeonBrick', 43),
    ResolveTileID('PinkDungeonBrick', 44)
]);
const LIHZAHRD_BRICK = ResolveTileID('LihzahrdBrick', 226);
const LIHZAHRD_WALL = ResolveWallID('LihzahrdBrickUnsafe', 87);
const SUNKEN_AVOID_TILES = new Set([
    Number(BiomeAnchorTiles.SunkenEutrophic),
    385
]);
const GRANITE_UNSAFE_WALL = ResolveWallID('GraniteUnsafe', 180);
const MARBLE_UNSAFE_WALL = ResolveWallID('MarbleUnsafe', 178);
const GRANITE_TILE = ResolveTileID('Granite', 368);
const MARBLE_TILE = ResolveTileID('Marble', 367);
const GRANITE_BLOCK_TILE = ResolveTileID('GraniteBlock', 369);
const MARBLE_BLOCK_TILE = ResolveTileID('MarbleBlock', 370);
const CONTAINERS_TILE = ResolveTileID('Containers', 21);
const EXPOSED_GEMS_TILE = ResolveTileID('ExposedGems', 178);
const GRANITE_WALL = ResolveWallID('Granite', 184);
const MARBLE_WALL = ResolveWallID('Marble', 183);
const SAPPHIRE_GEMSPARK_WALL = ResolveWallID('SapphireGemspark', 165);
const DIAMOND_GEMSPARK_WALL = ResolveWallID('DiamondGemspark', 166);

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
function Log(message) { try { tl.log(`[CalamityPort OfficialStructures] ${message}`); } catch (e) { } }

function FallbackSnowBounds() {
    const maxX = Math.floor(Number(Terraria.Main.maxTilesX) || 4200);
    const maxY = Math.floor(Number(Terraria.Main.maxTilesY) || 1200);
    const surface = Math.floor(Number(Terraria.Main.worldSurface) || 250);
    let left = maxX, right = 0;
    const top = Clamp(surface - 120, 10, maxY - 20);
    const bottom = Clamp(surface + 180, top + 1, maxY - 10);
    for (let x = 80; x < maxX - 80; x += 6) {
        for (let y = top; y <= bottom; y += 4) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (tile && IsActive(tile) && Number(tile.type) === SNOW_BLOCK) {
                left = Math.min(left, x); right = Math.max(right, x); break;
            }
        }
    }
    if (!(right > left)) return null;
    return { left, right, source: 'snow-tile-fallback' };
}

function SnowBounds() {
    try {
        const gen = Terraria.WorldBuilding.GenVars;
        const left = Math.floor(Number(gen.snowOriginLeft));
        const right = Math.floor(Number(gen.snowOriginRight));
        if (right > left)
            return { left, right, source: 'GenVars.snowOriginLeft/right' };
    } catch (e) { }
    return FallbackSnowBounds();
}

function ScoreUndergroundDesertColumn(x, top, bottom) {
    let score = 0;
    for (let y = top; y <= bottom; y += 12) {
        if (!InWorld(x, y))
            continue;
        const tile = Terraria.Main.tile.get_Item(x, y);
        if (!tile)
            continue;
        const wall = Number(tile.wall) || 0;
        const type = Number(tile.type) || 0;
        if (DESERT_WALLS.has(wall))
            score += 6;
        if (IsActive(tile) && DESERT_BOUND_TILES.has(type))
            score += 1;
    }
    return score;
}

function FallbackUndergroundDesertBounds() {
    const maxX = Math.floor(Number(Terraria.Main.maxTilesX) || 4200);
    const maxY = Math.floor(Number(Terraria.Main.maxTilesY) || 1200);
    const surface = Math.floor(Number(Terraria.Main.worldSurface) || 250);
    const rock = Math.floor(Number(Terraria.Main.rockLayer) || (surface + 220));
    const scanTop = Clamp(Math.max(surface + 35, maxY * 0.24), 40, maxY - 320);
    const scanBottom = Clamp(Math.max(rock + 220, maxY * 0.58), scanTop + 120, maxY - 220);
    const stepX = 8;
    const samples = [];
    let bestScore = 0;
    let bestIndex = -1;

    for (let x = 160; x <= maxX - 160; x += stepX) {
        const direct = ScoreUndergroundDesertColumn(x, scanTop, scanBottom);
        const sideA = ScoreUndergroundDesertColumn(x - 4, scanTop, scanBottom);
        const sideB = ScoreUndergroundDesertColumn(x + 4, scanTop, scanBottom);
        const score = direct + (sideA + sideB) * 0.35;
        samples.push({ x, score });
        if (score > bestScore) {
            bestScore = score;
            bestIndex = samples.length - 1;
        }
    }

    if (bestIndex < 0 || bestScore < 12)
        return null;

    // Smooth the samples so the large Sunken Sea cutout does not make the
    // remaining left and right halves look like unrelated deserts.
    const active = [];
    const threshold = Math.max(10, bestScore * 0.16);
    for (let i = 0; i < samples.length; i++) {
        let smooth = 0;
        for (let k = -2; k <= 2; k++) {
            const sample = samples[i + k];
            if (sample)
                smooth += sample.score;
        }
        if (smooth >= threshold)
            active.push({ index: i, x: samples[i].x, smooth });
    }
    if (active.length === 0)
        return null;

    // Build horizontal groups. Gaps up to 480 tiles are bridged deliberately:
    // the generated Sunken Sea occupies the center of the Underground Desert
    // and removes the vanilla desert signatures from that entire section.
    const groups = [];
    let group = null;
    const maxBridge = 60; // 60 samples * 8 tiles = 480 tiles.
    for (const entry of active) {
        if (!group || entry.index - group.lastIndex > maxBridge) {
            group = { firstIndex: entry.index, lastIndex: entry.index, left: entry.x, right: entry.x, weight: entry.smooth, peak: entry.smooth };
            groups.push(group);
        } else {
            group.lastIndex = entry.index;
            group.right = entry.x;
            group.weight += entry.smooth;
            group.peak = Math.max(group.peak, entry.smooth);
        }
    }
    groups.sort((a, b) => (b.weight + b.peak * 4) - (a.weight + a.peak * 4));
    const chosen = groups[0];
    if (!chosen)
        return null;

    let left = Clamp(chosen.left - 48, 55, maxX - 120);
    let right = Clamp(chosen.right + 56, left + 80, maxX - 55);
    if (right - left < 180) {
        const center = samples[bestIndex].x;
        left = Clamp(center - 260, 55, maxX - 400);
        right = Clamp(center + 260, left + 180, maxX - 55);
    }
    return {
        left,
        right,
        source: `underground-desert-tile-wall-scan:peak=${bestScore.toFixed(1)}:range=${left}-${right}`,
        scanTop,
        scanBottom,
        bestX: samples[bestIndex].x,
        bestScore
    };
}

function UndergroundDesertBounds() {
    try {
        const rect = Terraria.WorldBuilding.GenVars.UndergroundDesertLocation;
        if (rect) {
            let left = Math.floor(Number(rect.Left));
            let right = Math.floor(Number(rect.Right));
            if (!(right > left)) {
                left = Math.floor(Number(rect.X));
                right = left + Math.floor(Number(rect.Width));
            }
            if (right > left)
                return { left, right, source: 'GenVars.UndergroundDesertLocation' };
        }
    } catch (e) { }
    return FallbackUndergroundDesertBounds();
}

function CountBottomSnow(x, y) {
    let count = 0;
    for (let checkX = x - 15; checkX < x + 15; checkX++) {
        for (let checkY = y - 5; checkY < y; checkY++) {
            if (!InWorld(checkX, checkY)) continue;
            const tile = Terraria.Main.tile.get_Item(checkX, checkY);
            if (tile && IsActive(tile) && Number(tile.type) === SNOW_BLOCK) {
                count++;
                if (count >= 100) return count;
            }
        }
    }
    return count;
}

function CountTopEmpty(x, y) {
    let count = 0;
    for (let checkX = x - 15; checkX < x + 15; checkX++) {
        for (let checkY = y - 20; checkY < y - 15; checkY++) {
            if (!InWorld(checkX, checkY)) continue;
            const tile = Terraria.Main.tile.get_Item(checkX, checkY);
            if (tile && !IsActive(tile) && Number(tile.wall) === 0) {
                count++;
                if (count >= 100) return count;
            }
        }
    }
    return count;
}

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

function InspectDesertShrineArea(left, top, sunkenPlacement = null) {
    const width = DesertShrineSchematic.width;
    const height = DesertShrineSchematic.height;
    const xCheckArea = 50;
    let desertTiles = 0;
    let canGenerate = true;
    const totalTiles = (width + xCheckArea * 2) * height;
    for (let x = left - xCheckArea; x < left + width + xCheckArea; x++) {
        for (let y = top; y < top + height; y++) {
            if (!InWorld(x, y)) {
                canGenerate = false;
                continue;
            }
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (IsInsidePlannedSunkenCell(sunkenPlacement, x, y) || ShouldAvoidShrineTile(tile, true))
                canGenerate = false;
            if (tile && IsActive(tile) && DESERT_TILES.has(Number(tile.type)))
                desertTiles++;
        }
    }
    return { canGenerate, desertTiles, totalTiles, ratio: totalTiles > 0 ? desertTiles / totalTiles : 0 };
}


function InspectGraniteShrineArea(left, top, sunkenPlacement = null, drunkWorld = false) {
    const width = GraniteShrineSchematic.width;
    const height = GraniteShrineSchematic.height;
    let matchingCells = 0;
    let canGenerate = true;
    const totalTiles = width * height;
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
            if (!drunkWorld) {
                if (Number(tile.wall) === GRANITE_UNSAFE_WALL && !IsActive(tile))
                    matchingCells++;
            } else if (Number(tile.wall) === MARBLE_UNSAFE_WALL || Number(tile.type) === MARBLE_TILE) {
                matchingCells++;
            }
        }
    }
    return { canGenerate, matchingCells, totalTiles, ratio: totalTiles > 0 ? matchingCells / totalTiles : 0 };
}

function ResolveGoldBarItem() {
    const goldTile = ResolveTileID('Gold', 8);
    let selected = NaN;
    try { selected = Number(Terraria.WorldBuilding.GenVars.goldBar); } catch (e) { }
    // Deferred placement runs after worldgen. SavedOreTiers preserves the same
    // world choice if GenVars has already been cleared by the mobile runtime.
    if (!Number.isFinite(selected)) {
        try { selected = Number(Terraria.WorldGen.SavedOreTiers.Gold); } catch (e) { }
    }
    return selected === goldTile
        ? ResolveVanillaItemID('GoldBar', 19)
        : ResolveVanillaItemID('PlatinumBar', 706);
}

export function FillGraniteShrineChestByIndex(chestIndex) {
    // Exact current Calamity table: item IDs 2346, 2323 and 2345.
    const potionTypes = [2346, 2323, 2345];
    let zenith = false;
    try { zenith = Terraria.Main.zenithWorld === true; } catch (e) { }
    const potion = zenith ? ResolveVanillaItemID('RedPotion', 678) : potionTypes[WorldGenRand.NextInt(0, potionTypes.length)];
    const finalType = zenith && WorldGenRand.NextBool()
        ? ResolveVanillaItemID('GasTrap', 5346)
        : ResolveVanillaItemID('Granite', 3086);
    return FillChestByIndex(chestIndex, [
        [Number(ModItem.getTypeByName('UnstableGraniteCore') || 0), 1, -1],
        [ResolveVanillaItemID('Geode', 4400), WorldGenRand.NextInt(6, 9), -1],
        [ResolveVanillaItemID('BlueTorch', 427), WorldGenRand.NextInt(100, 111), -1],
        [ResolveVanillaItemID('GoldCoin', 73), WorldGenRand.NextInt(8, 11), -1],
        [ResolveVanillaItemID('HealingPotion', 188), WorldGenRand.NextInt(10, 13), -1],
        [potion, WorldGenRand.NextInt(zenith ? 1 : 10, (zenith ? 2 : 12) + 1), -1],
        [finalType, zenith ? 1 : WorldGenRand.NextInt(7, 16), -1]
    ]);
}

export function FillIceShrineChestByIndex(chestIndex) {
    let zenith = false;
    try { zenith = Terraria.Main.zenithWorld === true; } catch (e) { }
    const contents = zenith ? [
        [Number(ModItem.getTypeByName('FrozenCube') || 0), 1, -1],
        [5070, WorldGenRand.NextInt(6, 9), -1],
        [1537, 1, -1],
        [974, WorldGenRand.NextInt(100, 111), -1],
        [73, WorldGenRand.NextInt(8, 11), -1],
        [1912, WorldGenRand.NextInt(10, 13), -1],
        [WorldGenRand.NextBool() ? 5346 : 967, 1, -1]
    ] : [
        [Number(ModItem.getTypeByName('FrozenCube') || 0), 1, -1],
        [5070, WorldGenRand.NextInt(6, 9), -1],
        [1537, 1, -1],
        [974, WorldGenRand.NextInt(100, 111), -1],
        [73, WorldGenRand.NextInt(8, 11), -1],
        [188, WorldGenRand.NextInt(10, 13), -1],
        [4026, WorldGenRand.NextInt(10, 13), -1]
    ];
    return FillChestByIndex(chestIndex, contents);
}

export function FillCorruptionShrineChestByIndex(chestIndex) {
    const potionTypes = [300, 304, 2329];
    const potion = potionTypes[WorldGenRand.NextInt(0, potionTypes.length)];
    const effigy = Number(ModItem.getTypeByName('CorruptionEffigy') || 0);
    let zenith = false;
    try { zenith = Terraria.Main.zenithWorld === true; } catch (e) { }
    if (zenith) {
        const evil = [
            Number(ModItem.getTypeByName('StressPills') || 0),
            Number(ModItem.getTypeByName('Laudanum') || 0),
            Number(ModItem.getTypeByName('HeartofDarkness') || 0)
        ].filter(v => v > 0);
        return FillChestByIndex(chestIndex, [
            [effigy, 1, -1], [68, WorldGenRand.NextInt(24, 29), -1], [1534, 1, -1],
            [4385, WorldGenRand.NextInt(100, 111), -1], [73, WorldGenRand.NextInt(8, 11), -1],
            [evil.length ? evil[WorldGenRand.NextInt(0, evil.length)] : 0, 1, -1],
            [678, WorldGenRand.NextInt(1, 3), -1], [5346, 1, -1]
        ]);
    }
    return FillChestByIndex(chestIndex, [
        [effigy, 1, -1], [68, WorldGenRand.NextInt(24, 29), -1], [1534, 1, -1],
        [4385, WorldGenRand.NextInt(100, 111), -1], [73, WorldGenRand.NextInt(8, 11), -1],
        [188, WorldGenRand.NextInt(10, 13), -1], [potion, WorldGenRand.NextInt(10, 13), -1]
    ]);
}

export function FillCrimsonShrineChestByIndex(chestIndex) {
    const potionTypes = [300, 304, 2329];
    const potion = potionTypes[WorldGenRand.NextInt(0, potionTypes.length)];
    const effigy = Number(ModItem.getTypeByName('CrimsonEffigy') || 0);
    let zenith = false;
    try { zenith = Terraria.Main.zenithWorld === true; } catch (e) { }
    if (zenith) {
        const bloodyMary = Number(ModItem.getTypeByName('BloodyMary') || 0);
        return FillChestByIndex(chestIndex, [
            [effigy, 1, -1], [1330, WorldGenRand.NextInt(24, 29), -1], [1535, 1, -1],
            [4386, WorldGenRand.NextInt(100, 111), -1], [73, WorldGenRand.NextInt(8, 11), -1],
            [bloodyMary, WorldGenRand.NextInt(2, 3), -1], [678, WorldGenRand.NextInt(1, 3), -1], [5346, 1, -1]
        ]);
    }
    return FillChestByIndex(chestIndex, [
        [effigy, 1, -1], [1330, WorldGenRand.NextInt(24, 29), -1], [1535, 1, -1],
        [4386, WorldGenRand.NextInt(100, 111), -1], [73, WorldGenRand.NextInt(8, 11), -1],
        [188, WorldGenRand.NextInt(10, 13), -1], [potion, WorldGenRand.NextInt(10, 13), -1]
    ]);
}

export function FillMushroomShrineChestByIndex(chestIndex) {
    const potionTypes = [298, 2322, 2325];
    const potion = potionTypes[WorldGenRand.NextInt(0, potionTypes.length)];
    let zenith = false;
    try { zenith = Terraria.Main.zenithWorld === true; } catch (e) { }
    const fungal = Number(ModItem.getTypeByName('FungalSymbiote') || 0);
    const odd = Number(ModItem.getTypeByName('OddMushroom') || 0);
    const contents = zenith ? [
        [fungal, 1, -1],
        [2673, 3, -1],
        [5293, WorldGenRand.NextInt(100, 111), -1],
        [73, WorldGenRand.NextInt(8, 11), -1],
        [odd, WorldGenRand.NextInt(2, 4), -1],
        [678, WorldGenRand.NextInt(1, 3), -1],
        [5346, 1, -1]
    ] : [
        [fungal, 1, -1],
        [2673, 3, -1],
        [5293, WorldGenRand.NextInt(100, 111), -1],
        [73, WorldGenRand.NextInt(8, 11), -1],
        [188, WorldGenRand.NextInt(10, 13), -1],
        [potion, WorldGenRand.NextInt(10, 13), -1]
    ];
    return FillChestByIndex(chestIndex, contents);
}

export function FillMarbleShrineChestByIndex(chestIndex) {
    // Exact current Calamity table: item IDs 2346, 2323 and 2345.
    const potionTypes = [2346, 2323, 2345];
    let zenith = false;
    try { zenith = Terraria.Main.zenithWorld === true; } catch (e) { }
    const potion = zenith ? ResolveVanillaItemID('RedPotion', 678) : potionTypes[WorldGenRand.NextInt(0, potionTypes.length)];
    const finalType = zenith && WorldGenRand.NextBool()
        ? ResolveVanillaItemID('GasTrap', 5346)
        : ResolveVanillaItemID('Marble', 3081);
    return FillChestByIndex(chestIndex, [
        [Number(ModItem.getTypeByName('GladiatorsLocket') || 0), 1, -1],
        [ResolveGoldBarItem(), WorldGenRand.NextInt(12, 16), -1],
        [431, WorldGenRand.NextInt(100, 111), -1],
        [ResolveVanillaItemID('GoldCoin', 73), WorldGenRand.NextInt(8, 11), -1],
        [ResolveVanillaItemID('HealingPotion', 188), WorldGenRand.NextInt(10, 13), -1],
        [potion, WorldGenRand.NextInt(zenith ? 1 : 10, (zenith ? 2 : 12) + 1), -1],
        [finalType, zenith ? 1 : WorldGenRand.NextInt(7, 16), -1]
    ]);
}

function TransformGraniteShrineToMarble(left, top) {
    for (let x = left; x < left + GraniteShrineSchematic.width; x++) {
        for (let y = top; y < top + GraniteShrineSchematic.height; y++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile)
                continue;
            switch (Number(tile.type)) {
                case GRANITE_TILE: tile.type = MARBLE_TILE; break;
                case GRANITE_BLOCK_TILE: tile.type = MARBLE_BLOCK_TILE; break;
                case CONTAINERS_TILE: tile.frameX = Number(tile.frameX) + 36; break;
                case EXPOSED_GEMS_TILE: tile.frameX = Number(tile.frameX) + 54; break;
            }
            switch (Number(tile.wall)) {
                case GRANITE_WALL: tile.wall = MARBLE_WALL; break;
                case SAPPHIRE_GEMSPARK_WALL:
                    tile.wall = DIAMOND_GEMSPARK_WALL;
                    try { tile['void wallColor(byte wallColor)'](0); } catch (e) { }
                    break;
            }
        }
    }
}

export function FillDesertShrineChestByIndex(chestIndex) {
    const luxor = Number(ModItem.getTypeByName('LuxorsGift') || 0);
    const prism = Number(ModItem.getTypeByName('PrismShard') || 0);
    const spelunkerAmulet = Number(ModItem.getTypeByName('SpelunkersAmulet') || 0);
    const potionTypes = [
        ResolveVanillaItemID('ShinePotion', 298),
        ResolveVanillaItemID('MiningPotion', 2322),
        ResolveVanillaItemID('BuilderPotion', 2325)
    ];
    const potion = potionTypes[WorldGenRand.NextInt(0, potionTypes.length)];
    const normal = [
        [luxor, 1],
        [prism, WorldGenRand.NextInt(6, 9)],
        [ResolveVanillaItemID('DungeonDesertKey', 4714), 1],
        [ResolveVanillaItemID('DesertTorch', 4383), WorldGenRand.NextInt(100, 111)],
        [ResolveVanillaItemID('GoldCoin', 73), WorldGenRand.NextInt(8, 11)],
        [ResolveVanillaItemID('HealingPotion', 188), WorldGenRand.NextInt(10, 13)],
        [potion, WorldGenRand.NextInt(10, 13)]
    ];
    let zenith = false;
    try { zenith = Terraria.Main.zenithWorld === true; } catch (e) { }
    if (!zenith)
        return FillChestByIndex(chestIndex, normal);

    const golf = [
        ResolveVanillaItemID('GolfClubBronzeWedge', 4589),
        ResolveVanillaItemID('GolfClubWedge', 4093),
        ResolveVanillaItemID('GasTrap', 5346)
    ];
    return FillChestByIndex(chestIndex, [
        [luxor, 1],
        [prism, WorldGenRand.NextInt(6, 9)],
        [ResolveVanillaItemID('DungeonDesertKey', 4714), 1],
        [ResolveVanillaItemID('DesertTorch', 4383), WorldGenRand.NextInt(100, 111)],
        [ResolveVanillaItemID('GoldCoin', 73), WorldGenRand.NextInt(8, 11)],
        [spelunkerAmulet, 1],
        [ResolveVanillaItemID('RedPotion', 678), WorldGenRand.NextInt(1, 3)],
        [golf[WorldGenRand.NextInt(0, golf.length)], 1]
    ]);
}

export const OfficialStructureRuntime = {
    BeginGeneration() {
        OfficialStructureMap.Reset();
    },

    GenerateEarly(context) {
        return { mechanicShed: this.GenerateMechanicShed(context) };
    },

    GenerateLate(context, sunkenPlacement = null) {
        return {
            desertShrine: this.GenerateDesertShrine(context, sunkenPlacement),
            graniteShrine: this.GenerateGraniteShrine(context, sunkenPlacement)
        };
    },

    // Backward-compatible entry point.
    Generate(context) {
        this.BeginGeneration();
        return this.GenerateEarly(context);
    },

    GenerateMechanicShed(context) {
        const bounds = SnowBounds();
        if (!bounds)
            return { generated: false, reason: 'snow-bounds-not-found' };
        const maxX = Math.floor(Number(context?.maxX) || Number(Terraria.Main.maxTilesX) || 4200);
        const maxY = Math.floor(Number(context?.maxY) || Number(Terraria.Main.maxTilesY) || 1200);
        const leftLimit = Clamp(bounds.left + 100, 40, maxX - 41);
        const rightLimit = Clamp(bounds.right - 100, leftLimit + 1, maxX - 40);
        if (!(rightLimit > leftLimit))
            return { generated: false, reason: 'snow-biome-too-narrow', boundsSource: bounds.source };

        // The old mobile path could execute 100,000 attempts, each touching up
        // to 300 native tiles. On unlucky seeds this looked like a worldgen
        // crash because the main thread remained inside the search for nearly
        // a minute. Keep the original snow/air thresholds and search region,
        // but enumerate a bounded set of candidates and refine the best band.
        const baseY = Clamp(Math.floor(Number(Terraria.Main.worldSurface) || 250) - 50, 30, maxY - 30);
        const coarseXStep = 10;
        const coarseCount = Math.max(1, Math.floor((rightLimit - leftLimit) / coarseXStep) + 1);
        const randomX = WorldGenRand.NextInt(leftLimit, rightLimit);
        const startIndex = Math.max(0, Math.min(coarseCount - 1, Math.floor((randomX - leftLimit) / coarseXStep)));
        let placementX = leftLimit;
        let placementY = baseY;
        let snowCount = 0;
        let emptyCount = 0;
        let attempts = 0;
        let found = false;
        let best = { score: -1, x: placementX, y: placementY, snow: 0, empty: 0 };

        Log(`Mechanic Shed bounded search begin; snow=${bounds.left}-${bounds.right}, usable=${leftLimit}-${rightLimit}, baseY=${baseY}, source=${bounds.source}.`);

        const testCandidate = (x, y) => {
            attempts++;
            const snow = CountBottomSnow(x, y);
            const empty = CountTopEmpty(x, y);
            const score = snow + empty;
            if (score > best.score)
                best = { score, x, y, snow, empty };
            if (snow >= 100 && empty >= 100) {
                placementX = x;
                placementY = y;
                snowCount = snow;
                emptyCount = empty;
                found = true;
                return true;
            }
            return false;
        };

        // Coarse pass: randomized horizontal start, then deterministic wrap.
        for (let vertical = 0; vertical <= 100 && !found; vertical += 10) {
            const ys = vertical === 0 ? [baseY] : [Clamp(baseY - vertical, 25, maxY - 25), Clamp(baseY + vertical, 25, maxY - 25)];
            for (const y of ys) {
                for (let i = 0; i < coarseCount; i++) {
                    const x = leftLimit + ((startIndex + i) % coarseCount) * coarseXStep;
                    if (testCandidate(x, y))
                        break;
                }
                if (found)
                    break;
            }
        }

        // Fine pass around the most promising vertical band.
        if (!found) {
            const fineXStep = 5;
            const fineCount = Math.max(1, Math.floor((rightLimit - leftLimit) / fineXStep) + 1);
            const fineStart = Math.max(0, Math.min(fineCount - 1, Math.floor((best.x - leftLimit) / fineXStep)));
            for (let dy = -15; dy <= 15 && !found; dy += 5) {
                const y = Clamp(best.y + dy, 25, maxY - 25);
                for (let i = 0; i < fineCount; i++) {
                    const x = leftLimit + ((fineStart + i) % fineCount) * fineXStep;
                    if (testCandidate(x, y))
                        break;
                }
            }
        }

        if (!found) {
            Log(`Mechanic Shed bounded search found no valid candidate after ${attempts} checks; best=${best.x},${best.y}, snow=${best.snow}, empty=${best.empty}.`);
            return {
                generated: false,
                reason: 'no-valid-mechanic-shed-location',
                attempts,
                snowTileCount: best.snow,
                emptyTileCount: best.empty,
                boundsSource: bounds.source
            };
        }

        const result = OfficialSchematicRuntime.Place(MechanicShedSchematic, { x: placementX, y: placementY }, 'bottomCenter', FillMechanicChestByIndex, 30);
        result.anchorX = placementX;
        result.anchorY = placementY;
        result.attempts = attempts;
        result.snowTileCount = snowCount;
        result.emptyTileCount = emptyCount;
        result.boundsSource = bounds.source;
        result.source = 'CalamityMod/World/MechanicShed.cs + Schematics/MechanicShed.csch + bounded-mobile-safe-search';
        Log(`Mechanic Shed generated=${result.generated}, anchor=${placementX},${placementY}, attempts=${attempts}, chestCount=${result.chestCount || 0}.`);
        return result;
    },

    GenerateDesertShrine(context, sunkenPlacement = null) {
        const bounds = UndergroundDesertBounds();
        if (!bounds)
            return { generated: false, reason: 'underground-desert-bounds-not-found' };
        Log(`Desert Shrine bounds resolved from ${bounds.source}: left=${bounds.left}, right=${bounds.right}.`);
        const maxX = Math.floor(Number(context?.maxX) || Number(Terraria.Main.maxTilesX) || 4200);
        const maxY = Math.floor(Number(context?.maxY) || Number(Terraria.Main.maxTilesY) || 1200);
        const width = DesertShrineSchematic.width;
        const height = DesertShrineSchematic.height;
        const leftMin = Clamp(bounds.left, 55, maxX - width - 55);
        const leftMax = Clamp(bounds.right - width, leftMin + 1, maxX - width - 55);
        const topMin = Clamp(Math.floor(maxY * 0.30), 30, maxY - height - 30);
        const topMax = Clamp(Math.floor(maxY * 0.55), topMin + 1, maxY - height - 30);
        if (!(leftMax > leftMin) || !(topMax > topMin))
            return { generated: false, reason: 'underground-desert-bounds-too-small', boundsSource: bounds.source };

        let attempts = 0;
        let left = leftMin, top = topMin;
        let inspection = null;
        while (attempts <= 20000) {
            attempts++;
            left = WorldGenRand.NextInt(leftMin, leftMax);
            top = WorldGenRand.NextInt(topMin, topMax);
            inspection = InspectDesertShrineArea(left, top, sunkenPlacement);
            const rect = { left, top, right: left + width, bottom: top + height };
            if (inspection.canGenerate && inspection.ratio >= 0.30 && OfficialStructureMap.CanPlace(rect, 4))
                break;
        }
        if (!inspection || !inspection.canGenerate || inspection.ratio < 0.30)
            return { generated: false, reason: 'no-valid-location', attempts, boundsSource: bounds.source };

        const result = OfficialSchematicRuntime.Place(DesertShrineSchematic, { x: left, y: top }, 'topLeft', FillDesertShrineChestByIndex, 4);
        result.anchorX = left;
        result.anchorY = top;
        result.attempts = attempts;
        result.desertTileCount = inspection.desertTiles;
        result.checkedTileCount = inspection.totalTiles;
        result.desertRatio = inspection.ratio;
        result.boundsSource = bounds.source;
        result.source = 'CalamityMod/World/UndergroundShrines.cs::PlaceDesertShrine + Schematics/Shrine_Desert.csch + exact Sunken Sea exclusion';

        Log(`Desert Shrine generated=${result.generated}, topLeft=${left},${top}, attempts=${attempts}, desertRatio=${inspection.ratio}, chestCount=${result.chestCount || 0}.`);
        return result;
    },

    GenerateGraniteShrine(context, sunkenPlacement = null) {
        const maxX = Math.floor(Number(context?.maxX) || Number(Terraria.Main.maxTilesX) || 4200);
        const maxY = Math.floor(Number(context?.maxY) || Number(Terraria.Main.maxTilesY) || 1200);
        const width = GraniteShrineSchematic.width;
        const height = GraniteShrineSchematic.height;
        let beachDistance = 380;
        try { beachDistance = Math.max(80, Math.floor(Number(Terraria.WorldGen.beachDistance) || beachDistance)); } catch (e) { }
        let worldSurface = Math.floor(Number(Terraria.Main.worldSurface) || maxY * 0.25);
        let rockLayer = Math.floor(Number(Terraria.Main.rockLayer) || maxY * 0.4);
        try {
            const gen = Terraria.WorldBuilding.GenVars;
            worldSurface = Math.floor(Number(gen.worldSurface) || worldSurface);
            rockLayer = Math.floor(Number(gen.rockLayer) || rockLayer);
        } catch (e) { }
        let drunkWorld = false, remixWorld = false;
        try { drunkWorld = Terraria.Main.drunkWorld === true; } catch (e) { }
        try { remixWorld = Terraria.Main.remixWorld === true; } catch (e) { }

        const leftMinA = Clamp(beachDistance, 20, maxX - width - 20);
        const leftMaxA = Clamp(Math.floor(maxX * 0.45), leftMinA + 1, maxX - width - 20);
        const rightMinA = Clamp(Math.floor(maxX * 0.55), 20, maxX - width - 20);
        const rightMaxA = Clamp(maxX - beachDistance, rightMinA + 1, maxX - width - 20);
        let topMin = Clamp(rockLayer + 20, 20, maxY - height - 20);
        let topMax = Clamp(maxY - 220, topMin + 1, maxY - height - 20);
        if (remixWorld) {
            topMin = Clamp(worldSurface + 100, 20, maxY - height - 20);
            topMax = Clamp(rockLayer, topMin + 1, maxY - height - 20);
        }
        if (!(leftMaxA > leftMinA) || !(rightMaxA > rightMinA) || !(topMax > topMin))
            return { generated: false, reason: 'granite-search-bounds-invalid' };

        let attempts = 0, left = leftMinA, top = topMin, inspection = null;
        while (attempts <= 30000) {
            attempts++;
            left = WorldGenRand.NextBool()
                ? WorldGenRand.NextInt(rightMinA, rightMaxA)
                : WorldGenRand.NextInt(leftMinA, leftMaxA);
            top = WorldGenRand.NextInt(topMin, topMax);
            inspection = InspectGraniteShrineArea(left, top, sunkenPlacement, drunkWorld);
            const rect = { left, top, right: left + width, bottom: top + height };
            if (inspection.canGenerate && inspection.ratio >= 0.95 && OfficialStructureMap.CanPlace(rect, 4))
                break;
        }
        if (!inspection || !inspection.canGenerate || inspection.ratio < 0.95)
            return { generated: false, reason: 'no-valid-granite-geode-location', attempts, drunkVariant: drunkWorld };

        const fill = drunkWorld ? FillMarbleShrineChestByIndex : FillGraniteShrineChestByIndex;
        const result = OfficialSchematicRuntime.Place(GraniteShrineSchematic, { x: left, y: top }, 'topLeft', fill, 4);
        if (result.generated && drunkWorld)
            TransformGraniteShrineToMarble(left, top);
        result.anchorX = left;
        result.anchorY = top;
        result.attempts = attempts;
        result.matchingCellCount = inspection.matchingCells;
        result.checkedTileCount = inspection.totalTiles;
        result.graniteRatio = inspection.ratio;
        result.drunkVariant = drunkWorld;
        result.source = 'CalamityMod/World/UndergroundShrines.cs::PlaceGraniteShrine + Schematics/Shrine_Granite.csch';
        Log(`Granite Shrine generated=${result.generated}, topLeft=${left},${top}, attempts=${attempts}, ratio=${inspection.ratio}, drunkVariant=${drunkWorld}, chestCount=${result.chestCount || 0}.`);
        return result;
    }
};
