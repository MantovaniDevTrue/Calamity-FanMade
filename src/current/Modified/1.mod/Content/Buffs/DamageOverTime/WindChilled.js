import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
export class WindChilled extends ModBuff{
    constructor(){super();this.Texture='Buffs/DamageOverTime/WindChilled';}
    SetStaticDefaults(){try{Terraria.Main.debuff[this.Type]=true;}catch(e){}try{Terraria.Main.pvpBuff[this.Type]=true;}catch(e){}try{Terraria.Main.buffNoSave[this.Type]=true;}catch(e){}try{Terraria.ID.BuffID.Sets.BuffTimeIsExtendedWithGameDifficulty[this.Type]=true;}catch(e){}}
    UpdatePlayer(player,buffIndex){if(Number(player.lifeRegen)>0)player.lifeRegen=0;player.lifeRegenTime=0;player.lifeRegen=Number(player.lifeRegen)-12;}
    UpdateNPC(npc,buffIndex){const c=ModPlayer.getByName('FrozenCubePlayer');const mult=c?c.WindMultiplier(npc):1;if(Number(npc.lifeRegen)>0)npc.lifeRegen=0;npc.lifeRegen=Number(npc.lifeRegen)-Math.max(1,Math.floor(12*mult));}
}
