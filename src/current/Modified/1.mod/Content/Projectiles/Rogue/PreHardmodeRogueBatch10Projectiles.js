import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile, MarkStealthStrike, IsStealthStrike } from './../../../Core/RogueRuntime.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2, Color }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function src(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}}function spawned(id){try{return Terraria.Main.projectile.get_Item(Number(id));}catch(_){return null;}}
function owner(p){const i=I(p.owner);if(i<0)return null;try{if(i===I(Terraria.Main.myPlayer,-2))return Terraria.Main.LocalPlayer;}catch(_){}try{return Terraria.Main.player.get_Item(i);}catch(_){return null;}}
function center(e){try{return e.Center;}catch(_){return Vector2.Zero;}}function valid(n){try{return !!n&&n.active!==false&&n.dontTakeDamage!==true&&N(n.life)>0;}catch(_){return false;}}
function norm(v,s=1){const x=N(v?.X),y=N(v?.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*s,y/l*s);}function rotate(v,a){const x=N(v.X),y=N(v.Y),c=Math.cos(a),s=Math.sin(a);return Vector2.new(x*c-y*s,x*s+y*c);}function dust(p,id,c=1,s=1){for(let i=0;i<c;i++)try{NewDust(p.position,p.width,p.height,id,(Math.random()-.5)*3,(Math.random()-.5)*3,100,Color.White,s);}catch(_){} }

export class MetalChunk extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/MetalMonstrosity';}
 SetDefaults(){const p=this.Projectile;p.width=p.height=32;p.friendly=true;p.hostile=false;p.penetrate=1;p.timeLeft=600;p.tileCollide=true;p.ignoreWater=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=60;}
 OnSpawn(p){MarkRogueProjectile(p,'MetalMonstrosity',false);FusionEntityData.GetProjectileBag(p,'metalChunk',()=>({stuck:null,ox:0,oy:0}));}
 AI(p){const st=FusionEntityData.GetProjectileBag(p,'metalChunk',()=>({stuck:null,ox:0,oy:0}));if(st.stuck&&valid(st.stuck)){const c=center(st.stuck);p.Center=Vector2.new(N(c.X)+N(st.ox),N(c.Y)+N(st.oy));p.velocity=Vector2.Zero;p.tileCollide=false;}else{if(st.stuck)st.stuck=null;p.velocity=Vector2.new(N(p.velocity.X),Math.min(16,N(p.velocity.Y)+.11));p.rotation+=.14*(N(p.direction,1)||1);}}
 OnHitNPC(p,n){if(IsStealthStrike(p)&&valid(n)){const st=FusionEntityData.GetProjectileBag(p,'metalChunk',()=>({stuck:null,ox:0,oy:0})),nc=center(n),pc=center(p);st.stuck=n;st.ox=N(pc.X)-N(nc.X);st.oy=N(pc.Y)-N(nc.Y);p.velocity=Vector2.Zero;p.tileCollide=false;}}
 PreKill(p){if(I(p.owner)===I(Terraria.Main.myPlayer)){const shard=Number(ModProjectile.getTypeByName('MetalShard')||0),base=Math.max(1,I(p.damage,28));let spiky=0;try{spiky=Number(Terraria.ID.ProjectileID.SpikyBall||0);}catch(_){}for(let i=0;i<3;i++){const v=rotate(Vector2.new(0,-4.5),(Math.random()-.5)*Math.PI/2);if(spiky>0){const id=NewProjectile(src(p),p.Center,v,spiky,Math.max(1,Math.floor(base*.3)),0,p.owner,0,0,0,null),q=spawned(id);if(q){q.friendly=true;q.hostile=false;q.timeLeft=600;MarkRogueProjectile(q,'MetalMonstrosity',true);}}if(shard>0){const v2=rotate(Vector2.new(0,-3),(Math.random()-.5)*Math.PI/2),id=NewProjectile(src(p),p.Center,v2,shard,Math.max(1,Math.floor(base*.3)),0,p.owner,0,0,0,null),q=spawned(id);if(q)MarkRogueProjectile(q,'MetalMonstrosity',true);}}if(IsStealthStrike(p)&&shard>0)for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2,v=Vector2.new(Math.cos(a)*4,Math.sin(a)*4),id=NewProjectile(src(p),p.Center,v,shard,Math.max(1,Math.floor(base*.15)),0,p.owner,0,0,0,null),q=spawned(id);if(q)MarkRogueProjectile(q,'MetalMonstrosity',true);}}dust(p,31,10,1);try{PlayItemSound(42,p.Center,0,.25);}catch(_){}return true;}
}

export class MetalShard extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Rogue/MetalShard';}
 SetDefaults(){const p=this.Projectile;p.width=p.height=12;p.friendly=true;p.hostile=false;p.penetrate=2;p.timeLeft=360;p.tileCollide=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=60;}
 OnSpawn(p){MarkRogueProjectile(p,'MetalMonstrosity',true);FusionEntityData.GetProjectileBag(p,'metalShard',()=>({stuck:null,ox:0,oy:0}));}
 AI(p){const st=FusionEntityData.GetProjectileBag(p,'metalShard',()=>({stuck:null,ox:0,oy:0}));if(st.stuck&&valid(st.stuck)){const c=center(st.stuck);p.Center=Vector2.new(N(c.X)+N(st.ox),N(c.Y)+N(st.oy));p.velocity=Vector2.Zero;p.tileCollide=false;}else{if(st.stuck)st.stuck=null;p.velocity=Vector2.new(N(p.velocity.X),Math.min(16,N(p.velocity.Y)+.1));p.rotation+=.1;}}
 OnHitNPC(p,n){if(!valid(n))return;const st=FusionEntityData.GetProjectileBag(p,'metalShard',()=>({stuck:null,ox:0,oy:0})),nc=center(n),pc=center(p);st.stuck=n;st.ox=N(pc.X)-N(nc.X);st.oy=N(pc.Y)-N(nc.Y);p.velocity=Vector2.Zero;p.tileCollide=false;}
 OnTileCollide(){return true;}
}

const LemonHeartbeat=new Map();
export function LemonNadeHoldoutActive(o){const now=I(Terraria.Main.GameUpdateCount,0),t=I(LemonHeartbeat.get(Number(o)),-9999);if(now-t<=3)return true;LemonHeartbeat.delete(Number(o));return false;}
export class LemonNadeHoldout extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/LemonNade';this.NadeType=0;}
 PostSetupContent(){this.NadeType=Number(ModProjectile.getTypeByName('LemonNadeProjectile')||0);}
 SetDefaults(){const p=this.Projectile;p.width=22;p.height=28;p.friendly=false;p.hostile=false;p.penetrate=-1;p.timeLeft=2;p.tileCollide=false;p.ignoreWater=true;p.aiStyle=-1;}
 OnSpawn(p){LemonHeartbeat.set(Number(p.owner),I(Terraria.Main.GameUpdateCount,0));MarkRogueProjectile(p,'LemonNade',false);FusionEntityData.GetProjectileBag(p,'lemonHold',()=>({age:0,released:false,swing:0,cooldown:0,thrown:false,aimX:N(p.velocity.X,1),aimY:N(p.velocity.Y)}));}
 AI(p){
  const pl=owner(p),st=FusionEntityData.GetProjectileBag(p,'lemonHold',()=>({age:0,released:false,swing:0,cooldown:0,thrown:false,aimX:1,aimY:0}));
  if(!pl||pl.active===false||pl.dead===true){p.Kill();return;}
  LemonHeartbeat.set(Number(p.owner),I(Terraria.Main.GameUpdateCount,0));p.timeLeft=2;st.age++;
  let a=norm(Vector2.new(N(st.aimX,1),N(st.aimY)));
  try{const c=pl.MountedCenter,m=Terraria.Main.MouseWorld;a=norm(Vector2.new(N(m.X)-N(c.X),N(m.Y)-N(c.Y)));}catch(_){}
  st.aimX=N(a.X);st.aimY=N(a.Y);
  const dir=N(a.X)>=0?1:-1,grav=N(pl.gravDir,1),aimAngle=Math.atan2(N(a.Y),N(a.X));
  const using=!!pl.channel||!!pl.controlUseItem;
  const startup=10,swingTime=10,cooldownTime=10;
  if(!st.released&&st.age>=startup&&!using)st.released=true;
  if(!st.released&&st.age>=120)st.released=true;
  let relative=-Math.PI/2;
  if(!st.released){
   const t=Math.max(0,Math.min(1,st.age/startup)),e=1-Math.pow(1-t,3);
   relative=(-0.25+( -Math.PI/2 +0.25)*e)*dir;
  }else if(!st.thrown){
   st.swing++;
   const t=Math.max(0,Math.min(1,st.swing/swingTime)),e=t*t*(3-2*t);
   relative=(-Math.PI*0.70 + (Math.PI*0.20 + Math.PI*0.70)*e)*dir;
   if(st.swing>=Math.floor(swingTime*.75))this.Throw(p,a,st);
  }else{
   st.cooldown++;
   const t=Math.max(0,Math.min(1,st.cooldown/cooldownTime)),e=1-Math.pow(1-t,3);
   relative=(Math.PI*0.20+(Math.PI*0.33-Math.PI*0.20)*e)*dir;
  }
  const armAngle=aimAngle+relative,hand=Vector2.new(Math.cos(armAngle),Math.sin(armAngle));
  p.velocity=Vector2.Zero;p.Center=Vector2.new(N(pl.MountedCenter.X)+N(hand.X)*20,N(pl.MountedCenter.Y)+N(hand.Y)*20);
  p.rotation=armAngle+Math.PI/2;p.direction=p.spriteDirection=dir;
  try{Terraria.SetPlayerDirection(pl,dir);}catch(_){}
  try{pl.heldProj=p.whoAmI;pl.itemTime=2;pl.itemAnimation=2;const arm=(armAngle-Math.PI/2)*grav+(grav<0?Math.PI:0);pl.SetCompositeArmFront(true,Terraria.Player.CompositeArmStretchAmount.Full,arm);}catch(_){}
  if(st.thrown)p.alpha=255;
  if(st.thrown&&st.cooldown>=cooldownTime)p.Kill();
 }
 Throw(p,a,st=null){st=st||FusionEntityData.GetProjectileBag(p,'lemonHold',()=>({thrown:false}));if(st.thrown)return;st.thrown=true;st.cooldown=0;if(!(this.NadeType>0))this.NadeType=Number(ModProjectile.getTypeByName('LemonNadeProjectile')||0);if(this.NadeType>0&&I(p.owner)===I(Terraria.Main.myPlayer)){const id=NewProjectile(src(p),p.Center,norm(a,13),this.NadeType,Math.max(1,I(p.damage,33)),N(p.knockBack,3),p.owner,0,0,0,null),q=spawned(id);if(q){MarkRogueProjectile(q,'LemonNade',false);if(IsStealthStrike(p))MarkStealthStrike(q,'LemonNade',false);q.originalDamage=Math.max(1,I(p.originalDamage,p.damage));q.netUpdate=true;}}try{PlayItemSound(1,p.Center,0,.2);}catch(_){} }
 OnKill(p){LemonHeartbeat.delete(Number(p.owner));}
}

export class LemonNadeProjectile extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/LemonNade';}
 SetDefaults(){const p=this.Projectile;p.width=p.height=16;p.friendly=true;p.hostile=false;p.penetrate=-1;p.timeLeft=300;p.tileCollide=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;}
 OnSpawn(p){MarkRogueProjectile(p,'LemonNade',false);const st=FusionEntityData.GetProjectileBag(p,'lemonNade',()=>({age:0,max:90,base:Math.max(1,I(p.damage,33)),child:false,exploded:false}));p.damage=Math.max(1,Math.floor(st.base*.1));}
 AI(p){const st=FusionEntityData.GetProjectileBag(p,'lemonNade',()=>({age:0,max:90,base:Math.max(1,I(p.damage,33)),child:false,exploded:false}));st.age++;p.rotation+=.175*(N(p.direction,1)||1);if(st.age>20&&!st.child)p.velocity=Vector2.new(N(p.velocity.X),Math.min(16,N(p.velocity.Y)+.22));if(st.age>=st.max)this.Explode(p,st);}
 OnHitNPC(p,n){const st=FusionEntityData.GetProjectileBag(p,'lemonNade',()=>({age:0,max:90,base:Math.max(1,I(p.originalDamage,33)),child:false,exploded:false}));p.velocity=Vector2.new(-N(p.velocity.X)*.65,-3);if(st.max-st.age<30)st.age+=15;}
 OnTileCollide(p,old){let x=N(p.velocity.X),y=N(p.velocity.Y);if(x!==N(old.X))x=-N(old.X);if(y!==N(old.Y))y=-N(old.Y);p.velocity=Vector2.new(x*.75,y*.75);return false;}
 Explode(p,st,finish=true){if(st.exploded)return;st.exploded=true;const c=p.Center,base=Math.max(1,I(st.base,33));if(IsStealthStrike(p)&&I(p.owner)===I(Terraria.Main.myPlayer)){const t=Number(ModProjectile.getTypeByName('LemonNadeProjectile')||0);if(t>0)for(let i=0;i<6;i++){const a=i*Math.PI*2/6,v=Vector2.new(Math.cos(a)*10,Math.sin(a)*10),id=NewProjectile(src(p),c,v,t,Math.max(1,Math.floor(base*.5)),N(p.knockBack,3),p.owner,0,0,0,null),q=spawned(id);if(q){MarkRogueProjectile(q,'LemonNade',true);const cs=FusionEntityData.GetProjectileBag(q,'lemonNade',()=>({age:0,max:20,base:Math.max(1,Math.floor(base*.5)),child:true,exploded:false}));cs.age=0;cs.max=20;cs.base=Math.max(1,Math.floor(base*.5));cs.child=true;q.damage=Math.max(1,Math.floor(cs.base*.1));}}}p.Center=c;try{p['void Resize(int newWidth, int newHeight)'](360,360);}catch(_){p.width=p.height=360;p.Center=c;}p.damage=base;p.penetrate=-1;p.friendly=true;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;try{p.Damage();}catch(_){try{p['void Damage()']();}catch(__){}}dust(p,6,18,1.15);try{PlayItemSound(62,c,0,.3);}catch(_){}p.friendly=false;p.damage=0;p.velocity=Vector2.Zero;p.timeLeft=0;if(finish){try{p.Kill();}catch(_){}p.active=false;}}
 PreKill(p){const st=FusionEntityData.GetProjectileBag(p,'lemonNade',()=>({age:0,max:90,base:Math.max(1,I(p.damage,33)),child:false,exploded:false}));if(!st.exploded)this.Explode(p,st,false);p.friendly=false;p.damage=0;return true;}
}
