import { AbyssLayer1Biome } from './../Content/Biomes/AbyssLayer1Biome.js';
import { AbyssLayer2Biome } from './../Content/Biomes/AbyssLayer2Biome.js';
import { AbyssLayer3Biome } from './../Content/Biomes/AbyssLayer3Biome.js';
import { AbyssLayer4Biome } from './../Content/Biomes/AbyssLayer4Biome.js';
import { ModBiome } from './../TL/ModBiome.js';
import { SunkenSeaPreviewBiome } from './../Content/Biomes/SunkenSeaPreviewBiome.js';
import { SulphurousSeaBiome } from './../Content/Biomes/SulphurousSeaBiome.js';

export function RegisterBiomes() {
    ModBiome.register(SunkenSeaPreviewBiome);
    ModBiome.register(SulphurousSeaBiome);
    ModBiome.register(AbyssLayer1Biome);
    ModBiome.register(AbyssLayer2Biome);
    ModBiome.register(AbyssLayer3Biome);
    ModBiome.register(AbyssLayer4Biome);
}
