import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { FusionEntityData } from './../../Core/FusionEntityData.js';
import { DrawGlow, LuxorClass } from './LuxorProjectileUtils.js';
const {Vector2,Color}=Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaledTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function addBuff(n,t,time){try{n['void AddBuff(int type, int time, bool quiet)'](t,time,false);}catch(_){try{n.AddBuff(t,time,false);}catch(__){}}}
export class SparkSpreaderFire extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Ranged/SparkSpreaderFire';}
 SetDefaults(){const p=this.Projectile;p.width=18;p.height=12;p.friendly=false;p.hostile=false;p.ranged=true;p.penetrate=3;p.timeLeft=100;p.tileCollide=true;p.ignoreWater=false;p.aiStyle=-1;p.alpha=255;p.scale=1;p.light=0.35;}
 AI(p){
  const s=FusionEntityData.GetProjectileBag(p,'sparkSpreaderFire',()=>({configured:false,delay:0,vx:N(p.velocity.X),vy:N(p.velocity.Y),age:0}));
  if(!s.configured){s.configured=true;s.vx=N(p.velocity.X);s.vy=N(p.velocity.Y);s.delay=0;s.age=0;}
  if(s.delay>0){s.delay--;p.velocity=Vector2.Zero;p.friendly=false;p.alpha=255;return;}
  if(s.age===0){p.velocity=Vector2.new(N(s.vx),N(s.vy));p.friendly=true;p.timeLeft=42;p.alpha=70;p.scale=0.78;}
  s.age++;p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X));
  const grow=Math.min(1,s.age/7);
  const fade=s.age>28?Math.min(1,(s.age-28)/14):0;
  p.scale=0.78+0.34*grow-0.12*fade;
  p.alpha=Math.max(20,Math.min(230,Math.floor(70-45*grow+205*fade)));
  try{if(p.wet&&!p.lavaWet){p.Kill();return;}}catch(_){}
  // Keep cinders secondary. The flame sprite itself is now the readable body.
  if((s.age%4)===0){
   try{
    const vx=N(p.velocity.X),vy=N(p.velocity.Y);
    NewDust(p.position,p.width,p.height,Terraria.ID.DustID.Torch,-vx*0.08,-vy*0.08,80,Color.White,0.72);
   }catch(_){}
  }
 }
 PreDraw(p,lightColor){
  // Reuse the TLPro-safe draw path already proven by Luxor projectiles.
  // The sprite is drawn larger and bright while a tiny gold outline gives it
  // a compact flamethrower body without shaders or particle-system scans.
  const age=FusionEntityData.GetProjectileBag(p,'sparkSpreaderFire',()=>({age:0})).age||0;
  const grow=Math.min(1,N(age)/6);
  const tail=N(age)>28?Math.max(0,1-(N(age)-28)/14):1;
  const sx=(1.35+0.35*grow)*tail;
  const sy=(1.10+0.20*grow)*tail;
  if(sx<=0.08||sy<=0.08)return false;
  return DrawGlow(p,Color.White,LuxorClass.Magic,1.35,3,sx,sy,0);
 }
 OnHitNPC(p,npc){addBuff(npc,Terraria.ID.BuffID.OnFire,300+Math.floor(Math.random()*901));}
}
class VeeringWaveBase extends ModProjectile{
 constructor(texture,frost=false){super();this.Texture=texture;this.Frost=frost;}
 SetDefaults(){const p=this.Projectile;p.width=48;p.height=48;p.friendly=true;p.hostile=false;p.magic=true;p.tileCollide=false;p.penetrate=2;p.timeLeft=this.Frost?90:45;p.ignoreWater=true;p.aiStyle=-1;p.extraUpdates=this.Frost?0:1;}
 AI(p){
  p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;
  const s=FusionEntityData.GetProjectileBag(p,'veeringWave',()=>({hits:0,history:[]}));
  if(!Array.isArray(s.history))s.history=[];
  s.history.unshift({x:N(p.position.X),y:N(p.position.Y)});if(s.history.length>10)s.history.length=10;
 }
 PreDraw(p,lightColor){
  // PC Calamity suppresses vanilla drawing and renders a soft 10-step luminous
  // trail. Without this override TLPro drew every one of the 12 wave sprites
  // fully opaque at spawn, producing the huge white "ring" seen in testing.
  try{
   const texture=Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
   const sb=Terraria.Main.spriteBatch,draw=sb&&sb[DrawScaledTexture];if(!texture||!draw)return true;
   const sw=N(Terraria.Main.screenPosition.X),sh=N(Terraria.Main.screenPosition.Y);
   const ox=N(texture.Width)*0.5,oy=N(texture.Height)*0.5,origin=Vector2.new(ox,oy);
   const state=FusionEntityData.GetProjectileBag(p,'veeringWave',()=>({hits:0,history:[]}));
   const hist=Array.isArray(state.history)?state.history:[];
   const fadeOut=this.Frost?(N(p.timeLeft)<=30?N(p.timeLeft)/30:1):(N(p.timeLeft)<=15?N(p.timeLeft)/15:1);
   const base=this.Frost?[90,155,255]:[225,235,245];
   const dark=this.Frost?[35,85,180]:[145,155,165];
   const count=Math.min(10,hist.length);
   for(let i=count-1;i>=0;i--){
    const h=hist[i],life=(1-i/Math.max(1,count))*fadeOut,intensity=(0.28+0.62*life);
    const t=i/Math.max(1,count-1),r=Math.floor((base[0]+(dark[0]-base[0])*t)*intensity),g=Math.floor((base[1]+(dark[1]-base[1])*t)*intensity),b=Math.floor((base[2]+(dark[2]-base[2])*t)*intensity);
    const color=Color.new(Math.max(0,Math.min(255,r)),Math.max(0,Math.min(255,g)),Math.max(0,Math.min(255,b)),Math.max(8,Math.floor(100*intensity)));
    const scale=Vector2.new(0.72+0.28*life,0.72+0.28*life);
    sb[DrawScaledTexture](texture,Vector2.new(N(h.x)+ox-sw,N(h.y)+oy-sh),null,color,N(p.rotation),origin,scale,SpriteEffects.None,0);
   }
   return false;
  }catch(_){return true;}
 }
 OnHitNPC(p,npc){const s=FusionEntityData.GetProjectileBag(p,'veeringWave',()=>({hits:0,history:[]}));if(this.Frost){const wc=Number(ModBuff.getTypeByName('WindChilled')||0);if(wc>0)addBuff(npc,wc,s.hits===0?120:60);addBuff(npc,Terraria.ID.BuffID.Frozen,s.hits===0?30:15);}s.hits++;if(s.hits>=1&&N(p.damage)>1)p.damage=Math.max(1,Math.floor(N(p.damage)*0.5));}
}
export class VeeringWindAirWave extends VeeringWaveBase{constructor(){super('Projectiles/Magic/VeeringWindAirWave',false);}}
export class VeeringWindFrostWave extends VeeringWaveBase{constructor(){super('Projectiles/Magic/VeeringWindFrostWave',true);}}
