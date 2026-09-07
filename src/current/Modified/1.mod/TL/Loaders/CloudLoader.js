import { Terraria } from './../ModImports.js';
import { ModLoader } from './../Core/ModLoader.js';
import { ModTexture } from './../ModTexture.js';

function cloneResizedSetLastCloud(array, newSize, value) {
    const resized = array.cloneResized(newSize);
    if (value != null) resized[newSize - 1] = value;
    return resized;
}

function resizeArrayProperty(propertyHolder, propertyName, newSize, value) {
    propertyHolder[propertyName] = cloneResizedSetLastCloud(propertyHolder[propertyName], newSize, value);
}

const TextureMaskManager = new NativeClass('', 'TextureMaskManager');

export class CloudLoader {
    static Clouds = [];
    static ModTypes = new Set();
    static TypeToIndex = {};
    
    static isModCloud(cloud) { return this.isModType(cloud.type); }
    static isModType(type) { return this.ModTypes.has(type); }
    static getByName(name) { return this.Clouds.find(t => t.constructor.name === name); }
    static getTypeByName(name) { return this.getByName(name)?.Type; }
    static getModCloud(type) {
        if (this.ModTypes.has(type)) {
            return this.Clouds[this.TypeToIndex[type]];
        }
        return undefined;
    }
    
    static LoadClouds() {
        for (const cloud of this.Clouds) {
            this.LoadCloud(cloud);
        }
    }
    
    static LoadCloud(cloud) {
        const cloudTexture = new ModTexture('Textures/' + cloud?.Texture);
        if (!cloudTexture?.exists) return;
        
        cloud.Type = Terraria.GameContent.TextureAssets.Cloud.length;
        this.ModTypes.add(cloud.Type);
        this.TypeToIndex[cloud.Type] = this.Clouds.indexOf(cloud);
        const nextCloud = cloud.Type + 1;
        
        resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Cloud', nextCloud, cloudTexture.asset.asset);
        resizeArrayProperty(TextureMaskManager, 'CloudMasks', nextCloud, TextureMaskManager.CloudMasks[0]);
    }
    
    static SetupContent() {
        this.MAX_VANILLA_ID = Terraria.ID.CloudID.Count;
        this.LoadClouds();
    }
    
    static PostSetupContent() {
        this.CloudCount = Terraria.GameContent.TextureAssets.Cloud.length;
    }
    
    static ChooseCloud(vanillaPool, rare = false) {
        if (this.Clouds.length == 0) return 0;
        
        let pool = {};
        pool[0] = vanillaPool;
        
        for (const cloud of this.Clouds) {
            if (rare !== cloud.RareCloud())
                continue;
            let weight = cloud.SpawnChance() ?? 0;
            if (weight > 0) {
                pool[cloud.Type] = weight;
            }
        }
        
        let totalWeight = 0;
        for (const key in pool) {
            if (pool[key] < 0) {
                pool[key] = 0;
            }
            totalWeight += pool[key];
        }
        
        let choice = Terraria.Main.rand['double NextDouble()']() * totalWeight;
        for (const type in pool) {
            let weight = pool[type];
            if (choice < weight) {
                return +type;
            }
            choice -= weight;
        }
        
        return null;
    }
}