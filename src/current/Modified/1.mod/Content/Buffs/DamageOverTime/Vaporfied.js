import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
const { Vector2 } = Modules;
export class Vaporfied extends ModBuff{
    constructor(){super();this.Texture='Buffs/DamageOverTime/Vaporfied';}
    SetStaticDefaults(){try{Terraria.Main.debuff[this.Type]=true;}catch(_){}try{Terraria.Main.pvpBuff[this.Type]=true;}catch(_){}try{Terraria.Main.buffNoSave[this.Type]=true;}catch(_){}try{Terraria.ID.BuffID.Sets.BuffTimeIsExtendedWithGameDifficulty[this.Type]=true;}catch(_){}}
    UpdatePlayer(player,buffIndex){if(Number(player.lifeRegen)>0)player.lifeRegen=0;player.lifeRegenTime=0;player.lifeRegen=Number(player.lifeRegen)-16;try{const v=player.velocity;player.velocity=Vector2.new(Number(v.X)*.98,Number(v.Y)*.98);}catch(_){}}
    UpdateNPC(npc,buffIndex){if(Number(npc.lifeRegen)>0)npc.lifeRegen=0;npc.lifeRegen=Number(npc.lifeRegen)-30;try{if(npc.boss!==true){const v=npc.velocity;npc.velocity=Vector2.new(Number(v.X)/1.05,Number(v.Y)/1.05);}}catch(_){}}
}
