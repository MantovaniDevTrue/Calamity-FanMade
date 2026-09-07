import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModTexture } from './../../TL/ModTexture.js';
import { SunkenSeaPreviewRuntime } from './../../Core/SunkenSeaPreviewRuntime.js';
import { BiomeAnchorTiles } from './../../Core/BiomeAnchorIDs.js';

const TILE_EUTROPHIC = BiomeAnchorTiles.SunkenEutrophic;
const TILE_EUTROPHIC_LEGACY = BiomeAnchorTiles.LegacySunkenEutrophic;
const TILE_NAVYSTONE = 396;
const TILE_SEAPRISM = 385;
const WALL_EUTROPHIC = 216;
const WALL_NAVYSTONE = 187;
const CHECK_INTERVAL = 6;
function Tick() {
    try {
        return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
    } catch (e) {
        return 0;
    }
}

export class SunkenSeaTerrainVisualSystem extends ModSystem {
    constructor() {
        super();
        this.Ready = false;
        this.Applied = false;
        this.LastCheck = -9999;
        this.OldTiles = {};
        this.OldWalls = {};
        this.TileAssets = {};
        this.WallAssets = {};
        this.Failed = false;
    }

    EnsureAssets() {
        if (this.Ready)
            return true;
        if (this.Failed)
            return false;
        try {
            const eutrophic = new ModTexture('Textures/Tiles/SunkenSea/World/EutrophicSand');
            const navystone = new ModTexture('Textures/Tiles/SunkenSea/World/Navystone');
            const seaPrism = new ModTexture('Textures/Tiles/SunkenSea/World/SeaPrismCompat');
            const eutrophicWall = new ModTexture('Textures/Tiles/SunkenSea/World/EutrophicSandWall');
            const navystoneWall = new ModTexture('Textures/Tiles/SunkenSea/World/NavystoneWall');
            if (!eutrophic?.exists || !navystone?.exists || !seaPrism?.exists
                || !eutrophicWall?.exists || !navystoneWall?.exists) {
                this.Failed = true;
                tl.log('[CalamityPort] Sunken Sea terrain visual assets are incomplete.');
                return false;
            }
            this.TileAssets[TILE_EUTROPHIC] = eutrophic.asset.asset;
            this.TileAssets[TILE_EUTROPHIC_LEGACY] = eutrophic.asset.asset;
            this.TileAssets[TILE_NAVYSTONE] = navystone.asset.asset;
            this.TileAssets[TILE_SEAPRISM] = seaPrism.asset.asset;
            this.WallAssets[WALL_EUTROPHIC] = eutrophicWall.asset.asset;
            this.WallAssets[WALL_NAVYSTONE] = navystoneWall.asset.asset;
            this.Ready = true;
            return true;
        } catch (e) {
            this.Failed = true;
            tl.log(`[CalamityPort] Sunken Sea terrain visual load failed: ${e}`);
            return false;
        }
    }

    PostSetupContent() {
        this.EnsureAssets();
    }

    OnWorldLoad() {
        this.LastCheck = -9999;
        this.Applied = false;
        this.OldTiles = {};
        this.OldWalls = {};
        this.EnsureAssets();
    }

    IsLocalPlayerInside() {
        try {
            if (Terraria.Main.gameMenu === true)
                return false;
            if (SunkenSeaPreviewRuntime.GeneratedBiomeActive !== true)
                return false;
            const index = Math.floor(Number(Terraria.Main.myPlayer));
            if (!(index >= 0 && index < 255))
                return false;
            const player = Terraria.Main.player[index];
            if (!player || player.dead === true)
                return false;
            return SunkenSeaPreviewRuntime.ContainsPlayer(player);
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
                this.OldTiles[id] = Terraria.GameContent.TextureAssets.Tile[id];
                Terraria.GameContent.TextureAssets.Tile[id] = this.TileAssets[id];
            }
            for (const key of Object.keys(this.WallAssets)) {
                const id = Number(key);
                this.OldWalls[id] = Terraria.GameContent.TextureAssets.Wall[id];
                Terraria.GameContent.TextureAssets.Wall[id] = this.WallAssets[id];
            }
            this.Applied = true;
        } catch (e) {
            tl.log(`[CalamityPort] Sunken Sea terrain visual apply failed: ${e}`);
            this.Restore();
            this.Failed = true;
        }
    }

    Restore() {
        if (!this.Applied && Object.keys(this.OldTiles).length === 0 && Object.keys(this.OldWalls).length === 0)
            return;
        try {
            for (const key of Object.keys(this.OldTiles)) {
                const id = Number(key);
                Terraria.GameContent.TextureAssets.Tile[id] = this.OldTiles[id];
            }
            for (const key of Object.keys(this.OldWalls)) {
                const id = Number(key);
                Terraria.GameContent.TextureAssets.Wall[id] = this.OldWalls[id];
            }
        } catch (e) {
            tl.log(`[CalamityPort] Sunken Sea terrain visual restore failed: ${e}`);
        }
        this.Applied = false;
        this.OldTiles = {};
        this.OldWalls = {};
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
    }

    OnWorldUnload() {
        this.Restore();
        this.LastCheck = -9999;
    }

    GetStatus() {
        return `ready=${this.Ready} applied=${this.Applied} failed=${this.Failed}`;
    }
}
