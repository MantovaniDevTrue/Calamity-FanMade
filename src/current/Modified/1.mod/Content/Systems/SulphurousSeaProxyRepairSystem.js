import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { PostLoadWorkCoordinator } from './../../Core/PostLoadWorkCoordinator.js';
import { SulphurousScrapSchematics } from './../../Data/OfficialSchematics/SulphurousScrapSchematics.js';
import { SulphurousSeaProxyRuntime } from './../../Core/SulphurousSeaProxyRuntime.js';

const DETAIL = 'calamity:sulphursea:details:';
const AMBIENCE = 'calamity:sulphursea:ambience:';
const FIX = 'calamity:sulphursea:proxySafetyVersion';
const VERSION = 1;
const BUDGET = 32;
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Busy() { try { return Terraria.WorldGen.isGeneratingOrLoadingWorld === true; } catch (_) { return true; } }
function Log(s) { try { tl.log(`[CalamityPort ProxySafety] ${s}`); } catch (_) { } }
function AddRectCells(out, left, top, width, height) {
    if (left < 0 || top < 0 || width <= 0 || height <= 0) return;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) out.push([left + x, top + y]);
}
function BuildCells() {
    const out = [], seen = new Set(), add = (x, y) => { const k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); out.push([x, y]); } };
    const scraps = Math.max(0, I(WorldDB.get(DETAIL + 'scrapCount')));
    for (let n = 0; n < scraps; n++) {
        const k = DETAIL + `scrap:${n}:`, left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1);
        const variant = Math.max(1, Math.min(7, I(WorldDB.get(k + 'variant'), 1))), s = SulphurousScrapSchematics[variant - 1];
        if (!s || left < 0 || top < 0) continue;
        for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (SulphurousSeaProxyRuntime.MetaAt(left + x, top + y)) add(left + x, top + y);
    }
    const columns = Math.max(0, I(WorldDB.get(DETAIL + 'columnCount')));
    for (let n = 0; n < columns; n++) {
        const k = DETAIL + `column:${n}:`, left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1), bottom = I(WorldDB.get(k + 'bottom'), -1);
        if (left < 0 || top < 0 || bottom < top) continue;
        for (let y = top; y <= bottom; y++) { add(left, y); add(left + 1, y); }
    }
    const ambience = Math.max(0, I(WorldDB.get(AMBIENCE + 'count')));
    for (let n = 0; n < ambience; n++) {
        const k = AMBIENCE + `obj:${n}:`, left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1), width = I(WorldDB.get(k + 'width')), height = I(WorldDB.get(k + 'height'));
        if (left < 0 || top < 0 || width <= 0 || height <= 0) continue;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) add(left + x, top + y);
    }
    return out;
}
export class SulphurousSeaProxyRepairSystem extends ModSystem {
    constructor() { super(); this.Reset(); }
    Reset() { this.Delay = 300; this.Done = false; this.Cells = null; this.Cursor = 0; this.Changed = 0; this.Visual = 0; this.Solid = 0; this.Platform = 0; }
    OnWorldLoad() { this.Reset(); }
    OnWorldUnload() { this.Reset(); }
    Update() {
        if (this.Done || Terraria.Main.gameMenu === true || Busy() || !WorldDB.Instance) return;
        if (this.Delay-- > 0) return;
        if (I(WorldDB.get(FIX), 0) >= VERSION) { this.Done = true; return; }
        if (!this.Cells) { this.Cells = BuildCells(); Log(`proxy audit repair queued; cells=${this.Cells.length}.`); }
        const owner = 'SulphProxySafety'; if (!PostLoadWorkCoordinator.TryEnter(owner)) return;
        let n = 0;
        while (this.Cursor < this.Cells.length && n++ < BUDGET) {
            const q = this.Cells[this.Cursor++], r = SulphurousSeaProxyRuntime.RepairAt(q[0], q[1]);
            if (!r.changed) continue; this.Changed++;
            if (r.kind === 'visual') this.Visual++; else if (r.kind === 'solid') this.Solid++; else if (r.kind === 'platform') this.Platform++;
        }
        if (this.Cursor < this.Cells.length) return;
        WorldDB.set(FIX, VERSION); try { WorldDB.Instance.Save(); } catch (_) { }
        Log(`proxy audit repair complete: changed=${this.Changed}, visualEchoRemoved=${this.Visual}, solidEchoRetyped=${this.Solid}, platformNormalized=${this.Platform}.`);
        this.Done = true; PostLoadWorkCoordinator.Release(owner);
    }
}
