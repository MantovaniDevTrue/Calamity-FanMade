import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { PlayItemSound } from '../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2,Color }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const Active=new Map(),AimSignal=new Map(),States=new Map();let LastIceSound=0;
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function K(p){return Math.floor(N(p.whoAmI,-1));}function P(owner){try{return Terraria.Main.player[owner];}catch(_){return null;}}function Normalize(v,fx=1,fy=0){const x=N(v&&v.X),y=N(v&&v.Y),d=Math.sqrt(x*x+y*y);return d>.001?Vector2.new(x/d,y/d):Vector2.new(fx,fy);}function Source(p,player){try{return p.GetProjectileSource_FromThis();}catch(_){}try{return player.GetProjectileSource_Item(player.HeldItem);}catch(_){return null;}}
function PickAmmo(player,id){try{const a=Array.from(player.inventory||[]);for(let i=54;i<58&&i<a.length;i++)if(a[i]&&N(a[i].ammo)===N(id)&&N(a[i].stack)>0)return a[i];for(let i=0;i<54&&i<a.length;i++)if(a[i]&&N(a[i].ammo)===N(id)&&N(a[i].stack)>0)return a[i];}catch(_){}return null;}function SaveAmmo(player){if(Math.random()<.5)return true;try{if(player.ammoBox&&Math.random()<.2)return true;}catch(_){}try{if(player.ammoPotion&&Math.random()<.2)return true;}catch(_){}try{if(player.chloroAmmoCost80&&Math.random()<.2)return true;}catch(_){}try{if(player.ammoCost80&&Math.random()<.2)return true;}catch(_){}try{if(player.ammoCost75&&Math.random()<.25)return true;}catch(_){}return false;}function Consume(player,a){if(!a||a.consumable!==true||SaveAmmo(player))return;try{a.stack=N(a.stack)-1;if(N(a.stack)<=0)a.TurnToAir(true);}catch(_){}}
function Live(slot,type){try{const p=Terraria.Main.projectile[slot];return !!(p&&p.active&&N(p.type)===N(type));}catch(_){return false;}}
export function RegisterFlurrystormAim(owner,v){AimSignal.set(Number(owner),Normalize(v));}
export function FlurrystormHoldoutActive(owner){const e=Active.get(Number(owner));if(!e)return false;if(Live(e.slot,e.type))return true;Active.delete(Number(owner));return false;}
export class FlurrystormCannonShooting extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/FlurrystormCannonShooting';}
 SetStaticDefaults(){try{Terraria.Main.projFrames[this.Type]=2;}catch(_){}}
 SetDefaults(){const p=this.Projectile;p.width=68;p.height=38;p.friendly=false;p.penetrate=-1;p.tileCollide=false;p.ranged=true;p.ignoreWater=true;p.timeLeft=2;}
 OnSpawn(p){Active.set(Number(p.owner),{slot:K(p),type:Number(p.type)});States.set(K(p),{age:0,cool:0,frame:0,shots:0});}
 CanDamage(){return false;}
 AI(p){const player=P(p.owner),s=States.get(K(p))||{age:0,cool:0,frame:0};States.set(K(p),s);if(!player||player.active===false||player.dead===true){p.Kill();return;}s.age++;s.frame++;if(s.frame>=5){s.frame=0;p.frame=(Number(p.frame)+1)%2;}let aim=AimSignal.get(Number(p.owner));try{if(Number(p.owner)===Number(Terraria.Main.myPlayer)){const m=Terraria.Main.MouseWorld,c=player.MountedCenter,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),d=Math.sqrt(dx*dx+dy*dy);if(d>12)aim=Vector2.new(dx/d,dy/d);}}catch(_){}aim=Normalize(aim||p.velocity,N(Terraria.PlayerDirection(player),1),0);AimSignal.set(Number(p.owner),aim);p.velocity=Vector2.Multiply(aim,.55);const dir=Math.abs(N(aim.X))>.04?(N(aim.X)<0?-1:1):N(Terraria.PlayerDirection(player),1);Terraria.SetPlayerDirection(player,dir);p.direction=dir;p.spriteDirection=dir;p.rotation=Math.atan2(N(aim.Y),N(aim.X))+(dir===-1?Math.PI:0);p.Center=player.MountedCenter;p.timeLeft=2;player.heldProj=p.whoAmI;player.itemTime=2;player.itemAnimation=2;player.itemRotation=Math.atan2(N(aim.Y)*dir,N(aim.X)*dir);
 const held=player.HeldItem,ammo=PickAmmo(player,Terraria.ID.AmmoID.Snowball),using=player.channel===true||player.controlUseItem===true;if(!using||!ammo){p.Kill();return;}if(s.cool>0){s.cool--;return;}const stages=Math.min(6,Math.floor(s.age/60)),rate=Math.max(8,26-stages*3);s.cool=rate;if(s.shots>0)try{PlayItemSound(11,p.Center,0,.45);}catch(_){}s.shots++;const baseSpeed=Math.max(6,N(held.shootSpeed,18)),shotSpeed=baseSpeed*(.6+Math.random()*.15),jitter=(Math.random()*4-2),side=Vector2.new(-N(aim.Y),N(aim.X)),vel=Vector2.Add(Vector2.Multiply(aim,shotSpeed),Vector2.Multiply(side,jitter)),spawn=Vector2.Add(player.MountedCenter,Vector2.new((Math.random()-.5)*10,(Math.random()-.5)*10)),projType=N(ammo.shoot)>0?N(ammo.shoot):166,ranged=Math.max(0,N(player.rangedDamage,1)),dmg=Math.max(1,Math.floor(N(p.damage)+N(ammo.damage)*ranged)),kb=N(p.knockBack)+N(ammo.knockBack),src=Source(p,player);NewProjectile(src,spawn,vel,projType,dmg,kb,p.owner,0,0,0,null);Consume(player,ammo);if(Math.random()<.2){const t=Number(ModProjectile.getTypeByName('FlurrystormIceChunk')||0);if(t>0){const m=.6+Math.random()*.8,cv=Vector2.Multiply(aim,baseSpeed*m);NewProjectile(src,spawn,cv,t,Math.max(1,Math.floor(dmg*1.5)),kb*1.5,p.owner,0,N(cv.Y),0,null);}}}
 OnKill(p){States.delete(K(p));const e=Active.get(Number(p.owner));if(e&&e.slot===K(p))Active.delete(Number(p.owner));}
}
export class FlurrystormIceChunk extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/FlurrystormIceChunk';}
 SetDefaults(){const p=this.Projectile;p.width=14;p.height=14;p.aiStyle=1;p.friendly=true;p.ranged=true;p.penetrate=1;}
 AI(p){if(Math.random()<.18)try{const d=NewDust(p.position,p.width,p.height,68,N(p.velocity.X)*.1,N(p.velocity.Y)*.1,0,Color.White,.8);if(d>=0)Terraria.Main.dust[d].noGravity=true;}catch(_){}}
 OnHitNPC(p,npc){try{npc.AddBuff(44,180,false);npc.AddBuff(47,30,false);}catch(_){}}
 OnKill(p){const now=Date.now();if(now-LastIceSound>50){LastIceSound=now;try{PlayItemSound(27,p.Center,0,.35);}catch(_){}}const t=Number(ModProjectile.getTypeByName('FlurrystormIceShard')||0);if(t>0){const src=Source(p,P(p.owner));for(let i=0;i<3;i++){let vx=-N(p.velocity.X)*(.5+Math.random()*.2)+(Math.random()*6-3),vy=-N(p.velocity.Y)*(.5+Math.random()*.2)+(Math.random()*3.2-1.6);if(Math.abs(vx)<2)vx-=N(p.velocity.X);NewProjectile(src,p.position,Vector2.new(vx,vy),t,Math.max(1,Math.floor(N(p.damage)*.3)),2,p.owner,0,0,0,null);}}for(let i=0;i<2;i++)try{NewDust(p.position,p.width,p.height,68,0,0,0,Color.White,.8);}catch(_){}}
}
export class FlurrystormIceShard extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/FlurrystormIceShard';}
 SetDefaults(){const p=this.Projectile;p.friendly=true;p.width=10;p.height=10;p.ranged=true;}
 AI(p){p.rotation+=.6*(Number(p.direction)||1);p.velocity=Vector2.new(N(p.velocity.X),Math.min(16,N(p.velocity.Y)+.27));}
 OnHitNPC(p,npc){try{npc.AddBuff(44,120,false);npc.AddBuff(47,30,false);}catch(_){}}
 OnKill(p){for(let i=0;i<2;i++)try{NewDust(p.position,p.width,p.height,68,-N(p.velocity.X)*.1,-N(p.velocity.Y)*.08,150,Color.White,.7);}catch(_){}}
}
