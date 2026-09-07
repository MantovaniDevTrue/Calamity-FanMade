import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
export class Trippy extends ModBuff {
    constructor(){super();this.Texture='Buffs/Alcohol/Trippy';}
    SetStaticDefaults(){try{Terraria.Main.debuff[this.Type]=false;}catch(e){}try{Terraria.Main.pvpBuff[this.Type]=true;}catch(e){}try{Terraria.Main.buffNoSave[this.Type]=false;}catch(e){}}
    UpdatePlayer(player,buffIndex){}
}
