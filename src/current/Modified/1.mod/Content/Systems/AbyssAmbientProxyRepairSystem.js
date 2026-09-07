import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { PostLoadWorkCoordinator } from './../../Core/PostLoadWorkCoordinator.js';
import { AbyssAmbientProxyRuntime } from './../../Core/AbyssAmbientProxyRuntime.js';

const FIX = 'calamity:abyss:ambience:proxySafetyVersion';
const VERSION = 1;
const BUDGET = 32;
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Busy() { try { return Terraria.WorldGen.isGeneratingOrLoadingWorld === true; } catch (_) { return true; } }
function Log(s) { try { tl.log(`[CalamityPort ProxySafety] ${s}`); } catch (_) { } }

export class AbyssAmbientProxyRepairSystem extends ModSystem {
    constructor() { super(); this.Reset(); }
    Reset() { this.Delay = 360; this.Done = false; this.Cells = null; this.Cursor = 0; this.Changed = 0; this.Visual = 0; this.Solid = 0; AbyssAmbientProxyRuntime.Reset(); }
    OnWorldLoad() { this.Reset(); }
    OnWorldUnload() { this.Reset(); }
    Update() {
        if (this.Done || Terraria.Main.gameMenu === true || Busy() || !WorldDB.Instance) return;
        if (this.Delay-- > 0) return;
        if (I(WorldDB.get(FIX), 0) >= VERSION) { this.Done = true; return; }
        if (!this.Cells) { this.Cells = AbyssAmbientProxyRuntime.GetCells(); Log(`Abyss ambience proxy repair queued; cells=${this.Cells.length}.`); }
        const owner = 'AbyssAmbientProxySafety'; if (!PostLoadWorkCoordinator.TryEnter(owner)) return;
        let n = 0;
        while (this.Cursor < this.Cells.length && n++ < BUDGET) {
            const q = this.Cells[this.Cursor++], r = AbyssAmbientProxyRuntime.RepairAt(q[0], q[1]);
            if (!r.changed) continue;
            this.Changed++; if (r.kind === 'visual') this.Visual++; else if (r.kind === 'solid') this.Solid++;
        }
        if (this.Cursor < this.Cells.length) return;
        WorldDB.set(FIX, VERSION); try { WorldDB.Instance.Save(); } catch (_) { }
        Log(`Abyss ambience proxy repair complete: changed=${this.Changed}, visualEchoRemoved=${this.Visual}, coralEchoRetyped=${this.Solid}.`);
        this.Done = true; PostLoadWorkCoordinator.Release(owner);
    }
}
