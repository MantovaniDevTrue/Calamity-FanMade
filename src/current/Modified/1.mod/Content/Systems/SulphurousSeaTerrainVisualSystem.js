import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModTexture } from './../../TL/ModTexture.js';
import { SulphurousSeaPreviewRuntime } from './../../Core/SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaAnchorTiles } from './../../Core/SulphurousSeaTerrainRuntime.js';
import { BiomeAnchorTiles } from './../../Core/BiomeAnchorIDs.js';
import { AbyssLayer1Runtime } from './../../Core/AbyssLayer1Runtime.js';
import { AbyssTerrainProxyTiles, AbyssTerrainProxyWalls } from './../../Core/AbyssTerrainRuntime.js';

const { Color } = Modules;
const CHECK_INTERVAL = 6;

// Exact map colors used by Calamity's official ModTile / ModWall AddMapEntry calls.
const ABYSS_TILE_MAP_COLORS = Object.freeze([
    [AbyssTerrainProxyTiles.Shale, 57, 44, 93],
    [AbyssTerrainProxyTiles.Gravel, 25, 28, 54],
    [AbyssTerrainProxyTiles.PyreMantle, 43, 40, 40],
    [AbyssTerrainProxyTiles.Voidstone, 15, 15, 15],
    [AbyssTerrainProxyTiles.PlantyMush, 84, 102, 39],
    [AbyssTerrainProxyTiles.ScoriaOre, 167, 80, 22],
    [AbyssTerrainProxyTiles.PyreMantleMolten, 113, 49, 16]
]);
const ABYSS_WALL_MAP_COLORS = Object.freeze([
    [AbyssTerrainProxyWalls.Shale, 59, 40, 63],
    [AbyssTerrainProxyWalls.Gravel, 6, 10, 54],
    [AbyssTerrainProxyWalls.PyreMantle, 33, 30, 30],
    [AbyssTerrainProxyWalls.Voidstone, 0, 0, 0]
]);

function Tick() {
    try {
        return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
    } catch (e) {
        return 0;
    }
}

function AssetGet(collection, id) {
    try { if (collection && typeof collection.get_Item === 'function') return collection.get_Item(Number(id)); } catch (e) { }
    try { return collection[Number(id)]; } catch (e) { return null; }
}
function AssetSet(collection, id, value) {
    try { if (collection && typeof collection.set_Item === 'function') { collection.set_Item(Number(id), value); return true; } } catch (e) { }
    try { collection[Number(id)] = value; return true; } catch (e) { return false; }
}

export class SulphurousSeaTerrainVisualSystem extends ModSystem {
    constructor() {
        super();
        this.Ready = false;
        this.Applied = false;
        this.LastCheck = -9999;
        this.OldTiles = {};
        this.OldWalls = {};
        this.TileAssets = {};
        this.WallAssets = {};
        this.CurrentAbyssLayer = 0;
        this.MapColorsApplied = false;
        this.Failed = false;
    }

    SetMapColors() {
        // Keep this separate from texture replacement: Terraria's world map resolves a
        // tile/wall through MapHelper lookups, so the four physical proxy slots can display
        // exactly like the four Calamity materials without changing their world-generation IDs.
        try {
            for (const q of ABYSS_TILE_MAP_COLORS) {
                const lookup = Terraria.Map.MapHelper.tileLookup[Number(q[0])];
                Terraria.Map.MapHelper.colorLookup[lookup] = Color.new(q[1], q[2], q[3], 255);
            }
            this.MapColorsApplied = true;
        } catch (e) {
            this.MapColorsApplied = false;
            try { tl.log(`[CalamityPort] Abyss tile map-color setup deferred: ${e}`); } catch (_) { }
        }
        // Wall lookups exist on supported Terraria/TLPro builds, but are optional here so a
        // missing wrapper member cannot prevent the biome from loading. Tile colors still fix
        // the solid-region map identity even if the wall lookup is unavailable.
        try {
            const wallLookup = Terraria.Map.MapHelper.wallLookup;
            if (wallLookup) {
                for (const q of ABYSS_WALL_MAP_COLORS) {
                    const lookup = wallLookup[Number(q[0])];
                    Terraria.Map.MapHelper.colorLookup[lookup] = Color.new(q[1], q[2], q[3], 255);
                }
            }
        } catch (e) { }
    }

    SetupContent() {
        this.SetMapColors();
    }

    EnsureAssets() {
        if (this.Ready)
            return true;
        if (this.Failed)
            return false;
        try {
            const assets = {
                sand: new ModTexture('Textures/Tiles/SulphurousSea/World/SulphurousSand'),
                sandstone: new ModTexture('Textures/Tiles/SulphurousSea/World/SulphurousSandstone'),
                hardened: new ModTexture('Textures/Tiles/SulphurousSea/World/HardenedSulphurousSandstone'),
                shale: new ModTexture('Textures/Tiles/Abyss/World/SulphurousShale'),
                abyssGravel: new ModTexture('Textures/Tiles/Abyss/World/AbyssGravel'),
                pyreMantle: new ModTexture('Textures/Tiles/Abyss/World/PyreMantle'),
                voidstone: new ModTexture('Textures/Tiles/Abyss/World/Voidstone'),
                plantyMush: new ModTexture('Textures/Tiles/Abyss/World/PlantyMush'),
                scoriaOre: new ModTexture('Textures/Tiles/Abyss/World/ScoriaOre'),
                pyreMantleMolten: new ModTexture('Textures/Tiles/Abyss/World/PyreMantleMolten'),
                shaleWall: new ModTexture('Textures/Walls/Abyss/SulphurousShaleWall'),
                gravelWall: new ModTexture('Textures/Walls/Abyss/AbyssGravelWall'),
                pyreWall: new ModTexture('Textures/Walls/Abyss/PyreMantleWall'),
                voidWall: new ModTexture('Textures/Walls/Abyss/VoidstoneWall')
            };
            for (const asset of Object.values(assets)) {
                if (!asset?.exists) {
                    this.Failed = true;
                    tl.log('[CalamityPort] Sulphurous Sea terrain visual assets are incomplete.');
                    return false;
                }
            }
            this.TileAssets[SulphurousSeaAnchorTiles.sand] = assets.sand.asset.asset;
            this.TileAssets[BiomeAnchorTiles.LegacySulphurousSand] = assets.sand.asset.asset;
            this.TileAssets[SulphurousSeaAnchorTiles.sandstone] = assets.sandstone.asset.asset;
            this.TileAssets[SulphurousSeaAnchorTiles.hardened] = assets.hardened.asset.asset;
            this.TileAssets[SulphurousSeaAnchorTiles.shale] = assets.shale.asset.asset;

            // Four stable physical proxy identities, four official Calamity textures.
            this.TileAssets[AbyssTerrainProxyTiles.Shale] = assets.shale.asset.asset;
            this.TileAssets[AbyssTerrainProxyTiles.Gravel] = assets.abyssGravel.asset.asset;
            this.TileAssets[AbyssTerrainProxyTiles.PyreMantle] = assets.pyreMantle.asset.asset;
            this.TileAssets[AbyssTerrainProxyTiles.Voidstone] = assets.voidstone.asset.asset;
            this.TileAssets[AbyssTerrainProxyTiles.PlantyMush] = assets.plantyMush.asset.asset;
            this.TileAssets[AbyssTerrainProxyTiles.ScoriaOre] = assets.scoriaOre.asset.asset;
            this.TileAssets[AbyssTerrainProxyTiles.PyreMantleMolten] = assets.pyreMantleMolten.asset.asset;

            this.WallAssets[AbyssTerrainProxyWalls.Shale] = assets.shaleWall.asset.asset;
            this.WallAssets[AbyssTerrainProxyWalls.Gravel] = assets.gravelWall.asset.asset;
            this.WallAssets[AbyssTerrainProxyWalls.PyreMantle] = assets.pyreWall.asset.asset;
            this.WallAssets[AbyssTerrainProxyWalls.Voidstone] = assets.voidWall.asset.asset;
            this.Ready = true;
            return true;
        } catch (e) {
            this.Failed = true;
            tl.log(`[CalamityPort] Sulphurous Sea terrain visual load failed: ${e}`);
            return false;
        }
    }

    PostSetupContent() {
        this.SetMapColors();
        this.EnsureAssets();
    }

    OnWorldLoad() {
        this.LastCheck = -9999;
        this.Applied = false;
        this.OldTiles = {};
        this.OldWalls = {};
        this.CurrentAbyssLayer = 0;
        this.SetMapColors();
        this.EnsureAssets();
    }

    GetLocalPlayer() {
        try {
            let player = null;
            try { player = Terraria.Main.LocalPlayer; } catch (e) { }
            if (!player) {
                const index = Math.floor(Number(Terraria.Main.myPlayer));
                if (index >= 0 && index < 255) try { player = Terraria.Main.player.get_Item(index); } catch (e) { }
            }
            return player && player.active && !player.dead ? player : null;
        } catch (e) { return null; }
    }

    GetAbyssLayer() {
        const player = this.GetLocalPlayer();
        if (!player) return 0;
        try { return Math.max(0, Math.min(4, Number(AbyssLayer1Runtime.GetPlayerLayer(player)) || 0)); } catch (e) { return 0; }
    }

    IsLocalPlayerInside() {
        try {
            if (Terraria.Main.gameMenu === true)
                return false;
            const player = this.GetLocalPlayer();
            if (!player) return false;
            const inAbyss = AbyssLayer1Runtime.ContainsAbyssPlayer(player);
            const inSea = SulphurousSeaPreviewRuntime.GeneratedBiomeActive === true && SulphurousSeaPreviewRuntime.ContainsPlayerVisual(player);
            return inSea || inAbyss;
        } catch (e) {
            return false;
        }
    }

    Apply() {
        if (this.Applied || !this.EnsureAssets())
            return;
        try {
            for (const key of Object.keys(this.TileAssets)) {
                const id = Number(key);
                this.OldTiles[id] = AssetGet(Terraria.GameContent.TextureAssets.Tile, id);
                if (!this.OldTiles[id] || !this.TileAssets[id] || !AssetSet(Terraria.GameContent.TextureAssets.Tile, id, this.TileAssets[id]))
                    throw new Error(`tile texture slot ${id} unavailable`);
            }
            for (const key of Object.keys(this.WallAssets)) {
                const id = Number(key);
                this.OldWalls[id] = AssetGet(Terraria.GameContent.TextureAssets.Wall, id);
                if (!this.OldWalls[id] || !this.WallAssets[id] || !AssetSet(Terraria.GameContent.TextureAssets.Wall, id, this.WallAssets[id]))
                    throw new Error(`wall texture slot ${id} unavailable`);
            }
            this.CurrentAbyssLayer = this.GetAbyssLayer();
            this.Applied = true;
        } catch (e) {
            tl.log(`[CalamityPort] Sulphurous Sea terrain visual apply failed: ${e}`);
            this.Restore();
            this.Failed = true;
        }
    }

    Restore() {
        try {
            for (const key of Object.keys(this.OldTiles))
                AssetSet(Terraria.GameContent.TextureAssets.Tile, Number(key), this.OldTiles[Number(key)]);
            for (const key of Object.keys(this.OldWalls))
                AssetSet(Terraria.GameContent.TextureAssets.Wall, Number(key), this.OldWalls[Number(key)]);
        } catch (e) {
            tl.log(`[CalamityPort] Sulphurous Sea terrain visual restore failed: ${e}`);
        }
        this.Applied = false;
        this.OldTiles = {};
        this.OldWalls = {};
        this.CurrentAbyssLayer = 0;
    }

    Update() {
        const tick = Tick();
        if (tick - this.LastCheck < CHECK_INTERVAL)
            return;
        this.LastCheck = tick;
        const active = this.IsLocalPlayerInside();
        if (active && !this.Applied)
            this.Apply();
        else if (!active && this.Applied)
            this.Restore();
        else if (active && this.Applied)
            this.CurrentAbyssLayer = this.GetAbyssLayer();
    }

    OnWorldUnload() {
        this.Restore();
        this.LastCheck = -9999;
    }

    GetStatus() {
        return `ready=${this.Ready} applied=${this.Applied} abyssLayer=${this.CurrentAbyssLayer} proxies=s${AbyssTerrainProxyTiles.Shale}/g${AbyssTerrainProxyTiles.Gravel}/p${AbyssTerrainProxyTiles.PyreMantle}/v${AbyssTerrainProxyTiles.Voidstone}/plant${AbyssTerrainProxyTiles.PlantyMush}/scoria${AbyssTerrainProxyTiles.ScoriaOre}/molten${AbyssTerrainProxyTiles.PyreMantleMolten} mapColors=${this.MapColorsApplied} failed=${this.Failed}`;
    }
}
