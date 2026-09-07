import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';

function SafeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export const VernalSoilAnchorTile = SafeNumber(Terraria.ID.TileID.TeamBlockGreen, 428);
const PREFIX = 'calamity:vernalsoil:';
const STRUCTURE_PREFIX = 'calamity:structure:vernalPass:';
const PENDING_LIFETIME = 45;

function Tick() {
    try { return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0); } catch (e) { return 0; }
}
function Key(x, y) { return `${Math.floor(Number(x) || 0)},${Math.floor(Number(y) || 0)}`; }
function ParseSet(raw) {
    const set = new Set();
    for (const part of String(raw || '').split(';')) if (/^-?\d+,-?\d+$/.test(part)) set.add(part);
    return set;
}
function PlayerIndex(player) {
    try { return Math.max(0, Math.min(254, Math.floor(Number(Terraria.PlayerIndex(player)) || 0))); } catch (e) { return 0; }
}

export const VernalSoilRuntime = {
    Pending: new Array(255),
    Placed: new Set(),
    Dirty: false,
    Bounds: null,

    Load() {
        this.Pending = new Array(255);
        this.Placed = ParseSet(WorldDB.get(PREFIX + 'placed'));
        this.Dirty = false;
        this.ReloadBounds();
    },
    ReloadBounds() {
        if (WorldDB.get(STRUCTURE_PREFIX + 'generated') !== true) {
            this.Bounds = null;
            return null;
        }
        const left = Math.floor(SafeNumber(WorldDB.get(STRUCTURE_PREFIX + 'left'), 0));
        const top = Math.floor(SafeNumber(WorldDB.get(STRUCTURE_PREFIX + 'top'), 0));
        const width = Math.max(1, Math.floor(SafeNumber(WorldDB.get(STRUCTURE_PREFIX + 'width'), 276)));
        const height = Math.max(1, Math.floor(SafeNumber(WorldDB.get(STRUCTURE_PREFIX + 'height'), 208)));
        this.Bounds = { left, top, right: left + width, bottom: top + height, width, height };
        return this.Bounds;
    },
    Save() {
        if (!WorldDB.Instance) return;
        WorldDB.set(PREFIX + 'placed', Array.from(this.Placed).join(';'));
        WorldDB.set(PREFIX + 'schemaVersion', 1);
        this.Dirty = false;
    },
    MarkPending(player) {
        if (!player) return;
        this.Pending[PlayerIndex(player)] = { tick: Tick() };
    },
    ConsumePending(player) {
        if (!player) return false;
        const index = PlayerIndex(player);
        const pending = this.Pending[index];
        this.Pending[index] = null;
        return !!pending && Tick() - Number(pending.tick || 0) <= PENDING_LIFETIME;
    },
    Track(x, y) {
        const before = this.Placed.size;
        this.Placed.add(Key(x, y));
        if (this.Placed.size !== before) this.Dirty = true;
    },
    Remove(x, y) {
        if (this.Placed.delete(Key(x, y))) this.Dirty = true;
    },
    IsInsideStructure(x, y, padding = 0) {
        const b = this.Bounds || this.ReloadBounds();
        if (!b) return false;
        const p = Math.max(0, Math.floor(Number(padding) || 0));
        x = Math.floor(Number(x) || 0); y = Math.floor(Number(y) || 0);
        return x >= b.left - p && x < b.right + p && y >= b.top - p && y < b.bottom + p;
    },
    IsNearTracked(x, y, padding = 48) {
        if (!this.Placed || this.Placed.size === 0) return false;
        x = Math.floor(Number(x) || 0); y = Math.floor(Number(y) || 0);
        const p = Math.max(0, Math.floor(Number(padding) || 0));
        for (const key of this.Placed) {
            const comma = key.indexOf(',');
            if (comma <= 0) continue;
            const px = Number(key.slice(0, comma)), py = Number(key.slice(comma + 1));
            if (Number.isFinite(px) && Number.isFinite(py) && Math.abs(px - x) <= p && Math.abs(py - y) <= p)
                return true;
        }
        return false;
    },
    IsVernalSoilAt(x, y, tileType) {
        if (Number(tileType) !== VernalSoilAnchorTile) return false;
        return this.Placed.has(Key(x, y)) || this.IsInsideStructure(x, y, 0);
    }
};
