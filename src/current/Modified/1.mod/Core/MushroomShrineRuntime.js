import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { MushroomShrineSchematic } from './../Data/OfficialSchematics/MushroomShrineSchematic.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import { OfficialSchematicRuntime } from './OfficialSchematicRuntime.js';
import { FillMushroomShrineChestByIndex } from './OfficialStructureRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';

const MUSHROOM_TYPES = new Set([71, 528, 72, 70]);
const DUNGEON_TYPES = new Set([41, 43, 44]);
const LIHZAHRD_BRICK = 226;
const LIHZAHRD_WALL = 87;
const SUNKEN_AVOID = new Set([Number(BiomeAnchorTiles.SunkenEutrophic), 385]);
const EXTRA_X = 20;
const EXTRA_Y = 40;
const REQUIRED_MUSHROOMS = 20;
const MAX_CANDIDATES = 240;

function Clamp(value, min, max) { return Math.max(min, Math.min(max, Math.floor(Number(value) || 0))); }
function InWorld(x, y) { return x >= 2 && y >= 2 && x < Number(Terraria.Main.maxTilesX) - 2 && y < Number(Terraria.Main.maxTilesY) - 2; }
function Log(message) { try { tl.log(`[CalamityPort MushroomShrine] ${message}`); } catch (e) { } }
function InSunken(placement, x, y) {
    if (!placement) return false;
    const lx = Math.floor(x - Number(placement.left));
    const ly = Math.floor(y - Number(placement.top));
    const width = Math.floor(Number(placement.width) || 0);
    const height = Math.floor(Number(placement.height) || 0);
    if (lx < 0 || ly < 0 || lx >= width || ly >= height) return false;
    return OrganicBiomePlanner.SunkenPlanCode(lx, ly, width, height) > 0;
}
function Avoid(tile, placement, x, y) {
    if (!tile || InSunken(placement, x, y)) return true;
    const type = Number(tile.type) || 0;
    const wall = Number(tile.wall) || 0;
    // Official PlaceMushroomShrine uses ShouldAvoidLocation(point, false):
    // liquid is intentionally tolerated, while Dungeon, Temple and Sunken Sea are rejected.
    return DUNGEON_TYPES.has(type) || type === LIHZAHRD_BRICK || wall === LIHZAHRD_WALL || SUNKEN_AVOID.has(type);
}
function IsMushroom(tile) { return !!tile && MUSHROOM_TYPES.has(Number(tile.type) || 0); }
function PushCandidate(search, left, top) {
    const width = MushroomShrineSchematic.width;
    const height = MushroomShrineSchematic.height;
    left = Clamp(left, search.xMin, search.xMax - 1);
    top = Clamp(top, search.yMin, search.yMax - 1);
    if (left < search.xMin || left >= search.xMax || top < search.yMin || top >= search.yMax) return;
    if (left + width >= Number(Terraria.Main.maxTilesX) - 2 || top + height >= Number(Terraria.Main.maxTilesY) - 2) return;
    if (search.remix && left > search.maxX * 0.4 && left < search.maxX * 0.6) return;
    const key = `${left}:${top}`;
    if (search.seen.has(key)) return;
    search.seen.add(key);
    search.candidates.push({ left, top });
}
function AddCandidatesAround(search, x, y) {
    const width = MushroomShrineSchematic.width;
    const height = MushroomShrineSchematic.height;
    const baseLeft = x - Math.floor(width * 0.5);
    const baseTop = y - Math.floor(height * 0.5);
    for (const dx of [-28, -14, 0, 14, 28]) {
        for (const dy of [-24, -12, 0, 12, 24]) {
            PushCandidate(search, baseLeft + dx, baseTop + dy);
            if (search.candidates.length >= MAX_CANDIDATES) return;
        }
    }
}
function BeginCandidate(candidate) {
    const width = MushroomShrineSchematic.width;
    const height = MushroomShrineSchematic.height;
    return {
        candidate,
        startX: candidate.left - EXTRA_X,
        endX: candidate.left + width + EXTRA_X,
        startY: candidate.top,
        endY: candidate.top + height + EXTRA_Y,
        x: candidate.left - EXTRA_X,
        y: candidate.top,
        mushrooms: 0,
        canGenerate: true,
        total: (width + EXTRA_X * 2) * (height + EXTRA_Y)
    };
}
function FinishCandidate(search, current) {
    search.inspectedCandidates++;
    const c = current.candidate;
    const width = MushroomShrineSchematic.width;
    const height = MushroomShrineSchematic.height;
    const rect = { left: c.left, top: c.top, right: c.left + width, bottom: c.top + height };
    // Match the current source's remix branch: only location safety is required there.
    const valid = search.remix
        ? current.canGenerate
        : current.canGenerate && current.mushrooms >= REQUIRED_MUSHROOMS && OfficialStructureMap.CanPlace(rect, 4);
    if (!valid) return null;
    const result = OfficialSchematicRuntime.Place(
        MushroomShrineSchematic,
        { x: c.left, y: c.top },
        'topLeft',
        FillMushroomShrineChestByIndex,
        4
    );
    result.anchorX = c.left;
    result.anchorY = c.top;
    result.attempts = search.inspectedCandidates;
    result.candidates = search.candidates.length;
    result.discoveryReads = search.discoveryReads;
    result.exactReads = search.exactReads;
    result.mushroomTileCount = current.mushrooms;
    result.checkedTileCount = current.total;
    result.remixVariant = search.remix;
    result.source = 'CalamityMod/World/UndergroundShrines.cs::PlaceMushroomShrine + Schematics/Shrine_Mushroom.csch + incremental-bounded-delayed-mobile-safe-placement';
    Log(`generated=${result.generated}, topLeft=${c.left},${c.top}, attempts=${search.inspectedCandidates}, candidates=${search.candidates.length}, discoveryReads=${search.discoveryReads}, exactReads=${search.exactReads}, mushroomTiles=${current.mushrooms}, remix=${search.remix}, chestCount=${result.chestCount || 0}.`);
    return result;
}

export const MushroomShrineRuntime = {
    BeginSearch(context, sunkenPlacement = null) {
        const maxX = Math.floor(Number(context?.maxX) || Number(Terraria.Main.maxTilesX) || 4200);
        const maxY = Math.floor(Number(context?.maxY) || Number(Terraria.Main.maxTilesY) || 1200);
        const width = MushroomShrineSchematic.width;
        const height = MushroomShrineSchematic.height;
        let remix = false;
        try { remix = Terraria.Main.remixWorld === true; } catch (e) { }
        const xMin = Clamp(maxX * 0.2, 20, maxX - width - 20);
        const xMax = Clamp(maxX * 0.8, xMin + 1, maxX - width - 20);
        const yMin = remix ? Clamp(maxY * 0.85, 20, maxY - height - 20) : Clamp(maxY * 0.2, 20, maxY - height - 20);
        const yMax = remix ? Clamp(maxY * 0.9, yMin + 1, maxY - height - 20) : Clamp(maxY * 0.85, yMin + 1, maxY - height - 20);
        if (!(xMax > xMin && yMax > yMin)) return { done: true, generated: false, reason: 'mushroom-search-bounds-invalid' };
        const xStep = remix ? 20 : 10;
        const yStep = remix ? 12 : 8;
        return {
            done: false,
            generated: false,
            reason: 'discovering',
            phase: 'discover',
            maxX, maxY, xMin, xMax, yMin, yMax, xStep, yStep, remix,
            scanX: xMin + WorldGenRand.NextInt(0, xStep),
            scanY: yMin + WorldGenRand.NextInt(0, yStep),
            candidates: [], seen: new Set(), cursor: 0, current: null,
            discoveryReads: 0, exactReads: 0, inspectedCandidates: 0,
            sunkenPlacement
        };
    },
    StepSearch(search, readBudget = 768) {
        if (!search) return { done: true, generated: false, reason: 'mushroom-search-state-missing' };
        if (search.done === true) return search;
        let budget = Math.max(8, Math.floor(Number(readBudget) || 768));
        while (budget > 0 && search.phase === 'discover') {
            if (search.scanX >= search.xMax || search.candidates.length >= MAX_CANDIDATES) {
                // Remix worlds do not require mushroom-biome evidence, so add bounded random candidates.
                if (search.remix) {
                    for (let i = 0; i < 180 && search.candidates.length < MAX_CANDIDATES; i++)
                        PushCandidate(search, WorldGenRand.NextInt(search.xMin, search.xMax), WorldGenRand.NextInt(search.yMin, search.yMax));
                }
                search.phase = 'inspect';
                search.reason = 'searching';
                if (search.candidates.length === 0) {
                    search.done = true;
                    search.reason = 'mushroom-search-candidates-empty';
                    return search;
                }
                break;
            }
            if (!InWorld(search.scanX, search.scanY)) {
                search.scanY += search.yStep;
            } else {
                const tile = Terraria.Main.tile.get_Item(search.scanX, search.scanY);
                search.discoveryReads++;
                budget--;
                if (IsMushroom(tile)) AddCandidatesAround(search, search.scanX, search.scanY);
                search.scanY += search.yStep;
            }
            if (search.scanY >= search.yMax) {
                search.scanY = search.yMin + WorldGenRand.NextInt(0, search.yStep);
                search.scanX += search.xStep;
            }
        }
        while (budget > 0 && search.phase === 'inspect') {
            if (!search.current) {
                if (search.cursor >= search.candidates.length) {
                    search.done = true;
                    search.generated = false;
                    search.reason = 'no-valid-mushroom-location';
                    return search;
                }
                search.current = BeginCandidate(search.candidates[search.cursor++]);
            }
            const current = search.current;
            if (!InWorld(current.x, current.y)) current.canGenerate = false;
            else {
                const tile = Terraria.Main.tile.get_Item(current.x, current.y);
                search.exactReads++;
                if (Avoid(tile, search.sunkenPlacement, current.x, current.y)) current.canGenerate = false;
                if (IsMushroom(tile)) current.mushrooms++;
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
            if (current.x >= current.endX) {
                const result = FinishCandidate(search, current);
                search.current = null;
                if (result && result.generated === true) {
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
