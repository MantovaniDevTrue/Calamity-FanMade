import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { CorruptionShrineSchematic } from './../Data/OfficialSchematics/CorruptionShrineSchematic.js';
import { CrimsonShrineSchematic } from './../Data/OfficialSchematics/CrimsonShrineSchematic.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import { OfficialSchematicRuntime } from './OfficialSchematicRuntime.js';
import { FillCorruptionShrineChestByIndex, FillCrimsonShrineChestByIndex } from './OfficialStructureRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';

const DUNGEON = new Set([41, 43, 44]);
const TEMPLE_TILE = 226;
const TEMPLE_WALL = 87;
const DEMONITE = 26;
const SUNKEN = new Set([Number(BiomeAnchorTiles.SunkenEutrophic), 385]);
const WALL_CANDIDATE_LIMIT = 440;
const TILE_CANDIDATE_LIMIT = 220;
const MAX_CANDIDATES = WALL_CANDIDATE_LIMIT + TILE_CANDIDATE_LIMIT;
const OFFSET_VARIANTS = Object.freeze([
    [0.50, 0.50], [0.25, 0.50], [0.75, 0.50],
    [0.50, 0.25], [0.50, 0.75],
    [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]
]);

function N(v, fallback = 0) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : fallback;
}
function Clamp(v, a, b) {
    return Math.max(a, Math.min(b, N(v)));
}
function InWorld(x, y) {
    return x >= 2 && y >= 2 && x < N(Terraria.Main.maxTilesX) - 2 && y < N(Terraria.Main.maxTilesY) - 2;
}
function Log(kind, message) {
    try { tl.log(`[CalamityPort ${kind === 'crimson' ? 'Crimson' : 'Corruption'}Shrine] ${message}`); } catch (e) { }
}
function InSunken(placement, x, y) {
    if (!placement)
        return false;
    const localX = x - N(placement.left);
    const localY = y - N(placement.top);
    const width = N(placement.width);
    const height = N(placement.height);
    return localX >= 0 && localY >= 0 && localX < width && localY < height &&
        OrganicBiomePlanner.SunkenPlanCode(localX, localY, width, height) > 0;
}
function AvoidReason(tile, placement, x, y) {
    if (!tile)
        return 'missingTile';
    if (InSunken(placement, x, y))
        return 'sunken';
    const type = N(tile.type);
    const wall = N(tile.wall);
    const liquid = N(tile.liquid);
    if (liquid > 0)
        return 'liquid';
    if (DUNGEON.has(type))
        return 'dungeon';
    if (type === TEMPLE_TILE || wall === TEMPLE_WALL)
        return 'temple';
    if (SUNKEN.has(type))
        return 'sunken';
    if (type === DEMONITE)
        return 'demonite';
    return '';
}
function Config(kind) {
    if (kind === 'crimson') {
        return {
            kind,
            schematic: CrimsonShrineSchematic,
            scanWidth: CrimsonShrineSchematic.width,
            scanHeight: CrimsonShrineSchematic.height,
            tile: 203,
            wall: 83,
            threshold: 0.40,
            fill: FillCrimsonShrineChestByIndex
        };
    }
    return {
        kind: 'corruption',
        schematic: CorruptionShrineSchematic,
        scanWidth: Math.floor(CorruptionShrineSchematic.width / 2),
        scanHeight: CorruptionShrineSchematic.height,
        tile: 25,
        wall: 3,
        threshold: 0.90,
        fill: FillCorruptionShrineChestByIndex
    };
}
function CandidateFromHit(search, x, y, ordinal, source) {
    const cfg = search.cfg;
    const variant = OFFSET_VARIANTS[Math.abs(N(ordinal)) % OFFSET_VARIANTS.length];
    const offsetX = Math.floor((cfg.scanWidth - 1) * variant[0]);
    const offsetY = Math.floor((cfg.scanHeight - 1) * variant[1]);
    let left = Clamp(x - offsetX, search.xMin, search.xMax - 1);
    let top = Clamp(y - offsetY, search.yMin, search.yMax - 1);
    if (left + cfg.schematic.width >= search.maxX - 2 || top + cfg.schematic.height >= search.maxY - 2)
        return null;
    return { left, top, source };
}
function ReservoirAdd(pool, seenCountName, limit, search, candidate) {
    if (!candidate)
        return;
    search[seenCountName]++;
    if (pool.length < limit) {
        pool.push(candidate);
        return;
    }
    const replaceIndex = WorldGenRand.NextInt(0, search[seenCountName]);
    if (replaceIndex < limit)
        pool[replaceIndex] = candidate;
}
function Shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = WorldGenRand.NextInt(0, i + 1);
        const value = array[i];
        array[i] = array[j];
        array[j] = value;
    }
}
function FinalizeDiscovery(search) {
    Shuffle(search.wallCandidates);
    Shuffle(search.tileCandidates);
    search.candidates = search.wallCandidates.concat(search.tileCandidates).slice(0, MAX_CANDIDATES);
    search.candidateMinX = search.candidates.length ? Math.min(...search.candidates.map(c => c.left)) : -1;
    search.candidateMaxX = search.candidates.length ? Math.max(...search.candidates.map(c => c.left)) : -1;
    search.phase = 'inspect';
    search.reason = 'searching';
    if (!search.candidates.length) {
        search.done = true;
        search.reason = 'evil-search-candidates-empty';
    }
}
function BeginCandidate(search, candidate) {
    const total = search.cfg.scanWidth * search.cfg.scanHeight;
    return {
        candidate,
        x: candidate.left,
        y: candidate.top,
        endX: candidate.left + search.cfg.scanWidth,
        endY: candidate.top + search.cfg.scanHeight,
        matching: 0,
        inWall: false,
        total,
        read: 0,
        required: Math.ceil(total * search.cfg.threshold)
    };
}
function CountReject(search, reason) {
    const key = reason || 'unknown';
    search.rejects[key] = N(search.rejects[key]) + 1;
}
function CompleteCandidate(search, current, forcedReason = '') {
    search.inspected++;
    const candidate = current.candidate;
    const cfg = search.cfg;
    const ratio = current.total > 0 ? current.matching / current.total : 0;
    if (ratio > search.bestRatio) {
        search.bestRatio = ratio;
        search.bestX = candidate.left;
        search.bestY = candidate.top;
        search.bestInWall = current.inWall;
    }
    if (forcedReason) {
        CountReject(search, forcedReason);
        return null;
    }
    if (!current.inWall) {
        CountReject(search, 'noWall');
        return null;
    }
    if (ratio < cfg.threshold) {
        CountReject(search, 'lowRatio');
        return null;
    }
    const inspectRect = {
        left: candidate.left,
        top: candidate.top,
        right: candidate.left + cfg.scanWidth,
        bottom: candidate.top + cfg.scanHeight
    };
    if (!OfficialStructureMap.CanPlace(inspectRect, 0)) {
        CountReject(search, 'overlap');
        return null;
    }
    const result = OfficialSchematicRuntime.Place(cfg.schematic, { x: candidate.left, y: candidate.top }, 'topLeft', cfg.fill, 4);
    if (!result || result.generated !== true) {
        CountReject(search, 'placementFailed');
        return null;
    }
    result.kind = cfg.kind;
    result.anchorX = candidate.left;
    result.anchorY = candidate.top;
    result.width = cfg.schematic.width;
    result.height = cfg.schematic.height;
    result.attempts = search.inspected;
    result.candidates = search.candidates.length;
    result.discoveryReads = search.discoveryReads;
    result.exactReads = search.exactReads;
    result.matching = current.matching;
    result.totalChecked = current.total;
    result.matchingRatio = ratio;
    result.inEvilWall = current.inWall;
    result.wallHits = search.wallHits;
    result.tileHits = search.tileHits;
    result.candidateMinX = search.candidateMinX;
    result.candidateMaxX = search.candidateMaxX;
    result.source = `CalamityMod/World/UndergroundShrines.cs::${cfg.kind === 'crimson' ? 'PlaceCrimsonShrine' : 'PlaceCorruptionShrine'} + official csch + full-range-distributed-incremental-delayed-mobile-safe-placement`;
    Log(cfg.kind, `generated=true, topLeft=${candidate.left},${candidate.top}, attempts=${search.inspected}, candidates=${search.candidates.length}, matchingRatio=${ratio}, wallHits=${search.wallHits}, tileHits=${search.tileHits}, xSpread=${search.candidateMinX}-${search.candidateMaxX}, chest=${result.chestX},${result.chestY}, filled=${result.filled || 0}.`);
    return result;
}

export const EvilShrineRuntime = {
    BeginSearch(kind, context, sunkenPlacement = null) {
        const cfg = Config(kind);
        const maxX = N(context?.maxX, N(Terraria.Main.maxTilesX, 4200));
        const maxY = N(context?.maxY, N(Terraria.Main.maxTilesY, 1200));
        let surface = N(Terraria.Main.worldSurface, Math.floor(maxY * 0.25));
        try { surface = N(Terraria.WorldBuilding.GenVars.worldSurface, surface); } catch (e) { }
        const xMin = Clamp(maxX * 0.05, 20, maxX - cfg.schematic.width - 20);
        const xMax = Clamp(maxX * 0.95, xMin + 1, maxX - cfg.schematic.width - 20);
        const yMin = Clamp(surface, 20, maxY - cfg.schematic.height - 20);
        const yMax = Clamp(maxY * 0.5, yMin + 1, maxY - cfg.schematic.height - 20);
        if (!(xMax > xMin && yMax > yMin))
            return { done: true, generated: false, reason: 'evil-search-bounds-invalid', cfg };
        const xStep = 6;
        const yStep = 4;
        return {
            done: false,
            generated: false,
            reason: 'discovering',
            phase: 'discover',
            cfg,
            maxX,
            maxY,
            xMin,
            xMax,
            yMin,
            yMax,
            xStep,
            yStep,
            scanX: xMin + WorldGenRand.NextInt(0, xStep),
            scanY: yMin + WorldGenRand.NextInt(0, yStep),
            candidates: [],
            wallCandidates: [],
            tileCandidates: [],
            wallSeen: 0,
            tileSeen: 0,
            wallHits: 0,
            tileHits: 0,
            cursor: 0,
            current: null,
            discoveryReads: 0,
            exactReads: 0,
            inspected: 0,
            bestRatio: 0,
            bestX: -1,
            bestY: -1,
            bestInWall: false,
            candidateMinX: -1,
            candidateMaxX: -1,
            rejects: {},
            sunkenPlacement
        };
    },

    StepSearch(search, readBudget = 768) {
        if (!search)
            return { done: true, generated: false, reason: 'evil-search-state-missing' };
        if (search.done)
            return search;
        let budget = Math.max(8, N(readBudget, 768));

        while (budget > 0 && search.phase === 'discover') {
            if (search.scanX >= search.xMax) {
                FinalizeDiscovery(search);
                break;
            }
            if (InWorld(search.scanX, search.scanY)) {
                const tile = Terraria.Main.tile.get_Item(search.scanX, search.scanY);
                search.discoveryReads++;
                budget--;
                if (tile) {
                    const typeMatch = N(tile.type) === search.cfg.tile;
                    const wallMatch = N(tile.wall) === search.cfg.wall;
                    if (typeMatch)
                        search.tileHits++;
                    if (wallMatch)
                        search.wallHits++;
                    if (wallMatch) {
                        const candidate = CandidateFromHit(search, search.scanX, search.scanY, search.wallHits, 'wall');
                        ReservoirAdd(search.wallCandidates, 'wallSeen', WALL_CANDIDATE_LIMIT, search, candidate);
                    } else if (typeMatch) {
                        const candidate = CandidateFromHit(search, search.scanX, search.scanY, search.tileHits, 'tile');
                        ReservoirAdd(search.tileCandidates, 'tileSeen', TILE_CANDIDATE_LIMIT, search, candidate);
                    }
                }
            }
            search.scanY += search.yStep;
            if (search.scanY >= search.yMax) {
                search.scanY = search.yMin + WorldGenRand.NextInt(0, search.yStep);
                search.scanX += search.xStep;
            }
        }

        while (budget > 0 && search.phase === 'inspect' && !search.done) {
            if (!search.current) {
                if (search.cursor >= search.candidates.length) {
                    search.done = true;
                    search.generated = false;
                    search.reason = 'no-valid-evil-location';
                    return search;
                }
                search.current = BeginCandidate(search, search.candidates[search.cursor++]);
            }
            const current = search.current;
            let forcedReason = '';
            if (!InWorld(current.x, current.y)) {
                forcedReason = 'outsideWorld';
            } else {
                const tile = Terraria.Main.tile.get_Item(current.x, current.y);
                search.exactReads++;
                current.read++;
                forcedReason = AvoidReason(tile, search.sunkenPlacement, current.x, current.y);
                if (tile) {
                    if (N(tile.type) === search.cfg.tile || N(tile.wall) === search.cfg.wall)
                        current.matching++;
                    if (N(tile.wall) === search.cfg.wall)
                        current.inWall = true;
                }
                if (!forcedReason) {
                    const remaining = current.total - current.read;
                    if (current.matching + remaining < current.required)
                        forcedReason = 'lowPotential';
                }
            }
            budget--;

            if (forcedReason) {
                CompleteCandidate(search, current, forcedReason);
                search.current = null;
                continue;
            }

            current.y++;
            if (current.y >= current.endY) {
                current.y = current.candidate.top;
                current.x++;
            }
            if (current.x >= current.endX) {
                const result = CompleteCandidate(search, current);
                search.current = null;
                if (result) {
                    search.done = true;
                    search.generated = true;
                    search.reason = 'generated';
                    search.result = result;
                    return search;
                }
            }
        }
        return search;
    }
};
