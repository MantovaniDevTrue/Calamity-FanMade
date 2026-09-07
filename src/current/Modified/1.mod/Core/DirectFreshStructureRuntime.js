import { Terraria } from './../TL/ModImports.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import { SurfaceShrineRuntime } from './SurfaceShrineRuntime.js';
import { IceShrineRuntime } from './IceShrineRuntime.js';
import { MushroomShrineRuntime } from './MushroomShrineRuntime.js';
import { EvilShrineRuntime } from './EvilShrineRuntime.js';
import { MarbleShrineRuntime } from './MarbleShrineRuntime.js';
import { RoxShrineRuntime } from './RoxShrineRuntime.js';
import { AbyssShrineRuntime } from './AbyssShrineRuntime.js';
import { JungleLabRuntime } from './JungleLabRuntime.js';
import { IceLabRuntime } from './IceLabRuntime.js';
import { SunkenSeaLabRuntime } from './SunkenSeaLabRuntime.js';
import { UnderworldLabRuntime } from './UnderworldLabRuntime.js';
import { OnyxLabRuntime } from './OnyxLabRuntime.js';
import { JungleLabSchematic } from './../Data/OfficialSchematics/JungleLabSchematic.js';
import { IceLabSchematic } from './../Data/OfficialSchematics/IceLabSchematic.js';
import { SunkenSeaLabSchematic } from './../Data/OfficialSchematics/SunkenSeaLabSchematic.js';
import { UnderworldLabSchematic } from './../Data/OfficialSchematics/UnderworldLabSchematic.js';
import { OnyxLabSchematic } from './../Data/OfficialSchematics/OnyxLabSchematic.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';

function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Active(t) { try { return !!t && t['bool active()']() === true; } catch (e) { return false; } }
function TileAt(x, y) { try { return Terraria.Main.tile.get_Item(I(x), I(y)); } catch (e) { return null; } }
function Log(s) { try { tl.log(`[CalamityPort DirectStructures] ${s}`); } catch (e) { } }
function Hash(x) { x = (x ^ 61) ^ (x >>> 16); x = (x + (x << 3)) | 0; x ^= x >>> 4; x = Math.imul(x, 0x27d4eb2d); x ^= x >>> 15; return x >>> 0; }
function Rect(l, t, w, h) { return { left: I(l), top: I(t), right: I(l) + I(w), bottom: I(t) + I(h) }; }
function CanPlace(l, t, w, h, padding = 55) { return OfficialStructureMap.CanPlace(Rect(l, t, w, h), padding); }
function Reserve(name, result, padding = 4) {
    if (!result || result.generated !== true) return;
    const l = I(result.left, I(result.anchorX, -1)), t = I(result.top, I(result.anchorY, -1));
    const w = Math.max(1, I(result.width, 1)), h = Math.max(1, I(result.height, 1));
    if (l >= 0 && t >= 0) OfficialStructureMap.Reserve(name, Rect(l, t, w, h), padding);
}
function RunIncremental(label, search, stepFn, budget = 65536, maxSteps = 256) {
    const started = Date.now();
    if (!search) return { generated: false, reason: 'search-state-missing', elapsedMs: Date.now() - started };
    if (search.done === true) return search.result || { generated: false, reason: search.reason || 'search-ended', elapsedMs: Date.now() - started };
    for (let i = 0; i < maxSteps; i++) {
        const s = stepFn(search, budget);
        if (s?.generated === true && s.result) return { ...s.result, elapsedMs: Date.now() - started };
        if (s?.done === true || search.done === true) {
            if (search.result) return { ...search.result, elapsedMs: Date.now() - started };
            return { generated: false, reason: String(s?.reason || search.reason || 'no-valid-location'), elapsedMs: Date.now() - started,
                discoveryReads: I(search.discoveryReads), exactReads: I(search.exactReads), reads: I(search.reads), inspected: I(search.inspected || search.inspectedCandidates) };
        }
    }
    return { generated: false, reason: 'direct-search-budget-exhausted', elapsedMs: Date.now() - started,
        discoveryReads: I(search.discoveryReads), exactReads: I(search.exactReads), reads: I(search.reads), inspected: I(search.inspected || search.inspectedCandidates) };
}
function RunLabSession(label, runtime, schematic, candidate, padding = 55) {
    const started = Date.now();
    if (!candidate) return { generated: false, reason: 'no-valid-location', elapsedMs: Date.now() - started };
    if (!CanPlace(candidate.l, candidate.t, schematic.width, schematic.height, padding))
        return { generated: false, reason: 'reserved-location', elapsedMs: Date.now() - started };
    try {
        const q = runtime.CreateSession(candidate.l, candidate.t);
        let step = null;
        for (let i = 0; i < 4; i++) {
            step = runtime.StepSession(q, 1000000);
            if (step?.done === true) break;
        }
        const r = step?.result;
        if (r?.generated === true) {
            Reserve(label, r, 18);
            return { ...r, source: `${String(r.source || '')}/fresh-world-direct`, elapsedMs: Date.now() - started };
        }
        return { generated: false, reason: String(r?.reason || 'lab-session-incomplete'), elapsedMs: Date.now() - started };
    } catch (e) {
        return { generated: false, reason: String(e), elapsedMs: Date.now() - started };
    }
}
function FindCandidate(candidates, probe) {
    for (const relaxed of [false, true]) {
        for (const c of candidates) {
            try { if (probe(c, relaxed)) return c; } catch (e) { }
        }
    }
    return null;
}
function WorldInfo(context) {
    const W = I(context?.maxX, I(Terraria.Main.maxTilesX, 4200));
    const H = I(context?.maxY, I(Terraria.Main.maxTilesY, 1200));
    const surf = I(Terraria.Main.worldSurface, Math.floor(H * .25));
    const rock = I(Terraria.Main.rockLayer, Math.floor(H * .42));
    const under = I(Terraria.Main.UnderworldLayer, H - 200);
    return { W, H, surf, rock, under };
}
function JungleCandidates(context) {
    const { W, surf, under } = WorldInfo(context), sw = JungleLabSchematic.width, sh = JungleLabSchematic.height, out = [];
    const xs = []; for (let x = Math.floor(W * .14); x <= Math.floor(W * .86); x += Math.max(120, Math.floor(W / 24))) xs.push(x);
    const ys = []; for (let y = surf + 150; y <= under - 110; y += Math.max(80, Math.floor((under - surf) / 10))) ys.push(y);
    for (const y of ys) for (const x of xs) { const l = Math.floor(x - sw / 2), t = Math.floor(y - sh / 2); if (l >= 80 && t >= surf + 100 && l + sw <= W - 80 && t + sh <= under - 65) out.push({ l, t, h: Hash(x * 73856093 ^ y * 19349663) }); }
    out.sort((a, b) => a.h - b.h); return out.slice(0, 240);
}
function JungleProbe(c, relaxed) {
    if (!CanPlace(c.l, c.t, JungleLabSchematic.width, JungleLabSchematic.height, 70)) return false;
    let jungle = 0, active = 0, bad = 0; const w = JungleLabSchematic.width, h = JungleLabSchematic.height;
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 10; gx++) { const x = c.l - 20 + Math.floor((w + 40) * (gx + .5) / 10), y = c.t + Math.floor(h * (gy + .5) / 8), t = TileAt(x, y); if (!t) continue; const type = I(t.type, -1), wall = I(t.wall); if (Active(t)) { active++; if (type === 59 || type === 60) jungle++; if (type === 70 || type === 71 || type === 528) jungle -= 3; if (type === 41 || type === 43 || type === 44 || type === 226 || type === 25 || type === 203) bad++; } if (wall === 87 || wall === 3 || wall === 83) bad++; }
    return bad === 0 && active >= 34 && jungle >= (relaxed ? 18 : 26);
}
function IceCandidates(context) {
    const { W, surf, under } = WorldInfo(context), sw = IceLabSchematic.width, sh = IceLabSchematic.height, out = [];
    const xs = []; for (let x = Math.floor(W * .08); x <= Math.floor(W * .92); x += Math.max(110, Math.floor(W / 28))) xs.push(x);
    const ys = []; for (let y = surf + 170; y <= under - 130; y += Math.max(75, Math.floor((under - surf) / 11))) ys.push(y);
    for (const y of ys) for (const x of xs) { const l = Math.floor(x - sw / 2), t = Math.floor(y - sh / 2); if (l >= 90 && t >= surf + 135 && l + sw <= W - 90 && t + sh <= under - 85) out.push({ l, t, h: Hash(x * 73856093 ^ y * 19349663) }); }
    out.sort((a, b) => a.h - b.h); return out.slice(0, 280);
}
function IceProbe(c, relaxed) {
    if (!CanPlace(c.l, c.t, IceLabSchematic.width, IceLabSchematic.height, 65)) return false;
    let ice = 0, active = 0, bad = 0; const w = IceLabSchematic.width, h = IceLabSchematic.height;
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 10; gx++) { const x = c.l - 18 + Math.floor((w + 36) * (gx + .5) / 10), y = c.t + Math.floor(h * (gy + .5) / 8), t = TileAt(x, y); if (!t) continue; const type = I(t.type, -1), wall = I(t.wall); if (Active(t)) { active++; if (type === 147 || type === 161) ice++; if (type === 59 || type === 60 || type === 70 || type === 71 || type === 25 || type === 203 || type === 226) bad++; } if (wall === 87 || wall === 3 || wall === 83) bad++; }
    return bad === 0 && active >= 30 && ice >= (relaxed ? 16 : 23);
}
function SunkenCentralGeodeConflict(l, t, sunken, pad = 8) {
    if (!sunken) return false;
    const bw = I(sunken.width, 360), bh = I(sunken.height, 220), rim = bw >= 360 ? 20 : 0;
    const coreW = Math.max(320, bw - rim * 2), coreH = Math.max(168, bh - rim * 2);
    const scale = Math.max(1, Math.min(2, coreW / 320));
    const radius = 28 * scale + pad;
    const cx = I(sunken.left) + rim + coreW * .5;
    const cy = I(sunken.top) + rim + coreH * .33;
    const w = SunkenSeaLabSchematic.width, h = SunkenSeaLabSchematic.height;
    const nearestX = Math.max(l, Math.min(cx, l + w));
    const nearestY = Math.max(t, Math.min(cy, t + h));
    const dx = nearestX - cx, dy = nearestY - cy;
    return dx * dx + dy * dy < radius * radius;
}
function SunkenCandidates(sunken) {
    if (!sunken) return []; const w = SunkenSeaLabSchematic.width, h = SunkenSeaLabSchematic.height;
    const left = I(sunken.left), top = I(sunken.top), bw = I(sunken.width, 360), bh = I(sunken.height, 220), right = left + bw, bottom = top + bh;
    const minL = left + 10, maxL = right - w - 10, minT = top + 8, maxT = bottom - h - 8; if (maxL < minL || maxT < minT) return [];
    const out = [], seen = new Set(), add = (l, t) => {
        l = I(l); t = I(t); const k = `${l},${t}`;
        if (seen.has(k) || l < left + 8 || t < top + 6 || l + w > right - 8 || t + h > bottom - 6 || SunkenCentralGeodeConflict(l, t, sunken, 2)) return;
        seen.add(k); out.push({ l, t, sunken });
    };
    const spanX = Math.max(1, maxL - minL), spanY = Math.max(1, maxT - minT);
    const sideL = minL, sideR = maxL;
    const qL = I(minL + spanX * .22), qR = I(maxL - spanX * .22);
    const upper = I(minT + spanY * .22), mid = I(minT + spanY * .50), lower = I(minT + spanY * .72);
    // Fresh worlds previously tried the exact center first, which is why the 119x93 lab
    // dominated the middle of the sea in map screenshots. Desktop placement is not tied to
    // the center; prefer embedded side shelves and only widen the search if those fail.
    for (const y of [mid, lower, upper]) for (const x of [sideL, sideR, qL, qR]) add(x, y);
    const sx = Math.max(18, I(spanX / 7)), sy = Math.max(16, I(spanY / 6));
    for (let y = minT; y <= maxT; y += sy) for (let x = minL; x <= maxL; x += sx) add(x, y);
    // Last-resort near-center quarter points, never covering the central geode itself.
    add(I(minL + spanX * .32), I(minT + spanY * .55));
    add(I(minL + spanX * .68), I(minT + spanY * .55));
    return out;
}
function SunkenProbe(c, relaxed) {
    if (!CanPlace(c.l, c.t, SunkenSeaLabSchematic.width, SunkenSeaLabSchematic.height, 36)) return false;
    if (SunkenCentralGeodeConflict(c.l, c.t, c.sunken, 0)) return false;
    let score = 0, seen = 0; const w = SunkenSeaLabSchematic.width, h = SunkenSeaLabSchematic.height;
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 8; gx++) { const x = c.l + Math.floor(w * (gx + .5) / 8), y = c.t + Math.floor(h * (gy + .5) / 6), t = TileAt(x, y); if (!t) continue; seen++; const type = I(t.type, -1), wall = I(t.wall), liq = I(t.liquid); if (type === Number(BiomeAnchorTiles.SunkenEutrophic) || type === Number(BiomeAnchorTiles.LegacySunkenEutrophic)) score += 4; else if (type === 396 || type === 385) score += 3; if (wall === 216 || wall === 187) score += 2; if (liq > 96) score += 1; }
    return seen >= 20 && score >= (relaxed ? 14 : 24);
}
function UnderworldCandidates(context) {
    const { W, H, under } = WorldInfo(context), sw = UnderworldLabSchematic.width, sh = UnderworldLabSchematic.height, dungeon = I(Terraria.Main.dungeonX, W / 2), leftSide = dungeon > W / 2; let x0, x1;
    if (leftSide) { x0 = Math.floor(W / 12); x1 = Math.floor(W / 9); } else { x0 = Math.floor(W * .82); x1 = Math.floor(W * .925) - sw; }
    if (x1 < x0) { x0 = Math.max(30, leftSide ? 30 : W - sw - 260); x1 = Math.min(W - sw - 30, x0 + 220); }
    const y0 = Math.max(under + 10, H - 175), y1 = Math.min(H - sh - 18, H - 118), out = [];
    for (let y = y0; y <= y1; y += 5) for (let x = x0; x <= x1; x += Math.max(10, Math.floor((x1 - x0) / 12) || 10)) out.push({ l: x, t: y, h: Hash(x * 73856093 ^ y * 19349663) }); out.sort((a, b) => a.h - b.h); return out.slice(0, 220);
}
function UnderworldProbe(c, relaxed) {
    if (!CanPlace(c.l, c.t, UnderworldLabSchematic.width, UnderworldLabSchematic.height, 55)) return false;
    let active = 0, bad = 0, ash = 0; const w = UnderworldLabSchematic.width, h = UnderworldLabSchematic.height;
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 11; gx++) { const x = c.l - 18 + Math.floor((w + 36) * (gx + .5) / 11), y = c.t + Math.floor(h * (gy + .5) / 6), t = TileAt(x, y); if (!t) continue; const type = I(t.type, -1), wall = I(t.wall); if (Active(t)) { active++; if (type === 57 || type === 58 || type === 76 || type === 75) ash++; if (type === 41 || type === 43 || type === 44 || type === 226 || type === 25 || type === 203) bad++; } if (wall === 87 || wall === 83 || wall === 3) bad++; }
    return bad === 0 && active >= (relaxed ? 8 : 16) && ash >= (relaxed ? 3 : 7);
}
function MossLike(type) { return type === 179 || type === 180 || type === 181 || type === 182 || type === 183 || type === 184 || type === 381 || type === 382 || type === 383 || type === 384 || type === 385 || type === 386; }
function OnyxCandidates(context) {
    const { W, H, rock, under } = WorldInfo(context), sw = OnyxLabSchematic.width, sh = OnyxLabSchematic.height, x0 = Math.max(45, Math.floor(W * .30)), x1 = Math.min(W - sw - 45, Math.floor(W * .70)), y0 = Math.max(rock + 35, Math.floor(H * .55)), y1 = Math.min(under - sh - 45, Math.floor(H * .80)), out = [];
    if (x1 < x0 || y1 < y0) return out; const sx = Math.max(34, Math.floor((x1 - x0) / 15)), sy = Math.max(28, Math.floor((y1 - y0) / 10));
    for (let y = y0; y <= y1; y += sy) for (let x = x0; x <= x1; x += sx) out.push({ l: x, t: y, h: Hash(x * 73856093 ^ y * 19349663) });
    for (let n = 0; n < 96; n++) { const h = Hash(n * 2654435761), x = x0 + (h % Math.max(1, x1 - x0 + 1)), y = y0 + (Hash(h ^ 0x9e3779b9) % Math.max(1, y1 - y0 + 1)); out.push({ l: x, t: y, h: Hash(h ^ 0x85ebca6b) }); }
    out.sort((a, b) => a.h - b.h); const seen = new Set(), u = []; for (const c of out) { const k = `${c.l},${c.t}`; if (seen.has(k)) continue; seen.add(k); u.push(c); } return u.slice(0, 300);
}
function OnyxProbe(c, relaxed) {
    if (!CanPlace(c.l, c.t, OnyxLabSchematic.width, OnyxLabSchematic.height, 80)) return false;
    let plain = 0, active = 0, bad = 0, jungle = 0, dungeon = 0; const w = OnyxLabSchematic.width, h = OnyxLabSchematic.height;
    for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 13; gx++) { const x = c.l - 30 + Math.floor((w + 60) * (gx + .5) / 13), y = c.t + Math.floor(h * (gy + .5) / 7), t = TileAt(x, y); if (!t) continue; const type = I(t.type, -1), wall = I(t.wall); if (Active(t)) { active++; if (type === 0 || type === 1 || type === 59 || MossLike(type)) plain++; if (type === 60 || type === 70) jungle++; if (type === 41 || type === 43 || type === 44 || type === 226) bad++; } if (wall === 7 || wall === 8 || wall === 9 || wall === 87) dungeon++; }
    const needed = relaxed ? .20 : .30; return bad === 0 && dungeon === 0 && jungle <= (relaxed ? 2 : 0) && active >= Math.floor(13 * 7 * .22) && plain >= Math.floor(13 * 7 * needed);
}
function NativeBool(value) {
    if (value === true) return true;
    if (value === false || value === null || value === undefined) return false;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric !== 0;
    return String(value).toLowerCase() === 'true';
}
function EvilTargets() {
    let crimson = false, drunk = false;
    try { crimson = NativeBool(Terraria.WorldGen.crimson); } catch (e) { }
    try { drunk = NativeBool(Terraria.Main.drunkWorld); } catch (e) { }
    return drunk ? ['crimson', 'corruption'] : [crimson ? 'crimson' : 'corruption'];
}
function SunkenBounds(sunken) { return sunken ? { left: I(sunken.left), top: I(sunken.top), width: I(sunken.width, 320), height: I(sunken.height, 180) } : null; }

export const DirectFreshStructureRuntime = {
    Generate(context, sunken) {
        const started = Date.now(), timings = {}, result = {};
        const sb = SunkenBounds(sunken);
        const timed = (name, fn) => { const t = Date.now(); let r; try { r = fn(); } catch (e) { r = { generated: false, reason: String(e) }; } timings[name] = Date.now() - t; if (r && r.elapsedMs === undefined) r.elapsedMs = timings[name]; Log(`${name}: generated=${r?.generated === true}, reason=${r?.reason || 'none'}, elapsed=${timings[name]}ms.`); return r; };

        result.surfaceShrine = timed('SurfaceShrine', () => SurfaceShrineRuntime.Generate(context, sb)); Reserve('Surface Shrine', result.surfaceShrine, 4);
        result.iceShrine = timed('IceShrine', () => RunIncremental('IceShrine', IceShrineRuntime.BeginSearch(context, sb), (s, b) => IceShrineRuntime.StepSearch(s, b), 65536, 256)); Reserve('Ice Shrine', result.iceShrine, 4);
        result.mushroomShrine = timed('MushroomShrine', () => RunIncremental('MushroomShrine', MushroomShrineRuntime.BeginSearch(context, sb), (s, b) => MushroomShrineRuntime.StepSearch(s, b), 65536, 256)); Reserve('Mushroom Shrine', result.mushroomShrine, 4);
        result.evilShrines = { targets: EvilTargets(), results: {}, complete: true };
        for (const kind of result.evilShrines.targets) { const r = timed(`${kind}Shrine`, () => RunIncremental(`${kind}Shrine`, EvilShrineRuntime.BeginSearch(kind, context, sb), (s, b) => EvilShrineRuntime.StepSearch(s, b), 65536, 256)); result.evilShrines.results[kind] = r; result.evilShrines.complete = result.evilShrines.complete && r?.generated === true; Reserve(`${kind} Shrine`, r, 4); }
        result.marbleShrine = timed('MarbleShrine', () => MarbleShrineRuntime.Generate(context, sb)); Reserve('Marble Shrine', result.marbleShrine, 4);
        result.roxShrine = timed('RoxShrine', () => RunIncremental('RoxShrine', RoxShrineRuntime.Begin(context, sb), (s, b) => RoxShrineRuntime.Step(s, b), 65536, 128)); Reserve('Rox Shrine', result.roxShrine, 4);
        result.abyssShrine = timed('AbyssShrine', () => AbyssShrineRuntime.Place()); Reserve('Abyss Shrine', result.abyssShrine, 4);

        result.jungleLab = timed('JungleLab', () => RunLabSession('Jungle Lab', JungleLabRuntime, JungleLabSchematic, FindCandidate(JungleCandidates(context), JungleProbe), 70));
        result.iceLab = timed('IceLab', () => RunLabSession('Ice Lab', IceLabRuntime, IceLabSchematic, FindCandidate(IceCandidates(context), IceProbe), 65));
        result.sunkenSeaLab = timed('SunkenSeaLab', () => RunLabSession('Sunken Sea Lab', SunkenSeaLabRuntime, SunkenSeaLabSchematic, FindCandidate(SunkenCandidates(sb), SunkenProbe), 36));
        result.underworldLab = timed('UnderworldLab', () => RunLabSession('Underworld Lab', UnderworldLabRuntime, UnderworldLabSchematic, FindCandidate(UnderworldCandidates(context), UnderworldProbe), 55));
        result.onyxLab = timed('OnyxLab', () => RunLabSession('Onyx Lab', OnyxLabRuntime, OnyxLabSchematic, FindCandidate(OnyxCandidates(context), OnyxProbe), 80));
        result.generatedLabs = [result.jungleLab, result.iceLab, result.sunkenSeaLab, result.underworldLab, result.onyxLab].filter(r => r?.generated === true).length;
        result.generatedShrines = [result.surfaceShrine, result.iceShrine, result.mushroomShrine, result.marbleShrine, result.roxShrine, result.abyssShrine, ...Object.values(result.evilShrines.results)].filter(r => r?.generated === true).length;
        result.elapsedMs = Date.now() - started; result.timings = timings;
        Log(`fresh-world structure pass complete; labs=${result.generatedLabs}/5, shrines=${result.generatedShrines}/${6 + result.evilShrines.targets.length}, total=${result.elapsedMs}ms.`);
        return result;
    }
};
