import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';

const KEY = 'calamity:abyss:ambience:';
export const ABYSS_ECHO_LEGACY = 541;
export const ABYSS_SOLID_PROXY = 38; // hidden Gray Brick only for solid Abyss coral cells

function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function CellKey(x, y) { return `${I(x)},${I(y)}`; }
function InWorld(x, y, margin = 1) {
    return x >= margin && y >= margin && x < I(Terraria.Main.maxTilesX) - margin && y < I(Terraria.Main.maxTilesY) - margin;
}
function TileAt(x, y) { try { return InWorld(x, y) ? Terraria.Main.tile.get_Item(I(x), I(y)) : null; } catch (_) { return null; } }
function Active(t) { try { return !!t && t['bool active()']() === true; } catch (_) { return false; } }
function SetActive(t, value) { try { t['void active(bool active)'](value === true); } catch (_) { } }
function TryCall(t, sig, value) { try { if (t && typeof t[sig] === 'function') { t[sig](value); return true; } } catch (_) { } return false; }
function ReadRaw() {
    let raw = '[]';
    try {
        const chunks = Math.max(0, I(WorldDB.get(KEY + 'chunkCount'), 0));
        if (chunks > 0) {
            const parts = [];
            for (let i = 0; i < chunks; i++) {
                const p = WorldDB.get(KEY + `chunk:${i}`);
                if (typeof p !== 'string') return '[]';
                parts.push(p);
            }
            return parts.join('');
        }
        raw = String(WorldDB.get(KEY + 'data') || '[]');
    } catch (_) { }
    return raw;
}
function ClearVisual(t) {
    if (!t) return false;
    const liquid = I(t.liquid, 0); let liquidType = 0;
    try { liquidType = I(t['byte liquidType()'](), 0); } catch (_) { }
    SetActive(t, false); t.type = 0; t.frameX = 0; t.frameY = 0; t.liquid = liquid;
    TryCall(t, 'void liquidType(int liquidType)', liquidType);
    TryCall(t, 'void invisibleBlock(bool invisibleBlock)', false);
    TryCall(t, 'void actuator(bool actuator)', false); TryCall(t, 'void inActive(bool inActive)', false);
    TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    return true;
}
function SetSolid(t) {
    if (!t) return false;
    SetActive(t, true); t.type = ABYSS_SOLID_PROXY; t.frameX = 0; t.frameY = 0; t.liquid = 0;
    TryCall(t, 'void invisibleBlock(bool invisibleBlock)', true);
    TryCall(t, 'void actuator(bool actuator)', false); TryCall(t, 'void inActive(bool inActive)', false);
    TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    return true;
}

export const AbyssAmbientProxyRuntime = {
    Version: -1,
    Count: -1,
    ChunkCount: -1,
    Cells: new Map(),
    CellList: [],

    Reset() { this.Version = -1; this.Count = -1; this.ChunkCount = -1; this.Cells = new Map(); this.CellList = []; },
    Refresh(force = false) {
        if (!WorldDB.Instance) { this.Reset(); return; }
        const version = I(WorldDB.get(KEY + 'version'), 0), count = Math.max(0, I(WorldDB.get(KEY + 'count'), 0));
        const chunkCount = Math.max(0, I(WorldDB.get(KEY + 'chunkCount'), 0));
        if (!force && version === this.Version && count === this.Count && chunkCount === this.ChunkCount) return;
        const map = new Map(), list = [];
        try {
            const rows = JSON.parse(ReadRaw());
            if (Array.isArray(rows)) for (let index = 0; index < rows.length; index++) {
                const r = rows[index]; if (!Array.isArray(r) || r.length < 7) continue;
                const kind = String(r[0] || ''), variant = Math.max(1, I(r[1], 1));
                const left = I(r[2], -1), top = I(r[3], -1), width = I(r[4]), height = I(r[5]);
                if (left < 0 || top < 0 || width <= 0 || height <= 0) continue;
                // Pots deliberately retain the vanilla Pot host because it provides the desired
                // breakable, non-solid behavior. Every other visual object is metadata-only;
                // coral alone retains real solid volume beneath its overlay.
                if (kind === 'abyssPot' || kind === 'sulphPot') continue;
                const proxyKind = kind === 'coral' ? 'solid' : 'visual';
                const meta = { source: 'abyssAmbience', kind: proxyKind, objectKind: kind, index, variant, left, top, width, height };
                for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
                    const cx = left + x, cy = top + y, key = CellKey(cx, cy);
                    if (!map.has(key)) list.push([cx, cy]);
                    map.set(key, meta);
                }
            }
        } catch (e) {
            try { tl.log(`[CalamityPort ProxySafety] Abyss ambience metadata parse failed safely: ${e}`); } catch (_) { }
        }
        this.Cells = map; this.CellList = list; this.Version = version; this.Count = count; this.ChunkCount = chunkCount;
    },
    MetaAt(x, y) { this.Refresh(); return this.Cells.get(CellKey(x, y)) || null; },
    GetCells() { this.Refresh(); return this.CellList.slice(); },
    ProxyAt(x, y, type) {
        const meta = this.MetaAt(x, y); if (!meta) return null;
        const t = I(type, -1);
        if (meta.kind === 'visual') return t === ABYSS_ECHO_LEGACY ? meta : null;
        if (meta.kind === 'solid') return (t === ABYSS_ECHO_LEGACY || t === ABYSS_SOLID_PROXY) ? meta : null;
        return null;
    },
    RepairAt(x, y) {
        const meta = this.MetaAt(x, y); if (!meta) return { changed: false, kind: '' };
        const t = TileAt(x, y); if (!t) return { changed: false, kind: meta.kind };
        const type = I(t.type, -1), active = Active(t);
        if (meta.kind === 'visual') {
            if (active && type === ABYSS_ECHO_LEGACY) { ClearVisual(t); return { changed: true, kind: 'visual' }; }
            return { changed: false, kind: 'visual' };
        }
        if (meta.kind === 'solid') {
            if (active && type === ABYSS_ECHO_LEGACY) { SetSolid(t); return { changed: true, kind: 'solid' }; }
            return { changed: false, kind: 'solid' };
        }
        return { changed: false, kind: meta.kind };
    }
};
