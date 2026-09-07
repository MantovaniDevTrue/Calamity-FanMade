import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { IceShrineRuntime } from './../../Core/IceShrineRuntime.js';
import { OfficialStructureMap } from './../../Core/OfficialStructureMap.js';

const KEY = 'calamity:structure:iceShrine:';
function N(value, fallback) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) ? number : fallback;
}
function Log(message) {
    try { tl.log(`[CalamityPort IceShrineDeferred] ${message}`); } catch (e) { }
}
function Reserve(prefix, fallbackWidth, fallbackHeight) {
    if (WorldDB.get(prefix + 'generated') !== true)
        return;
    const left = N(WorldDB.get(prefix + 'left'), -1);
    const top = N(WorldDB.get(prefix + 'top'), -1);
    const width = Math.max(1, N(WorldDB.get(prefix + 'width'), fallbackWidth));
    const height = Math.max(1, N(WorldDB.get(prefix + 'height'), fallbackHeight));
    if (left >= 0 && top >= 0)
        OfficialStructureMap.Reserve(prefix, { left, top, right: left + width, bottom: top + height }, 4);
}
function SunkenPlacement() {
    if (WorldDB.get('calamity:sunkensea:terrain:generated') !== true)
        return null;
    const centerX = N(WorldDB.get('calamity:sunkensea:preview:centerX'), -1);
    const centerY = N(WorldDB.get('calamity:sunkensea:preview:centerY'), -1);
    const width = Math.max(1, N(WorldDB.get('calamity:sunkensea:preview:width'), 520));
    const height = Math.max(1, N(WorldDB.get('calamity:sunkensea:preview:height'), 310));
    if (centerX < 0 || centerY < 0)
        return null;
    return { left: centerX - Math.floor(width * 0.5), top: centerY - Math.floor(height * 0.5), width, height };
}
function SaveResult(result) {
    WorldDB.set(KEY + 'generated', true);
    WorldDB.set(KEY + 'pending', false);
    WorldDB.set(KEY + 'searchStopped', false);
    WorldDB.set(KEY + 'left', N(result.left, N(result.anchorX, 0)));
    WorldDB.set(KEY + 'top', N(result.top, N(result.anchorY, 0)));
    WorldDB.set(KEY + 'width', N(result.width, 46));
    WorldDB.set(KEY + 'height', N(result.height, 32));
    WorldDB.set(KEY + 'anchorX', N(result.anchorX, 0));
    WorldDB.set(KEY + 'anchorY', N(result.anchorY, 0));
    WorldDB.set(KEY + 'chestX', N(result.chestX, -1));
    WorldDB.set(KEY + 'chestY', N(result.chestY, -1));
    WorldDB.set(KEY + 'source', String(result.source || 'official-csch-delayed'));
    try { WorldDB.Instance.Save(); } catch (e) { Log(`metadata save deferred: ${e}`); }
}
function IsPortGeneratedWorld() {
    const prefixes = [
        'calamity:structure:mechanicShed:',
        'calamity:structure:desertShrine:',
        'calamity:structure:graniteShrine:',
        'calamity:structure:surfaceShrine:',
        'calamity:structure:marbleShrine:'
    ];
    for (const prefix of prefixes) {
        if (WorldDB.get(prefix + 'generated') === true)
            return true;
    }
    return WorldDB.get('calamity:sunkensea:terrain:generated') === true;
}

export class IceShrineGenerationSystem extends ModSystem {
    constructor() {
        super();
        this.Delay = 7800;
        this.SearchRounds = 0;
        this.SurfaceWaits = 0;
        this.Search = null;
        this.Done = false;
        this.RecoveryChecked = false;
        this.LastProgressBucket = -1;
    }
    ResetState() {
        this.Delay = 7800;
        this.SearchRounds = 0;
        this.SurfaceWaits = 0;
        this.Search = null;
        this.Done = false;
        this.RecoveryChecked = false;
        this.LastProgressBucket = -1;
    }
    OnWorldLoad() {
        this.ResetState();
        if (WorldDB.Instance) {
            WorldDB.set(KEY + 'searchStopped', false);
            WorldDB.set(KEY + 'scanning', false);
        }
    }
    OnWorldUnload() {
        this.ResetState();
    }
    RecoverPendingMarker() {
        if (this.RecoveryChecked)
            return;
        this.RecoveryChecked = true;

        // Phase 12.73.4: never invent deferred work in an already-running world.
        // Current worldgen writes deferredVersion=2 together with pending=true.
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
        Reserve('calamity:structure:marbleShrine:', 23, 44);
        const context = {
            maxX: N(Terraria.Main.maxTilesX, 4200),
            maxY: N(Terraria.Main.maxTilesY, 1200)
        };
        this.Search = IceShrineRuntime.BeginSearch(context, SunkenPlacement());
        WorldDB.set(KEY + 'scanning', this.Search && this.Search.done !== true);
        if (this.Search && this.Search.done !== true) {
            Log(`incremental search started; candidates=${this.Search.candidates.length}, coarseReads=${this.Search.coarseReads || 0}, quickReads=${this.Search.quickReads || 0}, readBudget=12.`);
        }
    }
    FinishFailedRound(result) {
        this.SearchRounds++;
        WorldDB.set(KEY + 'scanning', false);
        const candidateCount = Array.isArray(result?.candidates) ? result.candidates.length : Number(result?.candidates) || 0;
        Log(`incremental search round ${this.SearchRounds} failed; reason=${result?.reason || 'unknown'}, inspected=${result?.inspectedCandidates || 0}, candidates=${candidateCount}, exactReads=${result?.exactReads || 0}.`);
        this.Search = null;
        this.LastProgressBucket = -1;
        if (this.SearchRounds >= 4) {
            this.Done = true;
            WorldDB.set(KEY + 'searchStopped', true);
            Log('delayed placement stopped after four bounded search rounds; pending marker preserved for the next world load.');
        } else {
            this.Delay = 300;
        }
    }
    Update() {
        if (this.Done || !WorldDB.Instance)
            return;

        this.RecoverPendingMarker();

        if (this.Delay-- > 0)
            return;
        if (WorldDB.get(KEY + 'generated') === true) {
            this.Done = true;
            WorldDB.set(KEY + 'scanning', false);
            return;
        }
        if (WorldDB.get(KEY + 'pending') !== true) {
            this.Done = true;
            WorldDB.set(KEY + 'scanning', false);
            return;
        }

        if (WorldDB.get('calamity:structure:surfaceShrine:pending') === true &&
            WorldDB.get('calamity:structure:surfaceShrine:generated') !== true &&
            this.SurfaceWaits < 8) {
            this.SurfaceWaits++;
            this.Delay = 300;
            return;
        }

        try {
            if (!this.Search)
                this.BeginSearch();

            if (!this.Search) {
                this.FinishFailedRound({ reason: 'search-state-not-created' });
                return;
            }
            if (this.Search.done === true) {
                this.FinishFailedRound(this.Search);
                return;
            }

            const step = IceShrineRuntime.StepSearch(this.Search, 12);
            if (step && step.generated === true && step.result) {
                SaveResult(step.result);
                this.Done = true;
                this.Search = null;
                WorldDB.set(KEY + 'scanning', false);
                Log(`delayed placement complete; topLeft=${step.result.anchorX},${step.result.anchorY}, chest=${step.result.chestX},${step.result.chestY}, attempts=${step.result.attempts}, iceRatio=${step.result.iceRatio}.`);
                return;
            }
            if (step && step.done === true) {
                this.FinishFailedRound(step.search || this.Search);
                return;
            }

            const inspected = N(this.Search.inspectedCandidates, 0);
            const progressBucket = Math.floor(inspected / 8);
            if (progressBucket > this.LastProgressBucket) {
                this.LastProgressBucket = progressBucket;
                Log(`incremental search progress; inspected=${inspected}/${this.Search.candidates.length}, exactReads=${this.Search.exactReads || 0}.`);
            }
            this.Delay = 8;
        } catch (e) {
            WorldDB.set(KEY + 'scanning', false);
            Log(`incremental search threw: ${e}`);
            this.FinishFailedRound({
                reason: String(e),
                inspectedCandidates: this.Search?.inspectedCandidates || 0,
                exactReads: this.Search?.exactReads || 0,
                candidates: this.Search?.candidates || []
            });
        }
    }
}
