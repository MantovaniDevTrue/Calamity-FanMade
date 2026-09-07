import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
export class CrimsonEffigyBuff extends ModBuff {
 constructor(){super();this.Texture='Buffs/Placeables/CrimsonEffigyBuff';}
 SetStaticDefaults(){try{Terraria.Main.buffNoSave[this.Type]=false;}catch(e){}try{Terraria.Main.buffNoTimeDisplay[this.Type]=true;}catch(e){}try{Terraria.Main.persistentBuff[this.Type]=true;}catch(e){}try{Terraria.Main.pvpBuff[this.Type]=true;}catch(e){}}
 UpdatePlayer(player,buffIndex){}
}
