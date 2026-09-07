import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
export class FishAlert extends ModBuff {
    constructor(){ super(); this.Texture='Buffs/StatDebuffs/FishAlert'; }
    SetStaticDefaults(){
        try{Terraria.Main.debuff[this.Type]=true;}catch(_){}
        try{Terraria.Main.pvpBuff[this.Type]=true;}catch(_){}
        try{Terraria.Main.buffNoSave[this.Type]=true;}catch(_){}
    }
}
