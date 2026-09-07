import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
const { Vector2 }=Modules;
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
export class ToxicMinnowCloud extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Enemy/ToxicMinnowCloud';}
 SetDefaults(){const p=this.Projectile;p.width=28;p.height=28;p.hostile=true;p.friendly=false;p.penetrate=1;p.timeLeft=110;p.tileCollide=false;p.ignoreWater=true;p.alpha=55;}
 AI(p){p.velocity=Vector2.new(N(p.velocity?.X)*.975,N(p.velocity?.Y)*.975);p.rotation+=.035;try{Terraria.Lighting.AddLight(Math.floor((N(p.position?.X)+14)/16),Math.floor((N(p.position?.Y)+14)/16),.08,.35,.12);}catch(e){} }
 OnHitPlayer(p,player){try{player.AddBuff(20,240,true);}catch(e){} }
}
