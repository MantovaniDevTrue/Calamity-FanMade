import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { SunkenSeaTerrainRuntime } from './../../Core/SunkenSeaTerrainRuntime.js';
import { SunkenSeaPreviewRuntime } from './../../Core/SunkenSeaPreviewRuntime.js';

const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];

function Tell(text, r = 90, g = 255, b = 180) {
    try {
        NewText(String(text), r, g, b);
    } catch (e) { }
}

function LocalPlayer() {
    try {
        const player = Terraria.Main.player[Terraria.Main.myPlayer];
        return player && player.active ? player : null;
    } catch (e) {
        return null;
    }
}

function IsSinglePlayer() {
    try {
        return Number(Terraria.Main.netMode) === 0;
    } catch (e) {
        return true;
    }
}

export class SunkenSeaTerrainSystem extends ModSystem {
    constructor() {
        super();
        this.AutoToken = 0;
        this.AutoState = 'idle';
        this.AutoReason = '';
        this.AutoAttempts = 0;
        this.WasGenerating = false;
        this.EcologyQueued = false;
    }

    OnWorldLoad() {
        SunkenSeaTerrainRuntime.Load();
        SunkenSeaPreviewRuntime.SetGeneratedBiomeActive(SunkenSeaTerrainRuntime.Generated === true);
        this.AutoToken++;
        this.AutoAttempts = 0;
        this.AutoReason = '';
        this.WasGenerating = SunkenSeaTerrainRuntime.Active === true;
        this.EcologyQueued = false;

        if (SunkenSeaTerrainRuntime.Generated) {
            this.AutoState = 'complete';
            return;
        }

        if (!IsSinglePlayer()) {
            this.AutoState = 'blocked-multiplayer';
            return;
        }

        this.AutoState = SunkenSeaTerrainRuntime.Paused ? 'waiting-resume' : 'waiting';
        const token = this.AutoToken;
        ModSystem.SetTimeout(() => this.TryAutomaticGeneration(token, false), 180);
    }

    TryAutomaticGeneration(token = this.AutoToken, force = false) {
        if (token !== this.AutoToken)
            return { ok: false, reason: 'world-changed' };
        if (!IsSinglePlayer()) {
            this.AutoState = 'blocked-multiplayer';
            this.AutoReason = 'A geração automática está bloqueada no multiplayer.';
            return { ok: false, reason: this.AutoReason };
        }
        if (SunkenSeaTerrainRuntime.Generated) {
            this.AutoState = 'complete';
            this.AutoReason = '';
            return { ok: true, reason: 'already-generated' };
        }
        if (SunkenSeaTerrainRuntime.Active) {
            this.AutoState = 'running';
            return { ok: true, reason: 'already-running' };
        }

        this.AutoAttempts++;
        const player = LocalPlayer();
        if (SunkenSeaTerrainRuntime.Paused) {
            const resumed = SunkenSeaTerrainRuntime.Start(player, true);
            if (resumed.ok) {
                this.AutoState = 'running';
                this.AutoReason = '';
                Tell('Sunken Sea: geração interrompida retomada automaticamente.', 90, 255, 180);
                return resumed;
            }
            this.AutoState = 'resume-failed';
            this.AutoReason = resumed.reason;
            return resumed;
        }

        const hasBelowDesertAnchor = SunkenSeaPreviewRuntime.CenterX > 0
            && SunkenSeaPreviewRuntime.CenterY > 0
            && String(SunkenSeaPreviewRuntime.Mode).indexOf('below-desert') >= 0;

        if (!hasBelowDesertAnchor || force) {
            const anchor = SunkenSeaPreviewRuntime.AnchorBelowWorldDesert();
            if (!anchor.ok) {
                this.AutoState = 'anchor-failed';
                this.AutoReason = anchor.reason;
                if (!force && this.AutoAttempts < 3) {
                    const retryToken = this.AutoToken;
                    ModSystem.SetTimeout(() => this.TryAutomaticGeneration(retryToken, false), 300);
                }
                return anchor;
            }
            this.AutoState = 'anchor-ready';
            this.AutoReason = `${anchor.source}:x=${anchor.x}:bottom=${anchor.bottom}`;
        }

        const started = SunkenSeaTerrainRuntime.Start(player, false);
        if (started.ok) {
            this.AutoState = 'running';
            this.AutoReason = '';
            Tell('Sunken Sea encontrado abaixo do deserto. Geração automática iniciada.', 80, 235, 240);
            Tell('O terreno será criado em pequenos lotes para evitar travamentos.', 130, 220, 255);
            return started;
        }

        this.AutoState = 'start-failed';
        this.AutoReason = started.reason;
        if (!force && String(started.reason || '').indexOf('Saia da área') >= 0 && this.AutoAttempts < 6) {
            const retryToken = this.AutoToken;
            ModSystem.SetTimeout(() => this.TryAutomaticGeneration(retryToken, false), 300);
        }
        return started;
    }

    ForceAutomaticGeneration() {
        return this.TryAutomaticGeneration(this.AutoToken, true);
    }

    QueueEcologyPopulate() {
        if (this.EcologyQueued || !SunkenSeaTerrainRuntime.Generated)
            return;
        this.EcologyQueued = true;
        ModSystem.SetTimeout(() => {
            const ecology = ModSystem.getByName('SunkenSeaEcologySystem');
            if (ecology && typeof ecology.BeginPopulate === 'function')
                ecology.BeginPopulate(true);
        }, 90);
    }

    Update() {
        const wasActive = SunkenSeaTerrainRuntime.Active === true;
        SunkenSeaTerrainRuntime.Update();
        const isActive = SunkenSeaTerrainRuntime.Active === true;

        if (isActive)
            this.AutoState = 'running';
        if (wasActive && !isActive && SunkenSeaTerrainRuntime.Generated) {
            this.AutoState = 'complete';
            this.AutoReason = '';
            this.QueueEcologyPopulate();
        }
        this.WasGenerating = isActive;
    }

    GetAutoStatus() {
        return `state=${this.AutoState} attempts=${this.AutoAttempts}${this.AutoReason ? ` reason=${this.AutoReason}` : ''}`;
    }

    PreSaveAndQuit() {
        if (SunkenSeaTerrainRuntime.Active)
            SunkenSeaTerrainRuntime.Cancel();
        else
            SunkenSeaTerrainRuntime.Save();
    }

    OnWorldUnload() {
        this.AutoToken++;
        this.AutoState = 'idle';
        this.AutoReason = '';
        this.AutoAttempts = 0;
        this.EcologyQueued = false;
        SunkenSeaPreviewRuntime.SetGeneratedBiomeActive(false);
        SunkenSeaTerrainRuntime.ResetRuntime();
    }
}
