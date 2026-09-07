import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { AerialiteAnchorTiles } from './AerialiteAnchorIDs.js';

const PREFIX = 'calamity:aerialite:material:';
const GENERATED_KEY = 'calamity:aerialite:coords';
const PENDING_LIFETIME = 45;

function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Tick() { try { return I(Terraria.Main.GameUpdateCount); } catch (_) { return 0; } }
function Key(x, y) { return `${I(x)},${I(y)}`; }
function ParseSet(raw) {
    const set = new Set();
    for (const part of String(raw || '').split(';')) if (/^-?\d+,-?\d+$/.test(part)) set.add(part);
    return set;
}
function PlayerIndex(player) {
    try { return Math.max(0, Math.min(254, I(Terraria.PlayerIndex(player)))); } catch (_) { return 0; }
}
function IsAnchor(type) {
    const t = I(type, -1);
    return t === I(AerialiteAnchorTiles.Dormant, -2) || t === I(AerialiteAnchorTiles.Enchanted, -3);
}

export const AerialiteMaterialRuntime = {
    Generated: new Set(),
    Placed: new Set(),
    Removed: new Set(),
    Pending: new Array(255),
    Dirty: false,
    PointsDirty: true,
    Points: [],

    Load() {
        this.Generated = ParseSet(WorldDB.get(GENERATED_KEY));
        this.Placed = ParseSet(WorldDB.get(PREFIX + 'placed'));
        this.Removed = ParseSet(WorldDB.get(PREFIX + 'removed'));
        this.Pending = new Array(255);
        this.Dirty = false;
        this.PointsDirty = true; this.Points = [];
    },
    Save() {
        if (!WorldDB.Instance) return;
        WorldDB.set(PREFIX + 'placed', Array.from(this.Placed).join(';'));
        WorldDB.set(PREFIX + 'removed', Array.from(this.Removed).join(';'));
        WorldDB.set(PREFIX + 'schemaVersion', 1);
        this.Dirty = false;
    },
    ReloadGenerated() {
        this.Generated = ParseSet(WorldDB.get(GENERATED_KEY));
        this.PointsDirty = true;
    },
    AddGenerated(x, y) {
        const k = Key(x, y);
        this.Generated.add(k);
        this.Removed.delete(k);
        this.PointsDirty = true;
    },
    MarkPending(player, kind) {
        if (!player) return;
        this.Pending[PlayerIndex(player)] = { kind: String(kind || ''), tick: Tick() };
    },
    ConsumePending(player, kind) {
        if (!player) return false;
        const index = PlayerIndex(player), pending = this.Pending[index];
        this.Pending[index] = null;
        return !!pending && pending.kind === String(kind || '') && Tick() - I(pending.tick) <= PENDING_LIFETIME;
    },
    TrackPlaced(x, y) {
        const k = Key(x, y), before = this.Placed.size;
        this.Placed.add(k); this.Removed.delete(k);
        if (this.Placed.size !== before) { this.Dirty = true; this.PointsDirty = true; }
    },
    Retire(x, y) {
        const k = Key(x, y);
        let changed = this.Placed.delete(k);
        if (this.Generated.has(k) && !this.Removed.has(k)) { this.Removed.add(k); changed = true; }
        if (changed) { this.Dirty = true; this.PointsDirty = true; }
    },
    IsRetired(x, y) { return this.Removed.has(Key(x, y)); },
    EnsurePoints() {
        if (!this.PointsDirty) return;
        const out = [], seen = new Set();
        const add = (k) => {
            if (seen.has(k) || this.Removed.has(k)) return;
            const q = String(k).split(','); if (q.length !== 2) return;
            const x = I(q[0], NaN), y = I(q[1], NaN); if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            seen.add(k); out.push([x, y]);
        };
        for (const k of this.Generated) add(k);
        for (const k of this.Placed) add(k);
        this.Points = out; this.PointsDirty = false;
    },
    IsNearTracked(x, y, radius = 128) {
        this.EnsurePoints(); x = I(x); y = I(y); const r = Math.max(1, I(radius, 128)), r2 = r * r;
        for (const p of this.Points) { const dx = p[0] - x, dy = p[1] - y; if (dx * dx + dy * dy <= r2) return true; }
        return false;
    },
    IsAerialiteAt(x, y, type) {
        if (!IsAnchor(type)) return false;
        const k = Key(x, y);
        if (this.Placed.has(k)) return true;
        return this.Generated.has(k) && !this.Removed.has(k);
    },
    KindForType(type) {
        const t = I(type, -1);
        if (t === I(AerialiteAnchorTiles.Dormant, -2)) return 'dormant';
        if (t === I(AerialiteAnchorTiles.Enchanted, -3)) return 'enchanted';
        return '';
    }
};
