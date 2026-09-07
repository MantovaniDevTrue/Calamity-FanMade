import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModBiome } from './../../TL/ModBiome.js';
import { ModUndergroundBackground } from './../../TL/ModBackgrounds.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { AbyssLayer1Runtime } from './../../Core/AbyssLayer1Runtime.js';
const { Color }=Modules;
export class AbyssLayer3Biome extends ModBiome{
 constructor(){super();this.Priority=4;this.ForceNeutralUndergroundBackground=true;this.Music=0;this.WaterTexture='Waters/MiddleAbyssWater';this.WaterfallTexture='Waters/MiddleAbyssWaterflow';this.MapBackgroundTexture='Backgrounds/MapBackgrounds/AbyssBGLayer23';this.BiomeColor=Color.new(9,29,47,255);}
 SetStaticDefaults(){this.UndergroundBackground=ModUndergroundBackground.getByName('AbyssNeutralBackground');}
 IsBiomeActive(player,tileCounts){return AbyssLayer1Runtime.ContainsLayerPlayer(player,3);}
 OnInBiome(player){const s=ModPlayer.getByName('CalamityPlayerState');if(s){s.ZoneAbyss=true;s.ZoneAbyssLayer3=true;}const r=Math.max(1,Math.floor(Number(Terraria.NPC.spawnRate)||1));const m=Math.max(1,Math.floor(Number(Terraria.NPC.maxSpawns)||1));Terraria.NPC.spawnRate=Math.max(1,Math.floor(r*.7));Terraria.NPC.maxSpawns=Math.max(1,Math.floor(m*1.1));}
 ModifySpawnPool(spawnInfo,pool){if(!spawnInfo||!this.IsBiomeActive(spawnInfo.Player,null))return;if(Object.prototype.hasOwnProperty.call(pool,0))pool[0]=0;if(Object.prototype.hasOwnProperty.call(pool,'0'))pool['0']=0;}
}
