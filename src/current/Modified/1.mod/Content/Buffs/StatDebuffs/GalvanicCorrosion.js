import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
const { Vector2 } = Modules;
export class GalvanicCorrosion extends ModBuff{
 constructor(){super();this.Texture='Buffs/StatDebuffs/GalvanicCorrosion';}
 SetStaticDefaults(){try{Terraria.Main.debuff[this.Type]=true;}catch(e){}try{Terraria.Main.pvpBuff[this.Type]=true;}catch(e){}try{Terraria.Main.buffNoSave[this.Type]=false;}catch(e){}try{Terraria.ID.BuffID.Sets.BuffTimeIsExtendedWithGameDifficulty[this.Type]=true;}catch(e){}}
 UpdatePlayer(player,buffIndex){try{const v=player.velocity;player.velocity=Vector2.new(Number(v.X)*.98,Number(v.Y)*.98);}catch(e){}}
 UpdateNPC(npc,buffIndex){try{const v=npc.velocity;npc.velocity=Vector2.new(Number(v.X)*.95,Number(v.Y)*.95);}catch(e){}}
}
