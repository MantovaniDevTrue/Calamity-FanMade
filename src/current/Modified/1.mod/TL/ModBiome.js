import { Terraria } from './ModImports.js';
import { BiomeLoader } from './Loaders/BiomeLoader.js';

export class ModBiome {
    IsActive = false;
    Priority = 0;
    
    SurfaceBackground = null;
    UndergroundBackground = null;
    ForceNeutralUndergroundBackground = false;
    RainTexture = '';
    MapBackgroundTexture = '';
    WaterTexture = '';
    WaterfallTexture = '';
    
    BiomeColor = null;
    Music = -1;
    
    constructor() {
        
    }
    
    SetStaticDefaults() {
        
    }
    
    PostSetupContent() {
        
    }
    
    IsBiomeActive(player, tileCounts) {
        return false;
    }
    
    OnEnter(player) {
        
    }
    
    OnInBiome(player) {
        
    }
    
    OnLeave(player) {
        
    }
    
    GetBiomeBaseColor() {
        return this.BiomeColor;
    }
    
    GetSplashDust(dustType) {
        return dustType;
    }
    
    SpecialVisuals(player, skyColor) {
        
    }
    
    ModifySpawnPool(spawnInfo, pool) {
        
    }
    
    static register(biome) {
        BiomeLoader.Biomes.push(new biome());
    }
    static getByName(name) {
        return BiomeLoader.Biomes.find(b => b.constructor.name === name);
    }
}