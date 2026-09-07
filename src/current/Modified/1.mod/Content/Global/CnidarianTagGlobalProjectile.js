import { Terraria } from './../../TL/ModImports.js';
import { GlobalProjectile } from './../../TL/GlobalProjectile.js';
import { ModBuff } from './../../TL/ModBuff.js';
function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
export class CnidarianTagGlobalProjectile extends GlobalProjectile{
 OnHitNPC(projectile,npc){
  if(!projectile||!npc||I(projectile.owner)!==I(Terraria.Main.myPlayer))return;
  let summon=projectile.minion===true;
  if(!summon)try{summon=Terraria.ID.ProjectileID.Sets.MinionShot[projectile.type]===true;}catch(_){}
  if(!summon)return;
  const buff=Number(ModBuff.getTypeByName('CnidarianSummonTagBuff')||0);if(!(buff>0))return;
  let index=-1;try{index=npc.FindBuffIndex(buff);}catch(_){try{index=npc['int FindBuffIndex(int type)'](buff);}catch(__){}}
  if(index<0)return;
  try{npc['double StrikeNPC(int Damage, float knockBack, int hitDirection, bool crit, bool noEffect, bool fromNet, int owner)'](2,0,I(projectile.direction,1),false,false,false,I(projectile.owner));}catch(_){}
 }
}
