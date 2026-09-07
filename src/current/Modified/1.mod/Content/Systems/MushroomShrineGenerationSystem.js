import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { MushroomShrineRuntime } from './../../Core/MushroomShrineRuntime.js';
import { OfficialStructureMap } from './../../Core/OfficialStructureMap.js';

const KEY = 'calamity:structure:mushroomShrine:';
function N(value, fallback) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function Log(message) { try { tl.log(`[CalamityPort MushroomShrineDeferred] ${message}`); } catch (e) { } }
function Reserve(prefix, fallbackWidth, fallbackHeight) {
    if (WorldDB.get(prefix + 'generated') !== true) return;
    const left = N(WorldDB.get(prefix + 'left'), -1), top = N(WorldDB.get(prefix + 'top'), -1);
    const width = Math.max(1, N(WorldDB.get(prefix + 'width'), fallbackWidth));
    const height = Math.max(1, N(WorldDB.get(prefix + 'height'), fallbackHeight));
    if (left >= 0 && top >= 0) OfficialStructureMap.Reserve(prefix, { left, top, right: left + width, bottom: top + height }, 4);
}
function SunkenPlacement() {
    if (WorldDB.get('calamity:sunkensea:terrain:generated') !== true) return null;
    const centerX = N(WorldDB.get('calamity:sunkensea:preview:centerX'), -1);
    const centerY = N(WorldDB.get('calamity:sunkensea:preview:centerY'), -1);
    const width = Math.max(1, N(WorldDB.get('calamity:sunkensea:preview:width'), 520));
    const height = Math.max(1, N(WorldDB.get('calamity:sunkensea:preview:height'), 310));
    if (centerX < 0 || centerY < 0) return null;
    return { left: centerX - Math.floor(width * 0.5), top: centerY - Math.floor(height * 0.5), width, height };
}
function SaveResult(result) {
    WorldDB.set(KEY + 'generated', true);
    WorldDB.set(KEY + 'pending', false);
    WorldDB.set(KEY + 'scanning', false);
    WorldDB.set(KEY + 'left', N(result.left, N(result.anchorX, 0)));
    WorldDB.set(KEY + 'top', N(result.top, N(result.anchorY, 0)));
    WorldDB.set(KEY + 'width', N(result.width, 35));
    WorldDB.set(KEY + 'height', N(result.height, 42));
    WorldDB.set(KEY + 'anchorX', N(result.anchorX, 0));
    WorldDB.set(KEY + 'anchorY', N(result.anchorY, 0));
    WorldDB.set(KEY + 'chestX', N(result.chestX, -1));
    WorldDB.set(KEY + 'chestY', N(result.chestY, -1));
    WorldDB.set(KEY + 'remixVariant', result.remixVariant === true);
    WorldDB.set(KEY + 'source', String(result.source || 'official-csch-delayed'));
    try { WorldDB.Instance.Save(); } catch (e) { Log(`metadata save deferred: ${e}`); }
}
function IsPortGeneratedWorld() {
    const prefixes = [
        'calamity:structure:mechanicShed:', 'calamity:structure:desertShrine:',
        'calamity:structure:graniteShrine:', 'calamity:structure:surfaceShrine:',
        'calamity:structure:iceShrine:', 'calamity:structure:marbleShrine:'
    ];
    for (const prefix of prefixes) if (WorldDB.get(prefix + 'generated') === true) return true;
    return WorldDB.get('calamity:sunkensea:terrain:generated') === true;
}

export class MushroomShrineGenerationSystem extends ModSystem {
    constructor() { super(); this.Delay = 8400; this.Done = false; this.RecoveryChecked = false; this.Search = null; this.SearchRounds = 0; this.LastProgress = -1; }
    OnWorldLoad() { this.Delay = 8400; this.Done = false; this.RecoveryChecked = false; this.Search = null; this.SearchRounds = 0; this.LastProgress = -1; }
    OnWorldUnload() { this.Delay = 8400; this.Done = false; this.RecoveryChecked = false; this.Search = null; this.SearchRounds = 0; this.LastProgress = -1; }
    RecoverPendingMarker() {
        if (this.RecoveryChecked) return;
        this.RecoveryChecked = true;

        // Only a marker written by current worldgen is allowed to start work.
        if (WorldDB.get(KEY + 'pending') === true && N(WorldDB.get(KEY + 'deferredVersion'), 0) !== 2) {
            WorldDB.set(KEY + 'pending', false);
            WorldDB.set(KEY + 'scanning', false);
            WorldDB.set(KEY + 'stalePendingSuppressed', true);
            try { WorldDB.Instance.Save(); } catch (e) { }
            Log('suppressed stale legacy pending marker; no background recovery scan started.');
        }
    }
    BeginSearch() {
        OfficialStructureMap.Reset();
        Reserve('calamity:structure:mechanicShed:', 30, 21);
        Reserve('calamity:structure:desertShrine:', 30, 27);
        Reserve('calamity:structure:graniteShrine:', 17, 18);
        Reserve('calamity:structure:surfaceShrine:', 56, 36);
        Reserve('calamity:structure:iceShrine:', 46, 32);
        Reserve('calamity:structure:marbleShrine:', 23, 44);
        this.SearchRounds++;
        this.Search = MushroomShrineRuntime.BeginSearch({ maxX: N(Terraria.Main.maxTilesX, 4200), maxY: N(Terraria.Main.maxTilesY, 1200) }, SunkenPlacement());
        WorldDB.set(KEY + 'scanning', true);
        Log(`incremental search started; round=${this.SearchRounds}, budget=12 reads/update.`);
    }
    FailRound(result) {
        WorldDB.set(KEY + 'scanning', false);
        const count = Array.isArray(result?.candidates) ? result.candidates.length : N(result?.candidates, 0);
        Log(`incremental search round ${this.SearchRounds} failed; reason=${result?.reason || 'unknown'}, inspected=${result?.inspectedCandidates || 0}, candidates=${count}, discoveryReads=${result?.discoveryReads || 0}, exactReads=${result?.exactReads || 0}.`);
        this.Search = null;
        this.LastProgress = -1;
        if (this.SearchRounds >= 4) {
            this.Done = true;
            WorldDB.set(KEY + 'searchStopped', true);
            Log('delayed placement stopped after four bounded search rounds; pending marker preserved for the next world load.');
        } else this.Delay = 300;
    }
    Update() {
        if (this.Done || !WorldDB.Instance) return;
        this.RecoverPendingMarker();
        if (this.Delay-- > 0) return;
        if (WorldDB.get(KEY + 'generated') === true) { this.Done = true; WorldDB.set(KEY + 'scanning', false); return; }
        if (WorldDB.get(KEY + 'pending') !== true) { this.Done = true; WorldDB.set(KEY + 'scanning', false); return; }
        if (WorldDB.get('calamity:structure:iceShrine:generated') !== true && WorldDB.get('calamity:structure:iceShrine:searchStopped') !== true) { this.Delay = 300; return; }
        try {
            if (!this.Search) this.BeginSearch();
            if (!this.Search) { this.FailRound({ reason: 'search-state-not-created' }); return; }
            const step = MushroomShrineRuntime.StepSearch(this.Search, 12);
            if (step && step.generated === true && step.result) {
                SaveResult(step.result);
                this.Done = true;
                this.Search = null;
                Log(`delayed placement complete; topLeft=${step.result.anchorX},${step.result.anchorY}, chest=${step.result.chestX},${step.result.chestY}, attempts=${step.result.attempts}, mushroomTiles=${step.result.mushroomTileCount}.`);
                return;
            }
            if (step && step.done === true) { this.FailRound(step); return; }
            const progress = this.Search.phase === 'discover'
                ? Math.floor((Number(this.Search.discoveryReads) || 0) / 1024)
                : 1000 + Math.floor((Number(this.Search.inspectedCandidates) || 0) / 8);
            if (progress > this.LastProgress) {
                this.LastProgress = progress;
                Log(`incremental search progress; phase=${this.Search.phase}, candidates=${this.Search.candidates.length}, inspected=${this.Search.inspectedCandidates || 0}, discoveryReads=${this.Search.discoveryReads || 0}, exactReads=${this.Search.exactReads || 0}.`);
            }
            this.Delay = 8;
        } catch (e) {
            WorldDB.set(KEY + 'scanning', false);
            Log(`incremental search threw: ${e}`);
            this.FailRound({ reason: String(e), candidates: this.Search?.candidates || [], inspectedCandidates: this.Search?.inspectedCandidates || 0, discoveryReads: this.Search?.discoveryReads || 0, exactReads: this.Search?.exactReads || 0 });
        }
    }
}
