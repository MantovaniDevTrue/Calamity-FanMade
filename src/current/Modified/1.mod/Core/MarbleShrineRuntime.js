import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { MarbleShrineSchematic } from './../Data/OfficialSchematics/MarbleShrineSchematic.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import { OfficialSchematicRuntime } from './OfficialSchematicRuntime.js';
import { FillGraniteShrineChestByIndex, FillMarbleShrineChestByIndex } from './OfficialStructureRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';

const DUNGEON_TILES = new Set([41, 43, 44]);
const LIHZAHRD_BRICK = 226;
const LIHZAHRD_WALL = 87;
const SUNKEN_AVOID_TILES = new Set([Number(BiomeAnchorTiles.SunkenEutrophic), 385]);
const MARBLE_TILE = 367;
const GRANITE_TILE = 368;
const MARBLE_UNSAFE_WALL = 178;
const GRANITE_UNSAFE_WALL = 180;

function IsActive(tile) { try { return tile != null && tile['bool active()']() === true; } catch (e) { return false; } }
function Clamp(v, min, max) { return Math.max(min, Math.min(max, Math.floor(Number(v) || 0))); }
function InWorld(x, y) { return x >= 2 && y >= 2 && x < Number(Terraria.Main.maxTilesX) - 2 && y < Number(Terraria.Main.maxTilesY) - 2; }
function Log(message) { try { tl.log(`[CalamityPort MarbleShrine] ${message}`); } catch (e) { } }
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
function ShouldAvoid(tile, sunkenPlacement, x, y) {
    if (!tile || Number(tile.liquid) > 0 || IsInsidePlannedSunkenCell(sunkenPlacement, x, y))
        return true;
    const type = Number(tile.type) || 0;
    const wall = Number(tile.wall) || 0;
    return DUNGEON_TILES.has(type) || type === LIHZAHRD_BRICK || wall === LIHZAHRD_WALL || SUNKEN_AVOID_TILES.has(type);
}
function IsBiomeCell(tile, drunkWorld) {
    if (!tile)
        return false;
    const type = Number(tile.type) || 0;
    const wall = Number(tile.wall) || 0;
    return drunkWorld ? (type === GRANITE_TILE || wall === GRANITE_UNSAFE_WALL) : (type === MARBLE_TILE || wall === MARBLE_UNSAFE_WALL);
}
function Inspect(left, top, sunkenPlacement, drunkWorld) {
    const width = MarbleShrineSchematic.width;
    const height = MarbleShrineSchematic.height;
    const foundation = height * 0.2;
    let matchingCells = 0;
    let airBetweenPillars = 0;
    let canGenerate = true;
    for (let x = left; x < left + width; x++) {
        for (let y = top; y < top + height; y++) {
            if (!InWorld(x, y)) {
                canGenerate = false;
                continue;
            }
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (ShouldAvoid(tile, sunkenPlacement, x, y))
                canGenerate = false;
            if (!tile)
                continue;
            if (IsBiomeCell(tile, drunkWorld))
                matchingCells++;
            if (y <= top + height - foundation && y >= top + foundation && !IsActive(tile))
                airBetweenPillars++;
        }
    }
    const totalTiles = width * height;
    return {
        canGenerate,
        matchingCells,
        airBetweenPillars,
        totalTiles,
        matchingRatio: totalTiles > 0 ? matchingCells / totalTiles : 0,
        airRatio: totalTiles > 0 ? airBetweenPillars / totalTiles : 0
    };
}
function TransformMarbleShrineToGranite(left, top) {
    const width = MarbleShrineSchematic.width;
    const height = MarbleShrineSchematic.height;
    for (let x = left; x < left + width; x++) {
        for (let y = top; y < top + height; y++) {
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!tile)
                continue;
            const type = Number(tile.type) || 0;
            if (type === 19)
                tile.frameY = Number(tile.frameY) - 18;
            else if (type === 21)
                tile.frameX = Number(tile.frameX) - 36;
            else if (type === 357)
                tile.type = 369;
            else if (type === 367)
                tile.type = 368;
            else if (type === 561)
                tile.type = 576;

            const wall = Number(tile.wall) || 0;
            if (wall === 179) {
                tile.wall = 181;
                try { tile['void wallColor(byte wallColor)'](0); } catch (e) { }
            } else if (wall === 183) {
                tile.wall = 184;
            }
        }
    }
}
function PushCandidate(candidates, seen, left, top, leftMin, leftMax, rightMin, rightMax, topMin, topMax) {
    const width = MarbleShrineSchematic.width;
    const onLeft = left >= leftMin && left < leftMax;
    const onRight = left >= rightMin && left < rightMax;
    if ((!onLeft && !onRight) || top < topMin || top >= topMax)
        return;
    left = Clamp(left, 20, Number(Terraria.Main.maxTilesX) - width - 20);
    top = Clamp(top, topMin, topMax - 1);
    const key = `${left}:${top}`;
    if (seen.has(key))
        return;
    seen.add(key);
    candidates.push({ left, top });
}


function BeginCandidate(candidate) {
    const width = MarbleShrineSchematic.width;
    const height = MarbleShrineSchematic.height;
    return {
        candidate,
        x: candidate.left,
        y: candidate.top,
        matchingCells: 0,
        airBetweenPillars: 0,
        read: 0,
        canGenerate: true,
        totalTiles: width * height
    };
}

function FinishCandidate(search, current) {
    search.inspectedCandidates++;
    const candidate = current.candidate;
    const width = MarbleShrineSchematic.width;
    const height = MarbleShrineSchematic.height;
    const matchingRatio = current.totalTiles > 0 ? current.matchingCells / current.totalTiles : 0;
    const airRatio = current.totalTiles > 0 ? current.airBetweenPillars / current.totalTiles : 0;
    const rect = {
        left: candidate.left,
        top: candidate.top,
        right: candidate.left + width,
        bottom: candidate.top + height
    };
    if (!(current.canGenerate && matchingRatio >= 0.90 && airRatio >= 0.30 && OfficialStructureMap.CanPlace(rect, 4)))
        return null;

    const fill = search.drunkWorld ? FillGraniteShrineChestByIndex : FillMarbleShrineChestByIndex;
    const result = OfficialSchematicRuntime.Place(MarbleShrineSchematic, { x: candidate.left, y: candidate.top }, 'topLeft', fill, 4);
    if (result.generated && search.drunkWorld)
        TransformMarbleShrineToGranite(candidate.left, candidate.top);
    result.anchorX = candidate.left;
    result.anchorY = candidate.top;
    result.attempts = search.inspectedCandidates;
    result.candidates = search.candidates.length;
    result.coarseReads = search.coarseReads;
    result.exactReads = search.exactReads;
    result.matchingCellCount = current.matchingCells;
    result.airBetweenPillars = current.airBetweenPillars;
    result.checkedTileCount = current.totalTiles;
    result.matchingRatio = matchingRatio;
    result.airRatio = airRatio;
    result.drunkVariant = search.drunkWorld;
    result.source = 'CalamityMod/World/UndergroundShrines.cs::PlaceMarbleShrine + Schematics/Shrine_Marble.csch + incremental-bounded-delayed-mobile-safe-placement';
    Log(`generated=${result.generated}, topLeft=${candidate.left},${candidate.top}, attempts=${search.inspectedCandidates}, candidates=${search.candidates.length}, coarseReads=${search.coarseReads}, exactReads=${search.exactReads}, matchingRatio=${matchingRatio}, airRatio=${airRatio}, drunkVariant=${search.drunkWorld}, chestCount=${result.chestCount || 0}.`);
    return result;
}

function FinishDiscovery(search) {
    if (search.discoveryFinished)
        return;
    search.discoveryFinished = true;
    for (let i = 0; i < 160; i++) {
        const left = WorldGenRand.NextBool()
            ? WorldGenRand.NextInt(search.rightMin, search.rightMax)
            : WorldGenRand.NextInt(search.leftMin, search.leftMax);
        const top = WorldGenRand.NextInt(search.topMin, search.topMax);
        PushCandidate(
            search.candidates,
            search.seen,
            left,
            top,
            search.leftMin,
            search.leftMax,
            search.rightMin,
            search.rightMax,
            search.topMin,
            search.topMax
        );
    }
    if (search.candidates.length === 0) {
        search.done = true;
        search.generated = false;
        search.reason = 'marble-search-candidates-empty';
        return;
    }
    search.startIndex = WorldGenRand.NextInt(0, search.candidates.length);
    search.phase = 'inspect';
    search.reason = 'searching';
}

export const MarbleShrineRuntime = {
    BeginSearch(context, sunkenPlacement = null) {
        const maxX = Math.floor(Number(context?.maxX) || Number(Terraria.Main.maxTilesX) || 4200);
        const maxY = Math.floor(Number(context?.maxY) || Number(Terraria.Main.maxTilesY) || 1200);
        const width = MarbleShrineSchematic.width;
        const height = MarbleShrineSchematic.height;
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

        const leftMin = Clamp(beachDistance, 20, maxX - width - 20);
        const leftMax = Clamp(Math.floor(maxX * 0.45), leftMin + 1, maxX - width - 20);
        const rightMin = Clamp(Math.floor(maxX * 0.55), 20, maxX - width - 20);
        const rightMax = Clamp(maxX - beachDistance, rightMin + 1, maxX - width - 20);
        let topMin = Clamp(rockLayer + 20, 20, maxY - height - 20);
        let topMax = Clamp(maxY - 220, topMin + 1, maxY - height - 20);
        if (remixWorld) {
            topMin = Clamp(worldSurface + 100, 20, maxY - height - 20);
            topMax = Clamp(rockLayer, topMin + 1, maxY - height - 20);
        }
        if (!(leftMax > leftMin) || !(rightMax > rightMin) || !(topMax > topMin)) {
            return {
                done: true,
                generated: false,
                reason: 'marble-search-bounds-invalid',
                drunkWorld,
                drunkVariant: drunkWorld
            };
        }

        const xStep = 12;
        const yStep = 10;
        const xOffset = WorldGenRand.NextInt(0, xStep);
        const yOffset = WorldGenRand.NextInt(0, yStep);
        const xRegions = [[leftMin, leftMax], [rightMin, rightMax]];
        return {
            done: false,
            generated: false,
            reason: 'discovering',
            phase: 'discover',
            maxX, maxY, width, height,
            leftMin, leftMax, rightMin, rightMax, topMin, topMax,
            xStep, yStep, xOffset, yOffset, xRegions,
            regionIndex: 0,
            scanX: xRegions[0][0] + xOffset,
            scanY: topMin + yOffset,
            candidates: [],
            seen: new Set(),
            cursor: 0,
            current: null,
            startIndex: 0,
            discoveryFinished: false,
            coarseReads: 0,
            exactReads: 0,
            inspectedCandidates: 0,
            drunkWorld,
            remixWorld,
            sunkenPlacement
        };
    },

    StepSearch(search, readBudget = 384) {
        if (!search)
            return { done: true, generated: false, reason: 'marble-search-state-missing' };
        if (search.done === true)
            return search;

        let budget = Math.max(8, Math.floor(Number(readBudget) || 384));
        while (budget > 0 && search.phase === 'discover') {
            if (search.candidates.length >= 420 || search.regionIndex >= search.xRegions.length) {
                FinishDiscovery(search);
                break;
            }

            const region = search.xRegions[search.regionIndex];
            if (search.scanX >= region[1]) {
                search.regionIndex++;
                if (search.regionIndex >= search.xRegions.length) {
                    FinishDiscovery(search);
                    break;
                }
                const next = search.xRegions[search.regionIndex];
                search.scanX = next[0] + search.xOffset;
                search.scanY = search.topMin + search.yOffset;
                continue;
            }

            if (search.scanY >= search.topMax) {
                search.scanY = search.topMin + search.yOffset;
                search.scanX += search.xStep;
                continue;
            }

            if (InWorld(search.scanX, search.scanY)) {
                const tile = Terraria.Main.tile.get_Item(search.scanX, search.scanY);
                search.coarseReads++;
                budget--;
                if (IsBiomeCell(tile, search.drunkWorld)) {
                    const centerLeft = search.scanX - Math.floor(search.width * 0.5);
                    const centerTop = search.scanY - Math.floor(search.height * 0.5);
                    for (const dx of [-8, 0, 8]) {
                        for (const dy of [-12, 0, 12]) {
                            PushCandidate(
                                search.candidates,
                                search.seen,
                                centerLeft + dx,
                                centerTop + dy,
                                search.leftMin,
                                search.leftMax,
                                search.rightMin,
                                search.rightMax,
                                search.topMin,
                                search.topMax
                            );
                            if (search.candidates.length >= 420)
                                break;
                        }
                        if (search.candidates.length >= 420)
                            break;
                    }
                }
            } else {
                budget--;
            }
            search.scanY += search.yStep;
        }

        while (budget > 0 && search.phase === 'inspect' && search.done !== true) {
            if (!search.current) {
                if (search.cursor >= search.candidates.length) {
                    search.done = true;
                    search.generated = false;
                    search.reason = 'no-valid-marble-biome-location';
                    return search;
                }
                const index = (search.startIndex + search.cursor) % search.candidates.length;
                search.cursor++;
                search.current = BeginCandidate(search.candidates[index]);
            }

            const current = search.current;
            if (!InWorld(current.x, current.y)) {
                current.canGenerate = false;
            } else {
                const tile = Terraria.Main.tile.get_Item(current.x, current.y);
                search.exactReads++;
                if (ShouldAvoid(tile, search.sunkenPlacement, current.x, current.y))
                    current.canGenerate = false;
                if (tile) {
                    if (IsBiomeCell(tile, search.drunkWorld))
                        current.matchingCells++;
                    const foundation = search.height * 0.2;
                    if (current.y <= current.candidate.top + search.height - foundation &&
                        current.y >= current.candidate.top + foundation &&
                        !IsActive(tile))
                        current.airBetweenPillars++;
                }
            }
            current.read++;
            budget--;

            // Once a safety-invalid cell is found, or the remaining unread cells cannot
            // possibly raise the biome ratio to the official 90% threshold, this candidate
            // can never pass FinishCandidate. Stop here instead of doing ~1,000 native reads.
            const remaining = Math.max(0, current.totalTiles - current.read);
            const requiredMatching = Math.ceil(current.totalTiles * 0.90);
            if (!current.canGenerate || current.matchingCells + remaining < requiredMatching) {
                current.canGenerate = false;
                FinishCandidate(search, current);
                search.current = null;
                continue;
            }

            current.y++;
            if (current.y >= current.candidate.top + search.height) {
                current.y = current.candidate.top;
                current.x++;
            }

            if (current.x >= current.candidate.left + search.width) {
                const result = FinishCandidate(search, current);
                search.current = null;
                if (result) {
                    search.done = true;
                    search.generated = result.generated === true;
                    search.reason = result.generated === true ? 'generated' : 'schematic-placement-failed';
                    search.result = result;
                    return search;
                }
            }
        }

        return search;
    },

    Generate(context, sunkenPlacement = null) {
        const search = this.BeginSearch(context, sunkenPlacement);
        if (search.done === true)
            return search;
        let guard = 0;
        while (search.done !== true && guard++ < 10000)
            this.StepSearch(search, 65536);
        if (search.result)
            return search.result;
        return {
            generated: false,
            reason: search.reason || 'no-valid-marble-biome-location',
            attempts: search.inspectedCandidates || 0,
            candidates: Array.isArray(search.candidates) ? search.candidates.length : 0,
            coarseReads: search.coarseReads || 0,
            exactReads: search.exactReads || 0,
            drunkVariant: search.drunkWorld === true
        };
    }
};
