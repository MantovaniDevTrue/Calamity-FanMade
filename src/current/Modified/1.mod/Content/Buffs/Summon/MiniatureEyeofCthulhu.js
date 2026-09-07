import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';
export class MiniatureEyeofCthulhu extends ModBuff {
    constructor(){super();this.Texture='Buffs/Summon/MiniatureEyeofCthulhu';this.MinionType=0;}
    SetStaticDefaults(){try{Terraria.Main.buffNoTimeDisplay[this.Type]=true;}catch(_){}try{Terraria.Main.buffNoSave[this.Type]=true;}catch(_){} }
    PostSetupContent(){this.MinionType=Number(ModProjectile.getTypeByName('DeathstareEyeball')||0);}
    UpdatePlayer(player,buffIndex){
        if(!player||player.dead){try{player?.DelBuff(buffIndex);}catch(_){}return;}
        if(!(this.MinionType>0))this.MinionType=Number(ModProjectile.getTypeByName('DeathstareEyeball')||0);
        if(this.MinionType>0&&CountOwned(player,this.MinionType)>0){try{player.buffTime[buffIndex]=18000;}catch(_){try{player.buffTime.set_Item(buffIndex,18000);}catch(__){}}}
        else try{player.DelBuff(buffIndex);}catch(_){}
    }
}
