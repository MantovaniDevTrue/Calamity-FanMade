import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';
function killOwned(player,type){if(!player||!(type>0))return;let owner=-1;try{owner=Math.floor(Number(Terraria.PlayerIndex(player)));}catch(_){}for(let i=0;i<1000;i++){let p=null;try{p=Terraria.Main.projectile[i];}catch(_){}if(p&&p.active&&Number(p.owner)===owner&&Number(p.type)===Number(type)){try{p.Kill();}catch(_){try{p.active=false;}catch(__){}}}}}
export class FrostBlossomBuff extends ModBuff{
 constructor(){super();this.Texture='Buffs/Summon/FrostBlossomBuff';this.MinionType=0;}
 SetStaticDefaults(){try{Terraria.Main.buffNoTimeDisplay[this.Type]=true;}catch(_){}try{Terraria.Main.buffNoSave[this.Type]=true;}catch(_){} }
 PostSetupContent(){this.MinionType=Number(ModProjectile.getTypeByName('FrostBlossom')||0);}
 UpdatePlayer(player,buffIndex){if(!player||player.dead){try{if(player)player.DelBuff(buffIndex);}catch(_){}return;}if(!(this.MinionType>0))this.MinionType=Number(ModProjectile.getTypeByName('FrostBlossom')||0);if(this.MinionType>0&&CountOwned(player,this.MinionType)>0){try{player.buffTime[buffIndex]=18000;}catch(_){try{player.buffTime.set_Item(buffIndex,18000);}catch(__){}}}else try{player.DelBuff(buffIndex);}catch(_){} }
 OnRemove(player){if(!(this.MinionType>0))this.MinionType=Number(ModProjectile.getTypeByName('FrostBlossom')||0);killOwned(player,this.MinionType);}
}
