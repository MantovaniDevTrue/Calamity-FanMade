import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { SulphurousSeaAmbienceRuntime } from './../../Core/SulphurousSeaAmbienceRuntime.js';

const KEY = 'calamity:sulphursea:ambience:';
const DETAIL = 'calamity:sulphursea:details:';
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function B(v) { if (v === true) return true; if (v === false || v == null) return false; try { return Number(v) !== 0; } catch (e) { return false; } }
function Log(s) { try { tl.log(`[CalamityPort SulphAmbienceRepair] ${s}`); } catch (e) { } }
function Width(maxX) { if (maxX === 4200) return 370; if (maxX === 6400) return 445; return Math.floor(maxX / 16.8); }
function Depth(maxX, yStart) { const factor = maxX === 4200 ? .8 : (maxX === 6400 ? .85 : .925); const rock = Number(Terraria.Main.rockLayer || 0); return Math.max(1, Math.floor((rock + 112 - yStart) * factor)); }

function ReadScraps() {
    const n = Math.max(0, I(WorldDB.get(DETAIL + 'scrapCount'))), out = [];
    for (let i = 0; i < n; i++) {
        const k = DETAIL + `scrap:${i}:`;
        const left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1);
        const width = I(WorldDB.get(k + 'width')), height = I(WorldDB.get(k + 'height'));
        if (left < 0 || top < 0 || width <= 0 || height <= 0) continue;
        out.push({ left, top, width, height, variant: I(WorldDB.get(k + 'variant'), 1), x: left + Math.floor(width / 2), y: top + height });
    }
    return out;
}

function ReadExistingChests() {
    const count = Math.max(0, I(WorldDB.get(KEY + 'chestCount'))), out = [];
    for (let i = 0; i < count; i++) {
        const k = KEY + `chest:${i}:`;
        const left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1);
        if (left < 0 || top < 0) continue;
        out.push({
            kind: String(WorldDB.get(k + 'kind') || ''),
            left, top,
            index: I(WorldDB.get(k + 'index'), -1),
            specialName: String(WorldDB.get(k + 'special') || ''),
            filled: 0
        });
    }
    return out;
}

function PersistChestCompletion(chests, source = 'completion') {
    chests = Array.isArray(chests) ? chests : [];
    WorldDB.set(KEY + 'generated', true);
    WorldDB.set(KEY + 'version', Math.max(4, I(WorldDB.get(KEY + 'version'), 0)));
    WorldDB.set(KEY + 'chestCount', chests.length);
    for (let i = 0; i < chests.length; i++) {
        const c = chests[i], k = KEY + `chest:${i}:`;
        WorldDB.set(k + 'kind', String(c.kind || ''));
        WorldDB.set(k + 'left', I(c.left));
        WorldDB.set(k + 'top', I(c.top));
        WorldDB.set(k + 'index', I(c.index, -1));
        WorldDB.set(k + 'special', String(c.specialName || ''));
    }
    WorldDB.set(KEY + 'chestsRequested', 4);
    WorldDB.set(KEY + 'chestsGenerated', chests.length);
    WorldDB.set(KEY + 'source', String(source || 'completion'));
    // Force the native visibility audit to re-run after missing chest kinds are restored.
    WorldDB.set(KEY + 'chestVisibilityVersion', 0);
    try { WorldDB.Instance.Save(); } catch (e) { }
}

function Persist(r) {
    const objs = Array.isArray(r?.ambience) ? r.ambience : [], chests = Array.isArray(r?.chests) ? r.chests : [];
    WorldDB.set(KEY + 'generated', true); WorldDB.set(KEY + 'version', 4); WorldDB.set(KEY + 'count', objs.length);
    for (let i = 0; i < objs.length; i++) {
        const o = objs[i], k = KEY + `obj:${i}:`;
        WorldDB.set(k + 'kind', String(o.kind || '')); WorldDB.set(k + 'variant', I(o.variant, 1));
        WorldDB.set(k + 'left', I(o.left)); WorldDB.set(k + 'top', I(o.top)); WorldDB.set(k + 'width', I(o.width)); WorldDB.set(k + 'height', I(o.height));
        WorldDB.set(k + 'drawYOffset', I(o.drawYOffset));
    }
    WorldDB.set(KEY + 'chestCount', chests.length);
    for (let i = 0; i < chests.length; i++) {
        const c = chests[i], k = KEY + `chest:${i}:`;
        WorldDB.set(k + 'kind', String(c.kind || '')); WorldDB.set(k + 'left', I(c.left)); WorldDB.set(k + 'top', I(c.top));
        WorldDB.set(k + 'index', I(c.index, -1)); WorldDB.set(k + 'special', String(c.specialName || ''));
    }
    WorldDB.set(KEY + 'hostCells', I(r?.ambienceHostCells)); WorldDB.set(KEY + 'chestsRequested', I(r?.chestsRequested, 4));
    WorldDB.set(KEY + 'chestsGenerated', chests.length); WorldDB.set(KEY + 'chestVisibilityVersion', 0); WorldDB.set(KEY + 'source', String(r?.source || 'recovery'));
    try { WorldDB.Instance.Save(); } catch (e) { }
}

export class SulphurousSeaAmbienceRecoverySystem extends ModSystem {
    constructor() { super(); this.Reset(); }
    Reset() { this.Delay = 180; this.Done = false; this.Attempts = 0; }
    OnWorldLoad() { this.Reset(); }
    OnWorldUnload() { this.Reset(); }
    Update() {
        if (this.Done || Terraria.Main.gameMenu === true || !WorldDB.Instance) return;
        if (this.Delay-- > 0) return;
        this.Done = true;
        try {
            if (WorldDB.get('calamity:sulphursea:terrain:generated') !== true) return;

            const maxX = I(Terraria.Main.maxTilesX), maxY = I(Terraria.Main.maxTilesY);
            const h = I(WorldDB.get('calamity:sulphursea:preview:height')), cy = I(WorldDB.get('calamity:sulphursea:preview:centerY'));
            if (maxX < 1000 || maxY < 500 || h <= 0 || cy <= 0) return;
            const top = Math.floor(cy - h * .5), yStart = Math.max(20, top + 55), width = Width(maxX), blockDepth = Depth(maxX, yStart);
            const atLeft = B(WorldDB.get('calamity:sulphursea:preview:atLeft')), scraps = ReadScraps();
            const context = { maxX, maxY }, placement = { width, yStart, blockDepth, atLeft };

            const version = I(WorldDB.get(KEY + 'version')), count = I(WorldDB.get(KEY + 'count'));
            const existingChests = ReadExistingChests();

            // Old worlds (or an interrupted first generation) still need the ambience pass.
            if (version < 1 && count <= 0 && WorldDB.get(KEY + 'generated') !== true) {
                const r = SulphurousSeaAmbienceRuntime.Generate(context, placement, scraps);
                Persist(r);
                Log(`one-time official ambience recovery complete; objects=${r.ambience?.length || 0}, rustyChests=${r.chests?.length || 0}/4, scrapsUsed=${scraps.length}.`);
                return;
            }

            // Do not run the old deep-water completion search during gameplay. On Android that
            // search caused six large world scans across ~37 seconds whenever an old world had
            // only 1-3 Rusty Chests. Fresh worldgen remains responsible for chest placement.
            if (existingChests.length < 4) {
                WorldDB.set(KEY + 'completionSuppressed', true);
                WorldDB.set(KEY + 'completionSuppressedVersion', 1);
                WorldDB.set(KEY + 'chestsGenerated', existingChests.length);
                try { WorldDB.Instance.Save(); } catch (e) { }
                Log(`missing rusty chest background completion suppressed; saved=${existingChests.length}/4, no gameplay scan.`);
                return;
            }
        } catch (e) { Log(`recovery failed safely: ${e}`); }
    }
}
