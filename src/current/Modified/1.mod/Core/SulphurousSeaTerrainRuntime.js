import { Terraria, Modules } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';

const { TileData } = Modules;
const PREFIX = 'calamity:sulphursea:terrain:';
const CELLS_PER_TICK = 96;
const TERRAIN_SCHEMA_VERSION = 5;
function BoolValue(v) {
    if (v === true) return true;
    if (v === false || v == null) return false;
    try { const n = Number(v); if (Number.isFinite(n)) return n !== 0; } catch (e) { }
    return String(v).toLowerCase() === 'true';
}
export const SulphurousSeaAnchorTiles = Object.freeze({
    sand: BiomeAnchorTiles.SulphurousSand, // Yellow Team Block
    sandstone: 396, // Sandstone
    hardened: 397, // Hardened Sand
    shale: 404 // Desert Fossil
});
export const SulphurousSeaAnchorWalls = Object.freeze({
    sand: 2, // Dirt Wall
    sandstone: 187, // Unsafe Sandstone Wall
    hardened: 216, // Unsafe Hardened Sand Wall
    shale: 1 // Stone Wall
});
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const ProtectedTiles = new Set([
    6, 7, 8, 9, 12, 21, 22, 26, 31, 37, 56, 58, 63, 64, 65, 66, 67, 68,
    77, 107, 108, 111, 166, 167, 168, 169, 204, 211, 221, 222, 223, 226,
    237, 238, 239, 240, 467, 468
]);
const CoastalSandTiles = new Set([53, 112, 116, 234, 396, 397]);
function Tell(text, r = 190, g = 225, b = 90) {
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

function WorldSurface() {
    try {
        return Math.max(60, Math.floor(Number(Terraria.Main.worldSurface) || 250));
    } catch (e) {
        return 250;
    }
}

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
}

function IsFrameImportant(type) {
    try {
        return Terraria.Main.tileFrameImportant[Number(type)] === true;
    } catch (e) {
        return false;
    }
}

function CanConvertSolid(data) {
    try {
        const header = Number(data.sHeader) || 0;
        if ((header & 0x20) === 0)
            return false;
        const type = Number(data.type) || 0;
        if (!CoastalSandTiles.has(type))
            return false;
        if (ProtectedTiles.has(type) || IsFrameImportant(type))
            return false;
        const wall = Number(data.wall) || 0;
        try {
            if (wall > 0 && Terraria.Main.wallHouse[wall] === true)
                return false;
        } catch (e) { }
        return true;
    } catch (e) {
        return false;
    }
}

function SetConvertedSolidCell(data, tileType) {
    const oldType = Number(data.type) || 0;
    const targetType = Number(tileType) || 0;
    if (oldType === targetType)
        return false;
    data.type = targetType;
    data.frameX = -1;
    data.frameY = -1;
    return true;
}

export const SulphurousSeaTerrainRuntime = {
    Active: false,
    Paused: false,
    Generated: false,
    Cursor: 0,
    Total: 0,
    Modified: 0,
    Skipped: 0,
    Untouched: 0,
    StartTick: 0,
    LastPercent: -1,
    LastError: '',
    LoadedSchemaVersion: 0,
    Key(name) {
        return PREFIX + String(name);
    },
    ResetRuntime() {
        this.Active = false;
        this.Paused = false;
        this.Cursor = 0;
        this.Total = 0;
        this.Modified = 0;
        this.Skipped = 0;
        this.Untouched = 0;
        this.StartTick = 0;
        this.LastPercent = -1;
        this.LastError = '';
        this.LoadedSchemaVersion = 0;
    },
    Load() {
        this.ResetRuntime();
        this.Generated = BoolValue(WorldDB.get(this.Key('generated')));
        this.LoadedSchemaVersion = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('version'))) || 0));
        const state = String(WorldDB.get(this.Key('state')) || 'idle');
        this.Cursor = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('cursor'))) || 0));
        this.Modified = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('modified'))) || 0));
        this.Skipped = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('skipped'))) || 0));
        this.Untouched = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('untouched'))) || 0));
        this.Total = this.GetTotalCells();
        if (state === 'running' || state === 'paused')
            this.Paused = this.Cursor > 0 && this.Cursor < this.Total;
    },
    Save(state = null) {
        if (!WorldDB.Instance)
            return;
        WorldDB.set(this.Key('generated'), this.Generated === true);
        WorldDB.set(this.Key('state'), String(state || (this.Active ? 'running' : (this.Paused ? 'paused' : (this.Generated ? 'complete' : 'idle')))));
        WorldDB.set(this.Key('cursor'), Math.floor(this.Cursor));
        WorldDB.set(this.Key('modified'), Math.floor(this.Modified));
        WorldDB.set(this.Key('skipped'), Math.floor(this.Skipped));
        WorldDB.set(this.Key('untouched'), Math.floor(this.Untouched));
        WorldDB.set(this.Key('version'), TERRAIN_SCHEMA_VERSION);
        this.LoadedSchemaVersion = TERRAIN_SCHEMA_VERSION;
    },
    GetTotalCells() {
        return Math.max(0, Math.floor(Number(SulphurousSeaPreviewRuntime.Width) || 0) * Math.floor(Number(SulphurousSeaPreviewRuntime.Height) || 0));
    },
    CanStart(player) {
        if (this.Active)
            return { ok: false, reason: 'A geração do Sulphurous Sea já está em andamento.' };
        if (this.Generated)
            return { ok: false, reason: 'Este mundo já possui uma fundação do Sulphurous Sea gerada.' };
        if (!(SulphurousSeaPreviewRuntime.CenterX > 0 && SulphurousSeaPreviewRuntime.CenterY > 0))
            return { ok: false, reason: 'Crie primeiro a âncora com /calamityport sulphursea anchor.' };
        if (String(SulphurousSeaPreviewRuntime.Mode).indexOf('dungeon-ocean') < 0)
            return { ok: false, reason: 'A geração exige a âncora automática no oceano do lado da Dungeon.' };
        try {
            if (Number(Terraria.Main.netMode) !== 0)
                return { ok: false, reason: 'A geração experimental está bloqueada no multiplayer.' };
        } catch (e) { }
        if (player && SulphurousSeaPreviewRuntime.ContainsPlayer(player))
            return { ok: false, reason: 'Saia da área do Sulphurous Sea antes de gerar.' };
        return { ok: true, reason: '' };
    },
    Start(player, resume = false) {
        const check = this.CanStart(player);
        if (!check.ok && !(resume && this.Paused && !this.Generated))
            return check;
        this.Total = this.GetTotalCells();
        if (!(this.Total > 0))
            return { ok: false, reason: 'A área salva é inválida.' };
        if (!resume) {
            this.Cursor = 0;
            this.Modified = 0;
            this.Skipped = 0;
            this.Untouched = 0;
        }
        this.Active = true;
        this.Paused = false;
        this.StartTick = Tick();
        this.LastPercent = Math.floor(this.Cursor * 100 / this.Total) - 1;
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
    PlanCell(localX, localY, width, height) {
        const surfaceLocal = Clamp(WorldSurface() - Number(SulphurousSeaPreviewRuntime.BoundsTop), 8, height - 8);
        const band = OrganicBiomePlanner.SulphurousPlanBand(
            localX,
            localY,
            width,
            height,
            SulphurousSeaPreviewRuntime.AtLeft === true,
            surfaceLocal
        );
        if (band === 1)
            return { mode: 'solid', tile: SulphurousSeaAnchorTiles.sand };
        if (band === 2)
            return { mode: 'solid', tile: SulphurousSeaAnchorTiles.sandstone };
        if (band === 3)
            return { mode: 'solid', tile: SulphurousSeaAnchorTiles.hardened };
        if (band === 4)
            return { mode: 'solid', tile: SulphurousSeaAnchorTiles.shale };
        return null;
    },
    ApplyIndex(index) {
        const width = Math.floor(SulphurousSeaPreviewRuntime.Width);
        const height = Math.floor(SulphurousSeaPreviewRuntime.Height);
        const localX = index % width;
        const localY = Math.floor(index / width);
        const plan = this.PlanCell(localX, localY, width, height);
        if (!plan) {
            this.Untouched++;
            return;
        }
        const x = Math.floor(SulphurousSeaPreviewRuntime.BoundsLeft + localX);
        const y = Math.floor(SulphurousSeaPreviewRuntime.BoundsTop + localY);
        if (x <= 10 || y <= 10 || x >= Number(Terraria.Main.maxTilesX) - 10 || y >= Number(Terraria.Main.maxTilesY) - 10) {
            this.Skipped++;
            return;
        }
        const data = new TileData(x, y);
        if (!CanConvertSolid(data)) {
            this.Untouched++;
            return;
        }
        if (SetConvertedSolidCell(data, plan.tile))
            this.Modified++;
        else
            this.Untouched++;
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
                Tell(`Sulphurous Sea: conversão ${percent}% — ${this.Modified} blocos naturais convertidos, ${this.Skipped} protegidos.`, 190, 225, 90);
                this.Save('running');
            }
            if (this.Cursor >= this.Total) {
                this.Active = false;
                this.Paused = false;
                this.Generated = true;
                SulphurousSeaPreviewRuntime.Mode = 'generated-active-header-sand-family';
                SulphurousSeaPreviewRuntime.Enabled = true;
                SulphurousSeaPreviewRuntime.SetGeneratedBiomeActive(true);
                SulphurousSeaPreviewRuntime.Save();
                this.Save('complete');
                const seconds = Math.max(1, Math.round((Tick() - this.StartTick) / 60));
                Tell(`Fundação segura do Sulphurous Sea concluída em ${seconds}s. ${this.Modified} blocos naturais convertidos.`, 170, 255, 120);
                Tell('Somente blocos ativos da família da areia foram convertidos. Ar, água, paredes e cavernas permaneceram intactos.', 255, 220, 120);
            }
        } catch (e) {
            this.Active = false;
            this.Paused = this.Cursor > 0 && this.Cursor < this.Total;
            this.LastError = String(e);
            this.Save(this.Paused ? 'paused' : 'failed');
            Tell(`A conversão do Sulphurous Sea foi pausada por erro: ${this.LastError.slice(0, 180)}`, 255, 100, 100);
        }
    },
    GetStatus() {
        const percent = this.Total > 0 ? Math.floor(this.Cursor * 100 / this.Total) : 0;
        const legacy = this.Generated && this.LoadedSchemaVersion > 0 && this.LoadedSchemaVersion < TERRAIN_SCHEMA_VERSION;
        return `active=${this.Active} paused=${this.Paused} generated=${this.Generated} schema=${this.LoadedSchemaVersion || TERRAIN_SCHEMA_VERSION}${legacy ? ' legacy=true' : ''} strategy=active-header-sand-family progress=${percent}% cursor=${this.Cursor}/${this.Total} modified=${this.Modified} skipped=${this.Skipped} untouched=${this.Untouched}${this.LastError ? ` error=${this.LastError.slice(0, 100)}` : ''}`;
    }
};
