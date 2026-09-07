import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModBiome } from './../../TL/ModBiome.js';
import { SunkenSeaPreviewRuntime } from './../../Core/SunkenSeaPreviewRuntime.js';

function WarmAsset(asset) {
    try {
        const texture = asset && asset.Value;
        if (!texture)
            return false;
        Number(texture.Width);
        Number(texture.Height);
        return true;
    } catch (e) {
        return false;
    }
}

export class SunkenSeaPreviewSystem extends ModSystem {
    constructor() {
        super();
        this.WarmupGeneration = 0;
    }

    OnWorldLoad() {
        SunkenSeaPreviewRuntime.Load();
        this.WarmupGeneration++;
        const generation = this.WarmupGeneration;
        const delays = [12, 20, 28, 36, 44];
        for (let i = 0; i < delays.length; i++) {
            ModSystem.SetTimeout(() => {
                if (generation !== this.WarmupGeneration)
                    return;
                this.WarmVisualAsset(i);
            }, delays[i]);
        }
    }

    WarmVisualAsset(step) {
        const biome = ModBiome.getByName('SunkenSeaPreviewBiome');
        if (!biome)
            return;
        const style = Math.floor(Number(biome.WaterStyle) || 0);
        if (step === 0) {
            WarmAsset(biome.WaterTexture2D);
        } else if (step === 1) {
            try {
                WarmAsset(Terraria.GameContent.TextureAssets.Liquid[style]);
            } catch (e) { }
        } else if (step === 2) {
            try {
                WarmAsset(Terraria.GameContent.TextureAssets.LiquidSlope[style]);
            } catch (e) { }
        } else if (step === 3) {
            try {
                WarmAsset(Terraria.Main.instance.waterfallManager.waterfallTexture[Number(biome.Waterfall)]);
            } catch (e) { }
        } else if (step === 4) {
            WarmAsset(biome.Droplet);
        }
    }

    PreSaveAndQuit() {
        SunkenSeaPreviewRuntime.Save();
    }

    OnWorldUnload() {
        this.WarmupGeneration++;
        SunkenSeaPreviewRuntime.Reset();
    }
}
