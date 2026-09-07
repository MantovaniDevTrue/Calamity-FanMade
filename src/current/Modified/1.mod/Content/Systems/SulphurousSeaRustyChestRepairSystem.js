import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { EnsureVisibleRustyChestAt } from './../../Core/SulphurousSeaAmbienceRuntime.js';

const KEY = 'calamity:sulphursea:ambience:';
const VERSION = 3;
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Log(s) { try { tl.log(`[CalamityPort RustyChestRepair] ${s}`); } catch (e) { } }

export class SulphurousSeaRustyChestRepairSystem extends ModSystem {
    constructor() { super(); this.Reset(); }
    Reset() { this.Delay = 240; this.Done = false; this.Attempts = 0; }
    OnWorldLoad() { this.Reset(); }
    OnWorldUnload() { this.Reset(); }
    Update() {
        if (this.Done || !WorldDB.Instance || this.Delay-- > 0) return;
        if (WorldDB.get(KEY + 'generated') !== true) { this.Delay = 180; return; }
        if (I(WorldDB.get(KEY + 'chestVisibilityVersion'), 0) >= VERSION) { this.Done = true; return; }
        const count = Math.max(0, I(WorldDB.get(KEY + 'chestCount'), 0));
        if (count <= 0) { this.Done = true; return; }
        let ready = 0, recreated = 0, refilled = 0;
        const positions = [];
        for (let i = 0; i < count; i++) {
            const k = KEY + `chest:${i}:`;
            const left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1);
            const special = String(WorldDB.get(k + 'special') || '');
            const kind = String(WorldDB.get(k + 'kind') || '');
            if (left < 0 || top < 0) continue;
            const r = EnsureVisibleRustyChestAt(left, top, special, kind, true);
            if (r.success) {
                ready++;
                if (r.created) recreated++;
                if (I(r.filled, 0) > 0) refilled++;
                WorldDB.set(k + 'index', I(r.index, -1));
                positions.push(`${kind || 'chest'}@${left},${top}#${I(r.index, -1)}`);
            }
        }
        this.Attempts++;
        Log(`verification ready=${ready}/${count}, recreated=${recreated}, refilled=${refilled}, attempt=${this.Attempts}; ${positions.join(' | ')}.`);
        if (ready === count) {
            WorldDB.set(KEY + 'chestVisibilityVersion', VERSION);
            // Refresh the overlay cache as well if a stale chest registry index had to be replaced.
            WorldDB.set(KEY + 'version', Math.max(VERSION, I(WorldDB.get(KEY + 'version'), 0)));
            try { WorldDB.Instance.Save(); } catch (e) { }
            this.Done = true;
        } else if (this.Attempts >= 6) {
            Log('repair stopped after bounded retries.');
            this.Done = true;
        } else this.Delay = 300;
    }
}
