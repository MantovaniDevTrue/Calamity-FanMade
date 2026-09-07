import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2, Color }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function player(o){const i=Math.floor(N(o,-1));if(i<0)return null;try{if(i===Math.floor(N(Terraria.Main.myPlayer,-2))&&Terraria.Main.LocalPlayer)return Terraria.Main.LocalPlayer;}catch(_){}try{return Terraria.Main.player.get_Item(i);}catch(_){return null;}}function validPlayer(p){return !!(p&&p.active!==false&&p.dead!==true);}function norm(v,sp=1){const x=N(v&&v.X),y=N(v&&v.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*sp,y/l*sp);}function src(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}}function dust(p,id,count=1,scale=.8){for(let i=0;i<count;i++)try{NewDust(p.position,p.width,p.height,id,(Math.random()-.5)*4,(Math.random()-.5)*4,80,Color.White,scale);}catch(_){}}
const OpalHeartbeat=new Map(),OpalAim=new Map();export function RegisterOpalAim(o,v){OpalAim.set(Number(o),norm(v));}export function OpalHoldoutActive(owner){const now=Math.floor(N(Terraria.Main.GameUpdateCount,0)),t=Number(OpalHeartbeat.get(Number(owner))||-9999);if(now-t<=3)return true;OpalHeartbeat.delete(Number(owner));return false;}
export class ToxicArrow extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/ToxicArrow';}
 SetDefaults(){const p=this.Projectile;p.width=14;p.height=14;p.friendly=true;p.ranged=true;p.arrow=true;p.penetrate=1;p.timeLeft=240;p.aiStyle=-1;}
 AI(p){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;p.velocity=Vector2.new(N(p.velocity.X)*.998,Math.min(18,N(p.velocity.Y)+.035));if(N(p.timeLeft)%3===0)dust(p,75,1,.6);}
 OnHitNPC(p,npc){const b=Number(ModBuff.getTypeByName('Irradiated')||0);if(b>0)try{npc.AddBuff(b,480,false);}catch(_){} }
 PreKill(p){const c=p.Center;try{p['void Resize(int newWidth, int newHeight)'](32,32);}catch(_){p.width=32;p.height=32;p.Center=c;}p.maxPenetrate=-1;p.penetrate=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;p.damage=Math.max(1,Math.floor(N(p.damage)*.5));try{p.Damage();}catch(_){}dust(p,75,8,1.1);try{PlayItemSound(92,p.Center,0,.35);}catch(_){}return true;}
}
export class OpalStrikerHoldout extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Ranged/OpalStriker';}
 SetDefaults(){const p=this.Projectile;p.width=62;p.height=24;p.friendly=false;p.ranged=true;p.penetrate=-1;p.tileCollide=false;p.ignoreWater=true;p.timeLeft=2;p.aiStyle=-1;}
 CanDamage(){return false;}
 OnSpawn(p){FusionEntityData.GetProjectileBag(p,'opalHoldout',()=>({charge:0,fired:false,fullFx:false,after:0}));OpalHeartbeat.set(Number(p.owner),Math.floor(N(Terraria.Main.GameUpdateCount,0)));}
 AI(p){
  const pl=player(p.owner),s=FusionEntityData.GetProjectileBag(p,'opalHoldout',()=>({charge:0,fired:false,fullFx:false,after:0}));
  if(!validPlayer(pl)){p.Kill();return;}
  OpalHeartbeat.set(Number(p.owner),Math.floor(N(Terraria.Main.GameUpdateCount,0)));
  let a=OpalAim.get(Number(p.owner))||norm(p.velocity);
  try{if(Number(p.owner)===Number(Terraria.Main.myPlayer)){const m=Terraria.Main.MouseWorld,c=pl.MountedCenter,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y);if(dx*dx+dy*dy>4)a=norm(Vector2.new(dx,dy));}}catch(_){}
  if(Math.abs(N(a.X))+Math.abs(N(a.Y))<.01)a=Vector2.new(N(Terraria.PlayerDirection(pl),1)||1,0);
  OpalAim.set(Number(p.owner),a);
  const dir=N(a.X)>=0?1:-1;Terraria.SetPlayerDirection(pl,dir);p.direction=p.spriteDirection=dir;p.rotation=Math.atan2(N(a.Y),N(a.X))+(dir<0?Math.PI:0);p.Center=Vector2.Add(pl.MountedCenter,Vector2.Multiply(a,25));p.timeLeft=2;
  try{pl.heldProj=p.whoAmI;pl.itemTime=2;pl.itemAnimation=2;pl.itemRotation=Math.atan2(N(a.Y)*dir,N(a.X)*dir);}catch(_){}
  if(s.fired){s.after=Math.max(0,N(s.after)-1);if(s.after<=0)p.Kill();return;}
  const using=!!pl.channel||!!pl.controlUseItem;
  if(using){s.charge++;if(s.charge===10)try{PlayItemSound(13,p.Center,0,.2);}catch(_){}if(s.charge>=88&&!s.fullFx){s.fullFx=true;dust(p,6,12,1.1);try{PlayItemSound(15,p.Center,0,.35);}catch(_){} }if(s.charge>=10&&s.charge%6===0)dust(p,6,1,.7);return;}
  if(Number(p.owner)===Number(Terraria.Main.myPlayer)){const charged=s.charge>=88,t=Number(ModProjectile.getTypeByName(charged?'OpalChargedStrike':'OpalStrike')||0);if(t>0){const v=Vector2.Multiply(a,12),spawn=Vector2.Add(p.Center,Vector2.Multiply(a,24)),dmg=Math.max(1,Math.floor(N(p.damage)*(charged?5:1))),kb=N(p.knockBack)*(charged?3:1);NewProjectile(src(p),spawn,v,t,dmg,kb,p.owner,0,0,0,null);dust(p,6,charged?16:5,charged?1.2:.8);try{PlayItemSound(charged?109:11,p.Center,0,.45);}catch(_){} }}
  s.fired=true;s.after=17;
 }
 OnKill(p){OpalHeartbeat.delete(Number(p.owner));OpalAim.delete(Number(p.owner));}
}
export class OpalStrike extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/OpalStrike';}
 SetDefaults(){const p=this.Projectile;p.width=20;p.height=20;p.friendly=true;p.ranged=true;p.penetrate=2;p.timeLeft=300;p.extraUpdates=1;p.aiStyle=-1;}
 AI(p){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;if(N(p.timeLeft)%3===0)dust(p,6,1,.65);}
 OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.OnFire,60,false);}catch(_){} }
 OnKill(p){dust(p,6,6,1);}
}
export class OpalChargedStrike extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/OpalChargedStrike';}
 SetDefaults(){const p=this.Projectile;p.width=35;p.height=35;p.friendly=true;p.ranged=true;p.penetrate=5;p.timeLeft=300;p.extraUpdates=1;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=8;}
 AI(p){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;if(N(p.timeLeft)%2===0)dust(p,6,1,.95);}
 OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.OnFire3,120,false);}catch(_){try{npc.AddBuff(Terraria.ID.BuffID.OnFire,120,false);}catch(__){}}p.damage=Math.max(1,Math.floor(N(p.damage)*.75));}
 OnKill(p){dust(p,6,10,1.2);}
}
