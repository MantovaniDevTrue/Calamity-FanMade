import { Terraria, Modules } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { SunkenSeaPreviewRuntime } from './SunkenSeaPreviewRuntime.js';
import { SunkenSeaTerrainRuntime } from './SunkenSeaTerrainRuntime.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './SulphurousSeaTerrainRuntime.js';

const { TileData } = Modules;
const PREFIX = 'calamity:biomeanchors:migration:';
const CELLS_PER_TICK = 128;
const ACTIVE_HEADER = 0x20;
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
function Tell(text, r = 130, g = 220, b = 255) {
    try {
        NewText(String(text), r, g, b);
    } catch (e) { }
}

function Tick() {
    try {
        return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
    } catch (e) {
        return 0;
    }
}

function IsActive(data) {
    try {
        return ((Number(data.sHeader) || 0) & ACTIVE_HEADER) !== 0;
    } catch (e) {
        return false;
    }
}

export const BiomeAnchorMigrationRuntime = {
    Active: false,
    Paused: false,
    Complete: false,
    Cursor: 0,
    Total: 0,
    ConvertedSunken: 0,
    ConvertedSulphurous: 0,
    StartTick: 0,
    LastPercent: -1,
    LastError: '',
    Key(name) {
        return PREFIX + String(name);
    },
    Reset() {
        this.Active = false;
        this.Paused = false;
        this.Complete = false;
        this.Cursor = 0;
        this.Total = 0;
        this.ConvertedSunken = 0;
        this.ConvertedSulphurous = 0;
        this.StartTick = 0;
        this.LastPercent = -1;
        this.LastError = '';
    },
    GetSunkenTotal() {
        return SunkenSeaTerrainRuntime.Generated === true
            ? Math.max(0, Math.floor(Number(SunkenSeaPreviewRuntime.Width) || 0) * Math.floor(Number(SunkenSeaPreviewRuntime.Height) || 0))
            : 0;
    },
    GetSulphurousTotal() {
        return SulphurousSeaTerrainRuntime.Generated === true
            ? Math.max(0, Math.floor(Number(SulphurousSeaPreviewRuntime.Width) || 0) * Math.floor(Number(SulphurousSeaPreviewRuntime.Height) || 0))
            : 0;
    },
    Load() {
        this.Reset();
        this.Complete = WorldDB.get(this.Key('complete')) === true;
        this.Cursor = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('cursor'))) || 0));
        this.ConvertedSunken = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('sunken'))) || 0));
        this.ConvertedSulphurous = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('sulphurous'))) || 0));
        this.Total = this.GetSunkenTotal() + this.GetSulphurousTotal();
        const state = String(WorldDB.get(this.Key('state')) || 'idle');
        this.Paused = !this.Complete && this.Cursor > 0 && this.Cursor < this.Total && (state === 'running' || state === 'paused');
    },
    Save(state = null) {
        if (!WorldDB.Instance)
            return;
        WorldDB.set(this.Key('complete'), this.Complete === true);
        WorldDB.set(this.Key('cursor'), Math.floor(this.Cursor));
        WorldDB.set(this.Key('sunken'), Math.floor(this.ConvertedSunken));
        WorldDB.set(this.Key('sulphurous'), Math.floor(this.ConvertedSulphurous));
        WorldDB.set(this.Key('state'), String(state || (this.Active ? 'running' : (this.Paused ? 'paused' : (this.Complete ? 'complete' : 'idle')))));
        WorldDB.set(this.Key('schemaVersion'), 1);
    },
    CanStart(player, resume = false) {
        if (this.Active)
            return { ok: false, reason: 'A migração dos anchors já está em andamento.' };
        if (this.Complete && !resume)
            return { ok: false, reason: 'Os anchors deste mundo já foram migrados.' };
        if (this.GetSunkenTotal() + this.GetSulphurousTotal() <= 0)
            return { ok: false, reason: 'Este mundo não possui Sunken Sea ou Sulphurous Sea gerado.' };
        try {
            if (Number(Terraria.Main.netMode) !== 0)
                return { ok: false, reason: 'A migração está bloqueada no multiplayer.' };
        } catch (e) { }
        if (player && (SunkenSeaPreviewRuntime.ContainsPlayer(player) || SulphurousSeaPreviewRuntime.ContainsPlayer(player))) {
            return { ok: false, reason: 'Saia dos dois biomas antes de iniciar a migração.' };
        }
        return { ok: true, reason: '' };
    },
    Start(player, resume = false) {
        const check = this.CanStart(player, resume);
        if (!check.ok && !(resume && this.Paused))
            return check;
        this.Total = this.GetSunkenTotal() + this.GetSulphurousTotal();
        if (!resume) {
            this.Cursor = 0;
            this.ConvertedSunken = 0;
            this.ConvertedSulphurous = 0;
            this.Complete = false;
        }
        this.Active = true;
        this.Paused = false;
        this.StartTick = Tick();
        this.LastPercent = Math.floor(this.Cursor * 100 / Math.max(1, this.Total)) - 1;
        this.LastError = '';
        this.Save('running');
        return { ok: true, reason: '' };
    },
    Cancel() {
        if (!this.Active)
            return false;
        this.Active = false;
        this.Paused = this.Cursor > 0 && this.Cursor < this.Total;
        this.Save(this.Paused ? 'paused' : 'idle');
        return true;
    },
    ApplySunken(index) {
        const width = Math.floor(Number(SunkenSeaPreviewRuntime.Width) || 0);
        const height = Math.floor(Number(SunkenSeaPreviewRuntime.Height) || 0);
        if (!(width > 0 && height > 0))
            return;
        const localX = index % width;
        const localY = Math.floor(index / width);
        const plan = SunkenSeaTerrainRuntime.PlanCell(localX, localY, width, height);
        if (!plan || plan.water || Number(plan.tile) !== Number(BiomeAnchorTiles.SunkenEutrophic))
            return;
        const x = Math.floor(SunkenSeaPreviewRuntime.BoundsLeft + localX);
        const y = Math.floor(SunkenSeaPreviewRuntime.BoundsTop + localY);
        const data = new TileData(x, y);
        if (!IsActive(data) || Number(data.type) !== BiomeAnchorTiles.LegacySunkenEutrophic)
            return;
        data.type = BiomeAnchorTiles.SunkenEutrophic;
        data.frameX = -1;
        data.frameY = -1;
        this.ConvertedSunken++;
    },
    ApplySulphurous(index) {
        const width = Math.floor(Number(SulphurousSeaPreviewRuntime.Width) || 0);
        const height = Math.floor(Number(SulphurousSeaPreviewRuntime.Height) || 0);
        if (!(width > 0 && height > 0))
            return;
        const localX = index % width;
        const localY = Math.floor(index / width);
        const plan = SulphurousSeaTerrainRuntime.PlanCell(localX, localY, width, height);
        if (!plan || plan.mode !== 'solid' || Number(plan.tile) !== Number(BiomeAnchorTiles.SulphurousSand))
            return;
        const x = Math.floor(SulphurousSeaPreviewRuntime.BoundsLeft + localX);
        const y = Math.floor(SulphurousSeaPreviewRuntime.BoundsTop + localY);
        const data = new TileData(x, y);
        if (!IsActive(data) || Number(data.type) !== BiomeAnchorTiles.LegacySulphurousSand)
            return;
        data.type = BiomeAnchorTiles.SulphurousSand;
        data.frameX = -1;
        data.frameY = -1;
        this.ConvertedSulphurous++;
    },
    ApplyIndex(index) {
        const sunkenTotal = this.GetSunkenTotal();
        if (index < sunkenTotal)
            this.ApplySunken(index);
        else
            this.ApplySulphurous(index - sunkenTotal);
    },
    Update() {
        if (!this.Active)
            return;
        try {
            const end = Math.min(this.Total, this.Cursor + CELLS_PER_TICK);
            while (this.Cursor < end) {
                this.ApplyIndex(this.Cursor);
                this.Cursor++;
            }
            const percent = Math.floor(this.Cursor * 100 / Math.max(1, this.Total));
            if (percent >= this.LastPercent + 10 && percent < 100) {
                this.LastPercent = percent;
                Tell(`Migração dos anchors: ${percent}% — Sunken ${this.ConvertedSunken}, Sulphurous ${this.ConvertedSulphurous}.`, 130, 220, 255);
                this.Save('running');
            }
            if (this.Cursor >= this.Total) {
                this.Active = false;
                this.Paused = false;
                this.Complete = true;
                this.Save('complete');
                const seconds = Math.max(1, Math.round((Tick() - this.StartTick) / 60));
                Tell(`Migração concluída em ${seconds}s. Sunken ${this.ConvertedSunken}; Sulphurous ${this.ConvertedSulphurous}.`, 170, 255, 120);
                Tell('Somente os dois anchors legados foram trocados. Água, paredes, cavernas e outros materiais não foram alterados.', 255, 220, 120);
            }
        } catch (e) {
            this.Active = false;
            this.Paused = this.Cursor > 0 && this.Cursor < this.Total;
            this.LastError = String(e);
            this.Save(this.Paused ? 'paused' : 'failed');
            Tell(`Migração pausada por erro: ${this.LastError.slice(0, 160)}`, 255, 100, 100);
        }
    },
    GetStatus() {
        const percent = this.Total > 0 ? Math.floor(this.Cursor * 100 / this.Total) : 0;
        return `active=${this.Active} paused=${this.Paused} complete=${this.Complete} progress=${percent}% cursor=${this.Cursor}/${this.Total} sunken=${this.ConvertedSunken} sulphurous=${this.ConvertedSulphurous}${this.LastError ? ` error=${this.LastError.slice(0, 100)}` : ''}`;
    }
};
