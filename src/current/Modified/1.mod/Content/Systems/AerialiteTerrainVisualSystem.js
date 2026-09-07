import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModTexture } from './../../TL/ModTexture.js';
import { AerialiteAnchorTiles } from './../../Core/AerialiteAnchorIDs.js';
import { AerialiteMaterialRuntime } from './../../Core/AerialiteMaterialRuntime.js';

const CHECK_INTERVAL = 8;
function Tick(){ try{return Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(_){return 0;} }

export class AerialiteTerrainVisualSystem extends ModSystem {
    constructor() {
        super();
        this.Ready = false;
        this.Applied = false;
        this.Old = {};
        this.Assets = {};
        this.LastCheck = -9999;
    }

    EnsureAssets() {
        if (this.Ready)
            return true;
        try {
            const dormant = new ModTexture('Textures/Tiles/Aerialite/World/AerialiteOreDormant');
            const enchanted = new ModTexture('Textures/Tiles/Aerialite/World/AerialiteOre');
            if (!dormant?.exists || !enchanted?.exists)
                return false;
            this.Assets[AerialiteAnchorTiles.Dormant] = dormant.asset.asset;
            this.Assets[AerialiteAnchorTiles.Enchanted] = enchanted.asset.asset;
            this.Ready = true;
            return true;
        } catch (e) {
            tl.log(`[CalamityPort] Aerialite texture load failed: ${e}`);
            return false;
        }
    }

    Apply() {
        if (this.Applied || !this.EnsureAssets())
            return;
        try {
            for (const key of Object.keys(this.Assets)) {
                const id = Number(key);
                this.Old[id] = Terraria.GameContent.TextureAssets.Tile[id];
                Terraria.GameContent.TextureAssets.Tile[id] = this.Assets[id];
            }
            this.Applied = true;
        } catch (e) {
            tl.log(`[CalamityPort] Aerialite texture apply failed: ${e}`);
        }
    }

    Restore() {
        if (!this.Applied)
            return;
        try {
            for (const key of Object.keys(this.Old))
                Terraria.GameContent.TextureAssets.Tile[Number(key)] = this.Old[key];
        } catch (e) { }
        this.Old = {};
        this.Applied = false;
    }

    PostSetupContent() { this.EnsureAssets(); }
    OnWorldLoad() { this.Restore(); this.LastCheck = -9999; this.EnsureAssets(); }
    ShouldApply() {
        try {
            if (Terraria.Main.gameMenu === true) return false;
            const p = Terraria.Main.LocalPlayer; if (!p || !p.active || p.dead === true) return false;
            const x = Math.floor(Number(Terraria.PlayerCenterX(p)) / 16), y = Math.floor(Number(Terraria.PlayerCenterY(p)) / 16);
            return AerialiteMaterialRuntime.IsNearTracked(x, y, 128);
        } catch (_) { return false; }
    }
    Update() {
        const tick = Tick(); if (tick - this.LastCheck < CHECK_INTERVAL) return; this.LastCheck = tick;
        const active = this.ShouldApply(); if (active && !this.Applied) this.Apply(); else if (!active && this.Applied) this.Restore();
    }
    OnWorldUnload() { this.Restore(); this.LastCheck = -9999; }
    GetStatus() { return `ready=${this.Ready} applied=${this.Applied}`; }
}
