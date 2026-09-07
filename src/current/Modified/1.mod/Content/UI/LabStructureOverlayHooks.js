import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { Terraria } from './../../TL/ModImports.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { SulphurousScrapSchematics } from './../../Data/OfficialSchematics/SulphurousScrapSchematics.js';

const Main = new NativeClass('Terraria', 'Main');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const WorldGen = new NativeClass('Terraria', 'WorldGen');

const DRAW_SIG = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
const PLANETOID_KEY = 'calamity:structure:planetoidLab:';
const JUNGLE_KEY = 'calamity:structure:jungleLab:';
const ICE_KEY = 'calamity:structure:iceLab:';
const SUNKEN_KEY = 'calamity:structure:sunkenSeaLab:';
const UNDERWORLD_KEY = 'calamity:structure:underworldLab:';
const ONYX_KEY = 'calamity:structure:onyxLab:';
const SULPH_KEY = 'calamity:sulphursea:details:';
const SULPH_AMBIENCE_KEY = 'calamity:sulphursea:ambience:';
const ABYSS_AMBIENCE_KEY = 'calamity:abyss:ambience:';
const IRON_BALL_KEY = 'calamity:world:ironBall:';
const ABYSS_POT_PROXY_TILE = 28; // vanilla Pots; worldgen uses invisible coating + official overlay

const ABYSS_ATLAS_PATH = 'Textures/Tiles/Abyss/AbyssAmbientPacked/AbyssAmbientAtlas.png';
const ABYSS_ATLAS_FRAMES = {"tube:1":[252,168,48,48],"shalePile:1":[288,118,48,32],"shalePile:2":[338,118,48,32],"shalePile:3":[388,118,48,32],"pire:1":[438,118,48,48,2,168,48,48],"pire:2":[52,168,48,48,102,168,48,48],"pire:3":[152,168,48,48,202,168,48,48],"fossil:1":[302,168,48,32],"fossil:2":[352,168,48,32],"fossil:3":[402,168,48,32],"rib:1":[70,218,16,64],"rib:2":[88,218,16,48],"rib:3":[106,218,16,32],"rib:4":[124,218,16,48],"rib:5":[142,218,16,16],"plantPile:1":[138,118,48,32],"plantPile:2":[188,118,48,32],"plantPile:3":[238,118,48,32],"pearl:1":[288,84,32,16],"kelp:1":[146,2,32,80,180,2,32,80],"kelp:2":[214,2,32,80,248,2,32,80],"kelp:3":[282,2,32,64,316,2,32,64],"kelp:4":[350,2,32,48,384,2,32,48],"gravelPile:1":[138,84,48,32],"gravelPile:2":[188,84,48,32],"gravelPile:3":[238,84,48,32],"vent:1":[418,2,32,32],"vent:2":[452,2,32,32],"vent:3":[2,84,32,32],"crate:1":[322,84,32,32],"crate:2":[390,84,32,32],"crate:3":[458,84,32,32],"crate:4":[36,118,32,32],"crate:5":[70,118,32,32],"crate:6":[104,118,32,32],"coral:1":[2,2,16,16],"coral:2":[20,2,16,16],"coral:3":[38,2,16,16],"coral:4":[56,2,16,16],"coral:5":[74,2,16,16],"coral:6":[92,2,16,16],"coral:7":[110,2,16,16],"coral:8":[128,2,16,16],"abyssPot:1":[36,84,32,32],"abyssPot:2":[70,84,32,32],"abyssPot:3":[104,84,32,32],"sulphPot:1":[452,168,32,32],"sulphPot:2":[2,218,32,32],"sulphPot:3":[36,218,32,32],"viperVine:1":[322,218,16,16],"viperVine:2":[340,218,16,16],"viperVine:3":[358,218,16,16],"viperVine:4":[376,218,16,32],"viperVine:5":[394,218,16,32],"viperVine:6":[412,218,16,32],"viperVine:7":[430,218,16,48],"viperVine:8":[448,218,16,48],"viperVine:9":[466,218,16,48],"sulphVine:1":[160,218,16,16],"sulphVine:2":[178,218,16,16],"sulphVine:3":[196,218,16,16],"sulphVine:4":[214,218,16,32],"sulphVine:5":[232,218,16,32],"sulphVine:6":[250,218,16,32],"sulphVine:7":[268,218,16,48],"sulphVine:8":[286,218,16,48],"sulphVine:9":[304,218,16,48]};
function AbyssAtlasFrame(kind, variant) { return ABYSS_ATLAS_FRAMES[String(kind) + ':' + I(variant)] || null; }

function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function B(v) { if (typeof v === 'boolean') return v; try { return Number(v) !== 0; } catch (e) { return !!v; } }
function V(x, y) { const v = Vector2.new(); v.X = Number(x); v.Y = Number(y); return v; }
function R(x, y, w, h) { const r = Rectangle.new(); r.X = I(x); r.Y = I(y); r.Width = I(w); r.Height = I(h); return r; }
function IsGeneratingWorld() { try { return WorldGen.isGeneratingOrLoadingWorld === true; } catch (e) { return false; } }
function ScreenPosition() { return { x: Number(Main.screenPosition?.X || 0), y: Number(Main.screenPosition?.Y || 0) }; }
function VisiblePixels(x, y, w, h) {
    const sw = I(Main.screenWidth, 0), sh = I(Main.screenHeight, 0);
    return !(x > sw + 64 || y > sh + 64 || x + w < -64 || y + h < -64);
}
function LightingColor(x, y) {
    try { return Terraria.Lighting['Color GetColor(int x, int y)'](I(x), I(y)); } catch (e) { return Color.White; }
}
function LocalPlayerTile() {
    try {
        const p = Terraria.Main.LocalPlayer;
        if (!p || p.active === false) return null;
        try {
            return { x: Number(Terraria.PlayerCenterX(p)) / 16, y: Number(Terraria.PlayerCenterY(p)) / 16 };
        } catch (_) {
            return { x: (Number(p.position.X) + Number(p.width) * 0.5) / 16, y: (Number(p.position.Y) + Number(p.height) * 0.5) / 16 };
        }
    } catch (_) { return null; }
}
function ColorByte(c, k, fallback = 0) {
    try {
        const n = Number(c[k]);
        return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.floor(n))) : fallback;
    } catch (_) { return fallback; }
}
function ColorBrightness(c) {
    return ColorByte(c, 'R') + ColorByte(c, 'G') + ColorByte(c, 'B');
}
function BrighterColor(a, b) {
    if (!a) return b;
    if (!b) return a;
    return ColorBrightness(b) > ColorBrightness(a) ? b : a;
}
function SamplePlayerLight(playerTile) {
    if (!playerTile) return null;
    // Held lights are injected into Terraria's lighting grid around the player, not necessarily
    // with the brightest sample on the exact center tile. Take a tiny 5-point cross and keep the
    // brightest real Lighting color. Five native calls at 10 Hz is still negligible compared with
    // the old per-frame/per-chunk renderer and follows the same grid the vanilla tiles use.
    const cx = Math.floor(playerTile.x), cy = Math.floor(playerTile.y);
    const offsets = [[0,0],[-2,0],[2,0],[0,-2],[0,2]];
    let best = null;
    for (let i = 0; i < offsets.length; i++) {
        const c = LightingColor(cx + offsets[i][0], cy + offsets[i][1]);
        best = BrighterColor(best, c);
    }
    return best;
}
function LabResponsiveLight(base, playerLight, distanceTiles) {
    if (!playerLight || !Number.isFinite(distanceTiles) || distanceTiles >= 24) return base;
    // distanceTiles is now measured to the nearest point of the 16x16 chunk, not its center.
    // A chunk containing the player therefore receives almost the same lighting as the nearby
    // vanilla tiles, while the response still fades naturally over roughly a torch-sized radius.
    const t = Math.max(0, Math.min(0.97, (1 - distanceTiles / 24) * 0.97));
    if (t <= 0.001) return base;
    const br = ColorByte(base, 'R'), bg = ColorByte(base, 'G'), bb = ColorByte(base, 'B');
    const pr = ColorByte(playerLight, 'R', br), pg = ColorByte(playerLight, 'G', bg), pb = ColorByte(playerLight, 'B', bb);
    const r = Math.max(br, Math.floor(br + (pr - br) * t));
    const g = Math.max(bg, Math.floor(bg + (pg - bg) * t));
    const b = Math.max(bb, Math.floor(bb + (pb - bb) * t));
    try { return Color.new(r, g, b, 255); } catch (_) { return base; }
}
function IsSulphHostKey(k) {
    return k === '_' || k === 'SulphurousSandNoWater' || k === 'SulphurousSand' || k === 'SulphurousSandstone' || k === 'HardenedSulphurousSandstone';
}
function HasCustomVisual(entry) {
    if (!entry) return false;
    const tileKey = entry[0], wallKey = entry[1];
    const customTile = typeof tileKey === 'string' && !IsSulphHostKey(tileKey);
    const customWall = typeof wallKey === 'string' && wallKey !== '_';
    return customTile || customWall;
}

// Phase 13.08.7 mobile ambience LOD. The world metadata remains complete; only highly
// repetitive cosmetic overlays are deterministically thinned at render-cache build time.
// Functional/landmark objects are never removed. This avoids per-frame JS -> SpriteBatch
// calls without changing collision, loot, pots, enemy spawning or world data.
function AbyssAmbientHash(kind, left, top, variant) {
    let h = (((I(left) * 73856093) ^ (I(top) * 19349663) ^ (I(variant) * 83492791)) >>> 0);
    for (let i = 0; i < kind.length; i++) h = (((h * 33) ^ kind.charCodeAt(i)) >>> 0);
    return h >>> 0;
}
function KeepAbyssAmbient(kind, left, top, variant) {
    // Gameplay-interactive or visually distinctive objects stay at full density.
    if (kind === 'abyssPot' || kind === 'sulphPot' || kind === 'crate' || kind === 'vent' ||
        kind === 'pearl' || kind === 'kelp' || kind === 'pire') return true;
    const h = AbyssAmbientHash(kind, left, top, variant);
    // Coral blobs create many 1x1 overlay draws. Keep one quarter of cells; the shape and
    // color language remain visible while removing the largest draw-call population.
    if (kind === 'coral') return (h & 3) === 0;
    // Long vines are dense and purely decorative. Keep one third deterministically.
    if (kind === 'viperVine' || kind === 'sulphVine') return (h % 3) === 0;
    // Repeated floor clutter keeps half density.
    if (kind === 'tube' || kind === 'shalePile' || kind === 'plantPile' || kind === 'gravelPile') return (h & 1) === 0;
    // Fossils/ribs are less common; preserve two thirds.
    if (kind === 'fossil' || kind === 'rib') return (h % 3) !== 0;
    return true;
}

export class LabStructureOverlayHooks extends GlobalHooks {
    constructor() {
        super();
        this.Planetoid = null;
        this.Jungle = null;
        this.Ice = null;
        this.Sunken = null;
        this.Underworld = null;
        this.Onyx = null;
        this.SulphScrap = new Array(7).fill(null);
        this.SulphGlow = new Array(7).fill(null);
        this.SulphColumn = null;
        this.SulphAmbienceTextures = { crate: [], geyser: [], stalagmite: [], fossil: [], rib: [], stalactite: [] };
        this.AbyssAmbienceTextures = { tube: [], shalePile: [], pire: [], fossil: [], rib: [], plantPile: [], pearl: [], kelp: [], gravelPile: [], vent: [], crate: [], coral: [], abyssPot: [], sulphPot: [], viperVine: [], sulphVine: [] };
        this.AbyssAmbienceGlows = { pire: [], kelp: [], crate: [] };
        this.AbyssAmbience = [];
        this.AbyssAmbienceBuckets = new Map();
        this.AbyssAmbienceBounds = null;
        globalThis.CalamityAbyssPotCellRegistry = new Map(); // 32x32 tile buckets, keyed by X+Y.
        this.AbyssDrawPosition = null;
        this.AbyssDrawSource = null;
        this.AbyssDrawOrigin = null;
        this.AbyssAtlasTexture = null;
        this.AbyssAtlasWhite = null;
        this.AbyssAtlasEffectsNone = null;
        this.AbyssVisibleCacheKey = '';
        this.AbyssVisibleCandidates = [];
        this.AbyssFrameVisible = [];
        this.CachedSpriteDraw = null;
        this.AbyssAmbienceVersion = -1;
        this.AbyssAmbienceCount = -1;
        this.LoggedAbyssAmbience = false;
        this.RustyChestTexture = null;
        this.IronBallTexture = null;
        this.IronBallGlowTexture = null;
        this.IronBallTextureFailed = false;
        this.IronBallPositions = [];
        this.IronBallPositionsLoaded = false;
        this.IronBallBounds = null;
        this.LoadComplete = false;
        this.RejectedTexturePaths = [];
        this.LoggedIronBall = false;
        this.SulphAmbience = [];
        this.SulphRustyChests = [];
        this.SulphAmbienceVersion = -1;
        this.SulphAmbienceCount = -1;
        this.SulphChestCount = -1;
        this.LoggedSulphAmbience = false;
        this.LoggedRustyChest = false;
        this.Failed = false;
        this.Installed = false;
        this.LoggedDraw = false;
        this.LoggedSulphMetadata = false;
        this.LoggedSulphVisible = false;
        this.LoggedSulphAmbience = false;
        this.LoggedRustyChest = false;
        this.SulphAmbience = [];
        this.SulphRustyChests = [];
        this.SulphAmbienceVersion = -1; this.SulphAmbienceCount = -1; this.SulphChestCount = -1;
        this.LabAnchorCache = new Map();
        this.SulphDetailsLoaded = false;
        this.SulphScrapMeta = [];
        this.SulphColumnMeta = [];
        this.SulphDetailsBounds = null;
        this.SulphAmbienceBounds = null;
        this.ViewX = 0;
        this.ViewY = 0;
        this.ViewW = 1920;
        this.ViewH = 1080;
        // Mobile lab renderer scratch/cache. Reusing native structs avoids hundreds of
        // Vector2/Rectangle allocations per frame while standing inside a large lab.
        this.LabDrawPosition = Vector2.new();
        this.LabDrawSource = Rectangle.new();
        this.LabDrawOrigin = Vector2.new();
        this.LabDrawOrigin.X = 0; this.LabDrawOrigin.Y = 0;
        this.LabLightingCache = new Map();
        this.LabLightingEpoch = -1;
    }

    LoadGuardedTexture(path) {
        try {
            const texture = tl.texture.load(path);
            if (!texture) throw new Error('load returned null');
            // Force TLPro to resolve the native texture handle exactly once. If a dynamic
            // resource handle is missing from its dictionary, quarantine it here instead of
            // rediscovering the same KeyNotFoundException every gameplay frame.
            const width = I(texture.Width, -1);
            const height = I(texture.Height, -1);
            if (width <= 0 || height <= 0) throw new Error(`invalid dimensions ${width}x${height}`);
            return texture;
        } catch (e) {
            this.RejectedTexturePaths.push(String(path));
            try { tl.log(`[CalamityPort TextureGuard] rejected '${path}' once; ${e}`); } catch (_) { }
            return null;
        }
    }

    Load() {
        if (this.LoadComplete) return true;
        if (this.Failed) return false;
        try {
            this.Planetoid = tl.texture.load('Textures/Structures/LabOverlays/PlanetoidLabOverlay.png');
            this.Jungle = tl.texture.load('Textures/Structures/LabOverlays/JungleLabOverlay.png');
            this.Ice = tl.texture.load('Textures/Structures/LabOverlays/IceLabOverlay.png');
            this.Sunken = tl.texture.load('Textures/Structures/LabOverlays/SunkenSeaLabOverlay.png');
            this.Underworld = tl.texture.load('Textures/Structures/LabOverlays/UnderworldLabOverlay.png');
            this.Onyx = tl.texture.load('Textures/Structures/LabOverlays/OnyxLabOverlay.png');
            for (let i = 1; i <= 7; i++) {
                this.SulphScrap[i - 1] = tl.texture.load(`Textures/Structures/SulphurousScrapOverlays/SulphurousScrap${i}.png`);
                this.SulphGlow[i - 1] = tl.texture.load(`Textures/Structures/SulphurousScrapOverlays/SulphurousScrap${i}Glow.png`);
            }
            this.SulphColumn = tl.texture.load('Textures/Tiles/Abyss/SulphurousColumn.png');
            for (let i = 4; i <= 6; i++) this.SulphAmbienceTextures.crate.push(this.LoadGuardedTexture(`Textures/Tiles/Abyss/AbyssAmbient/PirateCrate${i}.png`));
            for (let i = 1; i <= 3; i++) this.SulphAmbienceTextures.geyser.push(this.LoadGuardedTexture(`Textures/Tiles/Abyss/SteamGeyser${i}.png`));
            for (let i = 1; i <= 6; i++) this.SulphAmbienceTextures.stalagmite.push(this.LoadGuardedTexture(`Textures/Tiles/Abyss/Stalactite/SulphurousStalacmite${i}.png`));
            for (let i = 1; i <= 3; i++) this.SulphAmbienceTextures.fossil.push(this.LoadGuardedTexture(`Textures/Tiles/Abyss/SulphuricFossil${i}.png`));
            for (let i = 1; i <= 5; i++) this.SulphAmbienceTextures.rib.push(this.LoadGuardedTexture(`Textures/Tiles/Abyss/SulphurousRib${i}.png`));
            for (let i = 1; i <= 6; i++) this.SulphAmbienceTextures.stalactite.push(this.LoadGuardedTexture(`Textures/Tiles/Abyss/Stalactite/SulphurousStalactite${i}.png`));

            // Phase 13.08.8: all 67 official Abyss ambience variants (plus the retained
            // kelp/pire glow variants) are packed into one 512x512 atlas. TLPro/SpriteBatch no
            // longer switches among dozens of Texture2D handles while walking through the Abyss.
            // World metadata, object density and the 13.08.7 visual LOD are unchanged.
            this.AbyssAtlasTexture = this.LoadGuardedTexture(ABYSS_ATLAS_PATH);
            if (!this.AbyssAtlasTexture) throw new Error('Abyss ambience atlas failed to load');
            this.AbyssAtlasWhite = Color.White;
            this.AbyssAtlasEffectsNone = SpriteEffects.None;

            // Keep the correct variant indexing while using a nearby official variant if TLPro
            // rejected a single native handle. If a whole family failed, those objects simply
            // skip their cosmetic overlay instead of hammering the exception logger.
            for (const list of Object.values(this.SulphAmbienceTextures)) {
                const fallback = list.find(texture => !!texture) || null;
                if (!fallback) continue;
                for (let i = 0; i < list.length; i++) if (!list[i]) list[i] = fallback;
            }
            // Keep the earlier Rusty Chest native-render fallback while 13.03.3 isolates the
            // actual 6596 source. The physical chest, interaction and loot are untouched.
            this.RustyChestTexture = null;
            if (!this.Planetoid || !this.Jungle || !this.Ice || !this.Sunken || !this.Underworld || !this.Onyx || !this.SulphColumn || this.SulphScrap.some(x => !x))
                throw new Error('critical overlay texture load returned null');
            if (I(this.Planetoid.Width) !== 105 * 16 || I(this.Planetoid.Height) !== 125 * 16)
                throw new Error(`Planetoid overlay size ${I(this.Planetoid.Width)}x${I(this.Planetoid.Height)} != 1680x2000`);
            if (I(this.Jungle.Width) !== 90 * 16 || I(this.Jungle.Height) !== 87 * 16)
                throw new Error(`Jungle overlay size ${I(this.Jungle.Width)}x${I(this.Jungle.Height)} != 1440x1392`);
            if (I(this.Ice.Width) !== 77 * 16 || I(this.Ice.Height) !== 92 * 16)
                throw new Error(`Ice overlay size ${I(this.Ice.Width)}x${I(this.Ice.Height)} != 1232x1472`);
            if (I(this.Sunken.Width) !== 119 * 16 || I(this.Sunken.Height) !== 93 * 16)
                throw new Error(`Sunken overlay size ${I(this.Sunken.Width)}x${I(this.Sunken.Height)} != 1904x1488`);
            if (I(this.Underworld.Width) !== 139 * 16 || I(this.Underworld.Height) !== 75 * 16)
                throw new Error(`Underworld overlay size ${I(this.Underworld.Width)}x${I(this.Underworld.Height)} != 2224x1200`);
            if (I(this.Onyx.Width) !== 129 * 16 || I(this.Onyx.Height) !== 67 * 16)
                throw new Error(`Onyx overlay size ${I(this.Onyx.Width)}x${I(this.Onyx.Height)} != 2064x1072`);
            for (let i = 0; i < 7; i++) {
                const s = SulphurousScrapSchematics[i];
                if (!s) throw new Error(`Sulphurous Scrap ${i + 1} schematic metadata missing`);
                if (I(this.SulphScrap[i].Width) !== I(s.width) * 16 || I(this.SulphScrap[i].Height) !== I(s.height) * 16)
                    throw new Error(`Sulphurous Scrap ${i + 1} overlay size mismatch`);
            }
            if (I(this.SulphColumn.Width) < 106 || I(this.SulphColumn.Height) < 54)
                throw new Error(`SulphurousColumn texture too small: ${I(this.SulphColumn.Width)}x${I(this.SulphColumn.Height)}`);
            this.LoadComplete = true;
            if (this.RejectedTexturePaths.length > 0) {
                try { tl.log(`[CalamityPort TextureGuard] Sulphurous ambience loaded with ${this.RejectedTexturePaths.length} quarantined handle(s): ${this.RejectedTexturePaths.join(' | ')}.`); } catch (_) { }
            }
            return true;
        } catch (e) {
            this.Failed = true;
            try { tl.log(`[CalamityPort LabOverlay] texture load failed: ${e}`); } catch (_) { }
            return false;
        }
    }

    RefreshView() {
        try {
            this.ViewX = Number(Main.screenPosition?.X || 0);
            this.ViewY = Number(Main.screenPosition?.Y || 0);
            this.ViewW = Math.max(1, I(Main.screenWidth, 1920));
            this.ViewH = Math.max(1, I(Main.screenHeight, 1080));
        } catch (_) {
            this.ViewX = 0; this.ViewY = 0; this.ViewW = 1920; this.ViewH = 1080;
        }
    }

    ViewVisible(x, y, w, h) {
        return !(x > this.ViewW + 64 || y > this.ViewH + 64 || x + w < -64 || y + h < -64);
    }

    GetLabAnchor(key) {
        if (this.LabAnchorCache.has(key)) return this.LabAnchorCache.get(key);
        if (!WorldDB.Instance) return null;
        let anchor = null;
        try {
            if (B(WorldDB.get(key + 'generated'))) {
                const left = I(WorldDB.get(key + 'left'), -1), top = I(WorldDB.get(key + 'top'), -1);
                if (left >= 0 && top >= 0) anchor = { left, top };
            }
        } catch (_) { }
        this.LabAnchorCache.set(key, anchor);
        return anchor;
    }

    DrawLab(texture, key, widthTiles, heightTiles, draw) {
        if (!texture) return;
        const anchor = this.GetLabAnchor(key);
        if (!anchor) return;
        const left = anchor.left, top = anchor.top;
        const x = left * 16 - this.ViewX, y = top * 16 - this.ViewY;
        const pixelW = widthTiles * 16, pixelH = heightTiles * 16;
        if (!this.ViewVisible(x, y, pixelW, pixelH)) return;

        // v21.4.3 lighting pass: 8x8 chunks restore a visibly local torch/light gradient while
        // staying substantially cheaper than the old 6x6 renderer. Lighting samples are refreshed
        // at ~30 Hz so moving held lights respond immediately instead of stepping in coarse 10 Hz/16x16 blocks, and
        // native Vector2/Rectangle scratch objects are reused instead of allocated every draw.
        const chunkTiles = 8;
        const epoch = Math.floor(Date.now() / 33);
        if (epoch !== this.LabLightingEpoch) {
            this.LabLightingEpoch = epoch;
            // Keep the map bounded. Only currently/very recently visible chunk samples matter.
            if (this.LabLightingCache.size > 512) this.LabLightingCache.clear();
        }
        const playerTile = LocalPlayerTile();
        // v18: sample a small cross in Terraria's real lighting grid. Held torches can have their
        // brightest cell beside the player's center, so a single center sample was still too dark.
        // This remains cached at 10 Hz and costs only five native calls per visible lab per epoch.
        let playerLight = null;
        if (playerTile) {
            const pk = `player:${epoch}`;
            const pc = this.LabLightingCache.get(pk);
            if (pc && pc.epoch === epoch) playerLight = pc.color;
            else {
                playerLight = SamplePlayerLight(playerTile);
                this.LabLightingCache.set(pk, { epoch, color: playerLight });
            }
        }
        const pos = this.LabDrawPosition, src = this.LabDrawSource, origin = this.LabDrawOrigin;
        for (let tileY = 0; tileY < heightTiles; tileY += chunkTiles) {
            const chunkH = Math.min(chunkTiles, heightTiles - tileY);
            const py = y + tileY * 16;
            for (let tileX = 0; tileX < widthTiles; tileX += chunkTiles) {
                const chunkW = Math.min(chunkTiles, widthTiles - tileX);
                const px = x + tileX * 16;
                if (!this.ViewVisible(px, py, chunkW * 16, chunkH * 16)) continue;
                const sampleX = left + tileX + Math.floor(chunkW * 0.5);
                const sampleY = top + tileY + Math.floor(chunkH * 0.5);
                const cacheKey = `${key}${tileX}:${tileY}`;
                let cached = this.LabLightingCache.get(cacheKey);
                if (!cached || cached.epoch !== epoch) {
                    cached = { epoch, color: LightingColor(sampleX, sampleY) };
                    this.LabLightingCache.set(cacheKey, cached);
                }
                let drawColor = cached.color;
                if (playerTile && playerLight) {
                    // Measure from the player to the nearest tile inside this chunk. Using the
                    // chunk center was the remaining v17 bug: on a 16x16 chunk the center may be
                    // 8-11 tiles away even while the player/torch is touching the artwork.
                    const minX = left + tileX, minY = top + tileY;
                    const maxX = minX + chunkW - 1, maxY = minY + chunkH - 1;
                    const nearX = Math.max(minX, Math.min(maxX, playerTile.x));
                    const nearY = Math.max(minY, Math.min(maxY, playerTile.y));
                    const dx = nearX - playerTile.x, dy = nearY - playerTile.y;
                    const nearDist = Math.sqrt(dx * dx + dy * dy);

                    // For chunks inside the held-light radius, take one real grid sample at the
                    // point closest to the player. This captures the same torch gradient visible
                    // on vanilla walls without increasing SpriteBatch draw calls.
                    if (nearDist < 24) {
                        const nk = `${key}${tileX}:${tileY}:near`;
                        let nc = this.LabLightingCache.get(nk);
                        if (!nc || nc.epoch !== epoch) {
                            nc = { epoch, color: LightingColor(Math.round(nearX), Math.round(nearY)) };
                            this.LabLightingCache.set(nk, nc);
                        }
                        drawColor = BrighterColor(drawColor, nc.color);
                    }
                    drawColor = LabResponsiveLight(drawColor, playerLight, nearDist);
                }
                pos.X = px; pos.Y = py;
                src.X = tileX * 16; src.Y = tileY * 16;
                src.Width = chunkW * 16; src.Height = chunkH * 16;
                draw(texture, pos, src, drawColor, 0, origin, 1, SpriteEffects.None, 0);
            }
        }
        if (!this.LoggedDraw) { this.LoggedDraw = true; try { tl.log('[CalamityPort LabOverlay] v21.4.3 dynamic lighting active; 8x8 chunks + ~30Hz cache + nearest-grid held-light response.'); } catch (_) { } }
    }

    RefreshSulphurousDetailsCache() {
        if (this.SulphDetailsLoaded || !WorldDB.Instance) return;
        this.SulphDetailsLoaded = true;
        const scraps = Math.max(0, I(WorldDB.get(SULPH_KEY + 'scrapCount'), 0));
        const columns = Math.max(0, I(WorldDB.get(SULPH_KEY + 'columnCount'), 0));
        if (!B(WorldDB.get(SULPH_KEY + 'generated')) && scraps <= 0 && columns <= 0) return;
        let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
        for(let i=0;i<scraps;i++){
            const k=`${SULPH_KEY}scrap:${i}:`, m={index:i,left:I(WorldDB.get(k+'left'),-1),top:I(WorldDB.get(k+'top'),-1),width:I(WorldDB.get(k+'width')),height:I(WorldDB.get(k+'height')),variant:Math.max(1,Math.min(7,I(WorldDB.get(k+'variant'),1))),cells:[]};
            if(m.left<0||m.top<0||m.width<=0||m.height<=0)continue;
            const schematic=SulphurousScrapSchematics[m.variant-1];
            if(schematic){const rows=schematic.rows,palette=schematic.palette;for(let y=0;y<m.height&&y<schematic.height;y++){const row=rows[y];if(!row)continue;for(let x=0;x<m.width&&x<schematic.width;x++){if(!HasCustomVisual(palette[row[x]]))continue;m.cells.push({x,y,sx:x*16,sy:y*16});}}}
            this.SulphScrapMeta.push(m);minX=Math.min(minX,m.left);minY=Math.min(minY,m.top);maxX=Math.max(maxX,m.left+m.width);maxY=Math.max(maxY,m.top+m.height);
        }
        for(let i=0;i<columns;i++){
            const k=`${SULPH_KEY}column:${i}:`, m={index:i,left:I(WorldDB.get(k+'left'),-1),top:I(WorldDB.get(k+'top'),-1),bottom:I(WorldDB.get(k+'bottom'),-1),variant:Math.max(0,Math.min(2,I(WorldDB.get(k+'variant'),0)))};
            if(m.left<0||m.top<0||m.bottom<m.top)continue;
            this.SulphColumnMeta.push(m);minX=Math.min(minX,m.left);minY=Math.min(minY,m.top);maxX=Math.max(maxX,m.left+2);maxY=Math.max(maxY,m.bottom+1);
        }
        if(maxX>minX&&maxY>minY)this.SulphDetailsBounds={left:minX,top:minY,right:maxX,bottom:maxY};
        if(!this.LoggedSulphMetadata){this.LoggedSulphMetadata=true;const a=this.SulphScrapMeta[0],c=this.SulphColumnMeta[0];try{tl.log(`[CalamityPort SulphDetails] cached metadata armed; scraps=${this.SulphScrapMeta.length}, columns=${this.SulphColumnMeta.length}, firstScrap=${a?a.left+','+a.top:'<none>'}, firstColumn=${c?c.left+','+c.top+'..'+c.bottom:'<none>'}.`);}catch(_){}}
    }

    BoundsVisible(bounds){if(!bounds)return false;return this.ViewVisible(bounds.left*16-this.ViewX,bounds.top*16-this.ViewY,(bounds.right-bounds.left)*16,(bounds.bottom-bounds.top)*16);}

    DrawSulphScrap(index, draw) {
        const m=this.SulphScrapMeta[index];if(!m)return false;
        const {left,top,width,height,variant}=m,x0=left*16-this.ViewX,y0=top*16-this.ViewY;
        if(!this.ViewVisible(x0,y0,width*16,height*16))return false;
        const texture=this.SulphScrap[variant-1],glow=this.SulphGlow[variant-1];if(!texture)return false;
        const pos=this.LabDrawPosition,src=this.LabDrawSource,origin=this.LabDrawOrigin;
        for(const cell of m.cells){const px=x0+cell.x*16,py=y0+cell.y*16;if(!this.ViewVisible(px,py,16,16))continue;pos.X=px;pos.Y=py;src.X=cell.sx;src.Y=cell.sy;src.Width=16;src.Height=16;draw(texture,pos,src,LightingColor(left+cell.x,top+cell.y),0,origin,1,SpriteEffects.None,0);}
        if(glow){pos.X=x0;pos.Y=y0;draw(glow,pos,null,Color.White,0,origin,1,SpriteEffects.None,0);}
        if(!this.LoggedSulphVisible){this.LoggedSulphVisible=true;try{tl.log(`[CalamityPort SulphDetails] visible official scrap renderer active; index=${m.index}, variant=${variant}, left=${left}, top=${top}, size=${width}x${height}.`);}catch(_){}}
        return true;
    }

    DrawSulphColumn(index, draw) {
        const m=this.SulphColumnMeta[index];if(!m||!this.SulphColumn)return false;
        const {left,top,bottom,variant}=m,x0=left*16-this.ViewX,y0=top*16-this.ViewY;
        if(!this.ViewVisible(x0,y0,32,(bottom-top+1)*16))return false;
        const pos=this.LabDrawPosition,src=this.LabDrawSource,origin=this.LabDrawOrigin;
        for(let y=top;y<=bottom;y++){const fy=y===top?0:(y===bottom?36:18);for(let dx=0;dx<2;dx++){const fx=variant*36+dx*18;pos.X=(left+dx)*16-this.ViewX;pos.Y=y*16-this.ViewY;src.X=fx;src.Y=fy;src.Width=16;src.Height=16;draw(this.SulphColumn,pos,src,LightingColor(left+dx,y),0,origin,1,SpriteEffects.None,0);}}
        if(!this.LoggedSulphVisible){this.LoggedSulphVisible=true;try{tl.log(`[CalamityPort SulphDetails] visible official column renderer active; index=${m.index}, left=${left}, top=${top}, bottom=${bottom}, variant=${variant}.`);}catch(_){}}
        return true;
    }

    DrawSulphurousDetails(draw){this.RefreshSulphurousDetailsCache();if(!this.BoundsVisible(this.SulphDetailsBounds))return;for(let i=0;i<this.SulphScrapMeta.length;i++)this.DrawSulphScrap(i,draw);for(let i=0;i<this.SulphColumnMeta.length;i++)this.DrawSulphColumn(i,draw);}

    RefreshSulphurousAmbienceCache() {
        if (!WorldDB.Instance || this.SulphAmbienceVersion >= 0) return;
        const version = I(WorldDB.get(SULPH_AMBIENCE_KEY + 'version'), 0);
        const count = Math.max(0, I(WorldDB.get(SULPH_AMBIENCE_KEY + 'count'), 0));
        const chestCount = Math.max(0, I(WorldDB.get(SULPH_AMBIENCE_KEY + 'chestCount'), 0));
        const objects = [];
        for (let i = 0; i < count; i++) {
            const k = SULPH_AMBIENCE_KEY + `obj:${i}:`;
            const kind = String(WorldDB.get(k + 'kind') || '');
            const left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1);
            const width = I(WorldDB.get(k + 'width')), height = I(WorldDB.get(k + 'height'));
            const variant = Math.max(1, I(WorldDB.get(k + 'variant'), 1));
            if (!this.SulphAmbienceTextures[kind] || left < 0 || top < 0 || width <= 0 || height <= 0) continue;
            objects.push({ kind, left, top, width, height, variant, drawYOffset: I(WorldDB.get(k + 'drawYOffset'), 0) });
        }
        const chests = [];
        for (let i = 0; i < chestCount; i++) {
            const k = SULPH_AMBIENCE_KEY + `chest:${i}:`;
            const left = I(WorldDB.get(k + 'left'), -1), top = I(WorldDB.get(k + 'top'), -1);
            if (left < 0 || top < 0) continue;
            chests.push({ left, top, index: I(WorldDB.get(k + 'index'), -1), kind: String(WorldDB.get(k + 'kind') || '') });
        }
        this.SulphAmbience = objects;
        this.SulphRustyChests = chests;
        if(objects.length>0){let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;for(const o of objects){minX=Math.min(minX,o.left);minY=Math.min(minY,o.top);maxX=Math.max(maxX,o.left+o.width);maxY=Math.max(maxY,o.top+o.height+Math.ceil(Math.abs(o.drawYOffset)/16));}this.SulphAmbienceBounds={left:minX,top:minY,right:maxX,bottom:maxY};}
        this.SulphAmbienceVersion = version;
        this.SulphAmbienceCount = count;
        this.SulphChestCount = chestCount;
        if ((count > 0 || chestCount > 0) && !this.LoggedSulphAmbience) {
            this.LoggedSulphAmbience = true;
            try { tl.log(`[CalamityPort SulphAmbience] unified renderer armed; objects=${objects.length}/${count}, rustyChests=${chests.length}/${chestCount}.`); } catch (_) { }
        }
    }

    DrawSulphurousAmbience(draw) {
        this.RefreshSulphurousAmbienceCache();
        if(!this.BoundsVisible(this.SulphAmbienceBounds))return;
        for (const o of this.SulphAmbience) {
            const textures = this.SulphAmbienceTextures[o.kind];
            const texture = textures && textures[o.variant - 1];
            if (!texture) continue;
            const x0 = o.left * 16 - this.ViewX, y0 = o.top * 16 - this.ViewY + o.drawYOffset;
            if (!this.ViewVisible(x0, y0, o.width * 16, o.height * 16 + Math.abs(o.drawYOffset))) continue;
            const pos=this.LabDrawPosition,src=this.LabDrawSource,origin=this.LabDrawOrigin;
            for (let y = 0; y < o.height; y++) {
                for (let x = 0; x < o.width; x++) {
                    const sx = x * 18, sy = y * 18;
                    if (sx + 16 > I(texture.Width) || sy + 16 > I(texture.Height)) continue;
                    pos.X=x0+x*16;pos.Y=y0+y*16;src.X=sx;src.Y=sy;src.Width=16;src.Height=16;draw(texture,pos,src,LightingColor(o.left+x,o.top+y),0,origin,1,SpriteEffects.None,0);
                }
            }
        }
        // Rusty Chests keep the native Chest tile renderer while the 13.03.3 guard isolates
        // the true 6596 source. Loot, interaction and registry indices are untouched.
        if (this.SulphRustyChests.length > 0 && !this.LoggedRustyChest) {
            this.LoggedRustyChest = true;
            const c = this.SulphRustyChests[0];
            try { tl.log(`[CalamityPort SulphAmbience] Rusty Chest native-render safe path active; custom overlay disabled; chests=${this.SulphRustyChests.length}, first=${c.left},${c.top}#${c.index}.`); } catch (_) { }
        }
    }

    AbyssBucketKey(bx, by) { return I(bx) * 256 + I(by); }

    EnsureAbyssDrawScratch() {
        if (this.AbyssDrawPosition && this.AbyssDrawSource && this.AbyssDrawOrigin) return true;
        try {
            this.AbyssDrawPosition = Vector2.new();
            this.AbyssDrawSource = Rectangle.new();
            this.AbyssDrawOrigin = Vector2.new();
            this.AbyssDrawOrigin.X = 0; this.AbyssDrawOrigin.Y = 0;
            return true;
        } catch (_) { return false; }
    }

    RefreshAbyssAmbienceCache() {
        if (!WorldDB.Instance || this.AbyssAmbienceVersion >= 0) return;
        const version = I(WorldDB.get(ABYSS_AMBIENCE_KEY + 'version'), 0);
        const count = Math.max(0, I(WorldDB.get(ABYSS_AMBIENCE_KEY + 'count'), 0));
        const objects = [];
        let raw = '[]';
        try {
            const chunkCount = Math.max(0, I(WorldDB.get(ABYSS_AMBIENCE_KEY + 'chunkCount'), 0));
            if (chunkCount > 0) {
                const parts = [];
                let complete = true;
                for (let i = 0; i < chunkCount; i++) {
                    const part = WorldDB.get(ABYSS_AMBIENCE_KEY + `chunk:${i}`);
                    if (typeof part !== 'string') { complete = false; break; }
                    parts.push(part);
                }
                raw = complete ? parts.join('') : '[]';
            } else {
                // Legacy 13.06/13.07 worlds stored one oversized string. BinarySerializer's
                // one-byte string length can truncate it; keep this fallback only for worlds
                // whose legacy value happens to be valid.
                raw = String(WorldDB.get(ABYSS_AMBIENCE_KEY + 'data') || '[]');
            }
        } catch (_) { raw = '[]'; }
        try {
            const rows = JSON.parse(raw);
            if (Array.isArray(rows)) for (const row of rows) {
                if (!Array.isArray(row) || row.length < 7) continue;
                const kind = String(row[0] || ''), variant = Math.max(1, I(row[1], 1));
                const left = I(row[2], -1), top = I(row[3], -1), width = I(row[4]), height = I(row[5]), drawYOffset = I(row[6]);
                const frame = AbyssAtlasFrame(kind, variant);
                if (!frame || left < 0 || top < 0 || width <= 0 || height <= 0) continue;
                if (!KeepAbyssAmbient(kind, left, top, variant)) continue;
                // Cache world geometry AND atlas source rectangles now. DrawNPCs does no
                // per-object texture dictionary lookup and touches one Texture2D for the whole pass.
                objects.push({
                    kind, variant, left, top, width, height, drawYOffset,
                    pixelLeft: left * 16, pixelTop: top * 16 + drawYOffset,
                    pixelW: I(frame[2], width * 16), pixelH: I(frame[3], height * 16),
                    srcX: I(frame[0]), srcY: I(frame[1]), srcW: I(frame[2]), srcH: I(frame[3]),
                    glowX: frame.length >= 8 ? I(frame[4], -1) : -1,
                    glowY: frame.length >= 8 ? I(frame[5], -1) : -1,
                    glowW: frame.length >= 8 ? I(frame[6]) : 0,
                    glowH: frame.length >= 8 ? I(frame[7]) : 0,
                    centerX: left + Math.floor(width / 2), centerY: top + Math.floor(height / 2),
                    potValid: true
                });
            }
        } catch (e) {
            try {
                const cc = Math.max(0, I(WorldDB.get(ABYSS_AMBIENCE_KEY + 'chunkCount'), 0));
                tl.log(`[CalamityPort AbyssAmbient] metadata parse failed safely: ${e}; chunks=${cc}, legacy=${cc <= 0}.`);
            } catch (_) { }
        }
        // 13.06.1: bucket on both axes. The old X-only bucket made an Abyss screen visit
        // iterate pots/vines at every depth and, for pots, perform native tile reads off-screen.
        const buckets = new Map();
        const potCells = new Map();
        for (const o of objects) {
            const bx = Math.floor(o.left / 32), by = Math.floor(o.top / 32);
            const key = this.AbyssBucketKey(bx, by);
            let list = buckets.get(key); if (!list) { list = []; buckets.set(key, list); }
            list.push(o);

            // Pot overlays are backed by a vanilla 2x2 pot proxy. Register each cell once so
            // the existing GlobalTile KillTile/OnReplace callbacks can invalidate the overlay
            // immediately. This removes all native tile.get_Item polling from DrawNPCs.
            if (o.kind === 'abyssPot' || o.kind === 'sulphPot') {
                for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
                    potCells.set(`${o.left + dx}:${o.top + dy}`, o);
            }
        }
        globalThis.CalamityAbyssPotCellRegistry = potCells;
        this.AbyssAmbience = objects; this.AbyssAmbienceBuckets = buckets;
        this.AbyssAmbienceBounds = null;
        if(objects.length>0){let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;for(const o of objects){minX=Math.min(minX,o.left);minY=Math.min(minY,o.top);maxX=Math.max(maxX,o.left+o.width);maxY=Math.max(maxY,o.top+o.height+Math.ceil(Math.abs(o.drawYOffset)/16));}this.AbyssAmbienceBounds={left:minX,top:minY,right:maxX,bottom:maxY};}
        this.AbyssAmbienceVersion = version; this.AbyssAmbienceCount = count;
        if (objects.length > 0 && !this.LoggedAbyssAmbience) {
            this.LoggedAbyssAmbience = true;
            try { tl.log(`[CalamityPort AbyssAmbient] single-atlas renderer armed; rendered=${objects.length}/${count}, buckets=${buckets.size}, version=${version}; atlas=512x512, visible-set cache=8 tiles, pots=event-driven, 13.08.7 LOD preserved.`); } catch (_) { }
        }
    }

    RefreshAbyssVisibleCandidates(viewX, viewY, sw, sh) {
        // Rebuild only after the camera crosses an 8-tile cell (or resolution changes).
        // A 14-tile safety margin is larger than one cache cell, so no object can pop in late.
        const centerTileX = Math.floor((viewX + sw * 0.5) / 16);
        const centerTileY = Math.floor((viewY + sh * 0.5) / 16);
        const key = `${Math.floor(centerTileX / 8)}:${Math.floor(centerTileY / 8)}:${I(sw)}:${I(sh)}`;
        if (key === this.AbyssVisibleCacheKey) return this.AbyssVisibleCandidates;
        const margin = 14;
        const minTileX = Math.floor(viewX / 16) - margin, maxTileX = Math.ceil((viewX + sw) / 16) + margin;
        const minTileY = Math.floor(viewY / 16) - margin, maxTileY = Math.ceil((viewY + sh) / 16) + margin;
        const bx0 = Math.floor(minTileX / 32) - 1, bx1 = Math.floor(maxTileX / 32) + 1;
        const by0 = Math.floor(minTileY / 32) - 1, by1 = Math.floor(maxTileY / 32) + 1;
        const out = this.AbyssVisibleCandidates; out.length = 0;
        for (let bx = bx0; bx <= bx1; bx++) for (let by = by0; by <= by1; by++) {
            const list = this.AbyssAmbienceBuckets.get(this.AbyssBucketKey(bx, by));
            if (!list) continue;
            for (const o of list) out.push(o);
        }
        this.AbyssVisibleCacheKey = key;
        return out;
    }

    DrawAbyssAmbientObject(o, draw, viewX, viewY, color) {
        if (!this.AbyssAtlasTexture) return;
        // Pot validity is event-driven by the already-installed GlobalTile callbacks.
        // No tile NativeObject read occurs on the render thread.
        if ((o.kind === 'abyssPot' || o.kind === 'sulphPot') && o.potValid !== true) return;
        if (!this.EnsureAbyssDrawScratch()) return;
        const pos = this.AbyssDrawPosition, src = this.AbyssDrawSource, origin = this.AbyssDrawOrigin;
        pos.X = Number(o.pixelLeft - viewX); pos.Y = Number(o.pixelTop - viewY);
        src.X = o.srcX; src.Y = o.srcY; src.Width = o.srcW; src.Height = o.srcH;
        draw(this.AbyssAtlasTexture, pos, src, color, 0, origin, 1, this.AbyssAtlasEffectsNone, 0);
        if (o.glowX >= 0) {
            src.X = o.glowX; src.Y = o.glowY; src.Width = o.glowW; src.Height = o.glowH;
            draw(this.AbyssAtlasTexture, pos, src, this.AbyssAtlasWhite, 0, origin, 1, this.AbyssAtlasEffectsNone, 0);
        }
    }

    DrawAbyssAmbience(draw) {
        this.RefreshAbyssAmbienceCache();
        if (this.AbyssAmbience.length <= 0 || !this.AbyssAtlasTexture || !this.BoundsVisible(this.AbyssAmbienceBounds)) return;
        const viewX = this.ViewX, viewY = this.ViewY, sw = this.ViewW, sh = this.ViewH;
        const candidates = this.RefreshAbyssVisibleCandidates(viewX, viewY, sw, sh);
        if (candidates.length <= 0) return;

        // Exact culling is cheap JS-only work. Reuse one array so this path allocates nothing.
        const visible = this.AbyssFrameVisible; visible.length = 0;
        for (const o of candidates) {
            const x0 = o.pixelLeft - viewX, y0 = o.pixelTop - viewY;
            if (x0 > sw + 16 || y0 > sh + 16 || x0 + o.pixelW < -16 || y0 + o.pixelH < -16) continue;
            visible.push(o);
        }
        if (visible.length <= 0) return;

        // Exactly one native Lighting.GetColor per ambience frame.
        const centerTileX = Math.floor((viewX + sw * 0.5) / 16);
        const centerTileY = Math.floor((viewY + sh * 0.5) / 16);
        const screenColor = LightingColor(centerTileX, centerTileY);
        for (const o of visible) this.DrawAbyssAmbientObject(o, draw, viewX, viewY, screenColor);
    }

    LoadIronBall() {
        if (this.IronBallTexture && this.IronBallGlowTexture) return true;
        if (this.IronBallTextureFailed) return false;
        try {
            this.IronBallTexture = tl.texture.load('Textures/Tiles/IronBallPlaced.png');
            this.IronBallGlowTexture = tl.texture.load('Textures/Tiles/IronBallPlaced_Glow.png');
            if (!this.IronBallTexture || !this.IronBallGlowTexture || I(this.IronBallTexture.Width) < 16 || I(this.IronBallTexture.Height) < 16 || I(this.IronBallGlowTexture.Width) < 16 || I(this.IronBallGlowTexture.Height) < 16)
                throw new Error('Iron Ball tile texture load returned null/invalid dimensions');
            return true;
        } catch (e) {
            this.IronBallTextureFailed = true;
            try { tl.log(`[CalamityPort IronBall] tile texture load failed: ${e}`); } catch (_) { }
            return false;
        }
    }

    LoadIronBallPositions() {
        if (this.IronBallPositionsLoaded) return;
        this.IronBallPositionsLoaded = true;
        this.IronBallPositions = [];
        this.IronBallBounds = null;
        if (WorldDB.get(IRON_BALL_KEY + 'generated') !== true) return;
        const count = Math.max(0, I(WorldDB.get(IRON_BALL_KEY + 'count'), 0));
        let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
        for (let i = 0; i < count; i++) {
            const x = I(WorldDB.get(IRON_BALL_KEY + `pos:${i}:x`), -1);
            const y = I(WorldDB.get(IRON_BALL_KEY + `pos:${i}:y`), -1);
            if (x >= 0 && y >= 0) { this.IronBallPositions.push({ x, y }); minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y); }
        }
        if(maxX>=minX)this.IronBallBounds={left:minX,top:minY,right:maxX+1,bottom:maxY+2};
    }

    DrawIronBalls(draw) {
        this.LoadIronBallPositions();
        if (this.IronBallPositions.length <= 0 || !this.BoundsVisible(this.IronBallBounds) || !this.LoadIronBall()) return;
        const pos=this.LabDrawPosition,src=this.LabDrawSource,origin=this.LabDrawOrigin;src.X=0;src.Y=0;src.Width=16;src.Height=16;
        for (const p of this.IronBallPositions) {
            const x = p.x, y = p.y;
            const px = x * 16 - this.ViewX, py = y * 16 - this.ViewY + 2;
            if (!this.ViewVisible(px, py, 16, 18)) continue;
            pos.X=px;pos.Y=py;draw(this.IronBallTexture,pos,src,LightingColor(x,y),0,origin,1,SpriteEffects.None,0);
            draw(this.IronBallGlowTexture,pos,src,Color.White,0,origin,1,SpriteEffects.None,0);
        }
    }

    Draw() {
        if (!this.Load()) return;
        this.RefreshView();
        let draw = this.CachedSpriteDraw;
        if (!draw) {
            const sb = Main.spriteBatch;
            draw = sb && sb[DRAW_SIG];
            if (!draw) return;
            this.CachedSpriteDraw = draw;
        }
        this.DrawLab(this.Planetoid, PLANETOID_KEY, 105, 125, draw);
        this.DrawLab(this.Jungle, JUNGLE_KEY, 90, 87, draw);
        this.DrawLab(this.Ice, ICE_KEY, 77, 92, draw);
        this.DrawLab(this.Sunken, SUNKEN_KEY, 119, 93, draw);
        this.DrawLab(this.Underworld, UNDERWORLD_KEY, 139, 75, draw);
        this.DrawLab(this.Onyx, ONYX_KEY, 129, 67, draw);
        this.DrawSulphurousDetails(draw);
        this.DrawSulphurousAmbience(draw);
        this.DrawAbyssAmbience(draw);
        this.DrawIronBalls(draw);
    }

    Initialize() {
        let drawNPCs = null;
        try { drawNPCs = Terraria.Main['void DrawNPCs(bool behindTiles)']; } catch (e) { }
        try { if (!drawNPCs) drawNPCs = Terraria.Main.DrawNPCs; } catch (e) { }
        if (!drawNPCs?.hook) {
            try { tl.log('[CalamityPort LabOverlay] DrawNPCs world-overlay hook unavailable.'); } catch (_) { }
            return;
        }
        drawNPCs.hook((original, self, behindTiles) => {
            // One shared world-overlay hook owns large laboratory composites AND Sulphurous Sea
            // scrap/column details. Keeping these in the same DrawNPCs(false) hook avoids hook-order
            // conflicts and uses the exact world camera origin already proven by the laboratory pass.
            if (!IsGeneratingWorld() && !B(behindTiles)) {
                try { this.Draw(); } catch (e) {
                    try { tl.log(`[CalamityPort LabOverlay] draw failed: ${e}`); } catch (_) { }
                }
            }
            return original(self, behindTiles);
        });
        this.Installed = true;
        try { tl.log('[CalamityPort LabOverlay] v18 mobile overlay path installed; nearest-grid held-light lab tint + low draw-call cache + Abyss atlas.'); } catch (_) { }
    }

    OnWorldLoad() {
        // WorldDB belongs to the current world. Never carry null/old lab anchors
        // across a world switch or reload.
        this.LabAnchorCache = new Map();
        this.LabLightingCache.clear();
        this.LabLightingEpoch = -1;

        // Phase 13.13.0.1: the old lazy path loaded six large lab overlays, Sulphurous
        // textures and the Abyss atlas on the first visible DrawNPCs frame. On Android
        // that presented as a 2-4 second world-entry freeze. EnterWorld invokes this
        // callback before the player is handed to the live world, so pay the one-time
        // texture/cache cost behind the loading transition instead.
        const started = Date.now();
        this.Load();
        this.RefreshSulphurousDetailsCache();
        this.RefreshSulphurousAmbienceCache();
        this.RefreshAbyssAmbienceCache();
        this.LoadIronBallPositions();
        const elapsed = Date.now() - started;
        let labs = 0;
        for (const key of [PLANETOID_KEY, JUNGLE_KEY, ICE_KEY, SUNKEN_KEY, UNDERWORLD_KEY, ONYX_KEY]) {
            try { if (B(WorldDB.get(key + 'generated')) && I(WorldDB.get(key + 'left'), -1) >= 0 && I(WorldDB.get(key + 'top'), -1) >= 0) labs++; } catch (_) { }
        }
        try { tl.log(`[CalamityPort WorldEntryPreload] overlay textures + metadata ready before first world frame; elapsed=${elapsed}ms; labAnchors=${labs}/6.`); } catch (_) { }
    }

    OnWorldUnload() {
        this.LoggedDraw = false;
        this.LoggedSulphMetadata = false;
        this.LoggedSulphVisible = false;
        this.LoggedIronBall = false;
        this.IronBallPositions = [];
        this.IronBallPositionsLoaded = false;
        this.IronBallBounds = null;
        this.AbyssAmbience = [];
        this.AbyssAmbienceBuckets = new Map();
        this.AbyssAmbienceBounds = null;
        this.AbyssDrawPosition = null;
        this.AbyssDrawSource = null;
        this.AbyssDrawOrigin = null;
        this.AbyssVisibleCacheKey = '';
        this.AbyssVisibleCandidates.length = 0;
        this.AbyssFrameVisible.length = 0;
        this.AbyssAmbienceVersion = -1;
        this.AbyssAmbienceCount = -1;
        this.LoggedAbyssAmbience = false;
        this.LabAnchorCache = new Map();
        this.LabLightingCache.clear();
        this.LabLightingEpoch = -1;
        this.SulphDetailsLoaded = false;
        this.SulphScrapMeta = [];
        this.SulphColumnMeta = [];
        this.SulphDetailsBounds = null;
        this.SulphAmbienceBounds = null;
        this.SulphAmbience = [];
        this.SulphRustyChests = [];
        this.SulphAmbienceVersion = -1;
        this.SulphAmbienceCount = -1;
        this.SulphChestCount = -1;
    }
}
