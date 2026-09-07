import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { MarbleShrineRuntime } from './../../Core/MarbleShrineRuntime.js';
import { OfficialStructureMap } from './../../Core/OfficialStructureMap.js';

const KEY = 'calamity:structure:marbleShrine:';
function N(value, fallback) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function Log(message) { try { tl.log(`[CalamityPort MarbleShrineDeferred] ${message}`); } catch (e) { } }
function Reserve(prefix, fallbackWidth, fallbackHeight) {
    if (WorldDB.get(prefix + 'generated') !== true)
        return;
    const left = N(WorldDB.get(prefix + 'left'), -1), top = N(WorldDB.get(prefix + 'top'), -1);
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
    WorldDB.set(KEY + 'left', N(result.left, N(result.anchorX, 0)));
    WorldDB.set(KEY + 'top', N(result.top, N(result.anchorY, 0)));
    WorldDB.set(KEY + 'width', N(result.width, 23));
    WorldDB.set(KEY + 'height', N(result.height, 44));
    WorldDB.set(KEY + 'anchorX', N(result.anchorX, 0));
    WorldDB.set(KEY + 'anchorY', N(result.anchorY, 0));
    WorldDB.set(KEY + 'chestX', N(result.chestX, -1));
    WorldDB.set(KEY + 'chestY', N(result.chestY, -1));
    WorldDB.set(KEY + 'drunkVariant', result.drunkVariant === true);
    WorldDB.set(KEY + 'source', String(result.source || 'official-csch-delayed'));
    try { WorldDB.Instance.Save(); } catch (e) { Log(`metadata save deferred: ${e}`); }
}
function IsPortGeneratedWorld() {
    const prefixes = [
        'calamity:structure:mechanicShed:',
        'calamity:structure:desertShrine:',
        'calamity:structure:graniteShrine:',
        'calamity:structure:surfaceShrine:',
        'calamity:structure:iceShrine:'
    ];
    for (const prefix of prefixes) {
        if (WorldDB.get(prefix + 'generated') === true)
            return true;
    }
    return WorldDB.get('calamity:sunkensea:terrain:generated') === true;
}

export class MarbleShrineGenerationSystem extends ModSystem {
    constructor() {
        super();
        this.Delay = 9600;
        this.SurfaceWaits = 0;
        this.IceWaits = 0;
        this.MushroomWaits = 0;
        this.Done = false;
        this.RecoveryChecked = false;
        this.Search = null;
        this.SearchRounds = 0;
        this.LastProgress = -1;
    }

    ResetRuntime() {
        this.Delay = 9600;
        this.SurfaceWaits = 0;
        this.IceWaits = 0;
        this.MushroomWaits = 0;
        this.Done = false;
        this.RecoveryChecked = false;
        this.Search = null;
        this.SearchRounds = 0;
        this.LastProgress = -1;
    }

    OnWorldLoad() { this.ResetRuntime(); }
    OnWorldUnload() { this.ResetRuntime(); }

    RecoverPendingMarker() {
        if (this.RecoveryChecked)
            return;
        this.RecoveryChecked = true;
        // Phase 12.73.3 performance policy:
        // Never invent a background migration request merely because this is an
        // older Calamity-generated world. Current worldgen explicitly writes the
        // pending marker when a deferred placement is actually required.
        if (WorldDB.get(KEY + 'generated') === true || WorldDB.get(KEY + 'searchStopped') === true)
            return;
        if (WorldDB.get(KEY + 'pending') === true) {
            if (N(WorldDB.get(KEY + 'deferredVersion'), 0) !== 2) {
                WorldDB.set(KEY + 'pending', false);
                WorldDB.set(KEY + 'stalePendingSuppressed', true);
                try { WorldDB.Instance.Save(); } catch (e) { }
                Log('suppressed stale legacy pending marker; no background recovery scan started.');
            }
            return;
        }
    }

    PrepareStructureMap() {
        OfficialStructureMap.Reset();
        Reserve('calamity:structure:mechanicShed:', 30, 21);
        Reserve('calamity:structure:desertShrine:', 30, 27);
        Reserve('calamity:structure:graniteShrine:', 17, 18);
        Reserve('calamity:structure:surfaceShrine:', 56, 36);
        Reserve('calamity:structure:iceShrine:', 46, 32);
        Reserve('calamity:structure:mushroomShrine:', 35, 42);
        Reserve('calamity:structure:corruptionShrine:', 26, 11);
        Reserve('calamity:structure:crimsonShrine:', 54, 19);
    }

    BeginSearch() {
        this.PrepareStructureMap();
        const context = {
            maxX: N(Terraria.Main.maxTilesX, 4200),
            maxY: N(Terraria.Main.maxTilesY, 1200)
        };
        this.SearchRounds++;
        this.Search = MarbleShrineRuntime.BeginSearch(context, SunkenPlacement());
        this.LastProgress = -1;
        Log(`incremental search started; round=${this.SearchRounds}, budget=8 reads/update.`);
    }

    FailRound(step) {
        const count = Array.isArray(step?.candidates) ? step.candidates.length : N(step?.candidates, 0);
        Log(`incremental search round ${this.SearchRounds} failed; reason=${step?.reason || 'unknown'}, inspected=${step?.inspectedCandidates || 0}, candidates=${count}, coarseReads=${step?.coarseReads || 0}, exactReads=${step?.exactReads || 0}.`);
        this.Search = null;
        this.LastProgress = -1;
        if (this.SearchRounds >= 4) {
            this.Done = true;
            WorldDB.set(KEY + 'searchStopped', true);
            try { WorldDB.Instance.Save(); } catch (e) { }
            Log('delayed placement stopped after four incremental search rounds; pending marker preserved and searchStopped persisted.');
        } else {
            this.Delay = 600;
        }
    }

    Update() {
        if (this.Done || !WorldDB.Instance)
            return;

        this.RecoverPendingMarker();

        if (WorldDB.get(KEY + 'generated') === true) {
            this.Done = true;
            return;
        }
        if (WorldDB.get(KEY + 'searchStopped') === true) {
            this.Done = true;
            return;
        }
        if (WorldDB.get(KEY + 'pending') !== true) {
            this.Done = true;
            return;
        }

        if (this.Delay-- > 0)
            return;

        if (!this.Search) {

            // Never run multiple delayed structure searches in the same period.
            if (WorldDB.get('calamity:structure:surfaceShrine:pending') === true &&
                WorldDB.get('calamity:structure:surfaceShrine:generated') !== true &&
                this.SurfaceWaits < 8) {
                this.SurfaceWaits++;
                this.Delay = 300;
                return;
            }
            if (WorldDB.get('calamity:structure:iceShrine:generated') !== true &&
                WorldDB.get('calamity:structure:iceShrine:searchStopped') !== true) {
                this.IceWaits++;
                this.Delay = 300;
                return;
            }
            if (WorldDB.get('calamity:structure:mushroomShrine:generated') !== true &&
                WorldDB.get('calamity:structure:mushroomShrine:searchStopped') !== true) {
                this.MushroomWaits++;
                this.Delay = 300;
                return;
            }
            if (WorldDB.get('calamity:structure:evilShrines:complete') !== true) {
                this.Delay = 300;
                return;
            }

            try {
                this.BeginSearch();
            } catch (e) {
                Log(`incremental search start threw: ${e}`);
                this.FailRound({ reason: String(e), candidates: [] });
                return;
            }
        }

        try {
            const step = MarbleShrineRuntime.StepSearch(this.Search, 8);
            if (step && step.done === true) {
                if (step.generated === true && step.result) {
                    SaveResult(step.result);
                    WorldDB.set(KEY + 'searchStopped', false);
                    this.Search = null;
                    this.Done = true;
                    Log(`delayed placement complete; topLeft=${step.result.anchorX},${step.result.anchorY}, chest=${step.result.chestX},${step.result.chestY}, attempts=${step.result.attempts}, drunkVariant=${step.result.drunkVariant === true}.`);
                    return;
                }
                this.FailRound(step);
                return;
            }

            const progress = this.Search.phase === 'discover'
                ? Math.floor((Number(this.Search.coarseReads) || 0) / 12288)
                : 1000 + Math.floor((Number(this.Search.inspectedCandidates) || 0) / 192);
            if (progress !== this.LastProgress) {
                this.LastProgress = progress;
                Log(`incremental search progress; phase=${this.Search.phase}, candidates=${this.Search.candidates.length}, inspected=${this.Search.inspectedCandidates || 0}, coarseReads=${this.Search.coarseReads || 0}, exactReads=${this.Search.exactReads || 0}.`);
            }
            this.Delay = 8;
        } catch (e) {
            Log(`incremental search threw: ${e}`);
            this.FailRound({
                reason: String(e),
                candidates: this.Search?.candidates || [],
                inspectedCandidates: this.Search?.inspectedCandidates || 0,
                coarseReads: this.Search?.coarseReads || 0,
                exactReads: this.Search?.exactReads || 0
            });
        }
    }
}
