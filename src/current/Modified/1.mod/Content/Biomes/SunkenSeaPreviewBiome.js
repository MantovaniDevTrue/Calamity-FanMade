import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModBiome } from './../../TL/ModBiome.js';
import { ModUndergroundBackground } from './../../TL/ModBackgrounds.js';
import { SunkenSeaPreviewRuntime } from './../../Core/SunkenSeaPreviewRuntime.js';

const { Color } = Modules;
export class SunkenSeaPreviewBiome extends ModBiome {
    constructor() {
        super();
        this.Priority = 3;
        this.Music = 78;
        this.WaterTexture = 'Waters/SunkenSeaShoresWater';
        this.WaterfallTexture = 'Waters/SunkenSeaShoresWaterflow';
        this.DropletTexture = 'Waters/SunkenSeaShoresWaterDroplet';
        this.BiomeColor = Color.new(38, 157, 174, 255);
    }

    SetStaticDefaults() {
        this.UndergroundBackground = ModUndergroundBackground.getByName('SunkenSeaPreviewBackground');
    }

    IsBiomeActive(player, tileCounts) {
        return SunkenSeaPreviewRuntime.ContainsPlayer(player);
    }

    OnInBiome(player) {
        const r = Math.max(1, Math.floor(Number(Terraria.NPC.spawnRate) || 1));
        const m = Math.max(1, Math.floor(Number(Terraria.NPC.maxSpawns) || 1));
        Terraria.NPC.spawnRate = Math.max(1, Math.floor(r * 0.9));
        Terraria.NPC.maxSpawns = Math.max(1, Math.floor(m * 1.1));
    }

    ModifySpawnPool(spawnInfo, pool) {
        if (!spawnInfo || !SunkenSeaPreviewRuntime.ContainsPlayer(spawnInfo.Player))
            return;
        if (Object.prototype.hasOwnProperty.call(pool, 0))
            pool[0] = 0;
        if (Object.prototype.hasOwnProperty.call(pool, '0'))
            pool['0'] = 0;
    }
}
