import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { SunkenSeaPreviewRuntime } from './SunkenSeaPreviewRuntime.js';
import { SunkenSeaTerrainRuntime } from './SunkenSeaTerrainRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';

const PREFIX = 'calamity:sunkensea:materials:';
const PENDING_LIFETIME = 45;
export const SunkenSeaMaterialKinds = Object.freeze({
    Eutrophic: 'eutrophic',
    Navystone: 'navystone',
    SeaPrism: 'seaprism'
});
export const SunkenSeaAnchorTiles = Object.freeze({
    eutrophic: BiomeAnchorTiles.SunkenEutrophic, // Blue Team Block
    navystone: 396, // Sandstone
    seaprism: 385 // Crystal Block
});
function Tick() {
    try {
        return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
    } catch (e) {
        return 0;
    }
}

function Key(x, y) {
    return `${Math.floor(Number(x) || 0)},${Math.floor(Number(y) || 0)}`;
}

function ParseSet(raw) {
    const result = new Set();
    const text = String(raw || '');
    if (!text)
        return result;
    for (const part of text.split(';')) {
        if (/^-?\d+,-?\d+$/.test(part))
            result.add(part);
    }
    return result;
}

function SerializeSet(set) {
    return Array.from(set || []).join(';');
}

function KindForTile(type) {
    const t = Number(type) || 0;
    if (t === SunkenSeaAnchorTiles.eutrophic || t === BiomeAnchorTiles.LegacySunkenEutrophic)
        return SunkenSeaMaterialKinds.Eutrophic;
    if (t === SunkenSeaAnchorTiles.navystone)
        return SunkenSeaMaterialKinds.Navystone;
    if (t === SunkenSeaAnchorTiles.seaprism)
        return SunkenSeaMaterialKinds.SeaPrism;
    return '';
}

export const SunkenSeaMaterialRuntime = {
    Pending: new Array(255),
    Placed: {
        eutrophic: new Set(),
        navystone: new Set(),
        seaprism: new Set()
    },
    Dirty: false,
    Key(name) {
        return PREFIX + String(name);
    },
    Reset() {
        this.Pending = new Array(255);
        this.Placed = {
            eutrophic: new Set(),
            navystone: new Set(),
            seaprism: new Set()
        };
        this.Dirty = false;
    },
    Load() {
        this.Reset();
        this.Placed.eutrophic = ParseSet(WorldDB.get(this.Key('placed:eutrophic')));
        this.Placed.navystone = ParseSet(WorldDB.get(this.Key('placed:navystone')));
        this.Placed.seaprism = ParseSet(WorldDB.get(this.Key('placed:seaprism')));
    },
    Save() {
        if (!WorldDB.Instance)
            return;
        WorldDB.set(this.Key('placed:eutrophic'), SerializeSet(this.Placed.eutrophic));
        WorldDB.set(this.Key('placed:navystone'), SerializeSet(this.Placed.navystone));
        WorldDB.set(this.Key('placed:seaprism'), SerializeSet(this.Placed.seaprism));
        WorldDB.set(this.Key('schemaVersion'), 1);
        this.Dirty = false;
    },
    PlayerIndex(player) {
        try {
            return Math.max(0, Math.min(254, Math.floor(Number(Terraria.PlayerIndex(player)) || 0)));
        } catch (e) {
            return 0;
        }
    },
    MarkPending(player, kind) {
        if (!player)
            return;
        const index = this.PlayerIndex(player);
        this.Pending[index] = { kind: String(kind || ''), tick: Tick() };
    },
    ConsumePending(player, kind) {
        if (!player)
            return false;
        const index = this.PlayerIndex(player);
        const pending = this.Pending[index];
        this.Pending[index] = null;
        if (!pending || pending.kind !== String(kind || ''))
            return false;
        return Tick() - Number(pending.tick || 0) <= PENDING_LIFETIME;
    },
    Track(x, y, kind) {
        const set = this.Placed[String(kind || '')];
        if (!set)
            return false;
        const key = Key(x, y);
        const before = set.size;
        set.add(key);
        if (set.size !== before)
            this.Dirty = true;
        return true;
    },
    RemoveTracked(x, y) {
        const key = Key(x, y);
        let removed = false;
        for (const set of Object.values(this.Placed)) {
            if (set.delete(key))
                removed = true;
        }
        if (removed)
            this.Dirty = true;
        return removed;
    },
    IsTracked(x, y, kind) {
        const set = this.Placed[String(kind || '')];
        return !!set && set.has(Key(x, y));
    },
    IsInsideGeneratedArea(x, y) {
        if (SunkenSeaTerrainRuntime.Generated !== true)
            return false;
        const px = Math.floor(Number(x) || 0);
        const py = Math.floor(Number(y) || 0);
        return px >= SunkenSeaPreviewRuntime.BoundsLeft
            && px <= SunkenSeaPreviewRuntime.BoundsRight
            && py >= SunkenSeaPreviewRuntime.BoundsTop
            && py <= SunkenSeaPreviewRuntime.BoundsBottom;
    },
    GetKindAt(x, y, tileType) {
        const kind = KindForTile(tileType);
        if (!kind)
            return '';
        if (this.IsTracked(x, y, kind))
            return kind;
        if (this.IsInsideGeneratedArea(x, y))
            return kind;
        return '';
    },
    KindForTile(type) {
        return KindForTile(type);
    },
    GetStatus() {
        return `tracked=e${this.Placed.eutrophic.size}/n${this.Placed.navystone.size}/s${this.Placed.seaprism.size} dirty=${this.Dirty}`;
    }
};
