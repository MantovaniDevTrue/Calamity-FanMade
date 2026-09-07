import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';

const KEY = 'calamity:world:ironBall:';
const VERSION = 1;
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }

// Phase 13.04.8: Iron Ball is confirmed working. This system is intentionally passive in gameplay.
// Fresh worlds generate the balls in WorldgenBiomeRuntime while the world is being created.
// No existing-world recovery, coordinate chat, periodic tile validation or gameplay lighting remains.
export class IronBallWorldgenSystem extends ModSystem {
    constructor() { super(); this.Positions = []; }

    OnWorldLoad() { this.LoadPositions(); }
    OnWorldUnload() { this.Positions = []; }

    LoadPositions() {
        this.Positions = [];
        if (!WorldDB.Instance || WorldDB.get(KEY + 'generated') !== true || I(WorldDB.get(KEY + 'version'), 0) < VERSION) return;
        const count = Math.max(0, I(WorldDB.get(KEY + 'count'), 0));
        for (let i = 0; i < count; i++) {
            const x = I(WorldDB.get(KEY + `pos:${i}:x`), -1);
            const y = I(WorldDB.get(KEY + `pos:${i}:y`), -1);
            if (x >= 0 && y >= 0) this.Positions.push({ x, y });
        }
    }

    PersistPositions(save = true) {
        if (!WorldDB.Instance) return;
        WorldDB.set(KEY + 'generated', true);
        WorldDB.set(KEY + 'version', VERSION);
        WorldDB.set(KEY + 'count', this.Positions.length);
        for (let i = 0; i < this.Positions.length; i++) {
            WorldDB.set(KEY + `pos:${i}:x`, I(this.Positions[i].x));
            WorldDB.set(KEY + `pos:${i}:y`, I(this.Positions[i].y));
        }
        if (save) try { WorldDB.Instance.Save(); } catch (_) { }
    }

    FindAt(x, y) {
        x = I(x); y = I(y);
        for (const p of this.Positions) if (p.x === x && p.y === y) return p;
        return null;
    }

    RemoveAt(x, y, save = true) {
        x = I(x); y = I(y);
        const before = this.Positions.length;
        this.Positions = this.Positions.filter(p => p.x !== x || p.y !== y);
        if (this.Positions.length === before) return false;
        if (save) this.PersistPositions(true);
        return true;
    }
}
