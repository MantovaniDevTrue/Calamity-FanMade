import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
export class CorruptionEffigyBuff extends ModBuff {
 constructor(){super();this.Texture='Buffs/Placeables/CorruptionEffigyBuff';}
 SetStaticDefaults(){try{Terraria.Main.buffNoSave[this.Type]=false;}catch(e){}try{Terraria.Main.buffNoTimeDisplay[this.Type]=true;}catch(e){}try{Terraria.Main.persistentBuff[this.Type]=true;}catch(e){}try{Terraria.Main.pvpBuff[this.Type]=true;}catch(e){}}
 UpdatePlayer(player,buffIndex){}
}
