import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const Lease=new Array(255).fill(0),Cooldown=new Array(255).fill(0),PlayerRefs=new Array(255).fill(null);
function Index(p){return Math.max(0,Math.min(254,Math.floor(Number(Terraria.PlayerIndex(p))||0)));}
function Active(p){return Date.now()-Lease[Index(p)]<180;}
function State(){return ModPlayer.getByName('CalamityPlayerState');}
export class InkBombPlayer extends ModPlayer{
 Enable(player){const i=Index(player);Lease[i]=Date.now();PlayerRefs[i]=player;}
 ResetEffects(player){}
 PostUpdate(player){if(!Active(player))return;const s=State();if(!s||s.WearingRogueArmor!==true||!(Number(s.RogueStealthMax)>0))return;if(Number(player.itemAnimation)>0)return;const v=Terraria.PlayerVelocity(player),moving=Math.abs(Number(v.X))+Math.abs(Number(v.Y))>0.1,frames=moving?240:120;s.RogueStealth=Math.min(Number(s.RogueStealthMax),Number(s.RogueStealth)+Number(s.RogueStealthMax)/frames*0.07);}
 OnHurt(player,damageSource,damage,hitDirection,pvp,quiet,crit,cooldownCounter,dodgeable){const i=Index(player),now=Date.now();if(!Active(player)||now<Cooldown[i])return;Cooldown[i]=now+20000;const s=State();if(s&&Number(s.RogueStealthMax)>0)s.RogueStealth=Math.min(Number(s.RogueStealthMax),Number(s.RogueStealth)+Number(s.RogueStealthMax)*0.5);const type=Number(ModProjectile.getTypeByName('InkBombProjectile')||0);if(type<=0)return;let source=null;try{source=null;}catch(e){}const c=Terraria.PlayerCenter(player);for(let n=0;n<3;n++){const a=Math.random()*Math.PI*2;try{NewProjectile(source,c,Vector2.new(Math.cos(a)*2,Math.sin(a)*2),type,0,0,i,0,0,0,null);}catch(e){}}try{tl.log(`[CalamityPort InkBomb] triggered; owner=${i}, cooldown=20s, bombs=3.`);}catch(e){}}
}
