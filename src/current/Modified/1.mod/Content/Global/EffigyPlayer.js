import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModBuff } from './../../TL/ModBuff.js';
function Has(player,type){if(!player||!(type>0))return false;try{return Number(player['int FindBuffIndex(int type)'](Math.floor(type)))>=0;}catch(e){try{return Number(player.FindBuffIndex(type))>=0;}catch(_){return false;}}}
export class EffigyPlayer extends ModPlayer{
 constructor(){super();this.CorruptType=0;this.CrimsonType=0;}
 Resolve(){if(!(this.CorruptType>0))this.CorruptType=Number(ModBuff.getTypeByName('CorruptionEffigyBuff')||0);if(!(this.CrimsonType>0))this.CrimsonType=Number(ModBuff.getTypeByName('CrimsonEffigyBuff')||0);}
 Corrupt(player){this.Resolve();return Has(player,this.CorruptType);} Crimson(player){this.Resolve();return Has(player,this.CrimsonType);}
 ModifyMaxStats(player){this.CumulativeHealth=0;if(this.Crimson(player)){const base=Math.max(1,Math.floor(Number(player.statLifeMax2)||1));this.CumulativeHealth=Math.floor(base*0.9)-base;}}
 UpdateEquips(player){if(this.Corrupt(player)){player.moveSpeed=Number(player.moveSpeed||0)+0.10;player.endurance=Number(player.endurance||0)-0.10;}if(this.Crimson(player))player.statDefense=Number(player.statDefense||0)+5;}
 ModifyWeaponDamage(player,item,damage){this.WeaponDamage=Number(damage)*(this.Crimson(player)?1.10:1);}
 ModifyWeaponCrit(player,item,crit){this.WeaponCrit=Number(crit)+(this.Corrupt(player)?10:0);}
}
