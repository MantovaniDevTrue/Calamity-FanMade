import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
export class CrushDepth extends ModBuff {
    constructor(){ super(); this.Texture='Buffs/DamageOverTime/CrushDepth'; }
    SetStaticDefaults(){
        try{Terraria.Main.debuff[this.Type]=true;}catch(_){}
        try{Terraria.Main.pvpBuff[this.Type]=true;}catch(_){}
        try{Terraria.Main.buffNoSave[this.Type]=true;}catch(_){}
    }
    UpdatePlayer(player){ try{player.lifeRegen=Number(player.lifeRegen)-100;}catch(_){} }
    UpdateNPC(npc){ try{npc.lifeRegen=Number(npc.lifeRegen)-100;}catch(_){} }
}
