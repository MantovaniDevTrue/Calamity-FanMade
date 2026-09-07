import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { IceShrineSchematic } from './../Data/OfficialSchematics/IceShrineSchematic.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import { OfficialSchematicRuntime } from './OfficialSchematicRuntime.js';
import { FillIceShrineChestByIndex } from './OfficialStructureRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';

const SNOW = 147;
const ICE = 161;
const DUNGEON = new Set([41, 43, 44]);
const LIHZAHRD_BRICK = 226;
const LIHZAHRD_WALL = 87;
const SUNKEN_AVOID = new Set([Number(BiomeAnchorTiles.SunkenEutrophic), 385]);
const X_PAD = 80;
const Y_PAD = 20;
const EXACT_RATIO = 0.35;
const QUICK_RATIO = 0.20;
const MAX_CANDIDATES = 48;

function Active(tile) {
    try { return !!tile && tile['bool active()']() === true; } catch (e) { return false; }
}
function Clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Math.floor(Number(value) || 0)));
}
function InWorld(x, y) {
    return x >= 2 && y >= 2 && x < Number(Terraria.Main.maxTilesX) - 2 && y < Number(Terraria.Main.maxTilesY) - 2;
}
function Log(message) {
    try { tl.log(`[CalamityPort IceShrine] ${message}`); } catch (e) { }
}
function InSunken(placement, x, y) {
    if (!placement)
        return false;
    const localX = Math.floor(x - Number(placement.left));
    const localY = Math.floor(y - Number(placement.top));
    const width = Math.floor(Number(placement.width) || 0);
    const height = Math.floor(Number(placement.height) || 0);
    if (localX < 0 || localY < 0 || localX >= width || localY >= height)
        return false;
    return OrganicBiomePlanner.SunkenPlanCode(localX, localY, width, height) > 0;
}
function Avoid(tile, placement, x, y) {
    if (!tile || InSunken(placement, x, y))
        return true;
    const type = Number(tile.type) || 0;
    const wall = Number(tile.wall) || 0;
    // The official Ice Shrine calls ShouldAvoidLocation(point, false), so
    // liquids are intentionally allowed throughout its 206x72 check area.
    return DUNGEON.has(type) || type === LIHZAHRD_BRICK || wall === LIHZAHRD_WALL || SUNKEN_AVOID.has(type);
}
function IceCell(tile) {
    if (!tile)
        return false;
    // Match the official source exactly: it compares TileType directly and
    // does not require HasTile/active before counting Snow or Ice.
    const type = Number(tile.type) || 0;
    return type === SNOW || type === ICE;
}
function PushCandidate(output, seen, left, top, xMin, xMax, yMin, yMax) {
    const width = IceShrineSchematic.width;
    const height = IceShrineSchematic.height;
    left = Clamp(left, xMin, xMax - 1);
    top = Clamp(top, yMin, yMax - 1);
    if (left < xMin || left >= xMax || top < yMin || top >= yMax)
        return;
    if (left + width >= Number(Terraria.Main.maxTilesX) - 2 || top + height >= Number(Terraria.Main.maxTilesY) - 2)
        return;
    const key = `${left}:${top}`;
    if (seen.has(key))
        return;
    seen.add(key);
    output.push({ left, top, quickRatio: 0 });
}
function QuickInspect(left, top, sunkenPlacement) {
    const width = IceShrineSchematic.width;
    const height = IceShrineSchematic.height;
    const startX = left - X_PAD;
    const endX = left + width + X_PAD;
    const startY = top - Y_PAD;
    const endY = top + height + Y_PAD;
    let ice = 0;
    let reads = 0;
    let canGenerate = true;

    // This is only a rejection/ranking filter. Every selected candidate still
    // receives the complete official padded-area validation incrementally.
    for (let x = startX; x < endX; x += 28) {
        for (let y = startY; y < endY; y += 14) {
            reads++;
            if (!InWorld(x, y)) {
                canGenerate = false;
                continue;
            }
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (Avoid(tile, sunkenPlacement, x, y))
                canGenerate = false;
            if (IceCell(tile))
                ice++;
        }
    }
    return { canGenerate, ice, reads, ratio: reads > 0 ? ice / reads : 0 };
}
function BuildCandidates(context, sunkenPlacement) {
    const maxX = Math.floor(Number(context?.maxX) || Number(Terraria.Main.maxTilesX) || 4200);
    const maxY = Math.floor(Number(context?.maxY) || Number(Terraria.Main.maxTilesY) || 1200);
    const width = IceShrineSchematic.width;
    const height = IceShrineSchematic.height;
    const xMin = Clamp(maxX * 0.25, 20, maxX - width - 20);
    const xMax = Clamp(maxX * 0.75, xMin + 1, maxX - width - 20);
    const yMin = Clamp(maxY * 0.35, 20, maxY - height - 20);
    const yMax = Clamp(maxY * 0.70, yMin + 1, maxY - height - 20);
    if (!(xMax > xMin && yMax > yMin))
        return { done: true, generated: false, reason: 'ice-search-bounds-invalid', candidates: [] };

    const candidates = [];
    const seen = new Set();
    const xStep = 22;
    const yStep = 16;
    const xOffset = WorldGenRand.NextInt(0, xStep);
    const yOffset = WorldGenRand.NextInt(0, yStep);
    let coarseReads = 0;

    for (let x = xMin + xOffset; x < xMax; x += xStep) {
        for (let y = yMin + yOffset; y < yMax; y += yStep) {
            coarseReads++;
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!IceCell(tile))
                continue;
            const baseLeft = x - Math.floor(width * 0.5);
            const baseTop = y - Math.floor(height * 0.5);
            for (const dx of [-12, 0, 12]) {
                for (const dy of [-8, 0, 8])
                    PushCandidate(candidates, seen, baseLeft + dx, baseTop + dy, xMin, xMax, yMin, yMax);
            }
            if (candidates.length >= 120)
                break;
        }
        if (candidates.length >= 120)
            break;
    }

    if (candidates.length === 0)
        return { done: true, generated: false, reason: 'ice-search-candidates-empty', candidates, coarseReads };

    let quickReads = 0;
    const ranked = [];
    for (const candidate of candidates) {
        const quick = QuickInspect(candidate.left, candidate.top, sunkenPlacement);
        quickReads += quick.reads;
        if (!quick.canGenerate || quick.ratio < QUICK_RATIO)
            continue;
        candidate.quickRatio = quick.ratio;
        ranked.push(candidate);
    }
    ranked.sort((a, b) => b.quickRatio - a.quickRatio);
    if (ranked.length > MAX_CANDIDATES)
        ranked.length = MAX_CANDIDATES;

    if (ranked.length === 0)
        return {
            done: true,
            generated: false,
            reason: 'ice-search-quick-filter-empty',
            candidates: ranked,
            coarseReads,
            quickReads
        };

    return {
        done: false,
        generated: false,
        reason: 'searching',
        candidates: ranked,
        cursor: 0,
        current: null,
        sunkenPlacement,
        exactReads: 0,
        inspectedCandidates: 0,
        coarseReads,
        quickReads,
        maxX,
        maxY
    };
}
function BeginCandidate(search, candidate) {
    const width = IceShrineSchematic.width;
    const height = IceShrineSchematic.height;
    return {
        candidate,
        startX: candidate.left - X_PAD,
        endX: candidate.left + width + X_PAD,
        startY: candidate.top - Y_PAD,
        endY: candidate.top + height + Y_PAD,
        x: candidate.left - X_PAD,
        y: candidate.top - Y_PAD,
        ice: 0,
        total: (width + X_PAD * 2) * (height + Y_PAD * 2),
        canGenerate: true
    };
}
function FinishCandidate(search, current) {
    search.inspectedCandidates++;
    const ratio = current.total > 0 ? current.ice / current.total : 0;
    const candidate = current.candidate;
    const width = IceShrineSchematic.width;
    const height = IceShrineSchematic.height;
    const rect = {
        left: candidate.left,
        top: candidate.top,
        right: candidate.left + width,
        bottom: candidate.top + height
    };
    if (!current.canGenerate || ratio < EXACT_RATIO || !OfficialStructureMap.CanPlace(rect, 4))
        return null;

    const result = OfficialSchematicRuntime.Place(
        IceShrineSchematic,
        { x: candidate.left, y: candidate.top },
        'topLeft',
        FillIceShrineChestByIndex,
        4
    );
    result.anchorX = candidate.left;
    result.anchorY = candidate.top;
    result.attempts = search.inspectedCandidates;
    result.candidates = search.candidates.length;
    result.coarseReads = search.coarseReads;
    result.quickReads = search.quickReads;
    result.exactReads = search.exactReads;
    result.iceTileCount = current.ice;
    result.checkedTileCount = current.total;
    result.iceRatio = ratio;
    result.source = 'CalamityMod/World/UndergroundShrines.cs::PlaceIceShrine + Schematics/Shrine_Ice.csch + incremental-bounded-delayed-mobile-safe-placement';
    Log(`generated=${result.generated}, topLeft=${candidate.left},${candidate.top}, attempts=${search.inspectedCandidates}, candidates=${search.candidates.length}, coarseReads=${search.coarseReads}, quickReads=${search.quickReads}, exactReads=${search.exactReads}, iceRatio=${ratio}, chestCount=${result.chestCount || 0}.`);
    return result;
}
function StepSearch(search, readBudget = 768) {
    if (!search)
        return { done: true, generated: false, reason: 'ice-search-state-missing' };
    if (search.done === true)
        return search;

    let budget = Math.max(8, Math.floor(Number(readBudget) || 768));
    while (budget > 0) {
        if (!search.current) {
            if (search.cursor >= search.candidates.length) {
                search.done = true;
                search.generated = false;
                search.reason = 'no-valid-ice-location';
                return search;
            }
            search.current = BeginCandidate(search, search.candidates[search.cursor++]);
        }

        const current = search.current;
        if (current.x >= current.endX) {
            const placed = FinishCandidate(search, current);
            search.current = null;
            if (placed && placed.generated === true)
                return { done: true, generated: true, reason: 'generated', result: placed, search };
            continue;
        }

        const x = current.x;
        const y = current.y;
        if (!InWorld(x, y)) {
            current.canGenerate = false;
        } else {
            const tile = Terraria.Main.tile.get_Item(x, y);
            search.exactReads++;
            if (Avoid(tile, search.sunkenPlacement, x, y))
                current.canGenerate = false;
            if (IceCell(tile))
                current.ice++;
        }

        budget--;
        if (!current.canGenerate) {
            FinishCandidate(search, current);
            search.current = null;
            continue;
        }
        current.y++;
        if (current.y >= current.endY) {
            current.y = current.startY;
            current.x++;
        }
    }

    return {
        done: false,
        generated: false,
        reason: 'searching',
        inspectedCandidates: search.inspectedCandidates,
        candidates: search.candidates.length,
        exactReads: search.exactReads,
        search
    };
}

// Generate remains available as a bounded compatibility entry point. The
// registered ModSystem uses BeginSearch + StepSearch so the exact 206x72
// validation is never executed in one large Android frame.
function Generate(context, sunkenPlacement = null) {
    const search = BuildCandidates(context, sunkenPlacement);
    if (search.done === true)
        return search;
    const result = StepSearch(search, 4096);
    if (result.generated === true)
        return result.result;
    return {
        generated: false,
        reason: 'incremental-search-required',
        attempts: search.inspectedCandidates,
        candidates: search.candidates.length,
        coarseReads: search.coarseReads,
        quickReads: search.quickReads,
        exactReads: search.exactReads,
        search
    };
}

export const IceShrineRuntime = {
    BeginSearch: BuildCandidates,
    StepSearch,
    Generate
};
