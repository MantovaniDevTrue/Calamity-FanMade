import { Terraria, Modules } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ModNPC } from './../TL/ModNPC.js';
import { ModLocalization } from './../TL/ModLocalization.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime, SulphurousSeaAnchorTiles } from './SulphurousSeaTerrainRuntime.js';
import { SulphurousSeaMaterialRuntime } from './SulphurousSeaMaterialRuntime.js';

const { TileData } = Modules;
const PREFIX = 'calamity:acidrain:tier1:';
const NATURAL_BLOCK_KEY = 'calamity:acidrain:blockNatural';
const BUBBLE_INTERVAL = 90;
const BUBBLE_SCAN_INTERVAL = 30;
const MAX_BUBBLES = 6;
const MAX_PROJECTILES = 1000;
const ACTIVE_TILE = 0x20;
const DEFAULT_KILLS = 110;
const NO_KILL_TIMEOUT = 9000;
const INITIAL_RAIN_LOCK = 20;
const ENEMY_SPAWN_INTERVAL = 75;
const MAX_EVENT_ENEMIES = 6;

const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const NPCStatic = new NativeClass('Terraria', 'NPC');

function I(v, f = 0) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : f;
}

function N(v, f = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
}

function B(v) {
    if (v === true) return true;
    if (v === false || v == null) return false;
    try {
        const n = Number(v);
        if (Number.isFinite(n)) return n !== 0;
    } catch (_) { }
    return String(v).toLowerCase() === 'true';
}

function Tick() {
    try { return I(Terraria.Main.GameUpdateCount, 0); }
    catch (_) { return 0; }
}

function PlayerAt(i) {
    try { return Terraria.Main.player.get_Item(I(i)); }
    catch (_) { return null; }
}

function LocalPlayer() {
    try {
        const p = Terraria.Main.LocalPlayer;
        if (p) return p;
    } catch (_) { }
    try { return PlayerAt(Terraria.Main.myPlayer); }
    catch (_) { return null; }
}

function ProjectileAt(i) {
    try { return Terraria.Main.projectile.get_Item(I(i)); }
    catch (_) { return null; }
}

function ActiveTile(t) {
    if (!t) return false;
    try {
        const getter = t['short get_sTileHeader()'];
        if (getter) return (I(getter(), 0) & ACTIVE_TILE) !== 0;
    } catch (_) { }
    try { return (I(t.sTileHeader, 0) & ACTIVE_TILE) !== 0; }
    catch (_) { return false; }
}

function SulphSand(x, y, t) {
    const type = I(t?.type, 0);
    if (type === I(SulphurousSeaAnchorTiles.sand)) return true;
    if (type === 53 && SulphurousSeaPreviewRuntime.ContainsTile(x, y, 0)) return true;
    return SulphurousSeaMaterialRuntime.GetKindAt(x, y, type) === 'sand';
}

function EnoughWater(t) {
    return !ActiveTile(t) && N(t?.liquid) >= 220;
}

function Clamp(v, a, b) {
    return Math.max(a, Math.min(b, N(v)));
}

function Tell(key, r = 115, g = 194, b = 147) {
    try {
        const text = ModLocalization.Translate(key, true, false) || key;
        NewText(String(text), r, g, b);
    } catch (_) { }
}

let SavedNativeWeather = null;

function CaptureNativeWeather() {
    if (SavedNativeWeather) return;
    try {
        SavedNativeWeather = {
            raining: Terraria.Main.raining === true,
            rainTime: N(Terraria.Main.rainTime, 0),
            maxRaining: N(Terraria.Main.maxRaining, 0),
            windCurrent: N(Terraria.Main.windSpeedCurrent, 0),
            windTarget: N(Terraria.Main.windSpeedTarget, 0),
            cloudBG: N(Terraria.Main.cloudBGActive, 0),
            numClouds: I(Terraria.Main.numClouds, 0),
            numCloudsTemp: I(Terraria.Main.numCloudsTemp, 0)
        };
    } catch (_) {
        SavedNativeWeather = {};
    }
}

function Rain(on, strong = true) {
    // Android/TLPro adaptation: the vanilla rain renderer alone was enough to
    // drop this device to ~20 FPS even with zero Acid Rain enemies alive.
    // Preserve the Acid Rain event/music/biome state but suppress native rain
    // particles, clouds, lightning and strong wind while the event is active.
    try {
        if (on) {
            CaptureNativeWeather();
            Terraria.Main.raining = false;
            Terraria.Main.rainTime = 0;
            Terraria.Main.maxRaining = 0;
            try { Terraria.Main.weatherCounter = 0; } catch (_) { }
            Terraria.Main.windSpeedCurrent = 0.04;
            Terraria.Main.windSpeedTarget = 0.04;
            try { Terraria.Main.cloudBGActive = 0; } catch (_) { }
            try { Terraria.Main.numCloudsTemp = Math.min(I(Terraria.Main.numCloudsTemp, 0), 4); } catch (_) { }
            try { Terraria.Main.numClouds = Math.min(I(Terraria.Main.numClouds, 0), 4); } catch (_) { }
        } else {
            const w = SavedNativeWeather;
            SavedNativeWeather = null;
            if (!w) return;
            try { Terraria.Main.raining = w.raining === true; } catch (_) { }
            try { Terraria.Main.rainTime = Math.max(0, I(w.rainTime, 0)); } catch (_) { }
            try { Terraria.Main.maxRaining = Math.max(0, N(w.maxRaining, 0)); } catch (_) { }
            try { Terraria.Main.windSpeedCurrent = N(w.windCurrent, 0); } catch (_) { }
            try { Terraria.Main.windSpeedTarget = N(w.windTarget, 0); } catch (_) { }
            try { Terraria.Main.cloudBGActive = Math.max(0, N(w.cloudBG, 0)); } catch (_) { }
            try { Terraria.Main.numClouds = Math.max(0, I(w.numClouds, 0)); } catch (_) { }
            try { Terraria.Main.numCloudsTemp = Math.max(0, I(w.numCloudsTemp, 0)); } catch (_) { }
        }
    } catch (_) { }
}

function EyeDefeated() {
    try { if (B(Terraria.NPC.downedBoss1)) return true; } catch (_) { }
    try { if (B(NPCStatic.downedBoss1)) return true; } catch (_) { }
    try { if (B(Terraria.Main.hardMode)) return true; } catch (_) { }
    return false;
}

function TerrainReady() {
    if (B(SulphurousSeaTerrainRuntime.Generated)) return true;
    try {
        if (WorldDB.Instance && B(WorldDB.get(SulphurousSeaTerrainRuntime.Key('generated')))) return true;
    } catch (_) { }
    try {
        const state = String(WorldDB.get(SulphurousSeaTerrainRuntime.Key('state')) || '').toLowerCase();
        const version = I(WorldDB.get(SulphurousSeaTerrainRuntime.Key('version')), 0);
        const cursor = I(WorldDB.get(SulphurousSeaTerrainRuntime.Key('cursor')), 0);
        const total = Math.max(0, I(SulphurousSeaTerrainRuntime.GetTotalCells(), 0));
        if (version > 0 && state === 'complete') return true;
        if (version > 0 && total > 0 && cursor >= total) return true;
    } catch (_) { }
    try { if (SulphurousSeaPreviewRuntime.GeneratedBiomeActive === true) return true; } catch (_) { }
    return false;
}

function TerrainState() {
    try { return String(WorldDB.get(SulphurousSeaTerrainRuntime.Key('state')) || 'none'); }
    catch (_) { return 'none'; }
}

function DayTime() {
    try { return B(Terraria.Main.dayTime); }
    catch (_) { return true; }
}

function WorldTime() {
    try { return N(Terraria.Main.time, 0); }
    catch (_) { return 0; }
}

function RainActive() {
    try { return B(Terraria.Main.raining); }
    catch (_) { return false; }
}

function VanillaEventActive() {
    try { if (I(Terraria.Main.invasionType, 0) > 0) return true; } catch (_) { }
    try { if (B(Terraria.Main.slimeRain)) return true; } catch (_) { }
    try { if (B(Terraria.Main.eclipse)) return true; } catch (_) { }
    try { if (B(Terraria.Main.pumpkinMoon)) return true; } catch (_) { }
    try { if (B(Terraria.Main.snowMoon)) return true; } catch (_) { }
    try { if (Terraria.GameContent.Events.DD2Event.Ongoing) return true; } catch (_) { }
    return false;
}

export const AcidRainTier1Runtime = {
    Active: false,
    Completed: false,
    FirstAutoTriggered: false,
    KillsRemaining: DEFAULT_KILLS,
    RequiredKills: DEFAULT_KILLS,
    TimeSinceLastKill: 0,
    TimeSinceEventStarted: 0,
    NightRollDone: false,
    BubbleType: 0,
    LastBubbleAttempt: -9999,
    LastBubbleScan: -9999,
    CachedBubbleCount: 0,
    SpawnedBubbles: 0,
    LastSpawnX: 0,
    LastSpawnY: 0,
    LastFloorX: 0,
    LastFloorY: 0,
    LastFloorKind: '',
    LastError: '',
    UpdateCalls: 0,
    IdleProbe: 0,
    LastStartSource: 'none',
    EnemyTypes: null,
    LastEnemyAttempt: -9999,
    SpawnedEnemies: 0,
    FirstEnemySpawnLogged: false,
    CachedEnemySpawn: null,
    LastEnemySpawnSearch: -9999,
    LastProgressAnnounce: 0,

    Key(n) { return PREFIX + String(n); },

    Reset() {
        this.Active = false;
        this.Completed = false;
        this.FirstAutoTriggered = false;
        this.KillsRemaining = DEFAULT_KILLS;
        this.RequiredKills = DEFAULT_KILLS;
        this.TimeSinceLastKill = 0;
        this.TimeSinceEventStarted = 0;
        this.NightRollDone = false;
        this.BubbleType = 0;
        this.LastBubbleAttempt = -9999;
        this.LastBubbleScan = -9999;
        this.CachedBubbleCount = 0;
        this.SpawnedBubbles = 0;
        this.LastSpawnX = 0;
        this.LastSpawnY = 0;
        this.LastFloorX = 0;
        this.LastFloorY = 0;
        this.LastFloorKind = '';
        this.LastError = '';
        this.UpdateCalls = 0;
        this.IdleProbe = 0;
        this.LastStartSource = 'none';
        this.EnemyTypes = null;
        this.LastEnemyAttempt = -9999;
        this.SpawnedEnemies = 0;
        this.FirstEnemySpawnLogged = false;
        this.CachedEnemySpawn = null;
        this.LastEnemySpawnSearch = -9999;
        this.LastProgressAnnounce = 0;
    },

    Load() {
        this.Reset();
        this.Active = WorldDB.get(this.Key('active')) === true;
        this.Completed = WorldDB.get(this.Key('completed')) === true;
        this.FirstAutoTriggered = WorldDB.get(this.Key('firstAutoTriggered')) === true;
        const schemaVersion = I(WorldDB.get(this.Key('schemaVersion')), 0);
        // Older Tier 1 builds used a broader auto-start gate. Give unfinished legacy worlds
        // one clean post-EoC force-start under the completed event rules.
        if (schemaVersion < 3 && !this.Completed && !this.Active)
            this.FirstAutoTriggered = false;
        this.RequiredKills = Math.max(1, I(WorldDB.get(this.Key('requiredKills')), DEFAULT_KILLS));
        this.KillsRemaining = Math.max(0, I(WorldDB.get(this.Key('killsRemaining')), this.RequiredKills));
        this.TimeSinceLastKill = Math.max(0, I(WorldDB.get(this.Key('timeSinceLastKill')), 0));
        this.TimeSinceEventStarted = Math.max(0, I(WorldDB.get(this.Key('timeSinceEventStarted')), 0));
        this.SpawnedBubbles = Math.max(0, I(WorldDB.get(this.Key('spawnedBubbles')), 0));
        this.LastStartSource = String(WorldDB.get(this.Key('lastStartSource')) || 'none');
        if (this.Active && this.KillsRemaining <= 0) this.KillsRemaining = this.RequiredKills;
    },

    Save() {
        if (!WorldDB.Instance) return;
        WorldDB.set(this.Key('active'), this.Active === true);
        WorldDB.set(this.Key('completed'), this.Completed === true);
        WorldDB.set(this.Key('firstAutoTriggered'), this.FirstAutoTriggered === true);
        WorldDB.set(this.Key('requiredKills'), I(this.RequiredKills, DEFAULT_KILLS));
        WorldDB.set(this.Key('killsRemaining'), I(this.KillsRemaining, DEFAULT_KILLS));
        WorldDB.set(this.Key('timeSinceLastKill'), I(this.TimeSinceLastKill, 0));
        WorldDB.set(this.Key('timeSinceEventStarted'), I(this.TimeSinceEventStarted, 0));
        WorldDB.set(this.Key('spawnedBubbles'), I(this.SpawnedBubbles, 0));
        WorldDB.set(this.Key('lastStartSource'), String(this.LastStartSource || 'none'));
        WorldDB.set(this.Key('schemaVersion'), 3);
        try { WorldDB.Instance.Save(); } catch (_) { }
    },

    IsNaturalBlocked() {
        try { return WorldDB.get(NATURAL_BLOCK_KEY) === true; }
        catch (_) { return false; }
    },

    SetNaturalBlocked(value) {
        const enabled = value === true;
        try {
            if (WorldDB.Instance) {
                WorldDB.set(NATURAL_BLOCK_KEY, enabled);
                WorldDB.Instance.Save();
            }
        } catch (_) { }
        return enabled;
    },

    ToggleNaturalBlocked() {
        return this.SetNaturalBlocked(!this.IsNaturalBlocked());
    },

    CanStartFromProgress() {
        return EyeDefeated();
    },

    Start(forceRain = true, source = 'manual') {
        if (!TerrainReady())
            return { ok: false, reason: 'Generate the Sulphurous Sea foundation first.' };
        if (this.Active)
            return { ok: true, reason: '' };
        if (VanillaEventActive())
            return { ok: false, reason: 'Another event is already active.' };

        this.Active = true;
        this.RequiredKills = DEFAULT_KILLS;
        this.KillsRemaining = this.RequiredKills;
        this.TimeSinceLastKill = 0;
        this.TimeSinceEventStarted = 0;
        this.LastStartSource = String(source || 'manual');
        this.LastProgressAnnounce = 0;
        if (source === 'eoc') this.FirstAutoTriggered = true;
        if (forceRain) Rain(true, true);
        this.Save();
        Tell('Messages.AcidRainStart');
        this.AnnounceProgress(true);
        try {
            tl.log(`[CalamityPort AcidRain] Tier 1 started; source=${this.LastStartSource}; remaining=${this.KillsRemaining}.`);
        } catch (_) { }
        return { ok: true, reason: '' };
    },

    Stop(completed = false, announce = true, reason = 'manual') {
        const was = this.Active;
        if (!was) return false;
        this.Active = false;
        if (completed) {
            this.Completed = true;
            this.KillsRemaining = 0;
            try {
                if (WorldDB.Instance) {
                    WorldDB.set('calamity:world:downedEoCAcidRain', true);
                    WorldDB.set('calamity:world:acidRainTier1Completed', true);
                }
            } catch (_) { }
        }
        this.TimeSinceLastKill = 0;
        this.TimeSinceEventStarted = 0;
        if (announce && was) Tell('Messages.AcidRainEnd');
        Rain(false, false);
        this.Save();
        if (was) {
            try {
                tl.log(`[CalamityPort AcidRain] Tier 1 ended; completed=${completed}; reason=${reason}.`);
            } catch (_) { }
        }
        return was;
    },

    AnnounceProgress(force = false) {
        if (!this.Active && !force) return;
        const required = Math.max(1, I(this.RequiredKills, DEFAULT_KILLS));
        const remaining = Math.max(0, I(this.KillsRemaining, required));
        const defeated = Math.max(0, required - remaining);
        const percent = Math.max(0, Math.min(100, Math.round(defeated * 100 / required)));
        try {
            const name = ModLocalization.Translate('Messages.AcidRainName', true, false) || 'ACID RAIN';
            NewText(`${name}: ${defeated}/${required} (${percent}%)`, 115, 194, 147);
        } catch (_) { }
    },

    OnEnemyKill(points = 1) {
        if (!this.Active) return;
        this.TimeSinceLastKill = 0;
        this.KillsRemaining = Math.max(0, I(this.KillsRemaining, this.RequiredKills) - Math.max(1, I(points, 1)));

        const required = Math.max(1, I(this.RequiredKills, DEFAULT_KILLS));
        const defeated = Math.max(0, required - I(this.KillsRemaining, required));
        const milestone = Math.floor(defeated / 10) * 10;
        if (defeated >= required || milestone > this.LastProgressAnnounce) {
            this.LastProgressAnnounce = milestone;
            this.AnnounceProgress(true);
        }

        if (this.KillsRemaining <= 0) {
            this.Stop(true, true, 'completed');
            return;
        }
        if (milestone > 0 && defeated === milestone) this.Save();
    },

    GetProgressRatio() {
        const required = Math.max(1, I(this.RequiredKills, DEFAULT_KILLS));
        return Clamp(1 - I(this.KillsRemaining, required) / required, 0, 1);
    },

    ResolveBubbleType() {
        if (this.BubbleType <= 0)
            this.BubbleType = N(ModProjectile.getTypeByName('SulphuricAcidBubble'), 0);
        return this.BubbleType;
    },

    CountBubbles(force = false) {
        const tick = Tick();
        if (!force && tick - this.LastBubbleScan < BUBBLE_SCAN_INTERVAL)
            return this.CachedBubbleCount;
        this.LastBubbleScan = tick;
        const type = this.ResolveBubbleType();
        if (type <= 0) return this.CachedBubbleCount = 0;
        let count = 0;
        for (let i = 0; i < MAX_PROJECTILES; i++) {
            const p = ProjectileAt(i);
            if (p && p.active && I(p.type) === I(type)) count++;
        }
        return this.CachedBubbleCount = count;
    },

    CheckFloorColumn(x, minY, maxY) {
        for (let y = minY; y <= maxY; y++) {
            const floor = new TileData(x, y);
            if (!ActiveTile(floor) || !SulphSand(x, y, floor)) continue;
            const w1 = new TileData(x, y - 1);
            const w2 = new TileData(x, y - 2);
            if (!EnoughWater(w1) || !EnoughWater(w2)) continue;
            this.LastFloorX = x;
            this.LastFloorY = y - 1;
            this.LastFloorKind = I(floor.type) === I(SulphurousSeaAnchorTiles.sand)
                ? 'anchor'
                : (I(floor.type) === 53 ? 'legacy-sand' : 'tracked');
            return { x, y: y - 1 };
        }
        return null;
    },

    FindFloor(player, wide = false) {
        if (!player || !player.active || player.dead || !SulphurousSeaPreviewRuntime.ContainsPlayer(player))
            return null;
        const minX = I(SulphurousSeaPreviewRuntime.BoundsLeft + 4);
        const maxX = I(SulphurousSeaPreviewRuntime.BoundsRight - 4);
        const px = Clamp(I(Terraria.PlayerCenterX(player) / 16), minX, maxX);
        const py = I(Terraria.PlayerCenterY(player) / 16);
        const minY = Math.max(I(SulphurousSeaPreviewRuntime.BoundsTop + 4), py - 24);
        const maxY = Math.min(I(SulphurousSeaPreviewRuntime.BoundsBottom - 4), py + 90);

        if (this.LastFloorX >= minX && this.LastFloorX <= maxX && Math.abs(this.LastFloorX - px) <= 56) {
            const cached = this.CheckFloorColumn(
                this.LastFloorX,
                Math.max(minY, this.LastFloorY - 4),
                Math.min(maxY, this.LastFloorY + 5)
            );
            if (cached) return cached;
        }

        const reach = wide ? 72 : 48;
        for (let d = 0; d <= reach; d += 4) {
            const left = Clamp(px - d, minX, maxX);
            const a = this.CheckFloorColumn(left, minY, maxY);
            if (a) return a;
            if (d === 0) continue;
            const right = Clamp(px + d, minX, maxX);
            if (right !== left) {
                const b = this.CheckFloorColumn(right, minY, maxY);
                if (b) return b;
            }
        }
        this.LastFloorKind = 'none';
        return null;
    },

    SpawnBubble(x, y) {
        const type = this.ResolveBubbleType();
        if (type <= 0) return -1;
        try {
            const idx = NewProjectile(
                null,
                I(x) * 16 + 8,
                I(y) * 16 + 8,
                0,
                -0.1,
                type,
                0,
                2,
                I(Terraria.Main.myPlayer),
                0, 0, 0,
                null
            );
            if (idx < 0) return idx;
            this.SpawnedBubbles++;
            this.CachedBubbleCount++;
            this.LastSpawnX = I(x);
            this.LastSpawnY = I(y);
            const p = ProjectileAt(idx);
            if (p) p.netUpdate = true;
            return idx;
        } catch (e) {
            this.LastError = String(e);
            try { tl.log(`[CalamityPort AcidRain] bubble spawn failed ${e}`); } catch (_) { }
            return -1;
        }
    },

    SpawnNearPlayer(player, wide = false) {
        const floor = this.FindFloor(player, wide);
        return floor ? this.SpawnBubble(floor.x, floor.y) : -1;
    },


    ResolveEnemyTypes() {
        if (this.EnemyTypes) return this.EnemyTypes;
        this.EnemyTypes = {
            eel: N(ModNPC.getTypeByName('AcidEel'), 0),
            toad: N(ModNPC.getTypeByName('NuclearToad'), 0),
            radiator: N(ModNPC.getTypeByName('Radiator'), 0),
            skyfin: N(ModNPC.getTypeByName('Skyfin'), 0)
        };
        return this.EnemyTypes;
    },

    CountEventEnemies() {
        const t = this.ResolveEnemyTypes();
        let total = 0;
        for (const type of [t.eel, t.toad, t.radiator, t.skyfin]) {
            if (!(type > 0)) continue;
            try { total += Math.max(0, I(Terraria.NPC.CountNPCS(type), 0)); } catch (_) { }
        }
        return total;
    },

    FindEnemySpawn(player) {
        const minX = I(SulphurousSeaPreviewRuntime.BoundsLeft + 5);
        const maxX = I(SulphurousSeaPreviewRuntime.BoundsRight - 5);
        const minY = I(SulphurousSeaPreviewRuntime.BoundsTop + 3);
        const maxY = I(SulphurousSeaPreviewRuntime.BoundsBottom - 3);
        const px = Clamp(I(Terraria.PlayerCenterX(player) / 16), minX, maxX);
        const py = Clamp(I(Terraria.PlayerCenterY(player) / 16), minY, maxY);
        const tick = Tick();

        // Reuse a validated water cell for a few seconds. The terrain is static
        // during the event, so rescanning native tiles for every spawn is wasteful.
        const cached = this.CachedEnemySpawn;
        if (cached && tick - this.LastEnemySpawnSearch < 360 && Math.abs(px - cached.playerX) <= 28)
            return { x: cached.x, y: cached.y, water: cached.water, reads: 0, cached: true };

        const side = Math.random() < 0.5 ? -1 : 1;
        const distance = 48 + Math.floor(Math.random() * 18);
        let x = Clamp(px + side * distance, minX, maxX);
        if (Math.abs(x - px) < 28)
            x = Clamp(px - side * distance, minX, maxX);

        const y0 = Math.max(minY, py - 18);
        const y1 = Math.min(maxY, py + 48);
        let reads = 0;
        let result = null;
        for (let y = y0; y <= y1 && reads < 32; y++, reads++) {
            try {
                const tile = Terraria.Main.tile.get_Item(x, y);
                if (!tile) continue;
                let liquid = 0;
                try {
                    const getLiquid = tile['byte get_liquid()'];
                    liquid = getLiquid ? I(getLiquid(), 0) : I(tile.liquid, 0);
                } catch (_) { liquid = 0; }
                if (liquid < 180 || ActiveTile(tile)) continue;
                result = { x, y, water: true, reads, cached: false };
                break;
            } catch (_) { }
        }
        if (!result)
            result = { x, y: Clamp(py - 5, minY, maxY), water: false, reads, cached: false };

        this.CachedEnemySpawn = { x: result.x, y: result.y, water: result.water, playerX: px };
        this.LastEnemySpawnSearch = tick;
        return result;
    },

    SpawnEventEnemy(player) {
        if (!player || !player.active || player.dead || !this.Active) return -1;
        if (this.CountEventEnemies() >= MAX_EVENT_ENEMIES) return -1;
        const t = this.ResolveEnemyTypes();
        const point = this.FindEnemySpawn(player);
        let candidates = [];
        if (point.water) {
            if (t.eel > 0) candidates.push([t.eel, 1.0, 'AcidEel']);
            if (t.toad > 0) candidates.push([t.toad, 0.75, 'NuclearToad']);
            if (t.radiator > 0) candidates.push([t.radiator, 1.0, 'Radiator']);
            if (t.skyfin > 0) candidates.push([t.skyfin, 1.0, 'Skyfin']);
        } else if (t.toad > 0) {
            candidates.push([t.toad, 1.0, 'NuclearToad']);
        }
        if (!candidates.length) return -1;

        // Keep the official Nuclear Toad anti-spam cap.
        candidates = candidates.filter(c => {
            if (c[0] !== t.toad) return true;
            try { return I(Terraria.NPC.CountNPCS(t.toad), 0) < 5; } catch (_) { return true; }
        });
        if (!candidates.length) return -1;
        let total = candidates.reduce((a, c) => a + c[1], 0);
        let r = Math.random() * total;
        let chosen = candidates[candidates.length - 1];
        for (const c of candidates) { if (r < c[1]) { chosen = c; break; } r -= c[1]; }
        try {
            const idx = Terraria.NPC.NewNPC(
                Terraria.NPC.GetSpawnSourceForNaturalSpawn(),
                I(point.x * 16 + 8), I(point.y * 16 + 8), I(chosen[0]),
                0, 0, 0, 0, 0, 255
            );
            const i = I(idx, -1);
            if (i >= 0) {
                this.SpawnedEnemies++;
                if (!this.FirstEnemySpawnLogged) {
                    this.FirstEnemySpawnLogged = true;
                    let active = false, actual = -1;
                    try { const n = Terraria.Main.npc.get_Item(i); active = !!n?.active; actual = I(n?.type, -1); } catch (_) { }
                    try { tl.log(`[CalamityPort AcidRainSpawner] first direct spawn; name=${chosen[2]}; requested=${chosen[0]}; index=${i}; active=${active}; actualType=${actual}; water=${point.water}; tile=${point.x},${point.y}; reads=${point.reads}.`); } catch (_) { }
                }
            }
            return i;
        } catch (e) {
            this.LastError = `enemy spawn: ${e}`;
            try { tl.log(`[CalamityPort AcidRainSpawner] direct spawn failed: ${e}`); } catch (_) { }
            return -1;
        }
    },

    UpdateEventSpawns(player) {
        const tick = Tick();
        if (tick - this.LastEnemyAttempt < ENEMY_SPAWN_INTERVAL) return;
        this.LastEnemyAttempt = tick;
        this.SpawnEventEnemy(player);
    },

    TryNaturalStart(player, inside) {
        const day = DayTime();
        if (day)
            this.NightRollDone = false;

        if (this.Active || this.IsNaturalBlocked() || !this.CanStartFromProgress())
            return false;

        if (!this.Completed && !this.FirstAutoTriggered && inside) {
            this.FirstAutoTriggered = true;
            this.Save();
            const result = this.Start(false, 'eoc');
            if (result.ok) {
                try { tl.log('[CalamityPort AcidRain] first post-EoC Acid Rain force-started in the Sulphurous Sea.'); } catch (_) { }
                return true;
            }
        }

        if (day)
            return false;

        const time = WorldTime();
        if (time < 32398 || this.NightRollDone)
            return false;

        this.NightRollDone = true;
        const chance = this.Completed ? (1 / 300) : (1 / 3);
        if (Math.random() >= chance)
            return false;

        const result = this.Start(false, 'natural-night');
        if (result.ok) {
            try { tl.log(`[CalamityPort AcidRain] natural night roll succeeded; chance=${chance}.`); } catch (_) { }
            return true;
        }
        return false;
    },

    Update() {
        this.UpdateCalls++;
        // Natural event eligibility changes slowly. While Acid Rain is inactive,
        // probe at 4 Hz instead of crossing JS -> native/world metadata at 60 Hz.
        // Once active, event timing remains exactly one update per game tick.
        if (!this.Active) {
            this.IdleProbe = (I(this.IdleProbe, 0) + 1) % 15;
            if (this.IdleProbe !== 0) return;
        } else this.IdleProbe = 0;
        if (!TerrainReady()) return;

        const player = LocalPlayer();
        if (!player || !player.active || player.dead) return;
        const inside = SulphurousSeaPreviewRuntime.ContainsPlayer(player);

        if (!this.Active) {
            this.TryNaturalStart(player, inside);
            return;
        }

        this.TimeSinceEventStarted++;
        this.TimeSinceLastKill++;

        if (this.TimeSinceEventStarted <= INITIAL_RAIN_LOCK)
            Rain(true, true);

        if (this.TimeSinceLastKill >= NO_KILL_TIMEOUT) {
            this.Stop(false, true, 'no-kill-timeout');
            return;
        }

        if (!inside) return;

        // Event NPCs now use TLPro's own natural-spawn replacement path.
        // This avoids both the failed direct custom-NPC spawn and the extra
        // per-event tile-search loop.
        return;
    },

    IsBiomeReady() { return TerrainReady(); },

    GetStatus(player = null) {
        const inside = !!(player && SulphurousSeaPreviewRuntime.ContainsPlayer(player));
        const terrain = TerrainReady();
        const local = LocalPlayer();
        const runtimeInside = !!(local && SulphurousSeaPreviewRuntime.ContainsPlayer(local));
        const error = this.LastError ? ` error=${this.LastError.slice(0, 100)}` : '';
        let net = -1;
        let localIndex = -1;
        try { net = I(Terraria.Main.netMode, -1); } catch (_) { }
        try { localIndex = I(Terraria.PlayerIndex(local), -1); } catch (_) { }
        return `active=${this.Active} completed=${this.Completed} inside=${inside} runtimeInside=${runtimeInside} local=${localIndex} eoc=${this.CanStartFromProgress()} blocked=${this.IsNaturalBlocked()} terrain=${terrain} terrainState=${TerrainState()} net=${net} updates=${this.UpdateCalls} firstAuto=${this.FirstAutoTriggered} progress=${Math.floor(this.GetProgressRatio() * 100)}% remaining=${this.KillsRemaining}/${this.RequiredKills} noKill=${this.TimeSinceLastKill}/${NO_KILL_TIMEOUT} source=${this.LastStartSource} enemies=${this.CountEventEnemies()}/${MAX_EVENT_ENEMIES} enemySpawned=${this.SpawnedEnemies} bubbles=${this.CountBubbles(false)}/${MAX_BUBBLES} spawned=${this.SpawnedBubbles} floor=${this.LastFloorX},${this.LastFloorY}:${this.LastFloorKind || 'unknown'}${error}`;
    }
};
