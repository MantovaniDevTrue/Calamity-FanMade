import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { SulphurousScrapSchematics } from './../Data/OfficialSchematics/SulphurousScrapSchematics.js';

const DETAIL = 'calamity:sulphursea:details:';
const AMBIENCE = 'calamity:sulphursea:ambience:';
export const SULPH_ECHO_LEGACY = 541;
export const SULPH_SOLID_PROXY = 38; // Gray Brick, hidden under the exact Calamity overlay.
export const SULPH_PLATFORM_PROXY = 19;

function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Bit(v, i) { return ((Number(v) >>> i) & 1) !== 0; }
function Active(t) { try { return !!t && t['bool active()']() === true; } catch (_) { return false; } }
function SetActive(t, v) { try { t['void active(bool active)'](v === true); } catch (_) { } }
function TryCall(t, sig, v) { try { if (t && typeof t[sig] === 'function') { t[sig](v); return true; } } catch (_) { } return false; }
function TileAt(x, y) { try { return Terraria.Main.tile.get_Item(I(x), I(y)); } catch (_) { return null; } }
function IsTerrainKey(k) { return k === 'SulphurousSandNoWater' || k === 'SulphurousSand' || k === 'SulphurousSandstone' || k === 'HardenedSulphurousSandstone'; }
function CellKind(tileKey, packed) {
    if (!Bit(packed, 0)) return '';
    if (tileKey === 'RustedShelf') return 'platform';
    if (tileKey === 'RustedPipes' || tileKey === 'RustedPlating') return 'solid';
    if (typeof tileKey === 'string' && tileKey !== '_' && !IsTerrainKey(tileKey)) return 'visual';
    return '';
}
function ScrapMetaAt(x, y) {
    const count = Math.max(0, I(WorldDB.get(DETAIL + 'scrapCount')));
    for (let n = 0; n < count; n++) {
        const k = DETAIL + `scrap:${n}:`, left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1);
        const width = I(WorldDB.get(k + 'width')), height = I(WorldDB.get(k + 'height')), variant = Math.max(1, Math.min(7, I(WorldDB.get(k + 'variant'), 1)));
        if (left < 0 || top < 0 || x < left || y < top || x >= left + width || y >= top + height) continue;
        const s = SulphurousScrapSchematics[variant - 1];
        if (!s) continue;
        const lx = x - left, ly = y - top;
        if (lx < 0 || ly < 0 || ly >= s.rows.length || lx >= s.rows[ly].length) continue;
        const e = s.palette[s.rows[ly][lx]];
        if (!e) continue;
        const kind = CellKind(e[0], e[6]);
        if (kind) return { source: 'scrap', kind, index: n, variant, left, top, localX: lx, localY: ly };
    }
    return null;
}
function ColumnMetaAt(x, y) {
    const count = Math.max(0, I(WorldDB.get(DETAIL + 'columnCount')));
    for (let n = 0; n < count; n++) {
        const k = DETAIL + `column:${n}:`, left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1), bottom = I(WorldDB.get(k + 'bottom'), -1);
        if (left < 0 || top < 0 || bottom < top) continue;
        if ((x === left || x === left + 1) && y >= top && y <= bottom)
            return { source: 'column', kind: 'platform', index: n, left, top, bottom };
    }
    return null;
}
function AmbienceMetaAt(x, y) {
    const count = Math.max(0, I(WorldDB.get(AMBIENCE + 'count')));
    for (let n = 0; n < count; n++) {
        const k = AMBIENCE + `obj:${n}:`, left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1);
        const width = I(WorldDB.get(k + 'width')), height = I(WorldDB.get(k + 'height'));
        if (left < 0 || top < 0 || width <= 0 || height <= 0) continue;
        if (x >= left && y >= top && x < left + width && y < top + height)
            return { source: 'ambience', kind: 'visual', index: n, left, top, width, height };
    }
    return null;
}
function ClearVisual(t) {
    if (!t) return false;
    SetActive(t, false); t.type = 0; t.frameX = 0; t.frameY = 0;
    TryCall(t, 'void invisibleBlock(bool invisibleBlock)', false);
    TryCall(t, 'void actuator(bool actuator)', false); TryCall(t, 'void inActive(bool inActive)', false);
    TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    return true;
}
function SetSolid(t) {
    if (!t) return false;
    SetActive(t, true); t.type = SULPH_SOLID_PROXY; t.frameX = 0; t.frameY = 0;
    TryCall(t, 'void invisibleBlock(bool invisibleBlock)', true);
    TryCall(t, 'void actuator(bool actuator)', false); TryCall(t, 'void inActive(bool inActive)', false);
    TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    return true;
}
function SetPlatform(t) {
    if (!t) return false;
    SetActive(t, true); t.type = SULPH_PLATFORM_PROXY; t.frameX = 0; t.frameY = 0;
    TryCall(t, 'void invisibleBlock(bool invisibleBlock)', true);
    TryCall(t, 'void actuator(bool actuator)', false); TryCall(t, 'void inActive(bool inActive)', false);
    TryCall(t, 'void halfBrick(bool halfBrick)', false); TryCall(t, 'void slope(byte slope)', 0);
    return true;
}

export const SulphurousSeaProxyRuntime = {
    CellKind,
    IsTerrainKey,
    MetaAt(x, y) {
        x = I(x); y = I(y);
        return ScrapMetaAt(x, y) || ColumnMetaAt(x, y) || AmbienceMetaAt(x, y);
    },
    ProxyAt(x, y, type) {
        const meta = this.MetaAt(x, y); if (!meta) return null;
        const t = I(type, -1);
        if (meta.kind === 'visual') return t === SULPH_ECHO_LEGACY ? meta : null;
        if (meta.kind === 'solid') return (t === SULPH_ECHO_LEGACY || t === SULPH_SOLID_PROXY) ? meta : null;
        if (meta.kind === 'platform') return t === SULPH_PLATFORM_PROXY ? meta : null;
        return null;
    },
    RepairAt(x, y) {
        const meta = this.MetaAt(x, y); if (!meta) return { changed: false, kind: '' };
        const t = TileAt(x, y); if (!t) return { changed: false, kind: meta.kind };
        const cur = I(t.type, -1), active = Active(t);
        if (meta.kind === 'visual') {
            if (active && cur === SULPH_ECHO_LEGACY) { ClearVisual(t); return { changed: true, kind: meta.kind }; }
            return { changed: false, kind: meta.kind };
        }
        if (meta.kind === 'solid') {
            if (active && cur === SULPH_ECHO_LEGACY) { SetSolid(t); return { changed: true, kind: meta.kind }; }
            return { changed: false, kind: meta.kind };
        }
        if (meta.kind === 'platform') {
            if (active && cur === SULPH_PLATFORM_PROXY) {
                // Remove any stale Echo/invisibility-actuation state while preserving the platform host.
                SetPlatform(t); return { changed: true, kind: meta.kind };
            }
        }
        return { changed: false, kind: meta.kind };
    }
};
