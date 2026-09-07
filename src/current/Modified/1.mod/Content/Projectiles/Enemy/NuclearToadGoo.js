import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
const { Vector2 }=Modules;const states=new Map();function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function Key(p){return`${I(p?.owner)}:${I(p?.whoAmI)}:${I(p?.type)}`;}function State(p){const k=Key(p);let s=states.get(k);if(!s){s={init:false};states.set(k,s);}return s;}
export class NuclearToadGoo extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Enemy/NuclearToadGoo';}
 SetStaticDefaults(){Terraria.Main.projFrames[this.Type]=3;}
 SetDefaults(){const p=this.Projectile;p.width=18;p.height=18;p.hostile=true;p.friendly=false;p.timeLeft=600;p.tileCollide=true;p.ignoreWater=false;p.penetrate=1;}
 AI(p){const s=State(p);if(!s.init){s.init=true;p.frame=Math.floor(Math.random()*3);}let vx=Number(p.velocity?.X)||0,vy=Number(p.velocity?.Y)||0;if(vy<10)vy+=.27;p.velocity=Vector2.new(vx,vy);}
 OnHitPlayer(p,target){const b=Number(ModBuff.getTypeByName('Irradiated')||0);if(b>0&&target)try{target.AddBuff(b,120,true);}catch(e){}}
 OnKill(p){states.delete(Key(p));}
}
