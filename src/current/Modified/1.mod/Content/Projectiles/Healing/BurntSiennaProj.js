import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
const { Vector2, Color }=Modules;
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function Owner(p){try{return Terraria.Main.player[Math.floor(N(p.owner,-1))];}catch(_){return null;}}
export class BurntSiennaProj extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=4;p.height=4;p.friendly=false;p.hostile=false;p.ignoreWater=true;p.alpha=255;p.penetrate=-1;p.timeLeft=180;p.tileCollide=false;p.aiStyle=-1;}
 CanDamage(){return false;}
 AI(p){const pl=Owner(p);if(!pl||pl.active===false||pl.dead===true){p.Kill();return;}p.velocity=Vector2.Multiply(p.velocity,.95);const pc=Terraria.PlayerCenter(pl),dx=N(pc.X)-N(p.Center.X),dy=N(pc.Y)-N(p.Center.Y),d=Math.sqrt(dx*dx+dy*dy)||1;if(d<28){if(Number(p.owner)===Number(Terraria.Main.myPlayer)){let blocked=false;try{blocked=pl.moonLeech===true;}catch(_){}if(!blocked){const before=N(pl.statLife),max=Math.max(before,N(pl.statLifeMax2,before)),heal=Math.min(2,Math.max(0,max-before));if(heal>0){pl.statLife=before+heal;try{pl['void HealEffect(int healAmount, bool broadcast)'](heal,true);}catch(_){try{pl.HealEffect(heal,true);}catch(__){}}}}}p.Kill();return;}const desired=Vector2.new(dx/d*6,dy/d*6);p.velocity=Vector2.Divide(Vector2.Add(Vector2.Multiply(p.velocity,14),desired),15);if((N(p.timeLeft)%2)===0)try{const q=NewDust(p.position,p.width,p.height,244,0,0,100,Color.White,.9);const dust=Terraria.Main.dust[q];if(dust){dust.noGravity=true;dust.velocity=Vector2.Zero;}}catch(_){} }
}
