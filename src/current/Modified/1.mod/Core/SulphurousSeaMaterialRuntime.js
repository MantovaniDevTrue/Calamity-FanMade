import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime, SulphurousSeaAnchorTiles } from './SulphurousSeaTerrainRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { AbyssTerrainRuntime, AbyssTerrainProxyTiles } from './AbyssTerrainRuntime.js';

const PREFIX = 'calamity:sulphursea:materials:';
const PENDING_LIFETIME = 45;
export const SulphurousSeaMaterialKinds = Object.freeze({
    Sand: 'sand',
    Sandstone: 'sandstone',
    Hardened: 'hardened',
    Shale: 'shale'
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
    for (const part of text.split(';'))
        if (/^-?\d+,-?\d+$/.test(part))
            result.add(part);
    return result;
}

function SerializeSet(set) {
    return Array.from(set || []).join(';');
}

function KindForTile(type) {
    const t = Number(type) || 0;
    if (t === SulphurousSeaAnchorTiles.sand || t === BiomeAnchorTiles.LegacySulphurousSand)
        return SulphurousSeaMaterialKinds.Sand;
    if (t === SulphurousSeaAnchorTiles.sandstone)
        return SulphurousSeaMaterialKinds.Sandstone;
    if (t === SulphurousSeaAnchorTiles.hardened)
        return SulphurousSeaMaterialKinds.Hardened;
    if (t === SulphurousSeaAnchorTiles.shale || t === AbyssTerrainProxyTiles.Shale)
        return SulphurousSeaMaterialKinds.Shale;
    return '';
}

export const SulphurousSeaMaterialRuntime = {
    Pending: new Array(255),
    Placed: { sand: new Set(), sandstone: new Set(), hardened: new Set(), shale: new Set() },
    Dirty: false,
    Key(name) {
        return PREFIX + String(name);
    },
    Reset() {
        this.Pending = new Array(255);
        this.Placed = { sand: new Set(), sandstone: new Set(), hardened: new Set(), shale: new Set() };
        this.Dirty = false;
    },
    Load() {
        this.Reset();
        for (const kind of Object.keys(this.Placed))
            this.Placed[kind] = ParseSet(WorldDB.get(this.Key(`placed:${kind}`)));
    },
    Save() {
        if (!WorldDB.Instance)
            return;
        for (const kind of Object.keys(this.Placed))
            WorldDB.set(this.Key(`placed:${kind}`), SerializeSet(this.Placed[kind]));
        WorldDB.set(this.Key('schemaVersion'), 2);
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
        this.Pending[this.PlayerIndex(player)] = { kind: String(kind || ''), tick: Tick() };
    },
    ConsumePending(player, kind) {
        if (!player)
            return false;
        const index = this.PlayerIndex(player);
        const pending = this.Pending[index];
        this.Pending[index] = null;
        return !!pending && pending.kind === String(kind || '') && Tick() - Number(pending.tick || 0) <= PENDING_LIFETIME;
    },
    Track(x, y, kind) {
        const set = this.Placed[String(kind || '')];
        if (!set)
            return false;
        const before = set.size;
        set.add(Key(x, y));
        if (set.size !== before)
            this.Dirty = true;
        return true;
    },
    RemoveTracked(x, y) {
        const key = Key(x, y);
        let removed = false;
        for (const set of Object.values(this.Placed))
            if (set.delete(key))
                removed = true;
        if (removed)
            this.Dirty = true;
        return removed;
    },
    IsTracked(x, y, kind) {
        const set = this.Placed[String(kind || '')];
        return !!set && set.has(Key(x, y));
    },
    IsGeneratedKindAt(x, y, kind) {
        if (String(kind || '') === SulphurousSeaMaterialKinds.Shale) {
            try { if (AbyssTerrainRuntime.IsGeneratedShaleCell(x, y)) return true; } catch (e) { }
        }
        if (SulphurousSeaTerrainRuntime.Generated !== true || !SulphurousSeaPreviewRuntime.ContainsTile(x, y, 0))
            return false;
        const localX = Math.floor(Number(x) || 0) - Math.floor(SulphurousSeaPreviewRuntime.BoundsLeft);
        const localY = Math.floor(Number(y) || 0) - Math.floor(SulphurousSeaPreviewRuntime.BoundsTop);
        const width = Math.floor(SulphurousSeaPreviewRuntime.Width);
        const height = Math.floor(SulphurousSeaPreviewRuntime.Height);
        if (localX < 0 || localY < 0 || localX >= width || localY >= height)
            return false;
        const plan = SulphurousSeaTerrainRuntime.PlanCell(localX, localY, width, height);
        return !!plan && plan.mode === 'solid' && KindForTile(plan.tile) === String(kind || '');
    },
    GetKindAt(x, y, tileType) {
        const kind = KindForTile(tileType);
        if (!kind)
            return '';
        if (this.IsTracked(x, y, kind) || this.IsGeneratedKindAt(x, y, kind))
            return kind;
        return '';
    },
    KindForTile(type) {
        return KindForTile(type);
    },
    GetStatus() {
        return `tracked=s${this.Placed.sand.size}/ss${this.Placed.sandstone.size}/h${this.Placed.hardened.size}/sh${this.Placed.shale.size} dirty=${this.Dirty}`;
    }
};
