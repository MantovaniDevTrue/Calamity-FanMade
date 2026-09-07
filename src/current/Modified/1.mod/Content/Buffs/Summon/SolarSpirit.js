import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { GetSunSpirit } from './../../../Core/PreBossArsenalRuntime.js';
export class SolarSpirit extends ModBuff{
 constructor(){super();this.Texture='Buffs/Summon/SolarSpirit';}
 UpdatePlayer(player,buffIndex){if(!GetSunSpirit(player)){try{player.DelBuff(buffIndex);}catch(_){}}}
}
