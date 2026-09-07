import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';
const { Vector2, Color }=Modules;const States={};let DustBudgetTick=-1,DustBudget=0;
function TakeDust(){let t=0;try{t=Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(e){}if(t!==DustBudgetTick){DustBudgetTick=t;DustBudget=40;}if(DustBudget<=0)return false;DustBudget--;return true;}
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function Center(n){try{return Terraria.NPCCenter(n);}catch(e){return n.Center;}}
function Hostile(n){try{return !!n&&!!n.active&&!n.friendly&&!n.dontTakeDamage&&Number(n.life)>0&&Number(n.lifeMax)>5;}catch(e){return false;}}
function Buff(n,type,time){try{n['void AddBuff(int type, int time, bool quiet)'](type,time,false);}catch(e){}}
function State(p){const k=N(p.whoAmI);return States[k]||(States[k]={seen:{},lastX:Number(p.velocity.X),lastY:Number(p.velocity.Y)});}
export class LightningArc extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=8;p.height=8;p.alpha=255;p.friendly=true;p.tileCollide=true;p.ignoreWater=true;p.magic=true;p.timeLeft=20;p.penetrate=5;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;p.aiStyle=-1;}
 AI(p){const s=State(p);let vx=Number(p.velocity.X),vy=Number(p.velocity.Y);if(Number(p.timeLeft)>=19){const m=Math.sqrt(vx*vx+vy*vy);if(m>6){vx*=6/m;vy*=6/m;p.velocity=Vector2.new(vx,vy);}}s.lastX=vx;s.lastY=vy;ScanFrozenCubeNPCs(2);let target=null,moveX=0,moveY=0,best=160;if(Number(p.timeLeft)<18){const slots=FrozenCubeTrackedIndices();for(let k=0;k<slots.length;k++){const n=FrozenCubeNPC(slots[k]);if(!Hostile(n)||s.seen[N(n.whoAmI)])continue;const c=Center(n),dx=Number(c.X)-(Number(p.Center.X)+vx),dy=Number(c.Y)-(Number(p.Center.Y)+vy),d=Math.sqrt(dx*dx+dy*dy);if(d<best){best=d;target=n;moveX=dx;moveY=dy;}}}if(target){s.seen[N(target.whoAmI)]=true;moveX+=(Math.random()*20-10)*best/30;moveY+=(Math.random()*20-10)*best/30;}else{moveX=(vx+(Math.random()*10-5))*5;moveY=(vy+(Math.random()*10-5))*5;}let cx=Number(p.Center.X),cy=Number(p.Center.Y);const samples=10,stepX=moveX/samples,stepY=moveY/samples;for(let i=0;i<samples;i++){if(TakeDust()){try{NewDust(Vector2.new(cx,cy),p.width,p.height,20,0,0,0,Color.White,1);}catch(e){}}cx+=stepX;cy+=stepY;}p.position=Vector2.new(cx-p.width/2,cy-p.height/2);}
 OnTileCollide(p,hitDirection){const s=State(p);p.velocity=Vector2.new(s.lastX,s.lastY);p.timeLeft=Math.max(1,N(p.timeLeft)-12);return false;}
 OnHitNPC(p,npc){const t=Number(ModBuff.getTypeByName('StaticDischarge')||0);if(t>0)Buff(npc,t,120);}
 OnKill(p,timeLeft){delete States[N(p.whoAmI)];}
}
