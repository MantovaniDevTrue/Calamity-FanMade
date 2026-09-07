import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
const { Vector2 }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function Local(p){try{return I(Terraria.PlayerIndex(p))===I(Terraria.Main.myPlayer,-2);}catch(e){return false;}}function NPCAt(i){try{return Terraria.Main.npc.get_Item(I(i));}catch(e){return null;}}
export class SulphurousArmorPlayer extends ModPlayer{
 constructor(){super();this.SetActive=false;this.JumpLatch=false;this.ExtraReady=true;this.AirTicks=0;this.BoostTicks=0;this.BubbleCooldown=0;}
 ResetEffects(){this.SetActive=false;}
 UpdateDead(){this.SetActive=false;this.ExtraReady=true;this.AirTicks=0;this.BoostTicks=0;this.JumpLatch=false;this.BubbleCooldown=0;}
 ActivateSet(player){if(!Local(player))return;this.SetActive=true;const s=ModPlayer.getByName('CalamityPlayerState');if(s&&s.IsLocalPlayer(player)){s.WearingRogueArmor=true;s.RogueStealthMax=N(s.RogueStealthMax)+.65;}}
 Poison(npc){if(!this.SetActive||!npc||!npc.active)return;try{npc.AddBuff(20,60,false);}catch(e){}}
 OnHitNPC(player,item,npc){if(Local(player))this.Poison(npc);}
 OnHitNPCWithProj(player,npc,projectile){if(Local(player))this.Poison(npc);}
 OnHurt(player,damageSource,damage){if(!Local(player)||!this.SetActive||N(damage)<=0||!damageSource)return;let idx=-1;try{idx=I(damageSource._sourceNPCIndex,-1);}catch(e){}if(idx>=0)this.Poison(NPCAt(idx));}
 ExtraJump(player){if(!this.ExtraReady)return;this.ExtraReady=false;this.BoostTicks=45;const v=player.velocity;player.velocity=Vector2.new(N(v?.X),Math.min(-7.5,N(v?.Y)-3));try{player.jump=Math.max(I(player.jump,0),15);}catch(e){}if(this.BubbleCooldown<=0){const type=N(ModProjectile.getTypeByName('SulphuricAcidBubbleFriendly'),0);if(type>0){const c=Terraria.PlayerCenter(player),s=ModPlayer.getByName('CalamityPlayerState'),damage=Math.max(1,Math.floor(20*(1+N(s?.RogueDamageBonus,0))));try{NewProjectile(null,N(c.X),N(c.Y)+20,0,0,type,damage,0,I(Terraria.Main.myPlayer),1,0,0,null);}catch(e){}this.BubbleCooldown=20;}}}
 PostUpdate(player){if(!Local(player))return;if(this.BubbleCooldown>0)this.BubbleCooldown--;if(!this.SetActive){this.AirTicks=0;this.ExtraReady=true;this.BoostTicks=0;this.JumpLatch=player.controlJump===true;return;}const vy=N(player.velocity?.Y),grounded=Math.abs(vy)<.01||player.wet===true;if(grounded){this.AirTicks=0;this.ExtraReady=true;}else this.AirTicks++;const jump=player.controlJump===true;if(jump&&!this.JumpLatch&&this.AirTicks>5)this.ExtraJump(player);this.JumpLatch=jump;if(this.BoostTicks>0){this.BoostTicks--;try{player.runAcceleration=N(player.runAcceleration,1)*1.5;player.maxRunSpeed=N(player.maxRunSpeed,1)*1.25;}catch(e){}}}
}
