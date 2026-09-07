import { Terraria } from './../ModImports.js';
import { ModTexture } from './../ModTexture.js';
import { SceneEffectLoader } from './../Loaders/SceneEffectLoader.js';

function cloneResizedSetLastGore(array, newSize, value) {
    const resized = array.cloneResized(newSize);
    if (value != null) resized[newSize - 1] = value;
    return resized;
}

function resizeArrayProperty(propertyHolder, propertyName, newSize, value) {
    propertyHolder[propertyName] = cloneResizedSetLastGore(propertyHolder[propertyName], newSize, value);
}

export class BiomeLoader {
    static Biomes = [];
    static ActiveBiomes = [];
    static modBiomeFlags = Array(255);
    
    static SetupContent() {
        this.TotalWater = Terraria.Main.maxLiquidTypes;
        
        for (const biome of this.Biomes) {
            biome.Name = biome.constructor.name;
            
            const mapBG = new ModTexture('Textures/' + biome.MapBackgroundTexture);
            if (mapBG?.exists) {
                const nextSlot = Terraria.GameContent.TextureAssets.MapBGs.length;
                resizeArrayProperty(Terraria.GameContent.TextureAssets, 'MapBGs', nextSlot + 1, mapBG.asset.asset);
                biome.MapBackground = nextSlot;
            }
            
            const rainTexture = new ModTexture('Textures/' + biome.RainTexture);
            if (rainTexture?.exists) {
                biome.Rain = rainTexture.asset.asset;
            }
            
            const dropletTexture = new ModTexture('Textures/' + biome.DropletTexture);
            if (dropletTexture?.exists) {
                biome.Droplet = dropletTexture.asset.asset;
            }
            
            const waterfallTexture = new ModTexture('Textures/' + biome.WaterfallTexture);
            if (waterfallTexture?.exists) {
                const nextSlot = Terraria.Main.instance.waterfallManager.waterfallTexture.length;
                resizeArrayProperty(Terraria.Main.instance.waterfallManager, 'waterfallTexture', nextSlot + 1, waterfallTexture.asset.asset);
                biome.Waterfall = nextSlot;
            }
            
            const waterTexture = new ModTexture('Textures/' + biome.WaterTexture);
            if (waterTexture?.exists) {
                const nextSlot = this.TotalWater;
                this.TotalWater++;
                resizeArrayProperty(Terraria.GameContent.Liquid.LiquidRenderer.Instance, '_liquidTextures', this.TotalWater, waterTexture.asset.asset);
                biome.WaterTexture2D = waterTexture.asset.asset;
                
                const liquidTexture = new ModTexture('Textures/' + biome.WaterTexture + '_Block');
                if (liquidTexture?.exists) {
                    resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Liquid', this.TotalWater, liquidTexture.asset.asset);
                }
                
                const liquidSlopeTexture = new ModTexture('Textures/' + biome.WaterTexture + '_Slope');
                if (liquidSlopeTexture?.exists) {
                    resizeArrayProperty(Terraria.GameContent.TextureAssets, 'LiquidSlope', this.TotalWater, liquidSlopeTexture.asset.asset);
                }
                
                resizeArrayProperty(Terraria.Main, 'liquidAlpha', this.TotalWater, 1.0);
                
                biome.WaterStyle = nextSlot;
            }
            
            biome.SetStaticDefaults();
        }
    }
    
    static PostSetupContent() {
        for (const biome of this.Biomes) {
            biome.PostSetupContent();
        }
    }
    
    static SetupPlayer(player) {
        this.modBiomeFlags[Terraria.PlayerIndex(player)] = Array(this.Biomes.length).fill(false);
    }
    
    static UpdateBiomes(player) {
        const playerIndex = Terraria.PlayerIndex(player);
        const flags = this.modBiomeFlags[playerIndex];
        let isScenePlayer = false;
        try { isScenePlayer = Number(playerIndex) === Number(Terraria.Main.myPlayer); } catch (e) { }

        if (flags) {
            for (let i = 0; i < flags.length; i++) {
                const biome = this.Biomes[i];
                const prev = flags[i] === true;
                const value = biome.IsBiomeActive(player, Terraria.Main.SceneMetrics._tileCounts) === true;
                flags[i] = value;

                // ModBiome instances are shared. Only the local scene player's state
                // may drive global background, water and music replacement. Compare
                // numeric player indexes because TLPro can return different JavaScript
                // wrappers for the same native Player instance.
                if (isScenePlayer) biome.IsActive = value;

                if (!prev && value) {
                    biome.OnEnter(player);
                    if (isScenePlayer && !BiomeLoader.ActiveBiomes.includes(biome))
                        BiomeLoader.ActiveBiomes.push(biome);
                } else if (!value && prev) {
                    biome.OnLeave(player);
                    if (isScenePlayer) {
                        const activeIndex = BiomeLoader.ActiveBiomes.indexOf(biome);
                        if (activeIndex >= 0) BiomeLoader.ActiveBiomes.splice(activeIndex, 1);
                    }
                }

                if (value) biome.OnInBiome(player);
            }
        } else {
            this.SetupPlayer(player);
        }

        // SceneEffectLoader mutates global texture arrays. Running it for remote or
        // inactive player slots can cause repeated enter/leave swaps on mobile.
        if (isScenePlayer) SceneEffectLoader.Update();
    }
    
    static ModifySpawnPool(spawnInfo, pool) {
        const flags = this.modBiomeFlags[Terraria.PlayerIndex(spawnInfo.Player)];
        if (flags) {
            for (let i = 0; i < flags.length; i++) {
                if (!flags[i]) continue;
                this.Biomes[i].ModifySpawnPool(spawnInfo, pool);
            }
        }
    }
}