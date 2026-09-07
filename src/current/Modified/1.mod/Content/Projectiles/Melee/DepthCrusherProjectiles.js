import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
const { Vector2 }=Modules;
const MainStates={};
let LowFxLogged=false;
let CachedRiptideType=0;
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Key(p){return `${N(p.owner)}:${N(p.identity)}:${N(p.type)}`;}
function P(i){try{return Terraria.Main.player[i]||Terraria.Main.player.get_Item(i);}catch(e){return null;}}
function Buff(n,type,time){try{n['void AddBuff(int type, int time, bool quiet)'](type,time,false);}catch(e){}}
function Riptide(npc){if(!(CachedRiptideType>0))CachedRiptideType=Number(ModBuff.getTypeByName('RiptideDebuff')||0);if(CachedRiptideType>0)Buff(npc,CachedRiptideType,180);}
function pcSafeMouseX(owner){try{return Number(Terraria.Main.MouseWorld.X);}catch(e){return Number(Terraria.PlayerCenter(owner).X)+(Number(Terraria.PlayerDirection(owner))||1)*100;}}
function pcSafeMouseY(owner){try{return Number(Terraria.Main.MouseWorld.Y);}catch(e){return Number(Terraria.PlayerCenter(owner).Y);}}
function LogLowFx(){if(LowFxLogged)return;LowFxLogged=true;try{tl.log('[CalamityPort DepthCrusherLowFX] active; mainProjectile=1; splitProjectiles=0; dust=0; dynamicLight=0; splitTargetScan=0; splitHoming=0; riptideType=cache.');}catch(e){}}

export class DepthCrusherProjectile extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Melee/DepthCrusher';}
 SetDefaults(){const p=this.Projectile;p.width=50;p.height=50;p.friendly=true;p.tileCollide=false;p.penetrate=-1;p.timeLeft=280;p.melee=true;p.ignoreWater=true;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=30;p.aiStyle=-1;}
 AI(p){
  LogLowFx();
  const k=Key(p),s=MainStates[k]||(MainStates[k]={hits:0,reduced:false,lastX:0,lastY:0,thrown:false});
  const owner=P(N(p.owner));if(!owner){p.timeLeft=1;return;}
  const charge=280-N(p.timeLeft);
  if(charge<25){
   const pc=Terraria.PlayerCenter(owner),dir=Number(Terraria.PlayerDirection(owner))||1;
   // Minimum mobile FX path: no heldProj bridge, no light, no dust and no auxiliary projectile work.
   p.Center=Vector2.new(Number(pc.X)+dir*20,Number(pc.Y)-32);
   p.velocity=Vector2.new(0,0);
   p.rotation=-Math.PI/4*dir+charge/25*0.75*dir;
   return;
  }
  if(charge===25||(!s.thrown&&charge>25)){
   s.thrown=true;
   const mx=Number(pcSafeMouseX(owner)),my=Number(pcSafeMouseY(owner)),pc=Terraria.PlayerCenter(owner),dx=mx-Number(pc.X),dy=my-Number(pc.Y),m=Math.sqrt(dx*dx+dy*dy)||1;
   p.Center=pc;p.velocity=Vector2.new(dx/m*15,dy/m*15);p.tileCollide=true;
   try{p.netUpdate=true;}catch(e){}
  }
  let vx=Number(p.velocity.X),vy=Number(p.velocity.Y);
  if(vy<10)vy+=s.hits>=3?0.7:0.4;
  vx*=vy>0?0.995:1;
  p.velocity=Vector2.new(vx,vy);
  // Keep only the weapon's essential rotation; all secondary visual emitters are disabled.
  p.rotation+=vx*0.06;
  s.lastX=vx;s.lastY=vy;
 }
 OnTileCollide(p,hitDirection){
  const k=Key(p),s=MainStates[k]||(MainStates[k]={hits:0,reduced:false,lastX:Number(p.velocity.X),lastY:Number(p.velocity.Y),thrown:true});
  p.timeLeft=240;
  if(s.hits<3){s.hits++;p.velocity=Vector2.new(-s.lastX*0.8,-Math.abs(s.lastY)*0.8);}else{return true;}
  if(s.hits>=3&&!s.reduced){s.reduced=true;p.damage=Math.max(1,Math.floor(Number(p.damage)*0.2));}
  return false;
 }
 OnHitNPC(p,npc){
  const k=Key(p),s=MainStates[k]||(MainStates[k]={hits:0,reduced:false,lastX:0,lastY:0,thrown:true});
  p.timeLeft=240;
  if(s.hits<3)s.hits++;
  p.velocity=Vector2.new(Number(p.velocity.X)*-0.65,-6);
  // Preserve the useful debuff without spawning a separate homing projectile solely to apply it.
  Riptide(npc);
  if(s.hits>=3&&!s.reduced){s.reduced=true;p.damage=Math.max(1,Math.floor(Number(p.damage)*0.2));}
 }
 OnKill(p,timeLeft){delete MainStates[Key(p)];}
}

// Kept registered for save/runtime compatibility, but the low-FX Depth Crusher never spawns it.
// If another legacy path creates one, it expires immediately and performs no scans, homing, dust or lighting.
export class DepthCrusherSplitProjectile extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=2;p.height=2;p.friendly=false;p.melee=true;p.tileCollide=false;p.penetrate=1;p.timeLeft=2;p.ignoreWater=true;p.aiStyle=-1;}
 AI(p){p.timeLeft=1;}
}
