import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2, Color }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function pc(p){try{return Terraria.PlayerCenter(p);}catch(_){return Vector2.Zero;}}function player(o){const i=Math.floor(N(o,-1));if(i<0)return null;try{if(i===Math.floor(N(Terraria.Main.myPlayer,-2))&&Terraria.Main.LocalPlayer)return Terraria.Main.LocalPlayer;}catch(_){}try{return Terraria.Main.player.get_Item(i);}catch(_){return null;}}function source(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}}function norm(v,sp=1){const x=N(v&&v.X),y=N(v&&v.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*sp,y/l*sp);}function validPlayer(p){return !!(p&&p.active!==false&&p.dead!==true);}function dust(p,id,count=1,scale=.8){for(let i=0;i<count;i++)try{NewDust(p.position,p.width,p.height,id,(Math.random()-.5)*3,(Math.random()-.5)*3,100,Color.White,scale);}catch(_){}}
function setArray(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=N(a&&a.Length,N(a&&a.length,0));if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}try{a.set_Item(Number(index),value);return true;}catch(_){}a[Number(index)]=value;return true;}catch(_){return false;}}
const MonstrousHealNext=new Map();
const UrchinHeartbeat=new Map();export function UrchinMaceActive(owner){const now=Math.floor(N(Terraria.Main.GameUpdateCount,0)),t=Number(UrchinHeartbeat.get(Number(owner))||-9999);if(now-t<=3)return true;UrchinHeartbeat.delete(Number(owner));return false;}
export class MonstrousKnife extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Melee/MonstrousKnife';}
 SetDefaults(){const p=this.Projectile;p.width=14;p.height=14;p.aiStyle=2;p.friendly=true;p.melee=true;p.ignoreWater=true;p.penetrate=1;p.timeLeft=180;}
 OnSpawn(p){FusionEntityData.GetProjectileBag(p,'monsterKnife',()=>({age:0}));}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'monsterKnife',()=>({age:0}));s.age++;if(s.age<30){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;return;}p.alpha=Math.min(255,N(p.alpha)+10);if(N(p.damage)>1)p.damage=Math.max(1,Math.floor(N(p.damage)*.9));p.knockBack=N(p.knockBack)*.9;if(N(p.alpha)>=250)p.Kill();}
 OnHitNPC(p){const owner=Math.floor(N(p.owner,-1)),pl=player(owner);if(!validPlayer(pl)||owner!==Math.floor(N(Terraria.Main.myPlayer,-2)))return;let blocked=false;try{blocked=pl.moonLeech===true;}catch(_){}if(blocked)return;const now=Math.floor(N(Terraria.Main.GameUpdateCount,0)),next=N(MonstrousHealNext.get(owner),0);if(now<next)return;const before=N(pl.statLife),mx=Math.max(before,N(pl.statLifeMax2,before)),heal=Math.min(1,Math.max(0,mx-before));if(heal>0){MonstrousHealNext.set(owner,now+30);pl.statLife=before+heal;try{pl['void HealEffect(int healAmount, bool broadcast)'](heal,true);}catch(_){try{pl.HealEffect(heal,true);}catch(__){}}}}
 OnKill(p){dust(p,135,3,.8);}
}
export class RiptideYoyo extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Melee/Yoyos/RiptideYoyo';}
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'YoyosLifeTimeMultiplier',this.Type,18);setArray(Terraria.ID.ProjectileID.Sets,'YoyosMaximumRange',this.Type,288);setArray(Terraria.ID.ProjectileID.Sets,'YoyosTopSpeed',this.Type,25);}
 SetDefaults(){const p=this.Projectile;p.aiStyle=99;p.width=22;p.height=22;p.friendly=true;p.melee=true;p.penetrate=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=20;}
 OnSpawn(p){FusionEntityData.GetProjectileBag(p,'riptideYoyo',()=>({tick:0,step:0}));}
 AI(p){const pl=player(p.owner);if(!validPlayer(pl)){p.Kill();return;}let dx=N(p.position.X)-N(Terraria.PlayerPositionX(pl)),dy=N(p.position.Y)-N(Terraria.PlayerPositionY(pl));if(dx*dx+dy*dy>3200*3200){p.Kill();return;}const s=FusionEntityData.GetProjectileBag(p,'riptideYoyo',()=>({tick:0,step:0}));s.tick++;if(s.tick%15!==0||Number(p.owner)!==Number(Terraria.Main.myPlayer))return;const vel=[[0,-10,1.2,.2],[5,-5,.7,.7],[10,0,.2,1.2],[5,5,-.7,.7],[0,10,-1.2,-.2],[-5,5,-.7,-.7],[-10,0,-.2,-1.2],[-10,-10,.7,-.7]][s.step];s.step=(s.step+1)%8;const t=Number(ModProjectile.getTypeByName('AquaStream')||0);if(t>0)NewProjectile(source(p),p.Center,Vector2.new(vel[0],vel[1]),t,Math.max(1,Math.floor(N(p.damage,12))),0,p.owner,vel[2],vel[3],0,null);try{PlayItemSound(21,p.Center,0,.25);}catch(_){} }
}
export class AquaStream extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=6;p.height=6;p.friendly=true;p.melee=true;p.alpha=150;p.penetrate=2;p.timeLeft=90;p.aiStyle=-1;}
 OnSpawn(p){const vx=N(p.velocity.X),vy=N(p.velocity.Y);let ax=.2,ay=1.2;if(Math.abs(vx)<2&&vy<0){ax=1.2;ay=.2;}else if(vx>2&&vy<-2){ax=.7;ay=.7;}else if(vx>2&&Math.abs(vy)<2){ax=.2;ay=1.2;}else if(vx>2&&vy>2){ax=-.7;ay=.7;}else if(Math.abs(vx)<2&&vy>0){ax=-1.2;ay=-.2;}else if(vx<-2&&vy>2){ax=-.7;ay=-.7;}else if(vx<-2&&Math.abs(vy)<2){ax=-.2;ay=-1.2;}else if(vx<-2&&vy<-2){ax=.7;ay=-.7;}FusionEntityData.GetProjectileBag(p,'aqua',()=>({ax,ay}));}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'aqua',()=>({ax:0,ay:0}));p.velocity=Vector2.new(N(p.velocity.X)+N(s.ax),N(p.velocity.Y)+N(s.ay));try{const d=NewDust(p.position,p.width,p.height,33,0,0,80,Color.White,1.15);let q=null;try{q=Terraria.Main.dust.get_Item(Number(d));}catch(_){}if(q){q.noGravity=true;q.velocity=Vector2.Zero;}}catch(_){} }
}
export class UrchinMaceProj extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Melee/UrchinMace';}
 SetDefaults(){const p=this.Projectile;p.width=36;p.height=36;p.friendly=true;p.melee=true;p.penetrate=-1;p.tileCollide=false;p.ignoreWater=true;p.timeLeft=2;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=12;p.aiStyle=-1;}
 OnSpawn(p){FusionEntityData.GetProjectileBag(p,'urchinMace',()=>({wind:0,angle:0,released:false}));UrchinHeartbeat.set(Number(p.owner),Math.floor(N(Terraria.Main.GameUpdateCount,0)));}
 AI(p){const pl=player(p.owner),s=FusionEntityData.GetProjectileBag(p,'urchinMace',()=>({wind:0,angle:0,released:false}));if(!validPlayer(pl)){p.Kill();return;}UrchinHeartbeat.set(Number(p.owner),Math.floor(N(Terraria.Main.GameUpdateCount,0)));p.timeLeft=2;const dir=N(Terraria.PlayerDirection(pl),1)||1;const using=!!pl.channel||!!pl.controlUseItem;if(using){s.wind=Math.min(45,s.wind+1);s.angle+=dir*(.045+.135*(s.wind/45));const c=pc(pl),r=50,pv=Vector2.new(Math.cos(s.angle)*r,Math.sin(s.angle)*r);p.Center=Vector2.Add(c,pv);p.rotation=s.angle+Math.PI/4;try{pl.heldProj=p.whoAmI;pl.itemTime=2;pl.itemAnimation=2;}catch(_){}return;}if(!s.released){s.released=true;if(s.wind>=45&&Number(p.owner)===Number(Terraria.Main.myPlayer)){let mx=N(pc(pl).X)+dir*100,my=N(pc(pl).Y);try{mx=N(Terraria.Main.MouseWorld.X,mx);my=N(Terraria.Main.MouseWorld.Y,my);}catch(_){}const c=pc(pl),v=norm(Vector2.new(mx-N(c.X),my-N(c.Y)),22),t=Number(ModProjectile.getTypeByName('RedtideWhirlpool')||0);if(t>0)NewProjectile(source(p),c,v,t,Math.max(1,Math.floor(N(p.damage,15))),N(p.knockBack,4),p.owner,0,0,0,null);}p.Kill();}}
 OnHitNPC(p,npc){const b=Number(ModBuff.getTypeByName('RiptideDebuff')||0);if(b>0)try{npc.AddBuff(b,300,false);}catch(_){} }
 OnKill(p){UrchinHeartbeat.delete(Number(p.owner));}
}
export class RedtideWhirlpool extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Melee/RedtideWhirlpool';}
 SetDefaults(){const p=this.Projectile;p.width=60;p.height=60;p.friendly=true;p.melee=true;p.ignoreWater=true;p.tileCollide=false;p.penetrate=-1;p.timeLeft=30;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=15;p.aiStyle=-1;}
 AI(p){p.velocity=Vector2.Multiply(p.velocity,.93);p.rotation=N(p.rotation)+(N(p.velocity.X)>=0?1:-1)*.13;if(N(p.timeLeft)%3===0)dust(p,34,1,1.1);}
 OnHitNPC(p,npc){const b=Number(ModBuff.getTypeByName('RiptideDebuff')||0);if(b>0)try{npc.AddBuff(b,120,false);}catch(_){} }
 OnKill(p){dust(p,33,10,1.1);try{PlayItemSound(19,p.Center,0,.35);}catch(_){} }
}
