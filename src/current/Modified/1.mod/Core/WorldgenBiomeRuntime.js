import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';
import { AerialiteWorldgenRuntime } from './AerialiteWorldgenRuntime.js';
import { OfficialStructureRuntime } from './OfficialStructureRuntime.js';
import { WorldEvilIslandRuntime } from './WorldEvilIslandRuntime.js';
import { VernalPassRuntime } from './VernalPassRuntime.js';
import { GiantHiveRuntime } from './GiantHiveRuntime.js';
import { AbyssTerrainRuntime } from './AbyssTerrainRuntime.js';
import { AbyssAmbientWorldgenRuntime } from './AbyssAmbientWorldgenRuntime.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaDetailRuntime } from './SulphurousSeaDetailRuntime.js';
import { SulphurousSeaAmbienceRuntime } from './SulphurousSeaAmbienceRuntime.js';
import { IronBallRuntime } from './IronBallRuntime.js';
import { ShimmerShrineRuntime } from './ShimmerShrineRuntime.js';
import { PlanetoidRuntime } from './PlanetoidRuntime.js';
import { PlanetoidLabRuntime } from './PlanetoidLabRuntime.js';
import { DirectFreshStructureRuntime } from './DirectFreshStructureRuntime.js';

const SUNKEN_DEFAULT_WIDTH = 320;
const SUNKEN_DEFAULT_HEIGHT = 180;
const TILE_EUTROPHIC = BiomeAnchorTiles.SunkenEutrophic;
const TILE_NAVYSTONE = 396;
const TILE_SEAPRISM = 385;
const WALL_EUTROPHIC = 216;
const WALL_NAVYSTONE = 187;
const TILE_SULPHUROUS_SAND = BiomeAnchorTiles.SulphurousSand;
const SUNKEN_TERRAIN_SCHEMA_VERSION = 10;
const SULPHUROUS_TERRAIN_SCHEMA_VERSION = 5;

// These vanilla tiles must remain protected during the Sulphurous Sea
// coastline conversion. The Sunken Sea intentionally no longer uses this
// set because its official cluster pass clears every cell claimed by the biome.
const SulphurousProtectedTiles = new Set([
    6, 7, 8, 9, 12, 21, 22, 26, 31, 37, 56, 58, 63, 64, 65, 66, 67, 68,
    77, 107, 108, 111, 166, 167, 168, 169, 204, 211, 221, 222, 223, 226,
    237, 238, 239, 240, 467, 468
]);

const DesertWalls = new Set([187, 216]);
const DesertTiles = new Set([53, 112, 116, 234, 396, 397, 398, 399, 400, 401, 402, 403, 404]);
const CoastalSandTiles = new Set([53, 112, 116, 234, 396, 397]);


function ResolveID(table, name, fallback = -1) {
    try {
        const v = Math.floor(Number(table?.[name]));
        if (Number.isFinite(v) && v >= 0)
            return v;
    } catch (e) { }
    return fallback;
}

function ResolveSet(table, names, fallbacks = {}) {
    const out = new Set();
    for (const name of names) {
        const v = ResolveID(table, name, Object.prototype.hasOwnProperty.call(fallbacks, name) ? fallbacks[name] : -1);
        if (v >= 0)
            out.add(v);
    }
    return out;
}

const SulphurousSurfaceClearTiles = ResolveSet(Terraria.ID.TileID, [
    'Stone','Dirt','Sand','Ebonsand','Crimsand','Grass','CorruptGrass','CrimsonGrass','ClayBlock','Mud',
    'Copper','Tin','Iron','Lead','Silver','Tungsten','Crimstone','Ebonstone','HardenedSand','CorruptHardenedSand','CrimsonHardenedSand',
    'Coral','BeachPiles','Plants','Plants2','SmallPiles','LargePiles','LargePiles2','Trees','Vines','PalmTree','Sunflower','CorruptThorns',
    'CrimsonThorns','CorruptPlants','Stalactite','ImmatureHerbs','MatureHerbs','Pots','Pumpkins','FallenLog','LilyPad','VanityTreeSakura',
    'VanityTreeYellowWillow','ShellPile'
], {
    Stone:1,Dirt:0,Sand:53,Ebonsand:112,Crimsand:234,Grass:2,CorruptGrass:23,CrimsonGrass:199,ClayBlock:40,Mud:59,
    Copper:7,Tin:166,Iron:6,Lead:167,Silver:9,Tungsten:168,Crimstone:203,Ebonstone:25,HardenedSand:397,CorruptHardenedSand:398,
    CrimsonHardenedSand:399,Coral:81,Plants:3,Plants2:73,Trees:5,Vines:52,PalmTree:323
});
const SulphurousSurfaceClearWalls = ResolveSet(Terraria.ID.WallID, [
    'Dirt','DirtUnsafe','DirtUnsafe1','DirtUnsafe2','DirtUnsafe3','DirtUnsafe4','Cave6Unsafe','Grass','GrassUnsafe','Flower','FlowerUnsafe',
    'CorruptGrassUnsafe','EbonstoneUnsafe','CrimstoneUnsafe'
]);
const SULPH_UNSAFE_SAND_WALL = 2;

function WorldSurfaceLow(context) {
    try {
        const n = Math.floor(Number(Terraria.WorldBuilding?.GenVars?.worldSurfaceLow));
        if (Number.isFinite(n) && n > 20)
            return n;
    } catch (e) { }
    return Math.floor(Number(context?.worldSurface) || 250);
}

function WorldGenNextInt(min, max) {
    try {
        return Math.floor(Number(Terraria.WorldGen.genRand['int Next(int minValue, int maxValue)'](Math.floor(min), Math.floor(max))));
    } catch (e) {
        return Math.floor(min + Math.random() * Math.max(1, max - min));
    }
}

function WorldGenNextFloat(min = 0, max = 1) {
    try {
        const v = Number(Terraria.Utils['float NextFloat(UnifiedRandom r)'](Terraria.WorldGen.genRand));
        if (Number.isFinite(v))
            return min + v * (max - min);
    } catch (e) { }
    return min + Math.random() * (max - min);
}

function LerpValue(from, to, value) {
    if (from === to)
        return value >= to ? 1 : 0;
    return Math.max(0, Math.min(1, (value - from) / (to - from)));
}

function Smooth01(t) {
    t = Math.max(0, Math.min(1, Number(t) || 0));
    return t * t * (3 - 2 * t);
}

function NoiseHash(ix, iy, seed) {
    let h = (Math.floor(ix) * 374761393 + Math.floor(iy) * 668265263 + Math.floor(seed) * 69069) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
}

// Mobile-safe stand-in for NoiseHelper.GetStaticNoise. It keeps the same 0..1 contract and
// smooth spatial continuity required by SulphurousSea.FractalBrownianMotion, while avoiding
// a reflection-heavy native noise call for every worldgen cell on Android.
function StaticValueNoise(x, y, seed) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = Smooth01(x - x0), fy = Smooth01(y - y0);
    const a = NoiseHash(x0, y0, seed), b = NoiseHash(x0 + 1, y0, seed);
    const c = NoiseHash(x0, y0 + 1, seed), d = NoiseHash(x0 + 1, y0 + 1, seed);
    const ab = a + (b - a) * fx, cd = c + (d - c) * fx;
    return ab + (cd - ab) * fy;
}

function SulphFBM(x, y, seed, octaves, gain = 0.5, lacunarity = 2) {
    let result = 0, frequency = 1, amplitude = 0.5;
    x += ((seed * 0.00489937) % 10);
    for (let i = 0; i < octaves; i++) {
        result += (StaticValueNoise(x * frequency, y * frequency, seed + i * 1013) * 2 - 1) * amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }
    return result;
}

function Convert01To010(v) {
    v = Math.max(0, Math.min(1, Number(v) || 0));
    return v <= 0.5 ? v * 2 : (1 - v) * 2;
}

function WorldGenNextBool(chance = 2) {
    return WorldGenNextInt(0, Math.max(1, Math.floor(chance))) === 0;
}

function ClearSulphCell(tile, wall = SULPH_UNSAFE_SAND_WALL, water = true) {
    if (!tile) return false;
    SetActive(tile, false);
    tile.frameX = 0;
    tile.frameY = 0;
    if (wall >= 0) tile.wall = wall;
    tile.liquid = water && WorldGenNextFloat() <= 0.91 ? 255 : 0;
    TryCall(tile, 'void liquidType(int liquidType)', 0);
    TryCall(tile, 'void halfBrick(bool halfBrick)', false);
    TryCall(tile, 'void slope(byte slope)', 0);
    return true;
}

function PlaceSulphSandCell(tile, wall = SULPH_UNSAFE_SAND_WALL, liquid = 0) {
    if (!tile) return false;
    SetActive(tile, true);
    tile.type = TILE_SULPHUROUS_SAND;
    tile.frameX = -1;
    tile.frameY = -1;
    tile.wall = wall;
    tile.liquid = Math.max(0, Math.min(255, Math.floor(liquid)));
    TryCall(tile, 'void liquidType(int liquidType)', 0);
    TryCall(tile, 'void halfBrick(bool halfBrick)', false);
    TryCall(tile, 'void slope(byte slope)', 0);
    return true;
}

function CarveSulphCircle(context, cx, cy, radius, wall = SULPH_UNSAFE_SAND_WALL) {
    radius = Math.max(1, Math.floor(radius));
    let carved = 0;
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
        const y = Math.floor(cy + dy);
        if (y < 3 || y >= context.maxY - 3) continue;
        const span = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
        for (let dx = -span; dx <= span; dx++) {
            const x = Math.floor(cx + dx);
            if (x < 3 || x >= context.maxX - 3) continue;
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (ClearSulphCell(tile, wall, true)) carved++;
        }
    }
    return carved;
}

function ActualSulphX(localX, context, atLeft) {
    localX = Math.floor(Number(localX) || 0);
    return atLeft ? localX : (context.maxX - 1) - localX;
}

function DetermineOfficialSulphYStart(context, atLeft) {
    const width = OfficialSulphurousWidth(context.maxX);
    const startY = Math.max(20, WorldSurfaceLow(context) - 20);
    let localX = width + 1;
    for (let attempt = 0; attempt < 96; attempt++, localX++) {
        const x = ActualSulphX(localX, context, atLeft);
        if (x < 3 || x >= context.maxX - 3)
            break;
        let foundY = -1;
        for (let y = startY; y < context.maxY - 180; y++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (tile && IsActive(tile)) {
                foundY = y;
                break;
            }
        }
        if (foundY < 0)
            continue;
        const tile = Terraria.Main.tile.get_Item(x, foundY);
        if (!tile || Number(tile.type) !== 25)
            return foundY;
    }
    return Math.floor(Number(context.worldSurface) || 250);
}

function OfficialSulphurousDepthFromYStart(context, yStart) {
    const factor = context.maxX === 4200 ? 0.8 : (context.maxX === 6400 ? 0.85 : 0.925);
    return Math.max(1, Math.floor((context.rockLayer + 112 - yStart) * factor));
}

function SulphDitherChance(width, top, bottom, localX, y) {
    const vertical = LerpValue(top, bottom, y);
    let chance = LerpValue(0.9, 1, localX / Math.max(1, width)) + LerpValue(0.9, 1, vertical);
    if (chance > 1)
        chance = 1;
    chance -= LerpValue(0.56, 0.5, vertical);
    return Math.max(0, chance);
}

function GenerateOfficialSulphurousSurface(context, placement) {
    const atLeft = placement.atLeft === true;
    const biomeWidth = OfficialSulphurousWidth(context.maxX);
    const width = biomeWidth + 1;
    const yStart = DetermineOfficialSulphYStart(context, atLeft);
    const blockDepth = OfficialSulphurousDepthFromYStart(context, yStart);
    let foundation = 0, cleared = 0, water = 0, wallsCleared = 0;

    // Official GenerateSandBlock foundation. Use the live WorldGen.genRand while ShimmerCleanUp
    // is still running, just like tModLoader does, instead of the post-load deterministic model.
    for (let i = 1; i < width; i++) {
        const x = ActualSulphX(i, context, atLeft);
        if (x < 3 || x >= context.maxX - 3)
            continue;
        const depthFactor = Math.pow(Math.max(0, Math.sin((1 - i / width) * Math.PI * 0.5)), 0.24);
        const top = yStart;
        const bottom = Math.min(context.maxY - 4, top + Math.floor(blockDepth * depthFactor));
        for (let y = top; y < bottom; y++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile)
                continue;
            const chance = SulphDitherChance(width, top, bottom, i, y);
            if (WorldGenNextFloat() >= chance) {
                tile.type = TILE_SULPHUROUS_SAND;
                tile.frameX = -1;
                tile.frameY = -1;
                if (y >= top + 45)
                    tile.wall = SULPH_UNSAFE_SAND_WALL;
            }
            if (chance <= 0) {
                SetActive(tile, true);
                TryCall(tile, 'void halfBrick(bool halfBrick)', false);
                TryCall(tile, 'void slope(byte slope)', 0);
            }
            foundation++;
        }
    }

    // Official RemoveStupidTilesAboveSea. This is the step the old mobile approximation lacked;
    // without it, vanilla sand survives as a roof and the "sea" becomes an underground pool.
    for (let i = 0; i < biomeWidth; i++) {
        const x = ActualSulphX(i, context, atLeft);
        if (x < 3 || x >= context.maxX - 3)
            continue;
        const minY = Math.max(3, yStart - 140);
        const maxY = Math.min(context.maxY - 4, yStart + 80);
        for (let y = minY; y < maxY; y++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile)
                continue;
            if (IsActive(tile) && SulphurousSurfaceClearTiles.has(Number(tile.type))) {
                SetActive(tile, false);
                tile.frameX = 0;
                tile.frameY = 0;
                cleared++;
            }
            if (SulphurousSurfaceClearWalls.has(Number(tile.wall))) {
                tile.wall = 0;
                wallsCleared++;
            }
        }
    }

    // Official GenerateShallowTopWater with the live worldgen RNG.
    const maxTopDepth = Math.max(1, Math.floor(blockDepth * 0.125));
    const totalSand = WorldGenNextInt(32, 45);
    const openWidth = Math.max(1, Math.floor((biomeWidth - totalSand) * 0.795));
    const smooth = WorldGenNextFloat(0.26, 0.39);
    const top = yStart - 20;
    for (let i = 1; i < openWidth; i++) {
        const x = ActualSulphX(i, context, atLeft);
        if (x < 3 || x >= context.maxX - 3)
            continue;
        const depthFactor = Math.pow(Math.max(0, Math.sin((1 - i / openWidth) * Math.PI * 0.5)), smooth);
        const bottom = Math.min(context.maxY - 30, top + Math.floor(maxTopDepth * depthFactor * 2));
        for (let y = Math.max(3, top); y < bottom; y++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile)
                continue;
            if (y >= top + 12) {
                const wallY = Math.min(context.maxY - 4, y + WorldGenNextInt(22, 25));
                const wallTile = Terraria.Main.tile.get_Item(x, wallY);
                if (wallTile)
                    wallTile.wall = SULPH_UNSAFE_SAND_WALL;
            }
            tile.liquid = 255;
            TryCall(tile, 'void liquidType(int liquidType)', 0);
            SetActive(tile, false);
            tile.frameX = 0;
            tile.frameY = 0;
            water++;
        }
        for (let y = Math.max(3, top - 150); y < Math.min(context.maxY - 3, top + 12); y++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile)
                continue;
            tile.liquid = 0;
            TryCall(tile, 'void liquidType(int liquidType)', 0);
        }
    }

    return { yStart, blockDepth, openWidth, topWaterTop: top, totalSand, smooth, foundation, cleared, water, wallsCleared, officialSurface: true };
}


function GenerateOfficialSulphurousCore(context, placement, surface) {
    const atLeft = placement.atLeft === true;
    const width = OfficialSulphurousWidth(context.maxX);
    const depth = Math.max(1, Math.floor(surface.blockDepth));
    const yStart = Math.floor(surface.yStart);
    const maxTopDepth = Math.max(1, Math.floor(depth * 0.125));
    let islandTiles = 0, smallCaveTiles = 0, spaghettiTiles = 0, cheeseTiles = 0, hardenedTiles = 0, surfaceTiles = 0;

    // GenerateIsland: reproduce the official edge island before cave carving.
    const left = -32;
    const right = Math.floor(width * 0.36);
    for (let i = 0; i < right; i++) {
        const x = ActualSulphX(i, context, atLeft);
        if (x < 3 || x >= context.maxX - 3) continue;
        const ratio = LerpValue(left, right, i);
        const islandHeight = Math.round(Math.pow(Convert01To010(ratio), 0.74) * (maxTopDepth + 4));
        for (let dy = -30; dy <= islandHeight; dy++) {
            const y = yStart + maxTopDepth - dy;
            if (y < 3 || y >= context.maxY - 3) continue;
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (PlaceSulphSandCell(tile, dy < islandHeight ? SULPH_UNSAFE_SAND_WALL : 0, 255)) islandTiles++;
        }
    }

    // GenerateSmallWaterCaverns. Small worlds create one of these, larger worlds more.
    const caveCount = Math.ceil(context.maxX / 2000);
    const minCaveWidth = Math.max(1, Math.floor(context.maxX / 2500));
    const maxCaveWidth = Math.min(15, Math.max(minCaveWidth + 1, Math.ceil(context.maxX / 566)));
    const minSteps = Math.max(2, Math.ceil(context.maxX / 70));
    const maxSteps = Math.max(minSteps + 1, Math.ceil(context.maxX / 40));
    for (let i = 2; i < caveCount; i++) {
        const caveOffset = WorldGenNextInt(0, Math.max(1, Math.floor(width * 0.1)));
        const localStart = Math.floor((width * 0.8) + (width * 0.24 - width * 0.8) * (i / Math.max(1, caveCount - 1))) + caveOffset;
        let cx = ActualSulphX(localStart, context, atLeft);
        let cy = yStart + maxTopDepth + 6;
        let caveWidth = Math.floor((minCaveWidth + maxCaveWidth) / 3) + WorldGenNextInt(0, 8);
        const steps = WorldGenNextInt(minSteps, maxSteps);
        const caveSeed = WorldGenNextInt(1, 0x7fffffff);
        const baseAngle = Math.PI * 0.5 + WorldGenNextFloat(-1, 1) * 0.54;
        for (let j = 0; j < steps; j++) {
            const offsetAngle = SulphFBM(i / 50, j / 50, caveSeed, 4) * Math.PI * 1.9;
            const angle = baseAngle + offsetAngle;
            const dx = Math.cos(angle), dy = Math.sin(angle);
            if (cx < context.maxX - 15 && cx >= 15)
                smallCaveTiles += CarveSulphCircle(context, cx, cy, Math.max(1, Math.floor(caveWidth * 1.18)), SULPH_UNSAFE_SAND_WALL);
            cx += dx * caveWidth;
            cy += dy * caveWidth;
            const localDistance = atLeft ? cx : (context.maxX - 1 - cx);
            if (localDistance > width * 0.8 || cy > yStart + depth * 0.7) {
                cx -= (atLeft ? 1 : -1) * caveWidth;
                cy -= caveWidth;
            }
            const tightness = Math.pow(WorldGenNextFloat(), 2.21);
            caveWidth = Math.round(caveWidth * ((1 - 0.51) + ((1 + 0.51) - (1 - 0.51)) * tightness));
            if (WorldGenNextBool(12)) caveWidth = Math.floor(caveWidth * 1.4);
            caveWidth = Math.max(minCaveWidth, Math.min(maxCaveWidth, caveWidth));
        }
    }

    // GenerateSpaghettiWaterCaves: exact thresholds and source bias formula, using the
    // mobile-safe FBM above in place of NoiseHelper.GetStaticNoise.
    const caveDepth = Math.max(1, Math.floor(depth * 0.96));
    for (const threshold of [0.033, 0.089]) {
        const caveSeed = WorldGenNextInt(1, 0x7fffffff);
        for (let i = 2; i < width; i++) {
            const x = ActualSulphX(i, context, atLeft);
            if (x < 3 || x >= context.maxX - 3) continue;
            for (let y = yStart; y < Math.min(context.maxY - 3, yStart + caveDepth); y++) {
                const distance = Math.hypot(i / width, (y - yStart) / caveDepth);
                let bias = LerpValue(0.82, 0.96, distance * 0.8);
                bias += LerpValue(yStart + 12, yStart, y) * 0.2;
                bias += LerpValue(width - 19, width - 4, i) * 0.6;
                // After the source's sign-preserving bias transform, abs(noise) can never
                // be lower than bias. Skip the expensive 5-octave FBM when the threshold
                // is therefore mathematically unreachable; output is bit-for-bit equivalent.
                if (bias >= threshold) continue;
                let noise = SulphFBM(i * 0.00193, y * 0.00193, caveSeed, 5);
                const sign = noise < 0 ? -1 : (noise > 0 ? 1 : 0);
                noise = noise + (sign - noise) * Math.max(0, Math.min(1, bias));
                if (Math.abs(noise) < threshold) {
                    const tile = Terraria.Main.tile.get_Item(x, y);
                    if (ClearSulphCell(tile, SULPH_UNSAFE_SAND_WALL, true)) spaghettiTiles++;
                }
            }
        }
    }

    // GenerateCheeseWaterCaves / open caverns.
    {
        const caveSeed = WorldGenNextInt(1, 0x7fffffff);
        for (let i = 2; i < width; i++) {
            const x = ActualSulphX(i, context, atLeft);
            if (x < 3 || x >= context.maxX - 3) continue;
            for (let y = yStart; y < Math.min(context.maxY - 3, yStart + caveDepth); y++) {
                const distance = Math.hypot(i / width, (y - yStart) / caveDepth);
                let bias = LerpValue(0.82, 0.96, distance * 0.8);
                bias += LerpValue(yStart + 0.42 * caveDepth, yStart + 0.42 * caveDepth - 25, y);
                bias += LerpValue(width - 19, width - 4, i);
                // Six octaves with amplitude .5 and gain .5 can never exceed .984375.
                // If even that maximum cannot clear the official +0.32 threshold, FBM is useless.
                if (bias >= 0.664375) continue;
                const noise = SulphFBM(i * 0.00237, y * 0.00237, caveSeed, 6);
                if (noise - bias > 0.32) {
                    const tile = Terraria.Main.tile.get_Item(x, y);
                    if (ClearSulphCell(tile, SULPH_UNSAFE_SAND_WALL, true)) cheeseTiles++;
                }
            }
        }
    }

    // DecideHardSandstoneLine. Proxy 397 represents Hardened Sulphurous Sandstone and wall
    // 216 already has the matching unsafe-wall visual identity in this port.
    {
        const sandstoneSeed = WorldGenNextInt(1, 0x7fffffff);
        for (let i = 0; i < width; i++) {
            const x = ActualSulphX(i, context, atLeft);
            if (x < 3 || x >= context.maxX - 3) continue;
            const edgeTerm = Math.floor(Math.pow(LerpValue(width * 0.1, width * 0.8, i), 1.72) * 67);
            const baseOffset = Math.floor(depth * 0.42) - edgeTerm;
            const minOffset = baseOffset - 30, maxOffset = baseOffset + 29;
            for (let y = yStart; y < Math.min(context.maxY - 3, yStart + depth); y++) {
                if (y < yStart + minOffset) continue;
                // Below the maximum possible noise boundary the comparison is always true,
                // so only the narrow transition band needs the 7-octave FBM evaluation.
                if (y < yStart + maxOffset) {
                    const offset = Math.floor(SulphFBM(i * 0.004, y * 0.004, sandstoneSeed, 7) * 30) + baseOffset;
                    if (y < yStart + offset) continue;
                }
                const tile = Terraria.Main.tile.get_Item(x, y);
                if (!tile || !IsActive(tile) || Number(tile.type) !== Number(TILE_SULPHUROUS_SAND)) continue;
                tile.type = 397;
                tile.frameX = -1;
                tile.frameY = -1;
                tile.wall = 216;
                // Official DecideHardSandstoneLine ends with Actions.SetLiquid().
                tile.liquid = 255;
                TryCall(tile, 'void liquidType(int liquidType)', 0);
                hardenedTiles++;
            }
        }
    }

    // MakeSurfaceLessRigid. Keep this last, matching PlaceSulphurSea.
    {
        const heightSeed = WorldGenNextInt(1, 0x7fffffff);
        for (let i = 2; i < width; i++) {
            const x = ActualSulphX(i, context, atLeft);
            if (x < 3 || x >= context.maxX - 3 || yStart < 3 || yStart >= context.maxY - 3) continue;
            const base = Terraria.Main.tile.get_Item(x, yStart);
            if (!base || !IsActive(base)) continue;
            let noise = SulphFBM(i * 0.0079, yStart * 0.0079, heightSeed, 5) * 0.5 + 0.5;
            const edge = LerpValue(width - 13, width - 1, i);
            noise = noise + (0.5 - noise) * edge;
            const heightOffset = -Math.round((-9) + (16 - (-9)) * noise);
            if (heightOffset === 0) continue;
            const step = heightOffset > 0 ? 1 : -1;
            for (let dy = 0; dy !== heightOffset; dy += step) {
                const y = yStart + dy;
                if (y < 3 || y >= context.maxY - 3) break;
                const tile = Terraria.Main.tile.get_Item(x, y);
                if (!tile) continue;
                if (heightOffset > 0) {
                    // Official MakeSurfaceLessRigid chains Actions.SetLiquid() after ClearTile.
                    SetActive(tile, false);
                    tile.frameX = 0; tile.frameY = 0; tile.liquid = 255;
                    TryCall(tile, 'void liquidType(int liquidType)', 0);
                    if (dy >= heightOffset - 2) tile.wall = 0;
                } else {
                    // The same SetLiquid() is applied after placing raised Sulphurous Sand.
                    PlaceSulphSandCell(tile, Math.abs(dy - heightOffset) >= 3 ? 216 : 0, 255);
                }
                surfaceTiles++;
            }
        }
    }

    return { islandTiles, smallCaveTiles, spaghettiTiles, cheeseTiles, hardenedTiles, surfaceTiles,
        modified: islandTiles + smallCaveTiles + spaghettiTiles + cheeseTiles + hardenedTiles + surfaceTiles };
}


function GenerateOfficialSulphurousAfterAbyssTerrain(context, placement) {
    const mobileStarted=Date.now();
    const atLeft = placement.atLeft === true;
    const width = OfficialSulphurousWidth(context.maxX);
    const yStart = Math.floor(Number(placement.yStart) || DetermineOfficialSulphYStart(context, atLeft));
    const depth = Math.max(1, Math.floor(Number(placement.blockDepth) || OfficialSulphurousDepthFromYStart(context, yStart)));
    const sulphTypes = new Set([Number(TILE_SULPHUROUS_SAND), 396, 397]);
    const beachConvert = ResolveSet(Terraria.ID.TileID, [
        'Dirt','Stone','Crimstone','Ebonstone','Sand','Ebonsand','Crimsand','Grass','CorruptGrass','CrimsonGrass','ClayBlock','Mud'
    ], {Dirt:0,Stone:1,Crimstone:203,Ebonstone:25,Sand:53,Ebonsand:112,Crimsand:234,Grass:2,CorruptGrass:23,CrimsonGrass:199,ClayBlock:40,Mud:59});
    const beachDestroy = ResolveSet(Terraria.ID.TileID, [
        'Coral','BeachPiles','Plants','Plants2','SmallPiles','LargePiles','LargePiles2','CorruptThorns','CrimsonThorns','DyePlants','Trees',
        'Sunflower','LilyPad','SeaOats','ImmatureHerbs','MatureHerbs','BloomingHerbs','VanityTreeSakura','VanityTreeYellowWillow'
    ], {Coral:81,Plants:3,Plants2:73,Trees:5,CorruptThorns:32,CrimsonThorns:352,Sunflower:27,LilyPad:519});
    const dungeonWalls = new Set([7,94,95,8,98,99,9,96,97]);
    let beachTiles = 0, beachWalls = 0, strayTiles = 0, aloneTiles = 0, sandstoneTiles = 0;
    let detailResult = { scrapPiles: [], columns: [], modified: 0, columnRequested: 0, columnValidCandidates: 0, columnAttempts: 0 };

    // SulphurSeaGenerationAfterAbyss.CreateBeach. The Acidwood palm planting portion is left
    // for the dedicated vegetation pass because the custom sapling/tree tile is not registered
    // yet in TLPro; the terrain conversion itself follows the official pass.
    let beachWidth = WorldGenNextInt(150, 191);
    const edgeLocal = width + 4;
    const edgeX = ActualSulphX(edgeLocal, context, atLeft);
    let determinedY = -1;
    const searchStart = Math.max(3, WorldSurfaceLow(context) - 20);
    if (edgeX >= 3 && edgeX < context.maxX - 3) {
        for (let y = searchStart; y < context.maxY - 3; y++) {
            const t = Terraria.Main.tile.get_Item(edgeX, y);
            if (t && IsActive(t)) { determinedY = y; break; }
        }
    }
    if (determinedY >= 0) {
        const edgeTile = Terraria.Main.tile.get_Item(edgeX, determinedY);
        const edgeType = edgeTile ? Number(edgeTile.type) : -1;
        if (edgeType === 53 || edgeType === 112 || edgeType === 234) beachWidth += 85;
        for (let i = width - 10; i <= width + beachWidth; i++) {
            const x = ActualSulphX(i, context, atLeft);
            if (x < 3 || x >= context.maxX - 3) continue;
            const xRatio = LerpValue(width - 10, width + beachWidth, i);
            const ditherChance = LerpValue(0.92, 0.99, xRatio);
            const beachDepth = Math.floor(Math.sin((1 - xRatio) * Math.PI * 0.5) * 50 + 1);
            for (let y = Math.max(3, yStart - 50); y < Math.min(context.maxY - 3, yStart + beachDepth); y++) {
                const tile = Terraria.Main.tile.get_Item(x, y);
                if (!tile) continue;
                const type = Number(tile.type);
                if (IsActive(tile) && beachDestroy.has(type)) {
                    SetActive(tile, false); tile.frameX = 0; tile.frameY = 0; beachTiles++;
                } else if (IsActive(tile) && beachConvert.has(type) && WorldGenNextFloat() >= ditherChance) {
                    tile.type = TILE_SULPHUROUS_SAND; tile.frameX = -1; tile.frameY = -1; beachTiles++;
                }
                if (Number(tile.wall) > 0 && !dungeonWalls.has(Number(tile.wall))) {
                    tile.wall = SULPH_UNSAFE_SAND_WALL; beachWalls++;
                }
            }
        }
    }

    // One native snapshot for the whole post-Abyss Sulphurous band. The previous mobile port
    // reread the same cells during stray cleanup, alone cleanup and 24-neighbour sandstone
    // tests, which dominated worldgen on ARM. All topology decisions below now use typed arrays;
    // native tiles are touched again only when a cell actually changes.
    const yMin = Math.max(3, yStart), yMax = Math.min(context.maxY - 4, yStart + depth - 1);
    const snapPad=6, worldX0=atLeft?Math.max(3,ActualSulphX(1,context,atLeft)-snapPad):Math.max(3,ActualSulphX(width-1,context,atLeft)-snapPad);
    const worldX1=atLeft?Math.min(context.maxX-4,ActualSulphX(width-1,context,atLeft)+snapPad):Math.min(context.maxX-4,ActualSulphX(1,context,atLeft)+snapPad);
    // PlaceAmbience also probes the shallow band above yStart. Include it in the same snapshot
    // so the post-pass and ambience/chest candidate searches share one native read of each cell.
    const snapY0=Math.max(3,yStart-146), snapY1=Math.min(context.maxY-4,yMax+84);
    const snapW=Math.max(1,worldX1-worldX0+1),snapH=Math.max(1,snapY1-snapY0+1),snapTotal=snapW*snapH;
    const snapActive=new Uint8Array(snapTotal),snapType=new Uint16Array(snapTotal),snapWall=new Uint16Array(snapTotal),snapLiquid=new Uint8Array(snapTotal);
    const snapIndex=(x,y)=>(x<worldX0||x>worldX1||y<snapY0||y>snapY1)?-1:(y-snapY0)*snapW+(x-worldX0);
    let snapshotReads=0;
    for(let y=snapY0;y<=snapY1;y++)for(let x=worldX0;x<=worldX1;x++){const si=snapIndex(x,y),t=Terraria.Main.tile.get_Item(x,y);snapshotReads++;if(!t)continue;snapActive[si]=IsActive(t)?1:0;snapType[si]=Math.max(0,Math.min(65535,Number(t.type)||0));snapWall[si]=Math.max(0,Math.min(65535,Number(t.wall)||0));snapLiquid[si]=Math.max(0,Math.min(255,Number(t.liquid)||0));}
    const SA=(x,y)=>{const i=snapIndex(x,y);if(i>=0)return snapActive[i]===1;const t=Terraria.Main.tile.get_Item(x,y);return !!t&&IsActive(t);};
    const ST=(x,y)=>{const i=snapIndex(x,y);if(i>=0)return Number(snapType[i]);const t=Terraria.Main.tile.get_Item(x,y);return t?Number(t.type):-1;};
    const SL=(x,y)=>{const i=snapIndex(x,y);if(i>=0)return Number(snapLiquid[i]);const t=Terraria.Main.tile.get_Item(x,y);return t?Math.max(0,Math.min(255,Number(t.liquid)||0)):0;};
    const SS=(x,y,a,type=null,wall=null,liquid=null)=>{const i=snapIndex(x,y);if(i>=0){snapActive[i]=a?1:0;if(type!==null)snapType[i]=Math.max(0,Math.min(65535,Number(type)||0));if(wall!==null)snapWall[i]=Math.max(0,Math.min(65535,Number(wall)||0));if(liquid!==null)snapLiquid[i]=Math.max(0,Math.min(255,Number(liquid)||0));}};

    // ClearOutStrayTiles. The desktop implementation recursively gathers the same component
    // many times. This visited flood-fill is equivalent for the final terrain and avoids a
    // recursion/stack hazard on Android. Dither-edge cells remain intentionally untouched.
    const h = Math.max(0, yMax - yMin + 1);
    const visited = new Uint8Array(Math.max(1, width * h));
    const localOfX = (x) => atLeft ? x : (context.maxX - 1 - x);
    const markIndex = (localX, y) => (y - yMin) * width + localX;
    for (let localX = 1; localX < width; localX++) {
        for (let y = yMin; y <= yMax; y++) {
            const vi = markIndex(localX, y);
            if (visited[vi]) continue;
            const x = ActualSulphX(localX, context, atLeft);
            if (!SA(x,y) || !sulphTypes.has(ST(x,y)) || SulphDitherChance(width, yStart, yStart + depth, localX, y) > 0) {
                visited[vi] = 1; continue;
            }
            const stack = [[x, y]], component = [];
            let overflow = false;
            while (stack.length) {
                const q = stack.pop(), qx = q[0], qy = q[1];
                if (qy < yMin || qy > yMax) continue;
                const ql = localOfX(qx);
                if (ql < 1 || ql >= width) continue;
                const qi = markIndex(ql, qy);
                if (visited[qi]) continue;
                visited[qi] = 1;
                if (!SA(qx,qy) || !sulphTypes.has(ST(qx,qy))) continue;
                if (SulphDitherChance(width, yStart, yStart + depth, ql, qy) > 0) continue;
                component.push([qx, qy]);
                if (component.length > 432) { overflow = true; break; }
                stack.push([qx+1,qy],[qx-1,qy],[qx,qy+1],[qx,qy-1]);
            }
            if (overflow) continue;
            const cutoff = y >= yStart + depth * 0.42 ? 432 : 50;
            if (component.length >= 2 && component.length < cutoff) {
                for (const q of component) {
                    const t = Terraria.Main.tile.get_Item(q[0], q[1]);
                    if (!t) continue;
                    // Official ClearOutStrayTiles ends with Actions.SetLiquid(), whose
                    // default is water at byte.MaxValue. The previous port incorrectly left
                    // these cleared chunks as dry air, creating visible dry seams/pockets.
                    SetActive(t, false); t.frameX = 0; t.frameY = 0; t.wall = 187; t.liquid = 255;
                    TryCall(t, 'void liquidType(int liquidType)', 0); SS(q[0],q[1],false,Number(t.type),187,255);
                    strayTiles++;
                }
            }
        }
    }

    // ClearAloneTiles: remove single isolated Sulphurous terrain cells and their wall.
    for (let localX = 1; localX < width; localX++) {
        const x = ActualSulphX(localX, context, atLeft);
        if (x < 3 || x >= context.maxX - 3) continue;
        for (let y = yMin; y <= yMax; y++) {
            if (!SA(x,y) || !sulphTypes.has(ST(x,y))) continue;
            let neighbors = 0;
            for (const d of [[-1,0],[1,0],[0,-1],[0,1]]) if(SA(x+d[0],y+d[1])) neighbors++;
            if (neighbors === 0) {
                // ClearAloneTiles also chains Actions.SetLiquid() after ClearTile/ClearWall.
                const t=Terraria.Main.tile.get_Item(x,y); if(!t)continue;
                SetActive(t, false); t.frameX = 0; t.frameY = 0; t.wall = 0; t.liquid = 255;
                TryCall(t, 'void liquidType(int liquidType)', 0); SS(x,y,false,Number(t.type),0,255);
                aloneTiles++;
            }
        }
    }

    // Official post-Abyss order: PlaceScrapPiles -> GenerateColumnsInCaverns -> GenerateHardenedSandstone.
    // Feed the same snapshot into scrap/column candidate searches so those systems do not
    // restart native tile scans of this band. Native access remains only for actual placement.
    const detailSolidTypes=new Set([Number(TILE_SULPHUROUS_SAND),396,397,404,38,541,0,1,53,112,234]);
    const detailAccessor={active:SA,solid:(x,y)=>SA(x,y)&&detailSolidTypes.has(ST(x,y)),set:SS};
    detailResult = SulphurousSeaDetailRuntime.Generate(context, { ...placement, width, yStart, blockDepth: depth, atLeft }, detailAccessor);

    // GenerateHardenedSandstone: convert exposed cave edges into Sulphurous Sandstone.
    // A cheap mathematical prefilter avoids the 24-neighbor edge scan when conversion can
    // never reach the official >= 0.5 threshold.
    const sandstoneSeed = WorldGenNextInt(1, 0x7fffffff);
    for (let localX = 1; localX < width; localX++) {
        const x = ActualSulphX(localX, context, atLeft);
        if (x < 9 || x >= context.maxX - 9) continue;
        for (let y = yMin; y <= Math.min(context.maxY - 9, yStart + depth); y++) {
            const depthFactor = LerpValue(yStart + 30, yStart + 54, y);
            if (depthFactor <= 0) continue;
            const baseChance = SulphFBM(localX * 0.00115, y * 0.00115, sandstoneSeed, 7) * 0.5 + 0.5;
            if (baseChance * depthFactor < 0.5) continue;
            let edgeScore = 0;
            for (let dx = -6; dx <= 6; dx++) if (dx !== 0 && !SA(x+dx,y)) edgeScore++;
            for (let dy = -6; dy <= 6; dy++) if (dy !== 0 && !SA(x,y+dy)) edgeScore++;
            let chance = baseChance * LerpValue(4, 11, edgeScore) * depthFactor;
            if (chance < 0.5 || WorldGenNextFloat() > chance) continue;
            for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
                const qx=x+dx,qy=y+dy; if (qx<3||qx>=context.maxX-3||qy<3||qy>=context.maxY-3) continue;
                if(!SA(qx,qy)||!sulphTypes.has(ST(qx,qy))||ST(qx,qy)===396)continue;
                const q=Terraria.Main.tile.get_Item(qx,qy); if(!q)continue;
                q.type=396; q.wall=187; q.frameX=-1; q.frameY=-1;
                // Official GenerateHardenedSandstone also chains Actions.SetLiquid().
                q.liquid=255; TryCall(q, 'void liquidType(int liquidType)', 0); SS(qx,qy,true,396,187,255);
                sandstoneTiles++;
            }
        }
    }

    // Official SulphurSeaGenerationAfterAbyss order continues with PlaceAmbience() and then
    // GenerateChests(scrapPilePositions). Decorative furniture is metadata-only; only the few
    // objects that genuinely need collision retain exact-scoped hidden physical proxies.
    const ambienceAccessor = { active: SA, type: ST, liquid: SL, solid: (x,y)=>SA(x,y)&&detailSolidTypes.has(ST(x,y)), set: SS };
    const ambienceResult = SulphurousSeaAmbienceRuntime.Generate(
        context,
        { ...placement, width, yStart, blockDepth: depth, atLeft },
        detailResult.scrapPiles,
        ambienceAccessor
    );

    return { beachWidth, beachTiles, beachWalls, strayTiles, aloneTiles, sandstoneTiles,
        scrapPiles: detailResult.scrapPiles, scrapAttempts: detailResult.scrapAttempts, scrapFallbackUsed: detailResult.scrapFallbackUsed,
        columns: detailResult.columns, columnRequested: detailResult.columnRequested,
        columnValidCandidates: detailResult.columnValidCandidates, columnAttempts: detailResult.columnAttempts, columnFallbackUsed: detailResult.columnFallbackUsed,
        ambience: ambienceResult.ambience, ambienceCounts: ambienceResult.ambienceCounts, ambienceHostCells: ambienceResult.ambienceHostCells,
        rustyChests: ambienceResult.chests, rustyChestsRequested: ambienceResult.chestsRequested, rustyChestsGenerated: ambienceResult.chestsGenerated, snapshotReads, elapsedMs:Date.now()-mobileStarted,
        modified: beachTiles + beachWalls + strayTiles + aloneTiles + sandstoneTiles + Math.max(0, Number(detailResult.modified) || 0) + Math.max(0, Number(ambienceResult.modified) || 0) };
}

let SunkenPlan = null;
let SunkenRowStarts = null;
let SunkenRowEnds = null;
let SunkenPlanWidth = 0;
let SunkenPlanHeight = 0;
let SunkenPlanSeed = null;
let PlannedCells = 0;

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
}

function CurrentWorldID() {
    try {
        return Math.floor(Number(Terraria.Main.worldID) || 0);
    } catch (e) {
        return 0;
    }
}

function CurrentWorldName() {
    try {
        return String(Terraria.Main.worldName || '');
    } catch (e) {
        return '';
    }
}

function IsActive(tile) {
    return tile != null && tile['bool active()']() === true;
}

function SetActive(tile, value) {
    tile['void active(bool active)'](value === true);
}

function TryCall(target, signature, value) {
    try {
        if (target && typeof target[signature] === 'function') {
            target[signature](value);
            return true;
        }
    } catch (e) { }
    return false;
}

function NativeAt(collection, index, typedSignature = '') {
    if (!collection)
        return null;
    index = Math.floor(Number(index));
    if (!Number.isFinite(index) || index < 0)
        return null;
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
            if (typeof getter === 'function')
                return getter(index);
        } catch (e) { }
    }
    return null;
}

function ResetTileState(tile) {
    // Mobile-safe equivalent of the relevant ClearEverything() state.
    SetActive(tile, false);
    tile.type = 0;
    tile.frameX = -1;
    tile.frameY = -1;
    tile.liquid = 0;
    TryCall(tile, 'void liquidType(int liquidType)', 0);
    TryCall(tile, 'void halfBrick(bool halfBrick)', false);
    TryCall(tile, 'void slope(byte slope)', 0);
    TryCall(tile, 'void color(byte color)', 0);
    TryCall(tile, 'void frameNumber(byte frameNumber)', 0);
    TryCall(tile, 'void actuator(bool actuator)', false);
    TryCall(tile, 'void inActive(bool inActive)', false);
    TryCall(tile, 'void wire(bool wire)', false);
    TryCall(tile, 'void wire2(bool wire2)', false);
    TryCall(tile, 'void wire3(bool wire3)', false);
    TryCall(tile, 'void wire4(bool wire4)', false);
}

function IsPlannedSunkenWorldCell(placement, x, y) {
    if (!placement)
        return false;
    const localX = Math.floor(Number(x) - Number(placement.left));
    const localY = Math.floor(Number(y) - Number(placement.top));
    if (localX < 0 || localY < 0 || localX >= Number(placement.width) || localY >= Number(placement.height))
        return false;
    return PlanSunkenCell(localX, localY, placement.width, placement.height) > 0;
}

function DestroyVanillaChestsInsideSunken(placement) {
    let removed = 0;
    for (let index = 0; index < 1000; index++) {
        const chest = NativeAt(Terraria.Main.chest, index, 'Chest get_Item(int index)');
        if (!chest)
            continue;
        const x = Math.floor(Number(chest.x));
        const y = Math.floor(Number(chest.y));
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0)
            continue;
        let claimed = false;
        for (let dx = 0; dx < 2 && !claimed; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                if (IsPlannedSunkenWorldCell(placement, x + dx, y + dy)) {
                    claimed = true;
                    break;
                }
            }
        }
        if (!claimed)
            continue;
        let destroyed = false;
        try {
            destroyed = Terraria.Chest['bool DestroyChest(int X, int Y)'](x, y) === true;
        } catch (e) { }
        if (!destroyed) {
            // Fallback prevents a ghost chest entry if this mobile build does
            // not expose the named static overload or refuses a non-empty chest.
            try {
                Terraria.Main.chest[index] = null;
                destroyed = Terraria.Main.chest[index] == null;
            } catch (e) { }
        }
        if (!destroyed) {
            try {
                chest.x = -1;
                chest.y = -1;
                destroyed = true;
            } catch (e) { }
        }
        if (destroyed) {
            // Remove the complete 2x2 object even when only one of its cells
            // crossed the irregular edge of the biome.
            for (let dx = 0; dx < 2; dx++) {
                for (let dy = 0; dy < 2; dy++) {
                    const chestTile = Terraria.Main.tile.get_Item(x + dx, y + dy);
                    if (chestTile)
                        ResetTileState(chestTile);
                }
            }
            removed++;
        }
    }
    return removed;
}

function IsFrameImportant(type) {
    try {
        return Terraria.Main.tileFrameImportant[Number(type)] === true;
    } catch (e) {
        return false;
    }
}

function IsHouseWall(wall) {
    if (!(wall > 0))
        return false;
    try {
        return Terraria.Main.wallHouse[Number(wall)] === true;
    } catch (e) {
        return false;
    }
}

function CanReplaceSunken(tile) {
    // The official Sunken Sea generator does not preserve vanilla ores,
    // furniture, cabins or other worldgen debris inside cells claimed by
    // the biome. Its cluster pass either ClearEverything()s or ResetToType()s
    // the destination tile. Therefore every valid planned cell is replaceable.
    return tile != null;
}

function CanConvertSulphurous(tile) {
    if (!tile || !IsActive(tile))
        return false;
    const type = Number(tile.type) || 0;
    if (!CoastalSandTiles.has(type))
        return false;
    if (SulphurousProtectedTiles.has(type) || IsFrameImportant(type))
        return false;
    const wall = Number(tile.wall) || 0;
    if (IsHouseWall(wall))
        return false;
    return true;
}

// 0 = untouched, 1 = water/eutrophic wall, 2 = water/navystone wall,
// 3 = eutrophic solid, 4 = navystone solid, 5 = sea prism solid.
function PlanSunkenCell(localX, localY, width = SunkenPlanWidth || SUNKEN_DEFAULT_WIDTH, height = SunkenPlanHeight || SUNKEN_DEFAULT_HEIGHT) {
    return OrganicBiomePlanner.SunkenPlanCode(localX, localY, width, height);
}

function BuildSunkenPlan(width = SUNKEN_DEFAULT_WIDTH, height = SUNKEN_DEFAULT_HEIGHT, seed = CurrentWorldID()) {
    const targetWidth = Math.max(160, Math.floor(Number(width) || SUNKEN_DEFAULT_WIDTH));
    const targetHeight = Math.max(120, Math.floor(Number(height) || SUNKEN_DEFAULT_HEIGHT));
    const targetSeed = Math.floor(Number(seed) || 0);
    if (SunkenPlan && SunkenPlanWidth === targetWidth && SunkenPlanHeight === targetHeight && SunkenPlanSeed === targetSeed)
        return;
    OrganicBiomePlanner.ConfigureSunkenSeed(targetSeed);
    SunkenPlanWidth = targetWidth;
    SunkenPlanHeight = targetHeight;
    SunkenPlanSeed = targetSeed;
    SunkenPlan = new Array(targetWidth * targetHeight);
    SunkenRowStarts = new Array(targetHeight);
    SunkenRowEnds = new Array(targetHeight);
    PlannedCells = 0;
    for (let localY = 0; localY < targetHeight; localY++) {
        const localStart = 0;
        const localEnd = targetWidth - 1;
        SunkenRowStarts[localY] = localStart;
        SunkenRowEnds[localY] = localEnd;
        const row = localY * targetWidth;
        for (let localX = localStart; localX <= localEnd; localX++) {
            const plan = PlanSunkenCell(localX, localY, targetWidth, targetHeight);
            SunkenPlan[row + localX] = plan;
            if (plan > 0)
                PlannedCells++;
        }
    }

    // Navystone variance is intentionally applied after the plan has touched real world
    // tiles. Desktop Calamity only converts Eutrophic Sand when either of the two cells
    // directly below it is non-solid; the old plan-space pass checked every direction and
    // outlined every cave with Navystone, which was visibly wrong on the map.
}

function StableWorldUnit(worldId) {
    let n = Math.floor(Number(worldId) || 0) | 0;
    n = Math.imul(n ^ 0x6d2b79f5, 0x27d4eb2d);
    n ^= n >>> 15;
    n = Math.imul(n, 0x85ebca6b);
    n ^= n >>> 13;
    return (n >>> 0) / 4294967295;
}

function ResolveOfficialSunkenDimensions(context) {
    // Desktop Calamity builds an 80x(60*1.4..1.7) cluster field, stretches it by 4x/2x,
    // then deliberately evaluates another 20 tiles on every side. Keep that entire envelope:
    // the old TLPro port omitted the ±20 rim, which made the sea look noticeably smaller and
    // cut off the wispy cluster falloff visible in the original generator.
    const scale = Clamp((Number(context?.maxX) || 4200) / 4200, 1, 2);
    const coreWidth = Math.max(320, Math.floor(80 * scale) * 4);
    const verticalFactor = 1.4 + StableWorldUnit(context?.worldId) * 0.3;
    const coreHeight = Math.max(168, Math.floor(60 * scale * verticalFactor) * 2);
    const padding = 20;
    return {
        width: coreWidth + padding * 2,
        height: coreHeight + padding * 2,
        coreWidth,
        coreHeight,
        padding,
        scale,
        verticalFactor
    };
}

function ScoreDesertColumn(x, startY, endY) {
    let score = 0;
    const { Main } = Terraria;
    for (let y = startY; y <= endY; y += 24) {
        const tile = Main.tile.get_Item(x, y);
        if (!tile)
            continue;
        if (DesertWalls.has(Number(tile.wall) || 0))
            score += 6;
        if (DesertTiles.has(Number(tile.type) || 0))
            score += 1;
    }
    return score;
}

function FindDesert(context) {
    const startY = Math.max(80, context.worldSurface + 45);
    const endY = Math.min(context.maxY - 450, Math.max(startY + 144, context.rockLayer + 180));
    const startX = Math.max(180, Math.floor(context.maxX * 0.12));
    const endX = Math.min(context.maxX - 180, Math.floor(context.maxX * 0.88));
    let bestX = 0;
    let bestScore = 0;
    for (let x = startX; x <= endX; x += 16) {
        let score = ScoreDesertColumn(x, startY, endY);
        score += ScoreDesertColumn(x - 8, startY, endY) * 0.35;
        score += ScoreDesertColumn(x + 8, startY, endY) * 0.35;
        if (score > bestScore) {
            bestScore = score;
            bestX = x;
        }
    }
    if (bestScore < 12)
        return null;

    // Approximate GenVars.UndergroundDesertLocation.Center instead of anchoring on
    // whichever sampled column happened to score highest. This is notably more stable
    // on wide/irregular vanilla deserts and mirrors the current desktop Calamity fix.
    const threshold = Math.max(8, bestScore * 0.24);
    let desertLeft = bestX, desertRight = bestX;
    let misses = 0;
    for (let x = bestX - 12; x >= startX; x -= 12) {
        const score = ScoreDesertColumn(x, startY, endY);
        if (score >= threshold) { desertLeft = x; misses = 0; }
        else if (++misses >= 3) break;
    }
    misses = 0;
    for (let x = bestX + 12; x <= endX; x += 12) {
        const score = ScoreDesertColumn(x, startY, endY);
        if (score >= threshold) { desertRight = x; misses = 0; }
        else if (++misses >= 3) break;
    }
    const centerX = Math.floor((desertLeft + desertRight) * 0.5);

    // Desktop starts deep and searches upward until it encounters the underground
    // desert wall, then offsets 50 tiles downward. The bottommost wall scan below is
    // equivalent while remaining bounded/mobile-safe.
    let bottom = 0;
    const bottomEnd = Math.min(context.maxY - 350, context.rockLayer + 260);
    for (let y = context.worldSurface + 40; y <= bottomEnd; y += 2) {
        const tile = Terraria.Main.tile.get_Item(centerX, y);
        if (tile && DesertWalls.has(Number(tile.wall) || 0))
            bottom = y;
    }
    if (!(bottom > 0)) {
        for (let y = context.worldSurface + 40; y <= bottomEnd; y += 2) {
            const tile = Terraria.Main.tile.get_Item(bestX, y);
            if (tile && DesertWalls.has(Number(tile.wall) || 0))
                bottom = y;
        }
    }
    return {
        centerX,
        bottom,
        desertLeft,
        desertRight,
        source: `direct-desert-bounds:${desertLeft}-${desertRight}:score=${bestScore.toFixed(1)}`
    };
}

function CaptureContextAfterVanilla() {
    const { Main } = Terraria;
    let dungeonX = Math.floor((Number(Main.maxTilesX) || 4200) * 0.5);
    try {
        dungeonX = Math.floor(Number(Main.dungeonX) || dungeonX);
    } catch (e) { }
    return {
        maxX: Math.max(400, Math.floor(Number(Main.maxTilesX) || 4200)),
        maxY: Math.max(300, Math.floor(Number(Main.maxTilesY) || 1200)),
        worldSurface: Math.max(60, Math.floor(Number(Main.worldSurface) || 250)),
        rockLayer: Math.max(160, Math.floor(Number(Main.rockLayer) || 480)),
        dungeonX,
        worldId: CurrentWorldID(),
        worldName: CurrentWorldName()
    };
}

function OfficialSulphurousWidth(maxX) {
    if (maxX === 4200)
        return 370;
    if (maxX === 6400)
        return 445;
    return Math.max(280, Math.min(520, Math.floor(maxX / 16.8)));
}

function OfficialSulphurousDepth(context) {
    const factor = context.maxX === 4200 ? 0.8 : (context.maxX === 6400 ? 0.85 : 0.925);
    const depth = Math.floor((context.rockLayer + 112 - context.worldSurface) * factor);
    return Math.max(220, Math.min(380, depth));
}

function ResolveSulphurousPlacement(context) {
    const atLeft = context.dungeonX < context.maxX * 0.5;
    const width = OfficialSulphurousWidth(context.maxX);
    const height = OfficialSulphurousDepth(context);
    const margin = 12;
    const left = atLeft ? margin : context.maxX - margin - width;
    const top = Math.floor(Clamp(Math.max(35, context.worldSurface - 55), 12, context.maxY - height - 12));
    return {
        generated: true,
        centerX: left + Math.floor(width / 2),
        centerY: top + Math.floor(height / 2),
        width,
        height,
        left,
        top,
        atLeft,
        mode: atLeft ? 'generated-worldgen-dungeon-ocean-left' : 'generated-worldgen-dungeon-ocean-right',
        source: `dungeon-ocean:${atLeft ? 'left' : 'right'}:dungeonX=${context.dungeonX}`
    };
}

function PlanSulphurousCell(localX, localY, placement, context) {
    const surfaceLocal = Clamp(context.worldSurface - placement.top, 8, placement.height - 8);
    const band = OrganicBiomePlanner.SulphurousPlanBand(
        localX,
        localY,
        placement.width,
        placement.height,
        placement.atLeft === true,
        surfaceLocal
    );
    if (band === 1)
        return TILE_SULPHUROUS_SAND;
    if (band === 2)
        return 396;
    if (band === 3)
        return 397;
    if (band === 4)
        return 404;
    return 0;
}

function ResolveSunkenPlacement(context) {
    const desert = FindDesert(context);
    if (!desert || !(desert.centerX > 0))
        return null;
    const dimensions = ResolveOfficialSunkenDimensions(context);
    const halfW = Math.floor(dimensions.width / 2);
    const halfH = Math.floor(dimensions.height / 2);
    const centerX = Math.floor(Clamp(desert.centerX, halfW + 12, context.maxX - halfW - 12));
    const fallbackTop = Math.max(context.worldSurface + 160, Math.min(context.maxY - dimensions.height - 90, context.rockLayer + 100));
    // The official origin is 50 tiles below the last Underground Desert wall, while its
    // PlaceClusters loop starts at origin-20. Store the real modified envelope, not the core.
    const officialEnvelopeTop = desert.bottom > 0 ? desert.bottom + 50 - dimensions.padding : fallbackTop;
    const top = Math.floor(Clamp(officialEnvelopeTop, 12, context.maxY - dimensions.height - 12));
    return {
        generated: true,
        centerX,
        centerY: top + halfH,
        width: dimensions.width,
        height: dimensions.height,
        scale: dimensions.scale,
        verticalFactor: dimensions.verticalFactor,
        coreWidth: dimensions.coreWidth,
        coreHeight: dimensions.coreHeight,
        padding: dimensions.padding,
        left: centerX - halfW,
        top,
        mode: 'generated-worldgen-official-scale-below-desert',
        source: desert.source,
        desertBottom: Math.floor(Number(desert.bottom) || 0),
        desertLeft: Math.floor(Number(desert.desertLeft) || 0),
        desertRight: Math.floor(Number(desert.desertRight) || 0)
    };
}

function SetWaterCell(tile, wall) {
    ResetTileState(tile);
    tile.wall = wall;
    tile.liquid = 192;
    TryCall(tile, 'void liquidType(int liquidType)', 0);
}

function SetSolidCell(tile, type, wall) {
    ResetTileState(tile);
    SetActive(tile, true);
    tile.type = type;
    tile.frameX = -1;
    tile.frameY = -1;
    tile.wall = wall;
    tile.liquid = 0;
    TryCall(tile, 'void liquidType(int liquidType)', 0);
}

function IsSunkenWall(tile) {
    if (!tile)
        return false;
    const wall = Number(tile.wall) || 0;
    return wall === Number(WALL_EUTROPHIC) || wall === Number(WALL_NAVYSTONE);
}

function ReadLiquidType(tile) {
    if (!tile)
        return -1;
    try {
        return Math.floor(Number(tile['byte liquidType()']()) || 0);
    } catch (e) {
        return -1;
    }
}

function ClearSunkenTileKeepWall(tile, waterAmount = 0) {
    if (!tile)
        return false;
    SetActive(tile, false);
    tile.type = 0;
    tile.frameX = -1;
    tile.frameY = -1;
    TryCall(tile, 'void halfBrick(bool halfBrick)', false);
    TryCall(tile, 'void slope(byte slope)', 0);
    TryCall(tile, 'void actuator(bool actuator)', false);
    TryCall(tile, 'void inActive(bool inActive)', false);
    if (waterAmount > 0) {
        tile.liquid = Math.max(Math.floor(Number(tile.liquid) || 0), Math.floor(Number(waterAmount) || 0));
        TryCall(tile, 'void liquidType(int liquidType)', 0);
    }
    return true;
}

function ApplyDesktopSunkenFinalCleanup(placement) {
    // Port of the important non-cosmetic pieces from desktop PlaceClusters()'s
    // final cleanup loop. Keep this intentionally conservative: the v11 cluster
    // silhouette already matches Calamity well, so do not run an additional cave
    // carver here. We only remove worldgen residue that desktop explicitly cleans.
    let lavaConverted = 0;
    let obsidianRemoved = 0;
    let floatingRemoved = 0;
    const left = Math.max(3, Math.floor(Number(placement.left) || 0));
    const right = Math.min(Number(Terraria.Main.maxTilesX) - 4, left + Math.max(1, Math.floor(Number(placement.width) || 1)) - 1);
    const top = Math.max(3, Math.floor(Number(placement.top) || 0));
    const bottom = Math.min(Number(Terraria.Main.maxTilesY) - 4, top + Math.max(1, Math.floor(Number(placement.height) || 1)) - 1);

    // Pass 1: lava -> water and leftover obsidian -> flooded cavity.
    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile || !IsSunkenWall(tile))
                continue;
            const liquid = Math.floor(Number(tile.liquid) || 0);
            if (liquid > 0 && ReadLiquidType(tile) === 1) {
                tile.liquid = 255;
                TryCall(tile, 'void liquidType(int liquidType)', 0);
                lavaConverted++;
            }
            if (IsActive(tile) && Number(tile.type) === 56) { // TileID.Obsidian
                ClearSunkenTileKeepWall(tile, 255);
                obsidianRemoved++;
            }
        }
    }

    // Pass 2: desktop removes single Eutrophic/Navystone cells that float with no
    // orthogonal support. Flood the vacated cell because our pass runs after vanilla
    // liquid settling and would otherwise leave tiny dry pixels on mobile.
    for (let y = top + 1; y < bottom; y++) {
        for (let x = left + 1; x < right; x++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile || !IsActive(tile))
                continue;
            const type = Number(tile.type) || 0;
            if (type !== Number(TILE_EUTROPHIC) && type !== Number(TILE_NAVYSTONE))
                continue;
            const up = Terraria.Main.tile.get_Item(x, y - 1);
            const down = Terraria.Main.tile.get_Item(x, y + 1);
            const leftTile = Terraria.Main.tile.get_Item(x - 1, y);
            const rightTile = Terraria.Main.tile.get_Item(x + 1, y);
            if (IsActive(up) || IsActive(down) || IsActive(leftTile) || IsActive(rightTile))
                continue;
            ClearSunkenTileKeepWall(tile, IsSunkenWall(tile) ? 192 : 0);
            floatingRemoved++;
        }
    }
    return { lavaConverted, obsidianRemoved, floatingRemoved };
}

function ApplyDesktopSunkenNavystoneVariance(placement) {
    // Mirrors the small material-variance check at the end of AddGeodes():
    // Eutrophic Sand becomes Navystone when the tile one or two cells below is open.
    // Keep the existing wall untouched, just like `tile.TileType = Navystone` on desktop.
    let converted = 0;
    const left = Math.max(3, Math.floor(Number(placement.left) || 0));
    const right = Math.min(Number(Terraria.Main.maxTilesX) - 4, left + Math.max(1, Math.floor(Number(placement.width) || 1)) - 1);
    const top = Math.max(3, Math.floor(Number(placement.top) || 0));
    const bottom = Math.min(Number(Terraria.Main.maxTilesY) - 5, top + Math.max(1, Math.floor(Number(placement.height) || 1)) - 1);
    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile || !IsActive(tile) || Number(tile.type) !== Number(TILE_EUTROPHIC))
                continue;
            const below = Terraria.Main.tile.get_Item(x, y + 1);
            const below2 = Terraria.Main.tile.get_Item(x, y + 2);
            if ((below && IsActive(below)) && (below2 && IsActive(below2)))
                continue;
            tile.type = TILE_NAVYSTONE;
            tile.frameX = -1;
            tile.frameY = -1;
            converted++;
        }
    }
    return converted;
}

function SetSulphurousSolidCell(tile, type) {
    const target = Number(type) || 0;
    if ((Number(tile.type) || 0) === target)
        return false;
    tile.type = target;
    tile.frameX = -1;
    tile.frameY = -1;
    return true;
}

function CountSampledType(bounds, targetType, step = 4) {
    let count = 0;
    const right = bounds.left + bounds.width - 1;
    const bottom = bounds.top + bounds.height - 1;
    for (let y = bounds.top + 2; y <= bottom - 2; y += step) {
        for (let x = bounds.left + 2; x <= right - 2; x += step) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (tile && IsActive(tile) && Number(tile.type) === Number(targetType))
                count++;
        }
    }
    return count;
}

function Log(message) {
    try {
        tl.log(`[CalamityPort DirectWorldgen] ${message}`);
    } catch (e) { }
}


function GenerateFreshPlanetoidLab(planetoids) {
    try {
        if (!planetoids || planetoids.generated !== true)
            return { generated: false, reason: 'planetoids-unavailable', source: 'fresh-world-direct' };
        const x = Math.floor(Number(planetoids.mainX) || -1);
        const y = Math.floor(Number(planetoids.mainY) || -1);
        if (x < 0 || y < 0)
            return { generated: false, reason: 'main-planetoid-anchor-unavailable', source: 'fresh-world-direct' };
        const session = PlanetoidLabRuntime.CreateSession(x, y);
        let step = null;
        let guard = 0;
        do {
            step = PlanetoidLabRuntime.StepSession(session, 1000000);
        } while (step && step.done !== true && guard++ < 8);
        if (step && step.done === true && step.result)
            return { ...step.result, source: 'official-planetoid-lab-fresh-world-direct-v1' };
        return { generated: false, reason: 'bounded-direct-budget-exhausted', source: 'fresh-world-direct' };
    } catch (e) {
        Log(`Planetoid Lab direct worldgen failed safely: ${e}`);
        return { generated: false, reason: String(e), source: 'fresh-world-direct-error' };
    }
}

function GenerateFreshShimmerShrine(context) {
    try {
        const search = ShimmerShrineRuntime.Begin(context);
        // Never fall back to the enormous live-world liquid scan here. During fresh worldgen,
        // Calamity's official anchor is already exposed as GenVars.shimmerPosition.
        if (!search || search.phase !== 'ground') {
            Log('Shimmer Shrine direct pass skipped: GenVars.shimmerPosition unavailable; no gameplay fallback scan scheduled.');
            return { generated: false, reason: 'shimmer-anchor-unavailable', source: 'worldgen-no-live-scan', reads: Number(search?.reads || 0) };
        }
        for (let i = 0; i < 8; i++) {
            const step = ShimmerShrineRuntime.Step(search, 4096);
            if (step?.generated === true && step.result)
                return { ...step.result, generated: true, reads: Number(search.reads || step.reads || 0), source: String(step.result.source || 'official-shimmer-worldgen-anchor') };
            if (step?.done === true)
                return { generated: false, reason: String(step.reason || 'placement-failed'), reads: Number(step.reads || search.reads || 0), source: 'worldgen-anchor' };
        }
        return { generated: false, reason: 'bounded-worldgen-budget-exhausted', reads: Number(search.reads || 0), source: 'worldgen-anchor' };
    } catch (e) {
        Log(`Shimmer Shrine direct pass failed safely: ${e}`);
        return { generated: false, reason: String(e), source: 'worldgen-anchor-error', reads: 0 };
    }
}

export const WorldgenBiomeRuntime = {
    Pending: null,
    InProgress: false,
    LastError: '',

    Prepare() {
        const started = Date.now();
        OrganicBiomePlanner.Prepare();
        BuildSunkenPlan();
        const stats = OrganicBiomePlanner.GetStats();
        Log(`Organic gradient templates prepared outside worldgen: planned=${PlannedCells}, noiseCells=${stats.sunkenFieldCells + stats.sulphurFieldCells}, elapsed=${Date.now() - started}ms.`);
    },

    GenerateFreshWorld() {
        if (this.InProgress)
            return false;
        this.InProgress = true;
        this.LastError = '';
        const started = Date.now();
        try {
            BuildSunkenPlan();
            const context = CaptureContextAfterVanilla();
            Log(`begin after vanilla cleanup; world=${context.maxX}x${context.maxY}. Starting official World Evil Island.`);
            const evilIsland = WorldEvilIslandRuntime.Generate();
            Log(`World Evil Island complete; generated=${evilIsland && evilIsland.generated === true}, count=${evilIsland && Array.isArray(evilIsland.islands) ? evilIsland.islands.length : 0}, elapsed=${evilIsland ? evilIsland.elapsedMs : 0}ms. Resetting official structure map.`);
            OfficialStructureRuntime.BeginGeneration();
            Log('Official structure map reset. Starting bounded Mechanic Shed search.');
            const earlyStructures = OfficialStructureRuntime.GenerateEarly(context);
            const mechanicShed = earlyStructures.mechanicShed;
            Log(`Early official structures complete; mechanicShed=${mechanicShed && mechanicShed.generated === true}. Starting Sunken Sea.`);
            const sunken = this.GenerateSunkenSea(context);
            sunken.elapsedMs = Date.now() - started;
            Log(`Sunken complete; bounds=${sunken.left},${sunken.top} ${sunken.width}x${sunken.height}, core=${sunken.coreWidth || 0}x${sunken.coreHeight || 0}, desert=${sunken.desertLeft || 0}-${sunken.desertRight || 0} bottom=${sunken.desertBottom || 0}, modified=${sunken.modified}, skipped=${sunken.skipped}, removedChests=${sunken.removedChests || 0}, elapsed=${sunken.elapsedMs}ms. Starting Sulphurous Sea.`);
            const sulphurousStarted = Date.now();
            const sulphurous = this.GenerateSulphurousSea(context);
            sulphurous.elapsedMs = Date.now() - sulphurousStarted;
            Log(`Sulphurous core complete; modified=${sulphurous.modified}, yStart=${sulphurous.yStart}, openWidth=${sulphurous.openWidth}, surfaceCleared=${sulphurous.officialSurface?.cleared || 0}, topWater=${sulphurous.officialSurface?.water || 0}, island=${sulphurous.officialCore?.islandTiles || 0}, smallCaves=${sulphurous.officialCore?.smallCaveTiles || 0}, spaghetti=${sulphurous.officialCore?.spaghettiTiles || 0}, cheese=${sulphurous.officialCore?.cheeseTiles || 0}, hardened=${sulphurous.officialCore?.hardenedTiles || 0}, elapsed=${sulphurous.elapsedMs}ms. Starting direct fresh-world Abyss.`);
            // Keep the live preview bounds in sync before PlaceAbyss planning. WorldDB does not
            // exist yet during ShimmerCleanUp, but SetArea updates the runtime immediately and its
            // Save() safely no-ops until first world load.
            SulphurousSeaPreviewRuntime.SetArea(sulphurous.centerX, sulphurous.centerY, sulphurous.width, sulphurous.height, sulphurous.atLeft === true, 'fresh-worldgen');
            const abyssStarted = Date.now();
            const abyss = AbyssTerrainRuntime.GenerateFreshWorldDirect(sulphurous);
            abyss.elapsedMs = Math.max(Number(abyss.elapsedMs) || 0, Date.now() - abyssStarted);
            if (abyss.generated === true) {
                Log(`Abyss complete during world creation; modified=${abyss.modified}, carved=${abyss.carved}, islands=${abyss.islands}, seaMouth=${abyss.seaMouthCarved}, elapsed=${abyss.elapsedMs}ms. Starting official Abyss L1/L2 complete ambient pass.`);
                try { abyss.ambient = AbyssAmbientWorldgenRuntime.Generate(context, abyss, sulphurous); }
                catch (e) { abyss.ambient = { generated:false, version:3, objects:[], counts:{}, source:'official-Abyss.cs-ambient-L1-L2-complete-cached-geometry-error', error:String(e), elapsedMs:0 }; Log(`Abyss ambient pass failed safely: ${e}`); }
                Log(`Abyss ambient complete; objects=${abyss.ambient?.objects?.length || 0}, elapsed=${abyss.ambient?.elapsedMs || 0}ms. Starting official Sulphurous post-Abyss terrain pass.`);
            } else
                Log(`Direct Abyss generation failed safely (${abyss.error || 'unknown'}); existing post-load fallback remains enabled. Starting official Sulphurous post-Abyss terrain pass.`);
            const sulphurousAfterAbyss = GenerateOfficialSulphurousAfterAbyssTerrain(context, sulphurous);
            sulphurous.officialAfterAbyss = sulphurousAfterAbyss;
            sulphurous.modified = Math.max(0, Number(sulphurous.modified) || 0) + Math.max(0, Number(sulphurousAfterAbyss.modified) || 0);
            Log(`Sulphurous post-Abyss complete; beach=${sulphurousAfterAbyss.beachTiles}, stray=${sulphurousAfterAbyss.strayTiles}, alone=${sulphurousAfterAbyss.aloneTiles}, scraps=${sulphurousAfterAbyss.scrapPiles?.length || 0} (fallback=${sulphurousAfterAbyss.scrapFallbackUsed || 0}), columns=${sulphurousAfterAbyss.columns?.length || 0}/${sulphurousAfterAbyss.columnRequested || 0} (fallback=${sulphurousAfterAbyss.columnFallbackUsed || 0}), sandstone=${sulphurousAfterAbyss.sandstoneTiles}, snapshotReads=${sulphurousAfterAbyss.snapshotReads || 0}, elapsed=${sulphurousAfterAbyss.elapsedMs || 0}ms, ambience=${sulphurousAfterAbyss.ambience?.length || 0}, rustyChests=${sulphurousAfterAbyss.rustyChests?.length || 0}/${sulphurousAfterAbyss.rustyChestsRequested || 4}. Starting official Iron Ball pass.`);
            const ironBalls = IronBallRuntime.Generate(context);
            Log(`Iron Ball pass complete; placed=${ironBalls.positions?.length || 0}/${ironBalls.target || 0}, attempts=${ironBalls.attempts || 0}, fallback=${ironBalls.fallback || 0}. Starting late official structures.`);
            const lateStructures = OfficialStructureRuntime.GenerateLate(context, sunken);
            const desertShrine = lateStructures.desertShrine;
            const graniteShrine = lateStructures.graniteShrine;
            Log(`Late official structures complete; desertShrine=${desertShrine && desertShrine.generated === true}, graniteShrine=${graniteShrine && graniteShrine.generated === true}. Starting official Vernal Pass.`);
            const vernalPass = VernalPassRuntime.Generate(context);
            Log(`Vernal Pass complete; generated=${vernalPass && vernalPass.generated === true}, chests=${vernalPass ? vernalPass.chestCount || 0 : 0}. Starting Giant Hive.`);
            const giantHive = GiantHiveRuntime.Generate({ ...context, vernalPass });
            Log(`Giant Hive complete; generated=${giantHive && giantHive.generated === true}, rooms=${giantHive ? giantHive.rooms || 0 : 0}, chests=${giantHive && Array.isArray(giantHive.chests) ? giantHive.chests.length : 0}. Starting Shimmer Shrine at official GenVars anchor.`);
            const shimmerShrine = GenerateFreshShimmerShrine(context);
            Log(`Shimmer Shrine direct pass complete; generated=${shimmerShrine && shimmerShrine.generated === true}, reason=${shimmerShrine?.reason || 'none'}, reads=${shimmerShrine?.reads || 0}. Starting Aerialite.`);
            const aerialite = AerialiteWorldgenRuntime.Generate(context);
            Log(`Aerialite complete; modified=${aerialite.modified || 0}. Starting fresh-world Planetoids.`);
            const planetoidStarted = Date.now();
            const planetoids = PlanetoidRuntime.Generate({ maxX: context.maxX, maxY: context.maxY });
            Log(`Planetoids direct pass complete; generated=${planetoids?.generated === true}, total=${planetoids?.planets?.length || 0}, main=${planetoids?.mainX || -1},${planetoids?.mainY || -1}, elapsed=${Date.now() - planetoidStarted}ms. Starting Planetoid Lab.`);
            const planetoidLabStarted = Date.now();
            const planetoidLab = GenerateFreshPlanetoidLab(planetoids);
            Log(`Planetoid Lab direct pass complete; generated=${planetoidLab?.generated === true}, applied=${planetoidLab?.applied || 0}, chests=${planetoidLab?.chests?.length || 0}, elapsed=${Date.now() - planetoidLabStarted}ms. Starting remaining Labs + Shrines in worldgen.`);
            const directStructuresStarted = Date.now();
            const directStructures = DirectFreshStructureRuntime.Generate(context, sunken);
            Log(`Remaining direct structures complete; labs=${directStructures?.generatedLabs || 0}/5, shrines=${directStructures?.generatedShrines || 0}, elapsed=${Date.now() - directStructuresStarted}ms.`);
            this.Pending = {
                schema: 34,
                source: 'WorldGen.ShimmerCleanUp/direct-main-tile/official-world-evil-island/official-sunken-clear/official-sulphurous-core-terrain/direct-fresh-abyss/official-abyss-ambient-l1-l2-cached-geometry/official-sulphurous-snapshot-scrap-columns-ambience-rusty-chests-post-abyss/official-iron-ball/desert-granite-shrines/official-vernal-pass/official-giant-hive-mobile-plan/direct-shimmer-shrine/aerialite/direct-planetoids/direct-planetoid-lab/direct-all-remaining-labs-and-shrines/worldgen-optimization-v1',
                worldId: context.worldId,
                worldName: context.worldName,
                maxX: context.maxX,
                maxY: context.maxY,
                totalElapsedMs: Date.now() - started,
                evilIsland,
                sunken,
                sulphurous,
                abyss,
                ironBalls,
                aerialite,
                planetoids,
                planetoidLab,
                directStructures,
                mechanicShed,
                desertShrine,
                graniteShrine,
                vernalPass,
                giantHive,
                shimmerShrine,
                surfaceShrineDeferred: directStructures?.surfaceShrine?.generated !== true,
                iceShrineDeferred: directStructures?.iceShrine?.generated !== true,
                mushroomShrineDeferred: directStructures?.mushroomShrine?.generated !== true,
                evilShrinesDeferred: directStructures?.evilShrines?.complete !== true,
                marbleShrineDeferred: directStructures?.marbleShrine?.generated !== true,
                roxShrineDeferred: directStructures?.roxShrine?.generated !== true,
                shimmerShrineDeferred: false,
                abyssShrineDeferred: directStructures?.abyssShrine?.generated !== true
            };
            Log(`world features complete; evilIsland=${evilIsland && evilIsland.generated === true}, mechanicShed=${mechanicShed && mechanicShed.generated === true}, desertShrine=${desertShrine && desertShrine.generated === true}, graniteShrine=${graniteShrine && graniteShrine.generated === true}, vernalPass=${vernalPass && vernalPass.generated === true}, giantHive=${giantHive && giantHive.generated === true}, sunkenModified=${sunken.modified}, sulphurousModified=${sulphurous.modified}, abyssFresh=${abyss && abyss.generated === true}, abyssModified=${abyss ? abyss.modified || 0 : 0}, ironBalls=${ironBalls.positions?.length || 0}/${ironBalls.target || 0}, aerialiteModified=${aerialite.modified}, planetoids=${planetoids?.planets?.length || 0}, planetoidLab=${planetoidLab?.generated === true}, directLabs=${directStructures?.generatedLabs || 0}/5, directShrines=${directStructures?.generatedShrines || 0}, directStructuresMs=${directStructures?.elapsedMs || 0}, total=${this.Pending.totalElapsedMs}ms.`);
            return true;
        } catch (e) {
            this.LastError = String(e);
            this.Pending = null;
            Log(`generation failed: ${this.LastError}`);
            return false;
        } finally {
            this.InProgress = false;
        }
    },

    GenerateSunkenSea(context) {
        const placement = ResolveSunkenPlacement(context);
        if (!placement)
            throw new Error('Underground Desert anchor was not found after vanilla world generation.');
        BuildSunkenPlan(placement.width, placement.height, context.worldId);
        let modified = 0;
        let skipped = 0;
        const removedChests = DestroyVanillaChestsInsideSunken(placement);
        const { Main } = Terraria;
        for (let localY = 0; localY < placement.height; localY++) {
            const y = placement.top + localY;
            const start = SunkenRowStarts[localY];
            const end = SunkenRowEnds[localY];
            const planRow = localY * placement.width;
            for (let localX = start; localX <= end; localX++) {
                const plan = SunkenPlan[planRow + localX] || 0;
                if (plan === 0)
                    continue;
                const x = placement.left + localX;
                const tile = Main.tile.get_Item(x, y);
                if (!CanReplaceSunken(tile)) {
                    skipped++;
                    continue;
                }
                const wasActive = IsActive(tile);
                if (plan === 1)
                    SetWaterCell(tile, WALL_EUTROPHIC);
                else if (plan === 2)
                    SetWaterCell(tile, WALL_NAVYSTONE);
                else if (plan === 3)
                    SetSolidCell(tile, TILE_EUTROPHIC, WALL_EUTROPHIC);
                else if (plan === 4)
                    SetSolidCell(tile, TILE_NAVYSTONE, WALL_NAVYSTONE);
                else if (plan === 5)
                    SetSolidCell(tile, TILE_SEAPRISM, WALL_NAVYSTONE);
                else if (plan === 6) {
                    if (wasActive) SetSolidCell(tile, TILE_EUTROPHIC, WALL_NAVYSTONE);
                    else SetWaterCell(tile, WALL_NAVYSTONE);
                } else if (plan === 7) {
                    if (wasActive) SetSolidCell(tile, TILE_EUTROPHIC, WALL_EUTROPHIC);
                    else SetWaterCell(tile, WALL_EUTROPHIC);
                } else if (plan === 8) {
                    if (wasActive) SetSolidCell(tile, TILE_EUTROPHIC, WALL_EUTROPHIC);
                    else SetWaterCell(tile, WALL_NAVYSTONE);
                } else if (plan === 9)
                    SetWaterCell(tile, 0);
                else if (plan === 10)
                    SetSolidCell(tile, TILE_EUTROPHIC, 0);
                else if (plan === 11)
                    SetSolidCell(tile, TILE_EUTROPHIC, WALL_NAVYSTONE);
                else
                    continue;
                modified++;
            }
        }
        const finalCleanup = ApplyDesktopSunkenFinalCleanup(placement);
        const navystoneVariance = ApplyDesktopSunkenNavystoneVariance(placement);
        return { ...placement, modified, skipped, removedChests, navystoneVariance, finalCleanup };
    },

    GenerateSulphurousSea(context) {
        let placement = ResolveSulphurousPlacement(context);
        // Fresh worlds now follow the official PlaceSulphurSea core order before PlaceAbyss:
        // foundation -> cleanup -> shallow water -> island -> small caves -> spaghetti caves ->
        // cheese/open caverns -> hardened line -> surface irregularity.
        const official = GenerateOfficialSulphurousSurface(context, placement);
        const core = GenerateOfficialSulphurousCore(context, placement, official);
        const top = Math.max(12, official.yStart - 55);
        const height = Math.min(context.maxY - top - 12, Math.max(placement.height, official.blockDepth + 120));
        placement = {
            ...placement,
            top,
            height,
            centerY: top + Math.floor(height / 2),
            yStart: official.yStart,
            blockDepth: official.blockDepth,
            openWidth: official.openWidth,
            officialTopWater: true,
            officialCoreTerrain: true
        };
        // Do not run the old OrganicBiomePlanner band conversion here. It was the pre-port
        // approximation and would overwrite the official cave network just created above.
        const modified = (official.foundation || 0) + (official.cleared || 0) + (official.water || 0) + (core.modified || 0);
        return {
            ...placement,
            modified,
            skipped: 0,
            untouched: 0,
            planned: modified,
            officialSurface: official,
            officialCore: core
        };
    },

    RepairInterruptedFreshWorld(allowTileSignature = false) {
        if (this.InProgress || !WorldDB.Instance)
            return false;

        // Phase 12.62.1 could finish the Sunken Sea and then abort on an
        // undefined Sulphurous protection set. Its metadata recovery writes
        // this exact source/schema combination. Restrict the repair to that
        // signature so established worlds are never modified unexpectedly.
        const recoveredSource = String(WorldDB.get('calamity:worldgenbiomes:source') || '');
        const recoveredVersion = Math.floor(Number(WorldDB.get('calamity:worldgenbiomes:version')) || 0);
        const sunkenTerrainVersion = Math.floor(Number(WorldDB.get('calamity:sunkensea:terrain:version')) || 0);
        const metadataSunken = WorldDB.get('calamity:sunkensea:terrain:generated') === true;
        const metadataSulphurous = WorldDB.get('calamity:sulphursea:terrain:generated') === true;
        const shrineReady = WorldDB.get('calamity:structure:desertShrine:generated') === true;
        const aerialiteReady = WorldDB.get('calamity:aerialite:generated') === true;

        // Healthy established worlds already have authoritative metadata for every feature this
        // legacy recovery pass can repair. Do not rescan tens of thousands of native tiles on
        // every world entry; that scan was responsible for the multi-second loading freeze.
        const interruptedMetadataSignature = recoveredVersion === 4 &&
            recoveredSource === 'world-tile-recovery/direct-main-tile/dual-biome/gradient-noise';
        if (metadataSunken && metadataSulphurous && shrineReady && aerialiteReady && !interruptedMetadataSignature) {
            Log(`interrupted repair fast-skip; metadata complete, source=${recoveredSource || '<empty>'}, version=${recoveredVersion}.`);
            return false;
        }

        BuildSunkenPlan();
        const context = CaptureContextAfterVanilla();
        const sunken = ResolveSunkenPlacement(context);
        const sulphurousPlacement = ResolveSulphurousPlacement(context);
        const sunkenAnchors = sunken ? CountSampledType(sunken, TILE_EUTROPHIC, 4) : 0;
        const sulphurousAnchors = sulphurousPlacement ? CountSampledType(sulphurousPlacement, TILE_SULPHUROUS_SAND, 4) : 0;
        const sunkenReady = metadataSunken || sunkenAnchors >= 12;
        const sulphurousReady = metadataSulphurous || sulphurousAnchors >= 8;
        const needsSulphurous = !sulphurousReady;
        const needsShrine = !shrineReady;
        const needsAerialite = !aerialiteReady;
        const needsAnyRepair = needsSulphurous || needsShrine || needsAerialite;
        const interruptedSignature = recoveredVersion === 4 &&
            recoveredSource === 'world-tile-recovery/direct-main-tile/dual-biome/gradient-noise';
        const tileSignature = allowTileSignature === true && sunkenReady && needsAnyRepair &&
            (sunkenTerrainVersion >= 5 || recoveredVersion === 4 || recoveredSource.includes('world-tile-recovery'));

        Log(`interrupted repair detector: allowTile=${allowTileSignature === true}, source=${recoveredSource || '<empty>'}, version=${recoveredVersion}, sunkenVersion=${sunkenTerrainVersion}, sunkenAnchors=${sunkenAnchors}, sulphurousAnchors=${sulphurousAnchors}, shrine=${shrineReady}, aerialite=${aerialiteReady}, needsSulphurous=${needsSulphurous}, needsShrine=${needsShrine}, needsAerialite=${needsAerialite}, metadataMatch=${interruptedSignature}, tileMatch=${tileSignature}.`);

        if ((!interruptedSignature && !tileSignature) || !sunkenReady || !needsAnyRepair)
            return false;

        this.InProgress = true;
        const started = Date.now();
        try {
            if (!sunken || sunkenAnchors < 12)
                throw new Error('Interrupted world repair could not validate the existing Sunken Sea.');

            let sulphurous = null;
            if (needsSulphurous) {
                Log('repairing Phase 12.62.1 interrupted generation: starting missing Sulphurous Sea.');
                const sulphurousStarted = Date.now();
                sulphurous = this.GenerateSulphurousSea(context);
                sulphurous.elapsedMs = Date.now() - sulphurousStarted;
            }

            let desertShrine = null;
            if (needsShrine) {
                OfficialStructureRuntime.BeginGeneration();
                desertShrine = OfficialStructureRuntime.GenerateDesertShrine(context, sunken);
                if (!desertShrine || desertShrine.generated !== true)
                    throw new Error(`Interrupted world repair could not place Desert Shrine: ${desertShrine?.reason || 'unknown'}.`);
            }

            const aerialite = needsAerialite ? AerialiteWorldgenRuntime.Generate(context) : null;
            this.Pending = {
                schema: 10,
                source: 'Phase12.62.4-partial-interrupted-generation-repair',
                worldId: context.worldId,
                worldName: context.worldName,
                maxX: context.maxX,
                maxY: context.maxY,
                totalElapsedMs: Date.now() - started,
                sunken: null,
                sulphurous,
                aerialite,
                mechanicShed: null,
                desertShrine
            };
            const committed = this.CommitPending();
            Log(`interrupted generation repair complete; sulphurousModified=${sulphurous ? sulphurous.modified : 'preserved'}, desertShrine=${desertShrine ? desertShrine.generated === true : 'preserved'}, aerialiteModified=${aerialite ? aerialite.modified : 'preserved'}, committed=${committed}.`);
            return committed;
        } catch (e) {
            this.LastError = String(e);
            this.Pending = null;
            Log(`interrupted generation repair failed: ${this.LastError}`);
            return false;
        } finally {
            this.InProgress = false;
        }
    },

    MatchesCurrentWorld(pending) {
        if (!pending)
            return false;
        const maxX = Math.floor(Number(Terraria.Main.maxTilesX) || 0);
        const maxY = Math.floor(Number(Terraria.Main.maxTilesY) || 0);
        if (pending.maxX !== maxX || pending.maxY !== maxY)
            return false;
        const currentId = CurrentWorldID();
        if (pending.worldId > 0 && currentId > 0 && pending.worldId !== currentId)
            return false;
        const currentName = CurrentWorldName();
        if (pending.worldName && currentName && pending.worldName !== currentName)
            return false;
        if (!(pending.worldId > 0 && currentId > 0) && !(pending.worldName && currentName)) {
            if (pending.sunken && CountSampledType(pending.sunken, TILE_EUTROPHIC, 12) < 2)
                return false;
            if (pending.sulphurous && CountSampledType(pending.sulphurous, TILE_SULPHUROUS_SAND, 8) < 2)
                return false;
        }
        return true;
    },

    CommitPending() {
        const pending = this.Pending;
        if (!pending || !WorldDB.Instance)
            return false;
        if (!this.MatchesCurrentWorld(pending)) {
            Log('pending metadata discarded because the loaded world does not match the generated world.');
            this.Pending = null;
            return false;
        }
        const sunken = pending.sunken;
        const sulphurous = pending.sulphurous;
        const evilIsland = pending.evilIsland;
        if (!sunken && !sulphurous && !pending.abyss && !pending.ironBalls && !pending.planetoids && !pending.planetoidLab && !pending.evilIsland && !pending.mechanicShed && !pending.desertShrine && !pending.graniteShrine && !pending.vernalPass && !pending.shimmerShrine && !pending.surfaceShrineDeferred && !pending.iceShrineDeferred && !pending.mushroomShrineDeferred && !pending.evilShrinesDeferred && !pending.marbleShrineDeferred && !pending.roxShrineDeferred && !pending.shimmerShrineDeferred && !pending.abyssShrineDeferred && !pending.aerialite)
            return false;
        if (evilIsland && evilIsland.generated === true && Array.isArray(evilIsland.islands)) {
            WorldDB.set('calamity:structure:worldEvilIsland:generated', true);
            WorldDB.set('calamity:structure:worldEvilIsland:variant', evilIsland.drunk === true ? 'drunk-both' : (evilIsland.crimsonWorld === true ? 'corruption' : 'crimson'));
            WorldDB.set('calamity:structure:worldEvilIsland:count', evilIsland.islands.length);
            WorldDB.set('calamity:structure:worldEvilIsland:elapsedMs', Math.max(0, Math.floor(Number(evilIsland.elapsedMs) || 0)));
            WorldDB.set('calamity:structure:worldEvilIsland:source', String(evilIsland.source || 'official-code-direct'));
            for (let idx = 0; idx < evilIsland.islands.length; idx++) {
                const island = evilIsland.islands[idx];
                const prefix = `calamity:structure:worldEvilIsland:${idx}:`;
                WorldDB.set(prefix + 'kind', String(island.kind || 'unknown'));
                WorldDB.set(prefix + 'x', Math.floor(Number(island.x) || 0));
                WorldDB.set(prefix + 'y', Math.floor(Number(island.y) || 0));
                WorldDB.set(prefix + 'chestX', Math.floor(Number(island.chestX) || -1));
                WorldDB.set(prefix + 'chestY', Math.floor(Number(island.chestY) || -1));
                WorldDB.set(prefix + 'chestIndex', Math.floor(Number(island.chestIndex) || -1));
                WorldDB.set(prefix + 'chestMethod', String(island.chestMethod || 'unknown'));
                WorldDB.set(prefix + 'lootVersion', Math.max(0, Math.floor(Number(island.chestLootVersion) || 0)));
                WorldDB.set(prefix + 'nativeLootSlots', Math.max(0, Math.floor(Number(island.chestNativeLootSlots) || 0)));
                WorldDB.set(prefix + 'inventorySynced', Math.max(0, Math.floor(Number(island.chestInventorySynced) || 0)));
                WorldDB.set(prefix + 'searchAttempts', Math.max(0, Math.floor(Number(island.searchAttempts) || 0)));
            }
        }
        if (sunken) {
            WorldDB.set('calamity:sunkensea:preview:enabled', true);
            WorldDB.set('calamity:sunkensea:preview:centerX', sunken.centerX);
            WorldDB.set('calamity:sunkensea:preview:centerY', sunken.centerY);
            WorldDB.set('calamity:sunkensea:preview:width', sunken.width);
            WorldDB.set('calamity:sunkensea:preview:height', sunken.height);
            WorldDB.set('calamity:sunkensea:preview:mode', sunken.mode);
            WorldDB.set('calamity:sunkensea:preview:autoAnchor', `worldgen:${sunken.source}:bottom=${sunken.desertBottom}`);
            WorldDB.set('calamity:sunkensea:terrain:generated', true);
            WorldDB.set('calamity:sunkensea:terrain:state', 'complete');
            WorldDB.set('calamity:sunkensea:terrain:cursor', sunken.width * sunken.height);
            WorldDB.set('calamity:sunkensea:terrain:modified', Math.max(0, Math.floor(Number(sunken.modified) || 0)));
            WorldDB.set('calamity:sunkensea:terrain:skipped', Math.max(0, Math.floor(Number(sunken.skipped) || 0)));
            WorldDB.set('calamity:sunkensea:terrain:version', SUNKEN_TERRAIN_SCHEMA_VERSION);
        }
        if (sulphurous) {
            WorldDB.set('calamity:sulphursea:preview:enabled', true);
            WorldDB.set('calamity:sulphursea:preview:centerX', sulphurous.centerX);
            WorldDB.set('calamity:sulphursea:preview:centerY', sulphurous.centerY);
            WorldDB.set('calamity:sulphursea:preview:width', sulphurous.width);
            WorldDB.set('calamity:sulphursea:preview:height', sulphurous.height);
            WorldDB.set('calamity:sulphursea:preview:atLeft', sulphurous.atLeft === true);
            WorldDB.set('calamity:sulphursea:preview:mode', sulphurous.mode);
            WorldDB.set('calamity:sulphursea:terrain:generated', true);
            WorldDB.set('calamity:sulphursea:terrain:state', 'complete');
            WorldDB.set('calamity:sulphursea:terrain:cursor', sulphurous.width * sulphurous.height);
            WorldDB.set('calamity:sulphursea:terrain:modified', Math.max(0, Math.floor(Number(sulphurous.modified) || 0)));
            WorldDB.set('calamity:sulphursea:terrain:skipped', Math.max(0, Math.floor(Number(sulphurous.skipped) || 0)));
            WorldDB.set('calamity:sulphursea:terrain:untouched', Math.max(0, Math.floor(Number(sulphurous.untouched) || 0)));
            WorldDB.set('calamity:sulphursea:terrain:version', SULPHUROUS_TERRAIN_SCHEMA_VERSION);
            const details = sulphurous.officialAfterAbyss || {};
            const scraps = Array.isArray(details.scrapPiles) ? details.scrapPiles : [];
            const columns = Array.isArray(details.columns) ? details.columns : [];
            WorldDB.set('calamity:sulphursea:details:generated', true);
            WorldDB.set('calamity:sulphursea:details:version', 2);
            WorldDB.set('calamity:sulphursea:details:scrapCount', scraps.length);
            for (let i = 0; i < scraps.length; i++) {
                const p = scraps[i], k = `calamity:sulphursea:details:scrap:${i}:`;
                WorldDB.set(k + 'left', Math.floor(Number(p.left) || 0)); WorldDB.set(k + 'top', Math.floor(Number(p.top) || 0));
                WorldDB.set(k + 'width', Math.floor(Number(p.width) || 0)); WorldDB.set(k + 'height', Math.floor(Number(p.height) || 0));
                WorldDB.set(k + 'variant', Math.floor(Number(p.variant) || 1));
            }
            WorldDB.set('calamity:sulphursea:details:columnCount', columns.length);
            for (let i = 0; i < columns.length; i++) {
                const p = columns[i], k = `calamity:sulphursea:details:column:${i}:`;
                WorldDB.set(k + 'left', Math.floor(Number(p.left) || 0)); WorldDB.set(k + 'top', Math.floor(Number(p.top) || 0));
                WorldDB.set(k + 'bottom', Math.floor(Number(p.bottom) || 0)); WorldDB.set(k + 'variant', Math.floor(Number(p.variant) || 0));
            }
            const ambience = Array.isArray(details.ambience) ? details.ambience : [];
            const rustyChests = Array.isArray(details.rustyChests) ? details.rustyChests : [];
            const ak = 'calamity:sulphursea:ambience:';
            WorldDB.set(ak + 'generated', true); WorldDB.set(ak + 'version', 4); WorldDB.set(ak + 'count', ambience.length);
            for (let i = 0; i < ambience.length; i++) {
                const o = ambience[i], k = ak + `obj:${i}:`;
                WorldDB.set(k + 'kind', String(o.kind || '')); WorldDB.set(k + 'variant', Math.floor(Number(o.variant) || 1));
                WorldDB.set(k + 'left', Math.floor(Number(o.left) || 0)); WorldDB.set(k + 'top', Math.floor(Number(o.top) || 0));
                WorldDB.set(k + 'width', Math.floor(Number(o.width) || 0)); WorldDB.set(k + 'height', Math.floor(Number(o.height) || 0));
                WorldDB.set(k + 'drawYOffset', Math.floor(Number(o.drawYOffset) || 0));
            }
            WorldDB.set(ak + 'chestCount', rustyChests.length);
            for (let i = 0; i < rustyChests.length; i++) {
                const c = rustyChests[i], k = ak + `chest:${i}:`;
                WorldDB.set(k + 'kind', String(c.kind || '')); WorldDB.set(k + 'left', Math.floor(Number(c.left) || 0)); WorldDB.set(k + 'top', Math.floor(Number(c.top) || 0));
                WorldDB.set(k + 'index', Math.floor(Number(c.index) || -1)); WorldDB.set(k + 'special', String(c.specialName || ''));
            }
            WorldDB.set(ak + 'hostCells', Math.floor(Number(details.ambienceHostCells) || 0));
            WorldDB.set(ak + 'chestsRequested', Math.floor(Number(details.rustyChestsRequested) || 4));
            WorldDB.set(ak + 'chestsGenerated', rustyChests.length); WorldDB.set(ak + 'chestVisibilityVersion', rustyChests.length >= 4 ? 3 : 0);
            WorldDB.set('calamity:sulphursea:proxySafetyVersion', 1);
        }
        const abyss = pending.abyss;
        if (abyss && abyss.generated === true) {
            const key = 'calamity:abyss:terrain:';
            WorldDB.set(key + 'generated', true);
            WorldDB.set(key + 'state', 'complete');
            WorldDB.set(key + 'version', Math.max(22, Math.floor(Number(abyss.version) || 22)));
            WorldDB.set(key + 'phase', 7);
            WorldDB.set(key + 'cursor', 0);
            WorldDB.set(key + 'modified', Math.max(0, Math.floor(Number(abyss.modified) || 0)));
            WorldDB.set(key + 'protected', Math.max(0, Math.floor(Number(abyss.protected) || 0)));
            WorldDB.set(key + 'carved', Math.max(0, Math.floor(Number(abyss.carved) || 0)));
            WorldDB.set(key + 'materials', Math.max(0, Math.floor(Number(abyss.materials) || 0)));
            WorldDB.set(key + 'islands', Math.max(0, Math.floor(Number(abyss.islands) || 0)));
            WorldDB.set(key + 'cleaned', Math.max(0, Math.floor(Number(abyss.cleaned) || 0)));
            WorldDB.set(key + 'smallClumps', Math.max(0, Math.floor(Number(abyss.smallClumps) || 0)));
            WorldDB.set(key + 'legacyRetyped', 0);
            WorldDB.set(key + 'seaMouthCarved', Math.max(0, Math.floor(Number(abyss.seaMouthCarved) || 0)));
            WorldDB.set(key + 'chasmX', Math.floor(Number(abyss.chasmX) || 0));
            WorldDB.set(key + 'anchorSource', String(abyss.anchorSource || 'official-fresh-worldgen'));
            WorldDB.set(key + 'bottomY', Math.floor(Number(abyss.bottomY) || 0));
            WorldDB.set(key + 'fillTop', Math.floor(Number(abyss.fillTop) || 0));
            WorldDB.set(key + 'connectorUsed', false);
            WorldDB.set(key + 'connectorX', -1);
            WorldDB.set(key + 'connectorY', -1);
            WorldDB.set(key + 'freshWorldgen', true);
            WorldDB.set(key + 'freshWorldgenElapsedMs', Math.max(0, Math.floor(Number(abyss.elapsedMs) || 0)));
            WorldDB.set(key + 'source', String(abyss.source || 'ShimmerCleanUp/Main.tile/direct-PlaceAbyss-v22'));
            const ambient = abyss.ambient;
            if (ambient && ambient.generated === true) {
                const ak = 'calamity:abyss:ambience:';
                const objects = Array.isArray(ambient.objects) ? ambient.objects : [];
                WorldDB.set(ak + 'generated', true);
                WorldDB.set(ak + 'version', Math.max(1, Math.floor(Number(ambient.version) || 1)));
                WorldDB.set(ak + 'count', objects.length);
                // BinarySerializer stores string length in a single byte. A full ambience JSON
                // can be many KB and was silently truncated, producing "Unexpected end of JSON"
                // on the next world load. Persist it in <=220-byte ASCII chunks, matching the
                // already-stable Sunken Sea ecology storage format.
                const serializedAmbient = AbyssAmbientWorldgenRuntime.Encode(objects);
                const ambientChunkSize = 220;
                const oldAmbientChunkCount = Math.max(0, Math.floor(Number(WorldDB.get(ak + 'chunkCount')) || 0));
                const ambientChunks = [];
                for (let i = 0; i < serializedAmbient.length; i += ambientChunkSize)
                    ambientChunks.push(serializedAmbient.slice(i, i + ambientChunkSize));
                WorldDB.set(ak + 'chunkCount', ambientChunks.length);
                for (let i = 0; i < ambientChunks.length; i++)
                    WorldDB.set(ak + `chunk:${i}`, ambientChunks[i]);
                for (let i = ambientChunks.length; i < oldAmbientChunkCount; i++)
                    WorldDB.delete(ak + `chunk:${i}`);
                WorldDB.delete(ak + 'data');
                WorldDB.set(ak + 'dataFormat', 2);
                WorldDB.set(ak + 'source', String(ambient.source || 'official-Abyss.cs-ambient-L1-L2'));
                WorldDB.set(ak + 'elapsedMs', Math.max(0, Math.floor(Number(ambient.elapsedMs) || 0)));
                WorldDB.set(ak + 'floorCells', Math.max(0, Math.floor(Number(ambient.floorCells) || 0)));
                const counts = ambient.counts || {};
                for (const name of ['tube','shalePile','pire','fossil','rib','plantPile','pearl','kelp','gravelPile','vent','crate','coral','coralCells','abyssPot','sulphPot','viperVine','sulphVine'])
                    WorldDB.set(ak + 'count:' + name, Math.max(0, Math.floor(Number(counts[name]) || 0)));
                WorldDB.set(ak + 'ceilingCells', Math.max(0, Math.floor(Number(ambient.ceilingCells) || 0)));
                WorldDB.set('calamity:abyss:ambience:proxySafetyVersion', 1);
            }
        }
        const ironBalls = pending.ironBalls;
        if (ironBalls) {
            const ik = 'calamity:world:ironBall:';
            const positions = Array.isArray(ironBalls.positions) ? ironBalls.positions : [];
            WorldDB.set(ik + 'generated', true);
            WorldDB.set(ik + 'version', 1);
            WorldDB.set(ik + 'count', positions.length);
            WorldDB.set(ik + 'target', Math.max(0, Math.floor(Number(ironBalls.target) || positions.length)));
            WorldDB.set(ik + 'attempts', Math.max(0, Math.floor(Number(ironBalls.attempts) || 0)));
            WorldDB.set(ik + 'fallback', Math.max(0, Math.floor(Number(ironBalls.fallback) || 0)));
            WorldDB.set(ik + 'source', String(ironBalls.source || 'official-MiscWorldgenRoutines.GenerateIronBall'));
            for (let i = 0; i < positions.length; i++) {
                WorldDB.set(ik + `pos:${i}:x`, Math.floor(Number(positions[i].x) || 0));
                WorldDB.set(ik + `pos:${i}:y`, Math.floor(Number(positions[i].y) || 0));
            }
        }
        const mechanicShed = pending.mechanicShed;
        if (mechanicShed && mechanicShed.generated === true) {
            WorldDB.set('calamity:structure:mechanicShed:generated', true);
            WorldDB.set('calamity:structure:mechanicShed:left', Math.floor(Number(mechanicShed.left) || 0));
            WorldDB.set('calamity:structure:mechanicShed:top', Math.floor(Number(mechanicShed.top) || 0));
            WorldDB.set('calamity:structure:mechanicShed:width', Math.floor(Number(mechanicShed.width) || 30));
            WorldDB.set('calamity:structure:mechanicShed:height', Math.floor(Number(mechanicShed.height) || 21));
            WorldDB.set('calamity:structure:mechanicShed:anchorX', Math.floor(Number(mechanicShed.anchorX) || 0));
            WorldDB.set('calamity:structure:mechanicShed:anchorY', Math.floor(Number(mechanicShed.anchorY) || 0));
            WorldDB.set('calamity:structure:mechanicShed:chestX', Math.floor(Number(mechanicShed.chestX) || -1));
            WorldDB.set('calamity:structure:mechanicShed:chestY', Math.floor(Number(mechanicShed.chestY) || -1));
            WorldDB.set('calamity:structure:mechanicShed:source', String(mechanicShed.source || 'official-csch'));
            if (Math.floor(Number(mechanicShed.chestX) || -1) >= 0 && Math.floor(Number(mechanicShed.chestY) || -1) >= 0) WorldDB.set('calamity:structure:mechanicShed:lootVersion', 3);
        }
        const desertShrine = pending.desertShrine;
        if (desertShrine && desertShrine.generated === true) {
            WorldDB.set('calamity:structure:desertShrine:generated', true);
            WorldDB.set('calamity:structure:desertShrine:left', Math.floor(Number(desertShrine.left) || 0));
            WorldDB.set('calamity:structure:desertShrine:top', Math.floor(Number(desertShrine.top) || 0));
            WorldDB.set('calamity:structure:desertShrine:width', Math.floor(Number(desertShrine.width) || 30));
            WorldDB.set('calamity:structure:desertShrine:height', Math.floor(Number(desertShrine.height) || 27));
            WorldDB.set('calamity:structure:desertShrine:anchorX', Math.floor(Number(desertShrine.anchorX) || 0));
            WorldDB.set('calamity:structure:desertShrine:anchorY', Math.floor(Number(desertShrine.anchorY) || 0));
            WorldDB.set('calamity:structure:desertShrine:chestX', Math.floor(Number(desertShrine.chestX) || -1));
            WorldDB.set('calamity:structure:desertShrine:chestY', Math.floor(Number(desertShrine.chestY) || -1));
            WorldDB.set('calamity:structure:desertShrine:source', String(desertShrine.source || 'official-csch'));
        }
        const graniteShrine = pending.graniteShrine;
        if (graniteShrine && graniteShrine.generated === true) {
            WorldDB.set('calamity:structure:graniteShrine:generated', true);
            WorldDB.set('calamity:structure:graniteShrine:left', Math.floor(Number(graniteShrine.left) || 0));
            WorldDB.set('calamity:structure:graniteShrine:top', Math.floor(Number(graniteShrine.top) || 0));
            WorldDB.set('calamity:structure:graniteShrine:width', Math.floor(Number(graniteShrine.width) || 17));
            WorldDB.set('calamity:structure:graniteShrine:height', Math.floor(Number(graniteShrine.height) || 18));
            WorldDB.set('calamity:structure:graniteShrine:anchorX', Math.floor(Number(graniteShrine.anchorX) || 0));
            WorldDB.set('calamity:structure:graniteShrine:anchorY', Math.floor(Number(graniteShrine.anchorY) || 0));
            WorldDB.set('calamity:structure:graniteShrine:chestX', Math.floor(Number(graniteShrine.chestX) || -1));
            WorldDB.set('calamity:structure:graniteShrine:chestY', Math.floor(Number(graniteShrine.chestY) || -1));
            WorldDB.set('calamity:structure:graniteShrine:drunkVariant', graniteShrine.drunkVariant === true);
            WorldDB.set('calamity:structure:graniteShrine:source', String(graniteShrine.source || 'official-csch'));
        }
        const vernalPass = pending.vernalPass;
        if (vernalPass && vernalPass.generated === true) {
            WorldDB.set('calamity:structure:vernalPass:generated', true);
            WorldDB.set('calamity:structure:vernalPass:left', Math.floor(Number(vernalPass.left) || 0));
            WorldDB.set('calamity:structure:vernalPass:top', Math.floor(Number(vernalPass.top) || 0));
            WorldDB.set('calamity:structure:vernalPass:width', Math.floor(Number(vernalPass.width) || 276));
            WorldDB.set('calamity:structure:vernalPass:height', Math.floor(Number(vernalPass.height) || 208));
            WorldDB.set('calamity:structure:vernalPass:anchorX', Math.floor(Number(vernalPass.anchorX) || 0));
            WorldDB.set('calamity:structure:vernalPass:anchorY', Math.floor(Number(vernalPass.anchorY) || 0));
            WorldDB.set('calamity:structure:vernalPass:chestCount', Math.max(0, Math.floor(Number(vernalPass.chestCount) || 0)));
            WorldDB.set('calamity:structure:vernalPass:chestMarkerCount', Math.max(0, Math.floor(Number(vernalPass.chestMarkerCount) || 0)));
            WorldDB.set('calamity:structure:vernalPass:chestFilledSlots', Math.max(0, Math.floor(Number(vernalPass.chestFilledSlots) || 0)));
            WorldDB.set('calamity:structure:vernalPass:protectionPadding', Math.max(0, Math.floor(Number(vernalPass.protectionPadding) || 30)));
            WorldDB.set('calamity:structure:vernalPass:vernalSoilTile', Math.floor(Number(vernalPass.vernalSoilTile) || 0));
            WorldDB.set('calamity:structure:vernalPass:source', String(vernalPass.source || 'official-csch'));
            if (Math.max(0, Math.floor(Number(vernalPass.chestCount) || 0)) > 0) WorldDB.set('calamity:structure:vernalPass:lootVersion', 1);
        }
        const giantHive = pending.giantHive;
        if (giantHive && giantHive.generated === true) {
            const key = 'calamity:structure:giantHive:';
            WorldDB.set(key + 'generated', true);
            WorldDB.set(key + 'anchorX', Math.floor(Number(giantHive.anchorX) || 0));
            WorldDB.set(key + 'anchorY', Math.floor(Number(giantHive.anchorY) || 0));
            WorldDB.set(key + 'left', Math.floor(Number(giantHive.left) || 0));
            WorldDB.set(key + 'top', Math.floor(Number(giantHive.top) || 0));
            WorldDB.set(key + 'width', Math.floor(Number(giantHive.width) || 0));
            WorldDB.set(key + 'height', Math.floor(Number(giantHive.height) || 0));
            WorldDB.set(key + 'rooms', Math.max(0, Math.floor(Number(giantHive.rooms) || 0)));
            WorldDB.set(key + 'modified', Math.max(0, Math.floor(Number(giantHive.modified) || 0)));
            WorldDB.set(key + 'honeyLiquid', Math.max(0, Math.floor(Number(giantHive.honeyLiquid) || 0)));
            WorldDB.set(key + 'chestCount', Array.isArray(giantHive.chests) ? giantHive.chests.length : 0);
            WorldDB.set(key + 'larvaCount', Array.isArray(giantHive.larvae) ? giantHive.larvae.length : 0);
            WorldDB.set(key + 'source', String(giantHive.source || 'official-GiantHive-mobile-plan'));
            if (Array.isArray(giantHive.chests) && giantHive.chests.length > 0) WorldDB.set(key + 'lootVersion', 1);
            if (Array.isArray(giantHive.chests)) for (let i = 0; i < giantHive.chests.length; i++) {
                const c = giantHive.chests[i], p = key + `chest:${i}:`;
                WorldDB.set(p + 'x', Math.floor(Number(c.x) || -1));
                WorldDB.set(p + 'y', Math.floor(Number(c.y) || -1));
                WorldDB.set(p + 'index', Math.floor(Number(c.index) || -1));
                WorldDB.set(p + 'filled', Math.max(0, Math.floor(Number(c.filled) || 0)));
            }
            if (Array.isArray(giantHive.larvae)) for (let i = 0; i < giantHive.larvae.length; i++) {
                const l = giantHive.larvae[i], p = key + `larva:${i}:`;
                WorldDB.set(p + 'x', Math.floor(Number(l.x) || 0));
                WorldDB.set(p + 'y', Math.floor(Number(l.y) || 0));
            }
        }

        // Phase 13.05.6: all remaining fresh-world Labs and Shrines are generated while
        // WorldGen.ShimmerCleanUp is still active. Persist their metadata before any
        // deferred markers are considered so the gameplay systems immediately self-disable.
        const directStructures = pending.directStructures;
        if (directStructures) {
            const saveBasicShrine = (key, r, defaults = {}) => {
                if (!r || r.generated !== true) return false;
                WorldDB.set(key + 'generated', true);
                WorldDB.set(key + 'pending', false);
                WorldDB.set(key + 'searchStopped', false);
                WorldDB.set(key + 'left', Math.floor(Number(r.left ?? r.anchorX) || 0));
                WorldDB.set(key + 'top', Math.floor(Number(r.top ?? r.anchorY) || 0));
                WorldDB.set(key + 'width', Math.max(1, Math.floor(Number(r.width) || Number(defaults.width) || 1)));
                WorldDB.set(key + 'height', Math.max(1, Math.floor(Number(r.height) || Number(defaults.height) || 1)));
                WorldDB.set(key + 'anchorX', Math.floor(Number(r.anchorX) || 0));
                WorldDB.set(key + 'anchorY', Math.floor(Number(r.anchorY) || 0));
                WorldDB.set(key + 'chestX', Math.floor(Number(r.chestX) || -1));
                WorldDB.set(key + 'chestY', Math.floor(Number(r.chestY) || -1));
                WorldDB.set(key + 'lootVersion', 1);
                WorldDB.set(key + 'source', String(r.source || 'fresh-world-direct'));
                return true;
            };
            if (saveBasicShrine('calamity:structure:surfaceShrine:', directStructures.surfaceShrine, { width:56, height:36 })) {
                const r = directStructures.surfaceShrine;
                WorldDB.set('calamity:structure:surfaceShrine:tunnelX', Math.floor(Number(r.tunnelX) || -1));
                WorldDB.set('calamity:structure:surfaceShrine:tunnelStartY', Math.floor(Number(r.tunnelStartY) || -1));
                WorldDB.set('calamity:structure:surfaceShrine:tunnelEndY', Math.floor(Number(r.tunnelEndY) || -1));
                WorldDB.set('calamity:structure:surfaceShrine:remixWorld', r.remixWorld === true);
            }
            saveBasicShrine('calamity:structure:iceShrine:', directStructures.iceShrine, { width:46, height:32 });
            if (saveBasicShrine('calamity:structure:mushroomShrine:', directStructures.mushroomShrine, { width:35, height:42 }))
                WorldDB.set('calamity:structure:mushroomShrine:remixVariant', directStructures.mushroomShrine.remixVariant === true);
            if (saveBasicShrine('calamity:structure:marbleShrine:', directStructures.marbleShrine, { width:23, height:44 }))
                WorldDB.set('calamity:structure:marbleShrine:drunkVariant', directStructures.marbleShrine.drunkVariant === true);
            const evil = directStructures.evilShrines;
            if (evil && evil.results) {
                for (const kind of Object.keys(evil.results)) {
                    const r = evil.results[kind], key = `calamity:structure:${kind}Shrine:`;
                    if (saveBasicShrine(key, r, { width: kind === 'crimson' ? 54 : 26, height: kind === 'crimson' ? 19 : 11 }))
                        WorldDB.set(key + 'source', String(r.source || 'official-csch-fresh-world-direct'));
                }
                if (evil.complete === true) {
                    WorldDB.set('calamity:structure:evilShrines:complete', true);
                    WorldDB.set('calamity:structure:evilShrines:pending', false);
                }
            }
            const rox = directStructures.roxShrine;
            if (rox && rox.generated === true) {
                const key = 'calamity:structure:roxShrine:';
                saveBasicShrine(key, rox, { width:35, height:35 });
                WorldDB.set(key + 'variant', Math.floor(Number(rox.variant) || 1));
                WorldDB.set(key + 'roxX', Math.floor(Number(rox.anchorX) || 0) + 16);
                WorldDB.set(key + 'roxY', Math.floor(Number(rox.anchorY) || 0) + 14);
                WorldDB.set(key + 'roxRemoved', false);
                WorldDB.set(key + 'customCells', JSON.stringify(rox.customCells || []));
            }
            const abyssShrine = directStructures.abyssShrine;
            if (abyssShrine && abyssShrine.generated === true) {
                const key = 'calamity:structure:abyssShrine:';
                WorldDB.set(key + 'generated', true);
                WorldDB.set(key + 'pending', false);
                WorldDB.set(key + 'searchStopped', false);
                WorldDB.set(key + 'side', String(abyssShrine.side || ''));
                WorldDB.set(key + 'left', Math.floor(Number(abyssShrine.left) || 0));
                WorldDB.set(key + 'top', Math.floor(Number(abyssShrine.top) || 0));
                WorldDB.set(key + 'right', Math.floor(Number(abyssShrine.right) || 0));
                WorldDB.set(key + 'bottom', Math.floor(Number(abyssShrine.bottom) || 0));
                WorldDB.set(key + 'chestAnchorX', Math.floor(Number(abyssShrine.chestAnchorX) || 0));
                WorldDB.set(key + 'chestAnchorY', Math.floor(Number(abyssShrine.chestAnchorY) || 0));
                WorldDB.set(key + 'chestX', Math.floor(Number(abyssShrine.chestX) || -1));
                WorldDB.set(key + 'chestY', Math.floor(Number(abyssShrine.chestY) || -1));
                WorldDB.set(key + 'chestIndex', Math.floor(Number(abyssShrine.chestIndex) || -1));
                WorldDB.set(key + 'chestPlacementVersion', 2);
                WorldDB.set(key + 'roofRows', Math.floor(Number(abyssShrine.roofRows) || 0));
                WorldDB.set(key + 'smoothCells', JSON.stringify(abyssShrine.cells || []));
                WorldDB.set(key + 'cellOriginX', Math.floor(Number(abyssShrine.cellOriginX) || 0));
                WorldDB.set(key + 'cellOriginY', Math.floor(Number(abyssShrine.cellOriginY) || 0));
                WorldDB.set(key + 'lootVersion', 1);
                WorldDB.set(key + 'source', 'official-code-fresh-world-direct');
            }
            const saveLab = (key, r, source, physicsName, validationVersion = 0) => {
                if (!r || r.generated !== true) return false;
                WorldDB.set(key + 'generated', true);
                WorldDB.set(key + 'pending', false);
                for (const name of ['left','top','width','height','centerX','centerY','centerWorldX','centerWorldY','applied'])
                    WorldDB.set(key + name, Math.floor(Number(r[name]) || (name === 'left' || name === 'top' ? -1 : 0)));
                WorldDB.set(key + 'sourceSha256', String(r.sourceSha256 || ''));
                WorldDB.set(key + 'source', String(source));
                if (validationVersion > 0) WorldDB.set(key + 'validationVersion', validationVersion);
                const chests = Array.isArray(r.chests) ? r.chests : [];
                WorldDB.set(key + 'chestCount', chests.length);
                for (let i = 0; i < chests.length; i++) {
                    const c = chests[i] || {}, q = key + `chest:${i}:`;
                    WorldDB.set(q + 'x', Math.floor(Number(c.x) || -1));
                    WorldDB.set(q + 'y', Math.floor(Number(c.y) || -1));
                    WorldDB.set(q + 'index', Math.floor(Number(c.index) || -1));
                    WorldDB.set(q + 'filled', Math.max(0, Math.floor(Number(c.filled) || 0)));
                    WorldDB.set(q + 'kind', String(c.kind || 'security'));
                }
                WorldDB.set(`calamity:labPhysics:proxyV5:${physicsName}`, true);
                WorldDB.set(`calamity:labPhysics:proxyV7:${physicsName}`, true);
                WorldDB.set(key + 'lootVersion', 1);
                return true;
            };
            saveLab('calamity:structure:jungleLab:', directStructures.jungleLab, 'official-plague-lab-fresh-world-direct-v1', 'jungle');
            saveLab('calamity:structure:iceLab:', directStructures.iceLab, 'official-ice-lab-fresh-world-direct-v1', 'ice');
            saveLab('calamity:structure:sunkenSeaLab:', directStructures.sunkenSeaLab, 'official-sunken-sea-lab-fresh-world-direct-v3', 'sunken', 3);
            saveLab('calamity:structure:underworldLab:', directStructures.underworldLab, 'official-underworld-lab-fresh-world-direct-v1', 'underworld');
            saveLab('calamity:structure:onyxLab:', directStructures.onyxLab, 'official-cavern-onyx-lab-fresh-world-direct-v1', 'onyx');
            WorldDB.set('calamity:structure:directFresh:elapsedMs', Math.max(0, Math.floor(Number(directStructures.elapsedMs) || 0)));
            WorldDB.set('calamity:structure:directFresh:labs', Math.max(0, Math.floor(Number(directStructures.generatedLabs) || 0)));
            WorldDB.set('calamity:structure:directFresh:shrines', Math.max(0, Math.floor(Number(directStructures.generatedShrines) || 0)));
        }

        if (pending.surfaceShrineDeferred === true && WorldDB.get('calamity:structure:surfaceShrine:generated') !== true) {
            WorldDB.set('calamity:structure:surfaceShrine:pending', true);
            WorldDB.set('calamity:structure:surfaceShrine:deferredVersion', 2);
        }
        if (pending.iceShrineDeferred === true && WorldDB.get('calamity:structure:iceShrine:generated') !== true) {
            WorldDB.set('calamity:structure:iceShrine:pending', true);
            WorldDB.set('calamity:structure:iceShrine:deferredVersion', 2);
        }
        if (pending.mushroomShrineDeferred === true && WorldDB.get('calamity:structure:mushroomShrine:generated') !== true) {
            WorldDB.set('calamity:structure:mushroomShrine:pending', true);
            WorldDB.set('calamity:structure:mushroomShrine:deferredVersion', 2);
        }
        if (pending.evilShrinesDeferred === true && WorldDB.get('calamity:structure:evilShrines:complete') !== true) {
            WorldDB.set('calamity:structure:evilShrines:pending', true);
            WorldDB.set('calamity:structure:evilShrines:deferredVersion', 2);
        }
        if (pending.marbleShrineDeferred === true && WorldDB.get('calamity:structure:marbleShrine:generated') !== true) {
            WorldDB.set('calamity:structure:marbleShrine:pending', true);
            WorldDB.set('calamity:structure:marbleShrine:deferredVersion', 2);
        }
        if (pending.roxShrineDeferred === true && WorldDB.get('calamity:structure:roxShrine:generated') !== true) {
            WorldDB.set('calamity:structure:roxShrine:pending', true);
            WorldDB.set('calamity:structure:roxShrine:deferredVersion', 2);
        }
        const shimmerShrine = pending.shimmerShrine;
        if (shimmerShrine && shimmerShrine.generated === true) {
            const k = 'calamity:structure:shimmerShrine:';
            WorldDB.set(k + 'generated', true);
            WorldDB.set(k + 'pending', false);
            WorldDB.set(k + 'searchStopped', false);
            WorldDB.set(k + 'backgroundScanSuppressed', false);
            WorldDB.set(k + 'left', Math.floor(Number(shimmerShrine.left) || 0));
            WorldDB.set(k + 'top', Math.floor(Number(shimmerShrine.top) || 0));
            WorldDB.set(k + 'width', Math.max(0, Math.floor(Number(shimmerShrine.width) || 0)));
            WorldDB.set(k + 'height', Math.max(0, Math.floor(Number(shimmerShrine.height) || 0)));
            WorldDB.set(k + 'anchorX', Math.floor(Number(shimmerShrine.anchorX) || 0));
            WorldDB.set(k + 'anchorY', Math.floor(Number(shimmerShrine.anchorY) || 0));
            WorldDB.set(k + 'placementX', Math.floor(Number(shimmerShrine.placementX) || 0));
            WorldDB.set(k + 'placementY', Math.floor(Number(shimmerShrine.placementY) || 0));
            WorldDB.set(k + 'shimmerX', Math.floor(Number(shimmerShrine.shimmerX) || 0));
            WorldDB.set(k + 'groundY', Math.floor(Number(shimmerShrine.groundY) || 0));
            WorldDB.set(k + 'chestX', Math.floor(Number(shimmerShrine.chestX) || -1));
            WorldDB.set(k + 'chestY', Math.floor(Number(shimmerShrine.chestY) || -1));
            WorldDB.set(k + 'lootVersion', 1);
            WorldDB.set(k + 'source', String(shimmerShrine.source || 'official-worldgen-shimmer-anchor'));
        }
        if (pending.shimmerShrineDeferred === true && WorldDB.get('calamity:structure:shimmerShrine:generated') !== true) {
            WorldDB.set('calamity:structure:shimmerShrine:pending', true);
            WorldDB.set('calamity:structure:shimmerShrine:deferredVersion', 2);
        }
        if (pending.abyssShrineDeferred === true && WorldDB.get('calamity:structure:abyssShrine:generated') !== true) {
            WorldDB.set('calamity:structure:abyssShrine:pending', true);
            WorldDB.set('calamity:structure:abyssShrine:deferredVersion', 2);
        }
        const planetoids = pending.planetoids;
        if (planetoids && planetoids.generated === true) {
            const key = 'calamity:structure:planetoids:';
            const planets = Array.isArray(planetoids.planets) ? planetoids.planets : [];
            WorldDB.set(key + 'generated', true);
            WorldDB.set(key + 'count', planets.length);
            WorldDB.set(key + 'mainX', Math.floor(Number(planetoids.mainX) || -1));
            WorldDB.set(key + 'mainY', Math.floor(Number(planetoids.mainY) || -1));
            WorldDB.set(key + 'mainRadius', Math.floor(Number(planetoids.mainRadius) || 54));
            WorldDB.set(key + 'mainLabReserved', planetoids.mainLabReserved === true);
            WorldDB.set(key + 'mainCount', Math.floor(Number(planetoids.counts?.main) || 0));
            WorldDB.set(key + 'heartCount', Math.floor(Number(planetoids.counts?.heart) || 0));
            WorldDB.set(key + 'grassCount', Math.floor(Number(planetoids.counts?.grass) || 0));
            WorldDB.set(key + 'mudCount', Math.floor(Number(planetoids.counts?.mud) || 0));
            WorldDB.set(key + 'source', 'fresh-world-direct-v1');
            for (let i = 0; i < planets.length; i++) {
                const p = planets[i] || {}, q = key + `planet:${i}:`;
                WorldDB.set(q + 'kind', String(p.kind || 'unknown'));
                WorldDB.set(q + 'x', Math.floor(Number(p.x) || 0));
                WorldDB.set(q + 'y', Math.floor(Number(p.y) || 0));
                WorldDB.set(q + 'radius', Math.max(1, Math.floor(Number(p.radius) || 1)));
                WorldDB.set(q + 'variant', String(p.variant || ''));
                WorldDB.set(q + 'lifeCrystal', p.lifeCrystal === true);
                if (p.chest) {
                    WorldDB.set(q + 'chestX', Math.floor(Number(p.chest.x) || -1));
                    WorldDB.set(q + 'chestY', Math.floor(Number(p.chest.y) || -1));
                    WorldDB.set(q + 'chestIndex', Math.floor(Number(p.chest.index) || -1));
                }
            }
        }
        const planetoidLab = pending.planetoidLab;
        if (planetoidLab && planetoidLab.generated === true) {
            const key = 'calamity:structure:planetoidLab:';
            for (const name of ['left','top','width','height','centerX','centerY','applied'])
                WorldDB.set(key + name, Math.floor(Number(planetoidLab[name]) || (name === 'left' || name === 'top' ? -1 : 0)));
            WorldDB.set(key + 'generated', true);
            WorldDB.set(key + 'sourceSha256', String(planetoidLab.sourceSha256 || ''));
            WorldDB.set(key + 'source', 'official-planetoid-lab-fresh-world-direct-v1');
            const chests = Array.isArray(planetoidLab.chests) ? planetoidLab.chests : [];
            WorldDB.set(key + 'chestCount', chests.length);
            for (let i = 0; i < chests.length; i++) {
                const c = chests[i] || {}, q = key + `chest:${i}:`;
                WorldDB.set(q + 'x', Math.floor(Number(c.x) || -1));
                WorldDB.set(q + 'y', Math.floor(Number(c.y) || -1));
                WorldDB.set(q + 'index', Math.floor(Number(c.index) || -1));
                WorldDB.set(q + 'filled', Math.max(0, Math.floor(Number(c.filled) || 0)));
            }
            // Fresh-world placement already applies LabPhysicalProxy to every schematic cell.
            // Mark the current proxy repair complete so fresh worlds never need the post-load walkway cleanup.
            WorldDB.set('calamity:labPhysics:proxyV5:planetoid', true);
            WorldDB.set('calamity:labPhysics:proxyV7:planetoid', true);
            WorldDB.set(key + 'lootVersion', 1);
        }
        const aerialite = pending.aerialite;
        if (aerialite) {
            WorldDB.set('calamity:aerialite:generated', true);
            WorldDB.set('calamity:aerialite:enchanted', false);
            WorldDB.set('calamity:aerialite:coords', String(aerialite.coords || ''));
            WorldDB.set('calamity:aerialite:clusters', Math.max(0, Math.floor(Number(aerialite.clusters) || 0)));
            WorldDB.set('calamity:aerialite:modified', Math.max(0, Math.floor(Number(aerialite.modified) || 0)));
            WorldDB.set('calamity:aerialite:source', String(aerialite.source || 'fresh-world'));
            WorldDB.set('calamity:aerialite:enchantCursor', 0);
        }
        WorldDB.set('calamity:worldgenbiomes:version', pending.schema);
        WorldDB.set('calamity:worldgenbiomes:elapsedMs', Math.max(0, Math.floor(Number(pending.totalElapsedMs) || 0)));
        WorldDB.set('calamity:worldgenbiomes:source', String(pending.source));
        try {
            WorldDB.Instance.Save();
        } catch (e) {
            Log(`metadata save deferred: ${e}`);
        }
        Log(`metadata committed; source=${pending.source}, total=${pending.totalElapsedMs || 0}ms.`);
        this.Pending = null;
        return true;
    },

    RecoverGeneratedWorldMetadata() {
        if (!WorldDB.Instance)
            return false;
        const needSunken = WorldDB.get('calamity:sunkensea:terrain:generated') !== true;
        const needSulphurous = WorldDB.get('calamity:sulphursea:terrain:generated') !== true;
        if (!needSunken && !needSulphurous)
            return false;
        const context = CaptureContextAfterVanilla();
        let sunken = null;
        let sulphurous = null;
        if (needSunken) {
            const placement = ResolveSunkenPlacement(context);
            if (placement) {
                const anchors = CountSampledType(placement, TILE_EUTROPHIC, 4);
                if (anchors >= 12)
                    sunken = { ...placement, modified: 0, skipped: 0, recoveredAnchors: anchors };
            }
        }
        if (needSulphurous) {
            const placement = ResolveSulphurousPlacement(context);
            const anchors = CountSampledType(placement, TILE_SULPHUROUS_SAND, 4);
            if (anchors >= 8)
                sulphurous = { ...placement, modified: 0, skipped: 0, untouched: 0, recoveredAnchors: anchors };
        }
        if (!sunken && !sulphurous)
            return false;
        this.Pending = {
            schema: 4,
            source: 'world-tile-recovery/direct-main-tile/dual-biome/gradient-noise',
            worldId: context.worldId,
            worldName: context.worldName,
            maxX: context.maxX,
            maxY: context.maxY,
            totalElapsedMs: 0,
            sunken,
            sulphurous
        };
        return this.CommitPending();
    }
};
