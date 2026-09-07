import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FindTarget, CanChase, Home } from './../AerialiteBatch4Targeting.js';
import { PlayItemSound } from '../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2,Color }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const States=new Map();function K(p){return Math.floor(Number(p.whoAmI)||-1);}function S(p){let s=States.get(K(p));if(!s){s={target:null,retry:0};States.set(K(p),s);}return s;}function Source(p){try{return p.GetProjectileSource_FromThis();}catch(_){}try{return null;}catch(_){return null;}}
export class Aquashard extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/Aquashard';}
 SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.ranged=true;p.penetrate=1;p.timeLeft=300;p.aiStyle=1;p.extraUpdates=1;}
 AI(p){p.velocity=Vector2.new(Number(p.velocity.X)*.9995,Number(p.velocity.Y)+.01);}
 OnHitNPC(p,npc){const t=Number(ModProjectile.getTypeByName('AquashardSplit')||0);if(t>0&&Number(p.owner)===Number(Terraria.Main.myPlayer)){const count=1+Math.floor(Math.random()*2);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,sp=7+Math.random()*3;NewProjectile(Source(p),p.Center,Vector2.new(Math.cos(a)*sp,Math.sin(a)*sp),t,Math.max(1,Math.floor(Number(p.damage)*.6)),0,p.owner,0,0,0,null);}}}
 OnKill(p){try{PlayItemSound(27,p.Center,0,.5);}catch(_){}for(let i=0;i<2;i++)try{NewDust(p.position,p.width,p.height,154,Number(p.oldVelocity.X)*.3,Number(p.oldVelocity.Y)*.3,0,Color.White,.8);}catch(_){}}
}
export class AquashardSplit extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/Aquashard';}
 SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.ranged=true;p.penetrate=1;p.timeLeft=300;p.aiStyle=1;p.extraUpdates=1;}
 CanDamage(p){return Number(p.timeLeft)<280?null:false;}
 AI(p){const s=S(p);p.velocity=Vector2.new(Number(p.velocity.X)*.9995,Number(p.velocity.Y)+.01);if(Number(p.timeLeft)>=280)return;if(!CanChase(s.target)&&s.retry--<=0){s.target=FindTarget(p,450,false);s.retry=8;}if(CanChase(s.target))Home(p,s.target,6,20);}
 OnKill(p){States.delete(K(p));try{PlayItemSound(27,p.Center,0,.4);}catch(_){}if(Math.random()<.5)try{NewDust(p.position,p.width,p.height,154,0,0,0,Color.White,.7);}catch(_){}}
}
