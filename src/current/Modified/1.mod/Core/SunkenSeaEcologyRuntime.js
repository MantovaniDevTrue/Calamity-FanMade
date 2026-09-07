import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { TileData } from './../TL/Modules/TileData.js';
import { SunkenSeaPreviewRuntime } from './SunkenSeaPreviewRuntime.js';
import { SunkenSeaTerrainRuntime } from './SunkenSeaTerrainRuntime.js';

const KEY = 'calamity:sunkensea:ecology:markers';
const SCHEMA_KEY = 'calamity:sunkensea:ecology:version';
const CHUNK_COUNT_KEY = 'calamity:sunkensea:ecology:chunkCount';
const CHUNK_PREFIX = 'calamity:sunkensea:ecology:chunk:';
const CHUNK_SIZE = 220;
const VERSION = 3;
const MAX_DECOR = 96;
const MAX_PRISM = 24;
function Hash(x, y, salt = 0) {
    let n = (Math.imul(Math.floor(x), 374761393) ^ Math.imul(Math.floor(y), 668265263) ^ Math.imul(salt + 1, 2246822519)) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return (n ^ (n >>> 16)) >>> 0;
}

function HasTile(data) {
    try {
        return !!(data && data.tile && Terraria.TileHasTile(data.tile));
    } catch (e) {
        return false;
    }
}

function IsSolid(data) {
    try {
        return HasTile(data) && data.isSolidOrSloped;
    } catch (e) {
        return false;
    }
}

function IsWater(data) {
    try {
        return Number(data.liquid) >= 128;
    } catch (e) {
        return false;
    }
}

function InBounds(x, y) {
    return x > SunkenSeaPreviewRuntime.BoundsLeft + 3
        && x < SunkenSeaPreviewRuntime.BoundsRight - 3
        && y > SunkenSeaPreviewRuntime.BoundsTop + 3
        && y < SunkenSeaPreviewRuntime.BoundsBottom - 3;
}

export const SunkenSeaEcologyRuntime = {
    Markers: [],
    Queue: [],
    Populating: false,
    Dirty: false,
    Processed: 0,
    Reset() {
        this.Markers = [];
        this.Queue = [];
        this.Populating = false;
        this.Dirty = false;
        this.Processed = 0;
    },
    Load() {
        this.Reset();
        let raw = null;
        const chunkCount = Math.max(0, Math.floor(Number(WorldDB.get(CHUNK_COUNT_KEY)) || 0));
        if (chunkCount > 0) {
            const parts = [];
            let complete = true;
            for (let i = 0; i < chunkCount; i++) {
                const part = WorldDB.get(`${CHUNK_PREFIX}${i}`);
                if (typeof part !== 'string') {
                    complete = false;
                    break;
                }
                parts.push(part);
            }
            if (complete)
                raw = parts.join('');
        } else {
            raw = WorldDB.get(KEY);
        }
        if (typeof raw === 'string' && raw.length > 0) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    this.Markers = parsed.filter(m => m && InBounds(Number(m.x), Number(m.y)) && ['kelp', 'brain', 'coral', 'tube', 'prism'].includes(String(m.kind))).map(m => ({
                        x: Math.floor(Number(m.x)), y: Math.floor(Number(m.y)), kind: String(m.kind), frame: Math.max(0, Math.floor(Number(m.frame) || 0)), flip: m.flip === true
                    }));
                }
            } catch (e) {
                tl.log(`[CalamityPort] Sunken Sea ecology legacy save ignored: ${e}`);
            }
        }
        const savedVersion = Math.max(0, Math.floor(Number(WorldDB.get(SCHEMA_KEY)) || 0));
        if (SunkenSeaTerrainRuntime.Generated && (this.Markers.length === 0 || savedVersion < VERSION))
            this.BeginPopulate(savedVersion < VERSION);
    },
    Save() {
        if (!WorldDB.Instance)
            return;
        try {
            const serialized = JSON.stringify(this.Markers);
            const oldCount = Math.max(0, Math.floor(Number(WorldDB.get(CHUNK_COUNT_KEY)) || 0));
            const chunks = [];
            for (let i = 0; i < serialized.length; i += CHUNK_SIZE)
                chunks.push(serialized.slice(i, i + CHUNK_SIZE));
            WorldDB.set(CHUNK_COUNT_KEY, chunks.length);
            for (let i = 0; i < chunks.length; i++)
                WorldDB.set(`${CHUNK_PREFIX}${i}`, chunks[i]);
            for (let i = chunks.length; i < oldCount; i++)
                WorldDB.delete(`${CHUNK_PREFIX}${i}`);
            WorldDB.delete(KEY);
            WorldDB.set(SCHEMA_KEY, VERSION);
            this.Dirty = false;
        } catch (e) {
            tl.log(`[CalamityPort] Sunken Sea ecology save failed: ${e}`);
        }
    },
    BeginPopulate(clear = true) {
        if (!SunkenSeaTerrainRuntime.Generated)
            return false;
        if (clear)
            this.Markers = [];
        this.Queue = [];
        this.Processed = 0;
        const left = SunkenSeaPreviewRuntime.BoundsLeft + 8;
        const right = SunkenSeaPreviewRuntime.BoundsRight - 8;
        const top = SunkenSeaPreviewRuntime.BoundsTop + 8;
        const bottom = SunkenSeaPreviewRuntime.BoundsBottom - 8;
        for (let x = left; x <= right; x += 4) {
            const h = Hash(x, SunkenSeaPreviewRuntime.CenterY, 11);
            const startY = top + (h % Math.max(1, bottom - top - 10));
            this.Queue.push({ mode: 'floor', x, startY, salt: h });
        }
        // Do not guess where randomized geodes landed. Scan real world columns for
        // Sea Prism support and attach crystal overlays only to actual prism tiles.
        for (let x = left + 2; x <= right - 2; x += 7) {
            const h = Hash(x, SunkenSeaPreviewRuntime.CenterY, 29);
            const startY = top + (h % Math.max(1, bottom - top));
            this.Queue.push({ mode: 'prism', x, startY, salt: h });
        }
        this.Populating = this.Queue.length > 0;
        return this.Populating;
    },
    MarkerAt(x, y) {
        x = Math.floor(Number(x));
        y = Math.floor(Number(y));
        return this.Markers.find(m => m.x === x && m.y === y) || null;
    },
    RemoveAt(x, y, prismOnly = false) {
        x = Math.floor(Number(x));
        y = Math.floor(Number(y));
        const old = this.Markers.length;
        this.Markers = this.Markers.filter(m => !(m.x === x && m.y === y && (!prismOnly || m.kind === 'prism')));
        if (old !== this.Markers.length) {
            this.Dirty = true;
            return true;
        }
        return false;
    },
    Add(marker, limit) {
        if (!marker || this.MarkerAt(marker.x, marker.y))
            return false;
        const count = this.Markers.filter(m => m.kind === marker.kind).length;
        if (count >= limit)
            return false;
        this.Markers.push(marker);
        this.Dirty = true;
        return true;
    },
    ProcessFloor(candidate) {
        if (this.Markers.filter(m => m.kind !== 'prism').length >= MAX_DECOR)
            return;
        const top = SunkenSeaPreviewRuntime.BoundsTop + 4;
        const bottom = SunkenSeaPreviewRuntime.BoundsBottom - 4;
        const span = Math.max(1, bottom - top);
        for (let offset = 0; offset < span; offset++) {
            const y = top + ((candidate.startY - top + offset) % span);
            try {
                const water = new TileData(candidate.x, y);
                const support = new TileData(candidate.x, y + 1);
                if (!IsWater(water) || !IsSolid(support))
                    continue;
                const choice = Number(candidate.salt) % 4;
                const kind = choice === 0 ? 'kelp' : choice === 1 ? 'brain' : choice === 2 ? 'coral' : 'tube';
                this.Add({
                    x: candidate.x, y: y + 1, kind, frame: Math.floor(Number(candidate.salt) / 7) % 8, flip: (Number(candidate.salt) & 1) === 1
                }, MAX_DECOR);
                return;
            } catch (e) {
                return;
            }
        }
    },
    ProcessPrism(candidate) {
        if (this.Markers.filter(m => m.kind === 'prism').length >= MAX_PRISM)
            return;
        const top = SunkenSeaPreviewRuntime.BoundsTop + 4;
        const bottom = SunkenSeaPreviewRuntime.BoundsBottom - 4;
        const span = Math.max(1, bottom - top);
        for (let offset = 0; offset < span; offset++) {
            const y = top + ((candidate.startY - top + offset) % span);
            if (!InBounds(candidate.x, y))
                continue;
            try {
                const support = new TileData(candidate.x, y);
                const above = new TileData(candidate.x, y - 1);
                if (Number(support.type) !== 385 || !HasTile(support) || !IsWater(above))
                    continue;
                this.Add({
                    x: candidate.x, y, kind: 'prism', frame: Number(candidate.salt) % 8, flip: false
                }, MAX_PRISM);
                return;
            } catch (e) {
                return;
            }
        }
    },
    Cleanup() {
        const valid = [];
        let changed = false;
        for (const marker of this.Markers) {
            try {
                const support = new TileData(marker.x, marker.y);
                const ok = IsSolid(support) && (marker.kind !== 'prism' || Number(support.type) === 385);
                if (ok)
                    valid.push(marker);
                else
                    changed = true;
            } catch (e) {
                changed = true;
            }
        }
        if (changed) {
            this.Markers = valid;
            this.Dirty = true;
        }
        return changed;
    },
    Update() {
        if (!this.Populating)
            return;
        const candidate = this.Queue.shift();
        if (!candidate) {
            this.Populating = false;
            this.Save();
            return;
        }
        if (candidate.mode === 'prism')
            this.ProcessPrism(candidate);
        else
            this.ProcessFloor(candidate);
        this.Processed++;
        if (this.Queue.length === 0) {
            this.Populating = false;
            this.Save();
        }
    },
    GetStatus() {
        const counts = {
            kelp: 0, brain: 0, coral: 0, tube: 0, prism: 0
        };
        for (const m of this.Markers)
            if (counts[m.kind] != null)
                counts[m.kind]++;
        return `markers=${this.Markers.length} kelp=${counts.kelp} brain=${counts.brain} coral=${counts.coral} tube=${counts.tube} prism=${counts.prism} populating=${this.Populating} queue=${this.Queue.length} dirty=${this.Dirty}`;
    }
};
