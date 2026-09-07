import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile, IsStealthStrike } from './../../../Core/RogueRuntime.js';
const { Vector2,Color }=Modules;const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function splat(p,count){for(let i=0;i<count;i++)try{const a=Math.random()*Math.PI*2,s=4+Math.random()*5;NewDust(p.position,p.width,p.height,5,Math.cos(a)*s+N(p.velocity.X)*.25,Math.sin(a)*s+N(p.velocity.Y)*.25,0,Color.White,1);}catch(_){} }
export class BouncingEyeballProjectile extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/BouncingEyeball';}
 SetDefaults(){const p=this.Projectile;p.width=30;p.height=26;p.friendly=true;p.tileCollide=true;p.timeLeft=300;p.penetrate=2;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'BouncingEyeball',false);FusionEntityData.GetProjectileBag(p,'bounceEye',()=>({bounces:5}));}
 AI(p){if(N(p.velocity.Y)<=10)p.velocity=Vector2.new(N(p.velocity.X),N(p.velocity.Y)+.15);p.rotation=N(p.rotation)+Math.PI/36*(N(p.velocity.X)<0?-1:1);}
 OnTileCollide(p,old){const s=FusionEntityData.GetProjectileBag(p,'bounceEye',()=>({bounces:5}));s.bounces--;if(s.bounces<=0)return true;let vx=N(p.velocity.X),vy=N(p.velocity.Y);if(vx!==N(old.X))vx=-N(old.X);if(vy!==N(old.Y))vy=-N(old.Y);p.velocity=Vector2.new(vx,vy);return false;}
 OnKill(p){splat(p,8);}
}
export class BouncingEyeballProjectileStealthStrike extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/BouncingEyeball';}
 SetDefaults(){const p=this.Projectile;p.width=30;p.height=26;p.friendly=true;p.tileCollide=true;p.timeLeft=280;p.penetrate=-1;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'BouncingEyeball',false);}
 AI(p){let vx=Math.max(-23,Math.min(23,N(p.velocity.X))),vy=Math.max(-23,Math.min(23,N(p.velocity.Y)));p.velocity=Vector2.new(vx,vy);p.rotation=Math.atan2(vy,vx);}
 OnTileCollide(p,old){const m=(.85+Math.random()*.30)*1.35;p.velocity=Vector2.Multiply(old,-m);return false;}
 OnKill(p){splat(p,12);}
}
