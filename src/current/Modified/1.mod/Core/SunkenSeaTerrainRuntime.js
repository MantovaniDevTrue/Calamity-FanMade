import { Terraria, Modules } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { SunkenSeaPreviewRuntime } from './SunkenSeaPreviewRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';

const { TileData } = Modules;
const PREFIX = 'calamity:sunkensea:terrain:';
const CELLS_PER_TICK = 48;
const ACTIVE_HEADER = 0x20;
const TILE_EUTROPHIC = BiomeAnchorTiles.SunkenEutrophic; // Blue Team Block
const TILE_NAVYSTONE = 396; // Sandstone
const TILE_SEAPRISM = 385; // Crystal Block
const WALL_EUTROPHIC = 216; // Unsafe Hardened Sand Wall
const WALL_NAVYSTONE = 187; // Unsafe Sandstone Wall
const PlaceTile = Terraria.WorldGen['bool PlaceTile(int i, int j, int Type, bool mute, bool forced, int plr, int style)'];
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const ProtectedTiles = new Set([
    6, 7, 8, 9, 12, 21, 22, 26, 31, 37, 56, 58, 63, 64, 65, 66, 67, 68,
    77, 107, 108, 111, 166, 167, 168, 169, 204, 211, 221, 222, 223, 226,
    237, 238, 239, 240, 467, 468
]);
const SafeNaturalTiles = new Set([
    0, 1, 2, 40, 53, 57, 59, 60, 70, 123, 147, 161, 396, 397, 404
]);
function Tell(text, r = 80, g = 235, b = 240) {
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

function CanReplace(data) {
    try {
        const tile = data.tile;
        const wall = Number(data.wall) || 0;
        try {
            if (wall > 0 && Terraria.Main.wallHouse[wall] === true)
                return false;
        } catch (e) { }
        if (!Terraria.TileHasTile(tile))
            return true;
        const type = Number(data.type) || 0;
        if (ProtectedTiles.has(type))
            return false;
        if (IsFrameImportant(type))
            return false;
        return SafeNaturalTiles.has(type);
    } catch (e) {
        return false;
    }
}

function SetWaterCell(data, wallType) {
    data.ClearEverything();
    data.wall = wallType;
    data.liquid = 255;
}

function SetSolidCell(data, x, y, tileType, wallType) {
    data.ClearEverything();
    let placed = false;
    try {
        placed = PlaceTile(x, y, tileType, true, true, -1, 0) === true;
    } catch (e) {
        placed = false;
    }

    if (!placed) {
        data.type = tileType;
        data.sHeader = ACTIVE_HEADER;
        data.frameX = -1;
        data.frameY = -1;
    }
    data.wall = wallType;
    data.liquid = 0;
}

export const SunkenSeaTerrainRuntime = {
    Active: false,
    Paused: false,
    Generated: false,
    Cursor: 0,
    Total: 0,
    Modified: 0,
    Skipped: 0,
    StartTick: 0,
    LastPercent: -1,
    LastError: '',
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
        this.StartTick = 0;
        this.LastPercent = -1;
        this.LastError = '';
    },
    Load() {
        this.ResetRuntime();
        try { OrganicBiomePlanner.ConfigureSunkenSeed(Number(Terraria.Main.worldID) || 0); } catch (e) { }
        this.Generated = WorldDB.get(this.Key('generated')) === true;
        const state = String(WorldDB.get(this.Key('state')) || 'idle');
        this.Cursor = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('cursor'))) || 0));
        this.Modified = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('modified'))) || 0));
        this.Skipped = Math.max(0, Math.floor(Number(WorldDB.get(this.Key('skipped'))) || 0));
        this.Total = this.GetTotalCells();
        if (state === 'running' || state === 'paused') {
            this.Paused = this.Cursor > 0 && this.Cursor < this.Total;
        }
    },
    Save(state = null) {
        if (!WorldDB.Instance)
            return;
        WorldDB.set(this.Key('generated'), this.Generated === true);
        WorldDB.set(this.Key('state'), String(state || (this.Active ? 'running' : (this.Paused ? 'paused' : (this.Generated ? 'complete' : 'idle')))));
        WorldDB.set(this.Key('cursor'), Math.floor(this.Cursor));
        WorldDB.set(this.Key('modified'), Math.floor(this.Modified));
        WorldDB.set(this.Key('skipped'), Math.floor(this.Skipped));
        WorldDB.set(this.Key('version'), 3);
    },
    GetTotalCells() {
        return Math.max(0, Math.floor(Number(SunkenSeaPreviewRuntime.Width) || 0) * Math.floor(Number(SunkenSeaPreviewRuntime.Height) || 0));
    },
    CanStart(player) {
        if (this.Active)
            return { ok: false, reason: 'A geração já está em andamento.' };
        if (this.Generated)
            return { ok: false, reason: 'Este mundo já possui a fundação experimental gerada.' };
        if (!(SunkenSeaPreviewRuntime.CenterX > 0 && SunkenSeaPreviewRuntime.CenterY > 0))
            return { ok: false, reason: 'Crie primeiro uma âncora com /calamityport sunkensea anchor.' };
        if (String(SunkenSeaPreviewRuntime.Mode).indexOf('below-desert') < 0)
            return { ok: false, reason: 'A geração exige uma âncora abaixo do deserto, não a prévia ao redor do jogador.' };
        try {
            if (Number(Terraria.Main.netMode) !== 0)
                return { ok: false, reason: 'A geração experimental está bloqueada no multiplayer.' };
        } catch (e) { }
        if (player) {
            const px = Math.floor(Terraria.PlayerCenterX(player) / 16);
            const py = Math.floor(Terraria.PlayerCenterY(player) / 16);
            if (px >= SunkenSeaPreviewRuntime.BoundsLeft && px <= SunkenSeaPreviewRuntime.BoundsRight
                && py >= SunkenSeaPreviewRuntime.BoundsTop && py <= SunkenSeaPreviewRuntime.BoundsBottom)
                return { ok: false, reason: 'Saia da área do Sunken Sea antes de gerar para não ficar preso ou afogado.' };
        }
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
    PlanCell(localX, localY, width, height, existingSolid = true) {
        const code = OrganicBiomePlanner.SunkenPlanCode(localX, localY, width, height);
        if (code === 1) return { water: true, tile: 0, wall: WALL_EUTROPHIC };
        if (code === 2) return { water: true, tile: 0, wall: WALL_NAVYSTONE };
        if (code === 3) return { water: false, tile: TILE_EUTROPHIC, wall: WALL_EUTROPHIC };
        if (code === 4) return { water: false, tile: TILE_NAVYSTONE, wall: WALL_NAVYSTONE };
        if (code === 5) return { water: false, tile: TILE_SEAPRISM, wall: WALL_NAVYSTONE };
        if (code === 6) return existingSolid ? { water: false, tile: TILE_EUTROPHIC, wall: WALL_NAVYSTONE } : { water: true, tile: 0, wall: WALL_NAVYSTONE };
        if (code === 7) return existingSolid ? { water: false, tile: TILE_EUTROPHIC, wall: WALL_EUTROPHIC } : { water: true, tile: 0, wall: WALL_EUTROPHIC };
        if (code === 8) return existingSolid ? { water: false, tile: TILE_EUTROPHIC, wall: WALL_EUTROPHIC } : { water: true, tile: 0, wall: WALL_NAVYSTONE };
        if (code === 9) return { water: true, tile: 0, wall: 0 };
        if (code === 10) return { water: false, tile: TILE_EUTROPHIC, wall: 0 };
        if (code === 11) return { water: false, tile: TILE_EUTROPHIC, wall: WALL_NAVYSTONE };
        return null;
    },
    ApplyIndex(index) {
        const width = Math.floor(SunkenSeaPreviewRuntime.Width);
        const height = Math.floor(SunkenSeaPreviewRuntime.Height);
        const localX = index % width;
        const localY = Math.floor(index / width);
        const x = Math.floor(SunkenSeaPreviewRuntime.BoundsLeft + localX);
        const y = Math.floor(SunkenSeaPreviewRuntime.BoundsTop + localY);
        if (x <= 10 || y <= 10 || x >= Number(Terraria.Main.maxTilesX) - 10 || y >= Number(Terraria.Main.maxTilesY) - 10) {
            this.Skipped++;
            return;
        }
        const data = new TileData(x, y);
        const existingSolid = Terraria.TileHasTile(data.tile);
        const plan = this.PlanCell(localX, localY, width, height, existingSolid);
        if (!plan)
            return;
        if (!CanReplace(data)) {
            this.Skipped++;
            return;
        }
        if (plan.water)
            SetWaterCell(data, plan.wall);
        else
            SetSolidCell(data, x, y, plan.tile, plan.wall);
        this.Modified++;
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
                Tell(`Sunken Sea: geração ${percent}% — ${this.Modified} blocos alterados, ${this.Skipped} protegidos.`, 80, 235, 240);
                this.Save('running');
            }
            if (this.Cursor >= this.Total) {
                this.Active = false;
                this.Paused = false;
                this.Generated = true;
                SunkenSeaPreviewRuntime.Mode = 'generated-experimental';
                SunkenSeaPreviewRuntime.Enabled = true;
                SunkenSeaPreviewRuntime.SetGeneratedBiomeActive(true);
                SunkenSeaPreviewRuntime.Save();
                this.Save('complete');
                const seconds = Math.max(1, Math.round((Tick() - this.StartTick) / 60));
                Tell(`Fundação experimental do Sunken Sea concluída em ${seconds}s. ${this.Modified} células alteradas; ${this.Skipped} blocos protegidos preservados.`, 90, 255, 170);
                Tell('Os blocos ainda são âncoras vanilla. Drops e aparências próprias virão na próxima fase.', 255, 220, 120);
            }
        } catch (e) {
            this.Active = false;
            this.Paused = this.Cursor > 0 && this.Cursor < this.Total;
            this.LastError = String(e);
            this.Save(this.Paused ? 'paused' : 'failed');
            Tell(`A geração foi pausada por erro: ${this.LastError.slice(0, 180)}`, 255, 100, 100);
        }
    },
    GetStatus() {
        const percent = this.Total > 0 ? Math.floor(this.Cursor * 100 / this.Total) : 0;
        return `active=${this.Active} paused=${this.Paused} generated=${this.Generated} progress=${percent}% cursor=${this.Cursor}/${this.Total} modified=${this.Modified} skipped=${this.Skipped}${this.LastError ? ` error=${this.LastError.slice(0, 100)}` : ''}`;
    }
};
