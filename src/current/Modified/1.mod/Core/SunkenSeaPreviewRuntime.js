import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';

const PREFIX = 'calamity:sunkensea:preview:';
const DETECTION_INTERVAL = 6;
const EXIT_PADDING = 6;
const DESERT_WALLS = new Set([187, 216]);
const DESERT_TILES = new Set([53, 112, 116, 234, 396, 397, 398, 399, 400, 401, 402, 403, 404]);
const GetTileType = Terraria.TileData['ushort GetType(int tileIndex)'];
const GetTileWall = Terraria.TileData['ushort GetWall(int tileIndex)'];

function Clamp(value, min, max) {
    const n = Number(value) || 0;
    return Math.max(Number(min) || 0, Math.min(Number(max) || 0, n));
}

function PlayerTileX(player) {
    return Math.floor(Terraria.PlayerCenterX(player) / 16);
}

function PlayerTileY(player) {
    return Math.floor(Terraria.PlayerCenterY(player) / 16);
}

function TilePosition(player) {
    return { x: PlayerTileX(player), y: PlayerTileY(player) };
}

function CurrentTick() {
    try {
        return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
    } catch (e) {
        return 0;
    }
}

function MaxTilesX() {
    try {
        return Math.max(400, Math.floor(Number(Terraria.Main.maxTilesX) || 4200));
    } catch (e) {
        return 4200;
    }
}

function MaxTilesY() {
    try {
        return Math.max(300, Math.floor(Number(Terraria.Main.maxTilesY) || 1200));
    } catch (e) {
        return 1200;
    }
}

function OfficialSunkenSize() {
    const scale = Math.max(1, Math.min(2, MaxTilesX() / 4200));
    const width = Math.max(320, Math.floor(80 * scale) * 4);
    // Preview/manual anchors use the midpoint of the desktop 1.4-1.7 vertical range.
    const height = Math.max(168, Math.floor(60 * scale * 1.55) * 2);
    return { width, height };
}

function WorldSurface() {
    try {
        return Math.max(0, Math.floor(Number(Terraria.Main.worldSurface) || 250));
    } catch (e) {
        return 250;
    }
}

function RockLayer() {
    try {
        return Math.max(WorldSurface() + 80, Math.floor(Number(Terraria.Main.rockLayer) || (WorldSurface() + 220)));
    } catch (e) {
        return WorldSurface() + 220;
    }
}

function TileOffset(x, y) {
    return Math.floor(y) * MaxTilesX() + Math.floor(x);
}

function ReadWall(x, y) {
    try {
        return Number(GetTileWall(TileOffset(x, y))) || 0;
    } catch (e) {
        return 0;
    }
}

function ReadType(x, y) {
    try {
        return Number(GetTileType(TileOffset(x, y))) || 0;
    } catch (e) {
        return 0;
    }
}

function TryGenVarsDesertCenter() {
    try {
        const rect = Terraria.WorldBuilding.GenVars.UndergroundDesertLocation;
        if (!rect)
            return 0;
        const x = Number(rect.X);
        const width = Number(rect.Width);
        if (Number.isFinite(x) && Number.isFinite(width) && width >= 40)
            return Math.floor(x + width * 0.5);
        const left = Number(rect.Left);
        const right = Number(rect.Right);
        if (Number.isFinite(left) && Number.isFinite(right) && right - left >= 40)
            return Math.floor((left + right) * 0.5);
    } catch (e) { }
    return 0;
}

function ScoreDesertColumn(x, startY, endY) {
    let score = 0;
    for (let y = startY; y <= endY; y += 24) {
        const wall = ReadWall(x, y);
        if (DESERT_WALLS.has(wall))
            score += 6;
        const type = ReadType(x, y);
        if (DESERT_TILES.has(type))
            score += 1;
    }
    return score;
}

function FindUndergroundDesertCenter() {
    const maxX = MaxTilesX();
    const fromGenVars = TryGenVarsDesertCenter();
    if (fromGenVars >= 120 && fromGenVars <= maxX - 120)
        return { x: fromGenVars, source: 'genvars' };

    const surface = WorldSurface();
    const startY = Math.max(80, surface + 45);
    const endY = Math.min(MaxTilesY() - 450, Math.max(startY + 144, RockLayer() + 180));
    const startX = Math.max(180, Math.floor(maxX * 0.12));
    const endX = Math.min(maxX - 180, Math.floor(maxX * 0.88));
    let bestX = 0;
    let bestScore = 0;

    for (let x = startX; x <= endX; x += 12) {
        let score = ScoreDesertColumn(x, startY, endY);
        score += ScoreDesertColumn(x - 8, startY, endY) * 0.35;
        score += ScoreDesertColumn(x + 8, startY, endY) * 0.35;
        if (score > bestScore) {
            bestScore = score;
            bestX = x;
        }
    }

    if (bestScore < 12)
        return { x: 0, source: 'not-found', score: bestScore };
    return { x: bestX, source: 'tile-scan', score: bestScore };
}

function FindUndergroundDesertBottom(x) {
    const maxY = MaxTilesY();
    const surface = WorldSurface();
    const startY = Math.max(surface + 100, maxY - 400);
    for (let y = startY; y >= surface; y--) {
        if (DESERT_WALLS.has(ReadWall(x, y)))
            return y;
    }

    let last = 0;
    const endY = Math.min(maxY - 350, RockLayer() + 260);
    for (let y = surface + 40; y <= endY; y += 2) {
        if (DESERT_WALLS.has(ReadWall(x, y)))
            last = y;
    }
    return last;
}

export const SunkenSeaPreviewRuntime = {
    Enabled: false,
    CenterX: 0,
    CenterY: 0,
    Width: 320,
    Height: 180,
    Mode: 'disabled',
    GeneratedBiomeActive: false,
    BoundsLeft: 0,
    BoundsRight: 0,
    BoundsTop: 0,
    BoundsBottom: 0,
    BoundsRevision: 0,
    DetectionStates: new Array(255),
    LastAutoAnchor: '',
    Key(name) {
        return PREFIX + String(name);
    },
    RefreshBounds() {
        const halfW = Math.floor(this.Width / 2);
        const halfH = Math.floor(this.Height / 2);
        this.BoundsLeft = this.CenterX - halfW;
        this.BoundsRight = this.CenterX + halfW;
        this.BoundsTop = this.CenterY - halfH;
        this.BoundsBottom = this.CenterY + halfH;
        this.BoundsRevision++;
        this.DetectionStates = new Array(255);
    },
    InvalidateDetection() {
        this.BoundsRevision++;
        this.DetectionStates = new Array(255);
    },
    Reset() {
        this.Enabled = false;
        this.CenterX = 0;
        this.CenterY = 0;
        this.Width = 320;
        this.Height = 180;
        this.Mode = 'disabled';
        this.GeneratedBiomeActive = false;
        this.LastAutoAnchor = '';
        this.RefreshBounds();
    },
    Load() {
        this.Reset();
        this.Enabled = WorldDB.get(this.Key('enabled')) === true;
        this.CenterX = Math.floor(Number(WorldDB.get(this.Key('centerX'))) || 0);
        this.CenterY = Math.floor(Number(WorldDB.get(this.Key('centerY'))) || 0);
        this.Width = Math.max(80, Math.floor(Number(WorldDB.get(this.Key('width'))) || 320));
        this.Height = Math.max(60, Math.floor(Number(WorldDB.get(this.Key('height'))) || 180));
        this.Mode = String(WorldDB.get(this.Key('mode')) || (this.Enabled ? 'saved' : 'disabled'));
        this.LastAutoAnchor = String(WorldDB.get(this.Key('autoAnchor')) || '');
        if (!(this.CenterX > 0 && this.CenterY > 0))
            this.Enabled = false;
        this.RefreshBounds();
    },
    Save() {
        if (!WorldDB.Instance)
            return;
        WorldDB.set(this.Key('enabled'), this.Enabled === true);
        WorldDB.set(this.Key('centerX'), Math.floor(this.CenterX));
        WorldDB.set(this.Key('centerY'), Math.floor(this.CenterY));
        WorldDB.set(this.Key('width'), Math.floor(this.Width));
        WorldDB.set(this.Key('height'), Math.floor(this.Height));
        WorldDB.set(this.Key('mode'), String(this.Mode || 'disabled'));
        WorldDB.set(this.Key('autoAnchor'), String(this.LastAutoAnchor || ''));
    },
    SetArea(centerX, centerY, width = 320, height = 180, mode = 'preview') {
        const maxX = MaxTilesX();
        const maxY = MaxTilesY();
        this.Width = Math.max(80, Math.min(720, Math.floor(Number(width) || 320)));
        this.Height = Math.max(60, Math.min(440, Math.floor(Number(height) || 180)));
        const halfW = Math.floor(this.Width / 2) + 12;
        const halfH = Math.floor(this.Height / 2) + 12;
        this.CenterX = Math.floor(Clamp(centerX, halfW, maxX - halfW));
        this.CenterY = Math.floor(Clamp(centerY, halfH, maxY - halfH));
        this.Mode = String(mode || 'preview');
        this.Enabled = true;
        this.RefreshBounds();
        this.Save();
        return this.GetBounds();
    },
    PreviewHere(player) {
        const pos = TilePosition(player);
        return this.SetArea(pos.x, pos.y, 240, 140, 'preview-here');
    },
    AnchorBelowDesert(player) {
        const pos = TilePosition(player);
        const minY = WorldSurface() + 100;
        const desiredY = Math.max(pos.y + 140, minY);
        this.LastAutoAnchor = 'manual-player';
        const size = OfficialSunkenSize();
        return this.SetArea(pos.x, desiredY, size.width, size.height, 'below-desert-anchor');
    },
    AnchorBelowWorldDesert() {
        const desert = FindUndergroundDesertCenter();
        if (!(desert.x > 0))
            return { ok: false, reason: `Não encontrei o deserto subterrâneo automaticamente (score=${Number(desert.score || 0).toFixed(1)}).` };

        const bottom = FindUndergroundDesertBottom(desert.x);
        const maxY = MaxTilesY();
        let top;
        if (bottom > 0)
            top = bottom + 50;
        else
            top = Math.max(WorldSurface() + 180, Math.min(maxY - 620, RockLayer() + 120));
        const size = OfficialSunkenSize();
        const centerY = top + Math.floor(size.height / 2);
        this.LastAutoAnchor = `${desert.source}:x=${desert.x}:bottom=${bottom}`;
        const bounds = this.SetArea(desert.x, centerY, size.width, size.height, 'below-desert-auto');
        return { ok: true, bounds, x: desert.x, bottom, source: desert.source };
    },
    Enable() {
        if (!(this.CenterX > 0 && this.CenterY > 0))
            return false;
        this.Enabled = true;
        if (this.Mode === 'disabled')
            this.Mode = 'saved';
        this.InvalidateDetection();
        this.Save();
        return true;
    },
    Disable() {
        this.Enabled = false;
        this.InvalidateDetection();
        this.Save();
    },
    Clear() {
        this.Reset();
        this.Save();
    },
    SetGeneratedBiomeActive(value) {
        const next = value === true;
        if (this.GeneratedBiomeActive === next)
            return;
        this.GeneratedBiomeActive = next;
        this.InvalidateDetection();
    },
    IsAvailable() {
        return this.Enabled === true || this.GeneratedBiomeActive === true;
    },
    ContainsTile(x, y, padding = 0) {
        if (!this.IsAvailable())
            return false;
        const px = Math.floor(Number(x) || 0);
        const py = Math.floor(Number(y) || 0);
        const p = Math.max(0, Math.floor(Number(padding) || 0));
        return px >= this.BoundsLeft - p
            && px <= this.BoundsRight + p
            && py >= this.BoundsTop - p
            && py <= this.BoundsBottom + p;
    },
    GetBounds() {
        return {
            left: this.BoundsLeft,
            right: this.BoundsRight,
            top: this.BoundsTop,
            bottom: this.BoundsBottom
        };
    },
    ContainsPlayer(player) {
        if (!this.IsAvailable() || !player)
            return false;
        const index = Math.max(0, Math.min(254, Math.floor(Number(Terraria.PlayerIndex(player)) || 0)));
        const tick = CurrentTick();
        let state = this.DetectionStates[index];
        if (state && state.revision === this.BoundsRevision && tick - state.tick < DETECTION_INTERVAL)
            return state.inside === true;
        const x = PlayerTileX(player);
        const y = PlayerTileY(player);
        const padding = state && state.inside === true ? EXIT_PADDING : 0;
        const inside = x >= this.BoundsLeft - padding
            && x <= this.BoundsRight + padding
            && y >= this.BoundsTop - padding
            && y <= this.BoundsBottom + padding;
        state = state || {};
        state.tick = tick;
        state.revision = this.BoundsRevision;
        state.x = x;
        state.y = y;
        state.inside = inside;
        this.DetectionStates[index] = state;
        return inside;
    },
    GetStatus(player = null) {
        let playerText = '';
        if (player) {
            const p = TilePosition(player);
            playerText = ` player=${p.x},${p.y} inside=${this.ContainsPlayer(player)}`;
        }
        const autoText = this.LastAutoAnchor ? ` autoAnchor=${this.LastAutoAnchor}` : '';
        return `enabled=${this.Enabled} generatedActive=${this.GeneratedBiomeActive} mode=${this.Mode} center=${this.CenterX},${this.CenterY} size=${this.Width}x${this.Height} bounds=${this.BoundsLeft}-${this.BoundsRight}/${this.BoundsTop}-${this.BoundsBottom}${autoText}${playerText}`;
    }
};
