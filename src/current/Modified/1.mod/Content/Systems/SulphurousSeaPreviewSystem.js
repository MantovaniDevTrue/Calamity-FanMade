import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModBiome } from './../../TL/ModBiome.js';
import { SulphurousSeaPreviewRuntime } from './../../Core/SulphurousSeaPreviewRuntime.js';
import { AcidRainTier1Runtime } from './../../Core/AcidRainTier1Runtime.js';

const MUSIC_DAY = 66;
const MUSIC_NIGHT = 64;
const MUSIC_RAIN = 62;
function Tick() {
    try {
        return Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
    } catch (e) {
        return 0;
    }
}

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

export class SulphurousSeaPreviewSystem extends ModSystem {
    constructor() {
        super();
        this.LastMusicCheck = -9999;
        this.WarmupGeneration = 0;
    }

    OnWorldLoad() {
        SulphurousSeaPreviewRuntime.Load();
        this.LastMusicCheck = -9999;
        this.WarmupGeneration++;
        const generation = this.WarmupGeneration;
        const delays = [16, 24, 32, 40, 48];
        for (let i = 0; i < delays.length; i++) {
            ModSystem.SetTimeout(() => {
                if (generation !== this.WarmupGeneration)
                    return;
                this.WarmVisualAsset(i);
            }, delays[i]);
        }
    }

    WarmVisualAsset(step) {
        const biome = ModBiome.getByName('SulphurousSeaBiome');
        if (!biome)
            return;
        const style = Math.floor(Number(biome.WaterStyle) || 0);
        if (step === 0)
            WarmAsset(biome.WaterTexture2D);
        else if (step === 1) {
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
        } else if (step === 4)
            WarmAsset(biome.Droplet);
    }

    Update() {
        const tick = Tick();
        if (tick - this.LastMusicCheck < 15)
            return;
        this.LastMusicCheck = tick;
        const biome = ModBiome.getByName('SulphurousSeaBiome');
        if (!biome)
            return;
        let raining = false;
        try {
            raining = AcidRainTier1Runtime.Active === true || Terraria.Main.raining === true || Number(Terraria.Main.cloudAlpha || 0) > 0.35;
        } catch (e) { }
        biome.Music = raining ? MUSIC_RAIN : (Terraria.Main.dayTime === true ? MUSIC_DAY : MUSIC_NIGHT);
    }

    PreSaveAndQuit() {
        SulphurousSeaPreviewRuntime.Save();
    }

    OnWorldUnload() {
        this.WarmupGeneration++;
        this.LastMusicCheck = -9999;
        SulphurousSeaPreviewRuntime.Reset();
    }
}
