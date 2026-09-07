import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

export class EnchantedKnifeStaffBuff extends ModBuff{
    constructor(){super();this.Texture='Buffs/Summon/EnchantedKnifeStaffBuff';this.MinionType=0;}
    SetStaticDefaults(){
        try{Terraria.Main.buffNoTimeDisplay[this.Type]=true;}catch(_){}
        try{Terraria.Main.buffNoSave[this.Type]=true;}catch(_){}
    }
    PostSetupContent(){this.MinionType=Number(ModProjectile.getTypeByName('EnchantedKnifeSummon')||0);}
    UpdatePlayer(player,buffIndex){
        if(!player||player.dead){try{player?.DelBuff(buffIndex);}catch(_){}return;}
        if(!(this.MinionType>0))this.MinionType=Number(ModProjectile.getTypeByName('EnchantedKnifeSummon')||0);
        if(this.MinionType>0&&CountOwned(player,this.MinionType)>0){
            try{player.buffTime[buffIndex]=18000;}catch(_){try{player.buffTime.set_Item(buffIndex,18000);}catch(__){}}
        } else try{player.DelBuff(buffIndex);}catch(_){}
    }
}

export class CnidarianSummonTagBuff extends ModBuff{
    constructor(){super();this.Texture='Items/Weapons/Summon/Cnidarian';}
    SetStaticDefaults(){try{Terraria.Main.debuff[this.Type]=true;}catch(_){}try{Terraria.Main.pvpBuff[this.Type]=true;}catch(_){} }
}
