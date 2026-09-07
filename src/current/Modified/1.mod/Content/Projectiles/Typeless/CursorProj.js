import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FindTarget, CanChase, Home } from './../AerialiteBatch4Targeting.js';
import { PlayItemSound } from '../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2, Color }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const States=new Map();
function K(p){return Math.floor(Number(p.whoAmI)||-1);}function S(p){let s=States.get(K(p));if(!s){s={age:0,target:null,retry:0};States.set(K(p),s);}return s;}
function Buff(npc,time){const b=Number(ModBuff.getTypeByName('Vaporfied')||0);if(b>0)try{npc.AddBuff(b,time,false);}catch(_){}}
function Source(p){try{return p.GetProjectileSource_FromThis();}catch(_){}try{return null;}catch(_){return null;}}
export class CursorProj extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Typeless/CursorProj';}
 SetDefaults(){const p=this.Projectile;p.width=12;p.height=12;p.friendly=true;p.penetrate=1;p.extraUpdates=1;p.alpha=255;p.timeLeft=300;}
 AI(p){const s=S(p);s.age++;p.alpha=Math.max(0,Number(p.alpha)-15);p.rotation=Math.atan2(Number(p.velocity.Y),Number(p.velocity.X))+Math.PI/2;if(Number(p.timeLeft)>285)return;if(!CanChase(s.target)&&s.retry--<=0){s.target=FindTarget(p,300,true);s.retry=8;}if(CanChase(s.target)){const dx=Number(s.target.Center.X)-Number(p.Center.X),dy=Number(s.target.Center.Y)-Number(p.Center.Y);if(dx*dx+dy*dy<100){p.Kill();return;}Home(p,s.target,6,30);}if(Math.random()<.035)try{const d=NewDust(p.position,p.width,p.height,255,-Number(p.velocity.X)*.05,-Number(p.velocity.Y)*.05,120,Color.White,.75);if(d>=0)Terraria.Main.dust[d].noGravity=true;}catch(_){}}
 OnHitNPC(p,npc){Buff(npc,120);}
 OnKill(p){States.delete(K(p));const t=Number(ModProjectile.getTypeByName('CursorProjSplit')||0);if(t>0&&Number(p.owner)===Number(Terraria.Main.myPlayer)){const v=p.velocity,mag=Math.sqrt(Number(v.X)**2+Number(v.Y)**2)||1,baseX=Number(v.X)/mag*4,baseY=Number(v.Y)/mag*4;for(let i=0;i<4;i++){const a=(-22.5+45*i/3)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);NewProjectile(Source(p),p.Center,Vector2.new(baseX*c-baseY*s,baseX*s+baseY*c),t,Math.max(1,Math.floor(Number(p.damage)/3)),Number(p.knockBack)*.33,p.owner,0,0,0,null);}}try{PlayItemSound(110,p.Center,0,.8);}catch(_){}}
}
export class CursorProjSplit extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Typeless/CursorProj';}
 SetDefaults(){const p=this.Projectile;p.width=12;p.height=12;p.friendly=true;p.penetrate=1;p.extraUpdates=1;p.alpha=255;p.timeLeft=300;}
 CanDamage(p){return Number(p.alpha)<128?null:false;}
 AI(p){const s=S(p);s.age++;p.alpha=Math.max(0,Number(p.alpha)-3);p.rotation=Math.atan2(Number(p.velocity.Y),Number(p.velocity.X))+Math.PI/2;if(Number(p.alpha)>=128)return;if(!CanChase(s.target)&&s.retry--<=0){s.target=FindTarget(p,300,true);s.retry=8;}if(CanChase(s.target)){const dx=Number(s.target.Center.X)-Number(p.Center.X),dy=Number(s.target.Center.Y)-Number(p.Center.Y);if(dx*dx+dy*dy<100){p.Kill();return;}Home(p,s.target,6,30);}if(Math.random()<.02)try{NewDust(p.position,p.width,p.height,234,0,0,130,Color.White,.7);}catch(_){}}
 OnHitNPC(p,npc){Buff(npc,60);}
 OnKill(p){States.delete(K(p));try{PlayItemSound(14,p.Center,-.1,.55);}catch(_){}for(let i=0;i<4;i++)try{NewDust(p.position,p.width,p.height,234,(Math.random()-.5)*3,(Math.random()-.5)*3,120,Color.White,.8);}catch(_){}}
}
