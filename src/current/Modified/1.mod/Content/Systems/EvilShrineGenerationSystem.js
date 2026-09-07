import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { EvilShrineRuntime } from './../../Core/EvilShrineRuntime.js';
import { OfficialStructureMap } from './../../Core/OfficialStructureMap.js';

const ROOT = 'calamity:structure:evilShrines:';
const RECOVERY_KEY = ROOT + 'distributedSearchRecoveryV1';
function N(v, fallback) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : fallback;
}
function Key(kind) {
    return `calamity:structure:${kind}Shrine:`;
}
function Log(message) {
    try { tl.log(`[CalamityPort EvilShrinesDeferred] ${message}`); } catch (e) { }
}
function Reserve(prefix, width, height) {
    if (WorldDB.get(prefix + 'generated') !== true)
        return;
    const left = N(WorldDB.get(prefix + 'left'), -1);
    const top = N(WorldDB.get(prefix + 'top'), -1);
    width = Math.max(1, N(WorldDB.get(prefix + 'width'), width));
    height = Math.max(1, N(WorldDB.get(prefix + 'height'), height));
    if (left >= 0 && top >= 0)
        OfficialStructureMap.Reserve(prefix, { left, top, right: left + width, bottom: top + height }, 4);
}
function Sunken() {
    if (WorldDB.get('calamity:sunkensea:terrain:generated') !== true)
        return null;
    const centerX = N(WorldDB.get('calamity:sunkensea:preview:centerX'), -1);
    const centerY = N(WorldDB.get('calamity:sunkensea:preview:centerY'), -1);
    const width = Math.max(1, N(WorldDB.get('calamity:sunkensea:preview:width'), 520));
    const height = Math.max(1, N(WorldDB.get('calamity:sunkensea:preview:height'), 310));
    return centerX < 0 || centerY < 0 ? null : {
        left: centerX - Math.floor(width / 2),
        top: centerY - Math.floor(height / 2),
        width,
        height
    };
}
function NativeBool(value) {
    if (value === true)
        return true;
    if (value === false || value === null || value === undefined)
        return false;
    const numeric = Number(value);
    if (Number.isFinite(numeric))
        return numeric !== 0;
    return String(value).toLowerCase() === 'true';
}
function Targets() {
    let crimson = false;
    let drunk = false;
    try { crimson = NativeBool(Terraria.WorldGen.crimson); } catch (e) { }
    try { drunk = NativeBool(Terraria.Main.drunkWorld); } catch (e) { }
    return drunk ? ['crimson', 'corruption'] : [crimson ? 'crimson' : 'corruption'];
}
function Save(kind, result) {
    const prefix = Key(kind);
    WorldDB.set(prefix + 'generated', true);
    WorldDB.set(prefix + 'pending', false);
    WorldDB.set(prefix + 'searchStopped', false);
    WorldDB.set(prefix + 'left', N(result.left, N(result.anchorX, 0)));
    WorldDB.set(prefix + 'top', N(result.top, N(result.anchorY, 0)));
    WorldDB.set(prefix + 'width', N(result.width, kind === 'crimson' ? 54 : 26));
    WorldDB.set(prefix + 'height', N(result.height, kind === 'crimson' ? 19 : 11));
    WorldDB.set(prefix + 'anchorX', N(result.anchorX, 0));
    WorldDB.set(prefix + 'anchorY', N(result.anchorY, 0));
    WorldDB.set(prefix + 'chestX', N(result.chestX, -1));
    WorldDB.set(prefix + 'chestY', N(result.chestY, -1));
    WorldDB.set(prefix + 'lootVersion', 1);
    WorldDB.set(prefix + 'source', String(result.source || 'official-csch-delayed'));
}
function PortWorld() {
    for (const name of ['mechanicShed', 'desertShrine', 'graniteShrine', 'surfaceShrine', 'iceShrine', 'mushroomShrine', 'marbleShrine']) {
        if (WorldDB.get(`calamity:structure:${name}:generated`) === true)
            return true;
    }
    return WorldDB.get('calamity:sunkensea:terrain:generated') === true;
}
function RejectionSummary(search) {
    const rejects = search?.rejects || {};
    return Object.keys(rejects).sort().map(k => `${k}:${N(rejects[k], 0)}`).join(',') || '<none>';
}

export class EvilShrineGenerationSystem extends ModSystem {
    constructor() {
        super();
        this.Delay = 9000;
        this.Done = false;
        this.Recovery = false;
        this.Targets = [];
        this.Index = 0;
        this.Search = null;
        this.Rounds = 0;
        this.LastProgress = -1;
    }
    Reset() {
        this.Delay = 9000;
        this.Done = false;
        this.Recovery = false;
        this.Targets = [];
        this.Index = 0;
        this.Search = null;
        this.Rounds = 0;
        this.LastProgress = -1;
    }
    OnWorldLoad() { this.Reset(); }
    OnWorldUnload() { this.Reset(); }

    Recover() {
        if (this.Recovery)
            return;
        this.Recovery = true;

        // Phase 12.73.4: old Phase 12.68 recovery markers are no longer reopened
        // automatically during gameplay. A legitimate deferred request is written
        // by current worldgen with ROOT + deferredVersion = 2.
        if (WorldDB.get(ROOT + 'pending') === true && N(WorldDB.get(ROOT + 'deferredVersion'), 0) !== 2) {
            WorldDB.set(ROOT + 'pending', false);
            WorldDB.set(ROOT + 'stalePendingSuppressed', true);
            for (const kind of Targets()) {
                if (WorldDB.get(Key(kind) + 'generated') !== true)
                    WorldDB.set(Key(kind) + 'pending', false);
            }
            try { WorldDB.Instance.Save(); } catch (e) { }
            Log('suppressed stale legacy pending marker; no background recovery scan started.');
        }
    }

    Begin(kind) {
        OfficialStructureMap.Reset();
        Reserve('calamity:structure:mechanicShed:', 30, 21);
        Reserve('calamity:structure:desertShrine:', 30, 27);
        Reserve('calamity:structure:graniteShrine:', 17, 18);
        Reserve('calamity:structure:surfaceShrine:', 56, 36);
        Reserve('calamity:structure:iceShrine:', 46, 32);
        Reserve('calamity:structure:mushroomShrine:', 35, 42);
        Reserve('calamity:structure:marbleShrine:', 23, 44);
        Reserve(Key('corruption'), 26, 11);
        Reserve(Key('crimson'), 54, 19);
        this.Rounds++;
        this.Search = EvilShrineRuntime.BeginSearch(kind, {
            maxX: N(Terraria.Main.maxTilesX, 4200),
            maxY: N(Terraria.Main.maxTilesY, 1200)
        }, Sunken());
        Log(`${kind} full-range incremental search started; round=${this.Rounds}, budget=12 reads/update.`);
    }

    Advance() {
        this.Search = null;
        this.Rounds = 0;
        this.LastProgress = -1;
        this.Index++;
        this.Delay = 180;
        if (this.Index >= this.Targets.length) {
            WorldDB.set(ROOT + 'complete', true);
            WorldDB.set(ROOT + 'pending', false);
            this.Done = true;
            try { WorldDB.Instance.Save(); } catch (e) { }
            Log(`delayed placement complete; targets=${this.Targets.join(',')}.`);
        }
    }

    Fail(kind, result) {
        Log(`${kind} search round ${this.Rounds} failed; reason=${result?.reason || 'unknown'}, inspected=${result?.inspected || 0}, candidates=${result?.candidates?.length || result?.candidates || 0}, wallHits=${result?.wallHits || 0}, tileHits=${result?.tileHits || 0}, xSpread=${result?.candidateMinX ?? -1}-${result?.candidateMaxX ?? -1}, bestRatio=${Number(result?.bestRatio || 0)}, best=${result?.bestX ?? -1},${result?.bestY ?? -1}, bestInWall=${result?.bestInWall === true}, rejects=${RejectionSummary(result)}, discoveryReads=${result?.discoveryReads || 0}, exactReads=${result?.exactReads || 0}.`);
        this.Search = null;
        this.LastProgress = -1;
        if (this.Rounds >= 4) {
            WorldDB.set(Key(kind) + 'searchStopped', true);
            this.Advance();
        } else {
            this.Delay = 300;
        }
    }

    Update() {
        if (this.Done || !WorldDB.Instance)
            return;
        this.Recover();
        if (this.Delay-- > 0)
            return;
        if (WorldDB.get(ROOT + 'complete') === true) {
            this.Done = true;
            return;
        }
        if (WorldDB.get(ROOT + 'pending') !== true) {
            this.Done = true;
            return;
        }
        if (WorldDB.get('calamity:structure:mushroomShrine:generated') !== true &&
            WorldDB.get('calamity:structure:mushroomShrine:searchStopped') !== true) {
            this.Delay = 300;
            return;
        }
        if (!this.Targets.length)
            this.Targets = Targets();
        while (this.Index < this.Targets.length && WorldDB.get(Key(this.Targets[this.Index]) + 'generated') === true)
            this.Index++;
        if (this.Index >= this.Targets.length) {
            this.Advance();
            return;
        }

        const kind = this.Targets[this.Index];
        try {
            if (!this.Search)
                this.Begin(kind);
            const step = EvilShrineRuntime.StepSearch(this.Search, 12);
            if (step?.generated === true && step.result) {
                Save(kind, step.result);
                Log(`${kind} placement complete; topLeft=${step.result.anchorX},${step.result.anchorY}, chest=${step.result.chestX},${step.result.chestY}, filled=${step.result.filled || 0}, xSpread=${step.result.candidateMinX}-${step.result.candidateMaxX}.`);
                this.Advance();
                return;
            }
            if (step?.done === true) {
                this.Fail(kind, step);
                return;
            }
            const progress = this.Search.phase === 'discover'
                ? Math.floor((this.Search.discoveryReads || 0) / 4096)
                : 1000 + Math.floor((this.Search.inspected || 0) / 8);
            if (progress > this.LastProgress) {
                this.LastProgress = progress;
                Log(`${kind} progress; phase=${this.Search.phase}, candidates=${this.Search.candidates.length}, wallPool=${this.Search.wallCandidates?.length || 0}, tilePool=${this.Search.tileCandidates?.length || 0}, wallHits=${this.Search.wallHits || 0}, tileHits=${this.Search.tileHits || 0}, inspected=${this.Search.inspected || 0}, bestRatio=${Number(this.Search.bestRatio || 0)}, discoveryReads=${this.Search.discoveryReads || 0}, exactReads=${this.Search.exactReads || 0}.`);
            }
            this.Delay = 8;
        } catch (e) {
            this.Fail(kind, {
                reason: String(e),
                inspected: this.Search?.inspected || 0,
                candidates: this.Search?.candidates || [],
                wallHits: this.Search?.wallHits || 0,
                tileHits: this.Search?.tileHits || 0,
                candidateMinX: this.Search?.candidateMinX ?? -1,
                candidateMaxX: this.Search?.candidateMaxX ?? -1,
                bestRatio: this.Search?.bestRatio || 0,
                bestX: this.Search?.bestX ?? -1,
                bestY: this.Search?.bestY ?? -1,
                bestInWall: this.Search?.bestInWall === true,
                rejects: this.Search?.rejects || {},
                discoveryReads: this.Search?.discoveryReads || 0,
                exactReads: this.Search?.exactReads || 0
            });
        }
    }
}
