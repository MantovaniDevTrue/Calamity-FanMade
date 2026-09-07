import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const Done={};
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function Source(p){try{return null;}catch(_){return null;}}
function AddNPC(n,t,d){try{n['void AddBuff(int type, int time, bool quiet)'](t,d,false);}catch(e){}}
function AddPlayer(n,t,d){try{n['void AddBuff(int type, int time, bool fromNetPvP)'](t,d,true);}catch(e){}}
function CreateInk(p){const k=N(p.whoAmI);if(Done[k])return;Done[k]=true;const names=['InkCloud1','InkCloud2','InkCloud3'];for(let i=0;i<4;i++){const name=names[Math.floor(Math.random()*3)],type=Number(ModProjectile.getTypeByName(name)||0),a=Math.random()*Math.PI*2,s=Math.random()*2;if(type>0)try{const id=NewProjectile(Source(p),p.Center,Vector2.new(Math.cos(a)*s,Math.sin(a)*s),type,16,7,N(p.owner),0,0,0,null);try{const q=Terraria.Main.projectile.get_Item(id);if(q)q.timeLeft+=Math.floor(Math.random()*31)-15;}catch(e){}}catch(e){}}p.timeLeft=1;}
export class InkBombProjectile extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Rogue/InkBombProjectile';}
 SetDefaults(){const p=this.Projectile;p.width=14;p.height=22;p.friendly=true;p.alpha=0;p.penetrate=1;p.tileCollide=true;p.ignoreWater=true;p.timeLeft=20;p.aiStyle=-1;}
 AI(p){p.velocity=Vector2.new(Number(p.velocity.X),Number(p.velocity.Y)+0.1);p.rotation+=Number(p.velocity.X)*0.1;if(N(p.timeLeft)<=1)CreateInk(p);}
 OnHitNPC(p,npc){if(!npc.friendly)CreateInk(p);}OnHitPlayer(p,player){CreateInk(p);}OnTileCollide(p,hitDirection){CreateInk(p);return true;}OnKill(p,timeLeft){delete Done[N(p.whoAmI)];}
}
class InkCloudBase extends ModProjectile{
 SetDefaults(){const p=this.Projectile;p.width=36;p.height=30;p.friendly=true;p.penetrate=-1;p.tileCollide=true;p.ignoreWater=true;p.timeLeft=100;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=15;p.aiStyle=-1;}
 AI(p){if(N(p.timeLeft)<50)p.alpha=Math.min(255,N(p.alpha)+5);if(N(p.timeLeft)<75)p.velocity=Vector2.new(Number(p.velocity.X)*0.95,Number(p.velocity.Y)*0.95);}
 OnHitNPC(p,npc){if(!npc.friendly)AddNPC(npc,31,60);}OnHitPlayer(p,player){AddPlayer(player,31,300);}
}
export class InkCloud1 extends InkCloudBase{constructor(){super();this.Texture='Projectiles/Rogue/InkCloud1';}}
export class InkCloud2 extends InkCloudBase{constructor(){super();this.Texture='Projectiles/Rogue/InkCloud2';}}
export class InkCloud3 extends InkCloudBase{constructor(){super();this.Texture='Projectiles/Rogue/InkCloud3';}}
