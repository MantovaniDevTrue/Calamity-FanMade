import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { WorldDB } from './../../../TL/WorldDB.js';
const {Vector2}=Modules;
const KEY='calamity:structure:iceLab:';
const ActiveOwners=new Map();
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Tick(){try{return I(Terraria.Main.GameUpdateCount,0);}catch(e){return 0;}}
function Owner(p){return I(p?.owner,-1);}
function Id(p){const o=Owner(p);let id=I(p?.identity,-1);if(id<0)id=I(p?.whoAmI,-1);return `${o}:${id}`;}
function Center(p){try{const r=p['Rectangle getRect()']();return {x:N(r.X)+N(r.Width)*0.5,y:N(r.Y)+N(r.Height)*0.5};}catch(e){try{return{x:N(p.Center.X),y:N(p.Center.Y)};}catch(_){return{x:N(p.position?.X)+N(p.width)*0.5,y:N(p.position?.Y)+N(p.height)*0.5};}}}
function SetCenter(p,x,y){try{p.position=Vector2.new(x-N(p.width)*0.5,y-N(p.height)*0.5);}catch(e){}}
function Destination(){if(!WorldDB.Instance||WorldDB.get(KEY+'generated')!==true)return null;let x=N(WorldDB.get(KEY+'centerWorldX'),NaN),y=N(WorldDB.get(KEY+'centerWorldY'),NaN);if(!Number.isFinite(x)||!Number.isFinite(y)){const tx=N(WorldDB.get(KEY+'centerX'),NaN),ty=N(WorldDB.get(KEY+'centerY'),NaN);if(Number.isFinite(tx)&&Number.isFinite(ty)){x=tx*16+8;y=ty*16+8;}}return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;}
function Approach(a,b,m){return a+(b-a)*m;}
function MoveToward(cx,cy,tx,ty,max){const dx=tx-cx,dy=ty-cy,d=Math.sqrt(dx*dx+dy*dy);if(!(d>max)||d<=0)return{ x:tx,y:ty };return{x:cx+dx/d*max,y:cy+dy/d*max};}
function Claim(p){const o=Owner(p),now=Tick(),id=Id(p);if(o<0)return false;const old=ActiveOwners.get(o);if(old&&old.until>=now&&old.id!==id)return false;ActiveOwners.set(o,{id,until:now+12});return true;}
function Refresh(p){const o=Owner(p),now=Tick(),id=Id(p),old=ActiveOwners.get(o);if(o<0)return false;if(old&&old.until>=now&&old.id!==id)return false;ActiveOwners.set(o,{id,until:now+12});return true;}
function Release(p){const o=Owner(p),id=Id(p),old=ActiveOwners.get(o);if(old&&old.id===id)ActiveOwners.delete(o);}
export function WhiteLabSeekerActive(owner){const o=I(owner,-1),now=Tick(),s=ActiveOwners.get(o);if(!s)return false;if(s.until<now){ActiveOwners.delete(o);return false;}return true;}
export class WhiteLabSeeker extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Typeless/WhiteLabSeeker';}
 SetDefaults(){const p=this.Projectile;p.width=24;p.height=24;p.friendly=true;p.ignoreWater=true;p.tileCollide=false;p.timeLeft=300;p.penetrate=-1;p.hide=false;p.alpha=0;}
 OnSpawn(p){if(!Claim(p)){p.friendly=false;p.timeLeft=1;try{p.Kill();}catch(e){}}}
 AI(p){if(!Refresh(p)){p.timeLeft=1;try{p.Kill();}catch(e){}return;}const d=Destination();if(!d){p.timeLeft=1;return;}const ai=new ProjAI(p),time=N(ai[0],0),c=Center(p);let vx=N(p.velocity?.X),vy=N(p.velocity?.Y),cx=c.x,cy=c.y;
  if(time<45){const a=Math.max(0,Math.min(1,time/25)),b=Math.max(0,Math.min(1,(30-time)/5));vx=0;vy=-4.5*a*b;p.velocity=Vector2.new(vx,vy);}
  else if(time<80){const want=Math.atan2(d.y-cy,d.x-cx)+Math.PI/2,lerp=Math.max(0,Math.min(1,(time-45)/25));p.rotation=Approach(N(p.rotation),want,lerp*0.16+0.04);p.velocity=Vector2.new(vx*0.9,vy*0.9);}
  const dx=d.x-cx,dy=d.y-cy,dist=Math.sqrt(dx*dx+dy*dy);
  if(time>=80&&dist<=420){const moved=MoveToward(cx,cy,d.x,d.y,Math.min(10,dist));cx=Approach(moved.x,d.x,0.1);cy=Approach(moved.y,d.y,0.1);SetCenter(p,cx,cy);const bob=Math.sin((time-80)/24)*2.5;p.velocity=Vector2.new(vx*0.85,bob);p.rotation=N(p.rotation)*0.95;ai[1]=1;}
  else if(time>=80){ai[1]=0;const dir=N(p.rotation)-Math.PI/2,speed=Math.max(0,Math.min(1,(time-80)/25))*25;p.velocity=Vector2.new(Math.cos(dir)*speed,Math.sin(dir)*speed);if(time%3===0){try{const cc=Center(p);const du=Terraria.Dust.QuickDust(Vector2.new(cc.x+(Math.random()*16-8),cc.y+(Math.random()*16-8)),Modules.Color.White);if(du){du.noGravity=true;du.scale=1.25;}}catch(e){}}}
  try{const cc=Center(p);Terraria.Lighting.AddLight(Math.floor(cc.x/16),Math.floor(cc.y/16),0.72,0.78,0.9);}catch(e){}
  ai[0]=time+1;
 }
 CanDamage(){return false;}
 CanCutTiles(){return false;}
 OnKill(p){Release(p);for(let i=0;i<4;i++){try{const c=Center(p);Terraria.Dust.QuickDust(Vector2.new(c.x+(Math.random()*24-12),c.y+(Math.random()*24-12)),Modules.Color.White);}catch(e){}}}
}
