import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';

const PREFIX = 'calamity:sulphursea:preview:';
const DETECTION_INTERVAL = 6;
const EXIT_PADDING = 8;
const VISUAL_HORIZONTAL_PADDING = 72;
const VISUAL_VERTICAL_PADDING = 18;
const COAST_BIOME_TOP = 35;

function BoolValue(value, fallback = false) {
    if (value === true) return true;
    if (value === false) return false;
    if (value == null) return fallback === true;
    try {
        const n = Number(value);
        if (Number.isFinite(n)) return n !== 0;
    } catch (e) { }
    const text = String(value).toLowerCase();
    if (text === 'true') return true;
    if (text === 'false') return false;
    return fallback === true;
}
function Clamp(value, min, max) {
    const n = Number(value) || 0;
    return Math.max(Number(min) || 0, Math.min(Number(max) || 0, n));
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

function WorldSurface() {
    try {
        return Math.max(80, Math.floor(Number(Terraria.Main.worldSurface) || 250));
    } catch (e) {
        return 250;
    }
}

function RockLayer() {
    try {
        return Math.max(WorldSurface() + 120, Math.floor(Number(Terraria.Main.rockLayer) || 600));
    } catch (e) {
        return 600;
    }
}

function CurrentTick() {
    try {
        return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
    } catch (e) {
        return 0;
    }
}

function PlayerTileX(player) {
    return Math.floor(Terraria.PlayerCenterX(player) / 16);
}

function PlayerTileY(player) {
    return Math.floor(Terraria.PlayerCenterY(player) / 16);
}

function OfficialWidth() {
    const maxX = MaxTilesX();
    if (maxX === 4200)
        return 370;
    if (maxX === 6400)
        return 445;
    return Math.max(280, Math.min(520, Math.floor(maxX / 16.8)));
}

function OfficialDepth() {
    const depth = Math.floor((RockLayer() + 112 - WorldSurface()) * (MaxTilesX() === 4200 ? 0.8 : (MaxTilesX() === 6400 ? 0.85 : 0.925)));
    return Math.max(220, Math.min(380, depth));
}

export const SulphurousSeaPreviewRuntime = {
    Enabled: false,
    GeneratedBiomeActive: false,
    CenterX: 0,
    CenterY: 0,
    Width: 370,
    Height: 280,
    AtLeft: true,
    Mode: 'disabled',
    BoundsLeft: 0,
    BoundsRight: 0,
    BoundsTop: 0,
    BoundsBottom: 0,
    BoundsRevision: 0,
    DetectionStates: new Array(255),
    VisualDetectionStates: new Array(255),
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
        this.VisualDetectionStates = new Array(255);
    },
    InvalidateDetection() {
        this.BoundsRevision++;
        this.DetectionStates = new Array(255);
        this.VisualDetectionStates = new Array(255);
    },
    Reset() {
        this.Enabled = false;
        this.GeneratedBiomeActive = false;
        this.CenterX = 0;
        this.CenterY = 0;
        this.Width = OfficialWidth();
        this.Height = OfficialDepth();
        this.AtLeft = true;
        this.Mode = 'disabled';
        this.RefreshBounds();
    },
    Load() {
        this.Reset();
        this.Enabled = BoolValue(WorldDB.get(this.Key('enabled')), false);
        this.CenterX = Math.floor(Number(WorldDB.get(this.Key('centerX'))) || 0);
        this.CenterY = Math.floor(Number(WorldDB.get(this.Key('centerY'))) || 0);
        this.Width = Math.max(160, Math.floor(Number(WorldDB.get(this.Key('width'))) || OfficialWidth()));
        this.Height = Math.max(140, Math.floor(Number(WorldDB.get(this.Key('height'))) || OfficialDepth()));
        this.AtLeft = BoolValue(WorldDB.get(this.Key('atLeft')), true);
        this.Mode = String(WorldDB.get(this.Key('mode')) || (this.Enabled ? 'saved' : 'disabled'));
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
        WorldDB.set(this.Key('atLeft'), this.AtLeft === true);
        WorldDB.set(this.Key('mode'), String(this.Mode || 'disabled'));
    },
    SetArea(centerX, centerY, width, height, atLeft, mode) {
        const maxX = MaxTilesX();
        const maxY = MaxTilesY();
        this.Width = Math.max(160, Math.min(560, Math.floor(Number(width) || OfficialWidth())));
        this.Height = Math.max(140, Math.min(420, Math.floor(Number(height) || OfficialDepth())));
        const halfW = Math.floor(this.Width / 2) + 10;
        const halfH = Math.floor(this.Height / 2) + 10;
        this.CenterX = Math.floor(Clamp(centerX, halfW, maxX - halfW));
        this.CenterY = Math.floor(Clamp(centerY, halfH, maxY - halfH));
        this.AtLeft = atLeft === true;
        this.Mode = String(mode || 'preview');
        this.Enabled = true;
        this.RefreshBounds();
        this.Save();
        return this.GetBounds();
    },
    PreviewHere(player) {
        const x = PlayerTileX(player);
        const y = PlayerTileY(player);
        return this.SetArea(x, y, 260, 180, x < MaxTilesX() / 2, 'preview-here');
    },
    AnchorDungeonOcean() {
        const maxX = MaxTilesX();
        let dungeonX = Math.floor(maxX / 2);
        try {
            dungeonX = Math.floor(Number(Terraria.Main.dungeonX) || dungeonX);
        } catch (e) { }
        const atLeft = dungeonX < maxX / 2;
        const width = OfficialWidth();
        const height = OfficialDepth();
        const margin = 12;
        const centerX = atLeft ? margin + Math.floor(width / 2) : maxX - margin - Math.floor(width / 2);
        const top = Math.max(35, WorldSurface() - 55);
        const centerY = top + Math.floor(height / 2);
        return this.SetArea(centerX, centerY, width, height, atLeft, atLeft ? 'dungeon-ocean-left' : 'dungeon-ocean-right');
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
        return px >= this.BoundsLeft - p && px <= this.BoundsRight + p
            && py >= this.BoundsTop - p && py <= this.BoundsBottom + p;
    },
    IsCoastalArea() {
        const mode = String(this.Mode || '');
        return this.GeneratedBiomeActive === true
            || mode.indexOf('dungeon-ocean') >= 0
            || mode.indexOf('generated-') >= 0;
    },
    BiomeTop(visual = false) {
        if (!this.IsCoastalArea())
            return this.BoundsTop - (visual ? VISUAL_VERTICAL_PADDING : 0);
        return COAST_BIOME_TOP;
    },
    ContainsPlayerCached(player, visual) {
        if (!this.IsAvailable() || !player)
            return false;
        const index = Math.max(0, Math.min(254, Math.floor(Number(Terraria.PlayerIndex(player)) || 0)));
        const tick = CurrentTick();
        const states = visual ? this.VisualDetectionStates : this.DetectionStates;
        let state = states[index];
        if (state && state.revision === this.BoundsRevision && tick - state.tick < DETECTION_INTERVAL)
            return state.inside === true;
        const x = PlayerTileX(player);
        const y = PlayerTileY(player);
        const wasInside = state && state.inside === true;
        const horizontal = visual ? VISUAL_HORIZONTAL_PADDING : 0;
        const bottomPadding = visual ? VISUAL_VERTICAL_PADDING : 0;
        const exit = wasInside ? EXIT_PADDING : 0;
        const top = this.BiomeTop(visual);
        const inside = x >= this.BoundsLeft - horizontal - exit && x <= this.BoundsRight + horizontal + exit
            && y >= top - exit && y <= this.BoundsBottom + bottomPadding + exit;
        state = state || {};
        state.tick = tick;
        state.revision = this.BoundsRevision;
        state.inside = inside;
        states[index] = state;
        return inside;
    },
    ContainsPlayer(player) {
        return this.ContainsPlayerCached(player, false);
    },
    ContainsPlayerVisual(player) {
        return this.ContainsPlayerCached(player, true);
    },
    GetBounds() {
        return { left: this.BoundsLeft, right: this.BoundsRight, top: this.BoundsTop, bottom: this.BoundsBottom };
    },
    GetStatus(player = null) {
        let playerText = '';
        if (player)
            playerText = ` player=${PlayerTileX(player)},${PlayerTileY(player)} inside=${this.ContainsPlayer(player)} visualInside=${this.ContainsPlayerVisual(player)}`;
        return `enabled=${this.Enabled} generatedActive=${this.GeneratedBiomeActive} side=${this.AtLeft ? 'left' : 'right'} mode=${this.Mode} center=${this.CenterX},${this.CenterY} size=${this.Width}x${this.Height} bounds=${this.BoundsLeft}-${this.BoundsRight}/${this.BoundsTop}-${this.BoundsBottom} biomeTop=${this.BiomeTop(false)} visualPad=${VISUAL_HORIZONTAL_PADDING}x${VISUAL_VERTICAL_PADDING}${playerText}`;
    }
};
