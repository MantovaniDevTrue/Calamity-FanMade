import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

class ExistingMinionPatternBuff extends ModBuff {
    constructor(){ super(); this.MinionName=''; this.MinionType=0; }
    SetStaticDefaults(){
        try{Terraria.Main.buffNoTimeDisplay[this.Type]=true;}catch(_){}
        try{Terraria.Main.buffNoSave[this.Type]=true;}catch(_){}
    }
    PostSetupContent(){
        if(this.MinionName) this.MinionType=Number(ModProjectile.getTypeByName(this.MinionName)||0);
    }
    UpdatePlayer(player,buffIndex){
        if(!player || player.dead){ try{player?.DelBuff(buffIndex);}catch(_){} return; }
        if(!(this.MinionType>0) && this.MinionName) this.MinionType=Number(ModProjectile.getTypeByName(this.MinionName)||0);
        if(this.MinionType>0 && CountOwned(player,this.MinionType)>0){
            try{player.buffTime[buffIndex]=18000;}catch(_){try{player.buffTime.set_Item(buffIndex,18000);}catch(__){}}
        } else {
            try{player.DelBuff(buffIndex);}catch(_){}
        }
    }
}

export class VileFeederBuff extends ExistingMinionPatternBuff {
    constructor(){super();this.Texture='Buffs/Summon/VileFeederBuff';this.MinionName='VileFeederSummon';}
}
export class BabyBloodCrawlerBuff extends ExistingMinionPatternBuff {
    constructor(){super();this.Texture='Buffs/Summon/BabyBloodCrawlerBuff';this.MinionName='BabyBloodCrawler';}
}
export class SmallSkeletonBuff extends ExistingMinionPatternBuff {
    constructor(){super();this.Texture='Buffs/Summon/SmallSkeletonBuff';this.MinionName='SmallSkeletonMinion';}
}
export class EyeOfNightBuff extends ExistingMinionPatternBuff {
    constructor(){super();this.Texture='Buffs/Summon/EyeOfNightBuff';this.MinionName='EyeOfNightSummon';}
}
