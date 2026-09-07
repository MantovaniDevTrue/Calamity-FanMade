import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC, ScanFrozenCubeNPCs } from './../../../Core/FrozenCubeTargetRuntime.js';
const { Vector2,Color }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function Source(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}}function valid(n){return !!(n&&n.active&&N(n.life)>0&&n.friendly!==true&&n.dontTakeDamage!==true);}function home(p,range=450,speed=6,inertia=20){ScanFrozenCubeNPCs(8);let best=null,bd=range*range;for(const i of FrozenCubeTrackedIndices()){const n=FrozenCubeNPC(i);if(!valid(n))continue;const dx=N(n.Center.X)-N(p.Center.X),dy=N(n.Center.Y)-N(p.Center.Y),d=dx*dx+dy*dy;if(d<bd){bd=d;best=n;}}if(!best)return;const dx=N(best.Center.X)-N(p.Center.X),dy=N(best.Center.Y)-N(p.Center.Y),l=Math.sqrt(dx*dx+dy*dy)||1,des=Vector2.new(dx/l*speed,dy/l*speed);p.velocity=Vector2.Divide(Vector2.Add(Vector2.Multiply(p.velocity,inertia),des),inertia+1);}
export class ManaBolt extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Magic/ManaBolt';}
 SetDefaults(){const p=this.Projectile;p.width=24;p.height=24;p.friendly=true;p.magic=true;p.penetrate=1;p.timeLeft=180;p.aiStyle=-1;}
 AI(p){p.rotation=N(p.rotation)+(Math.abs(N(p.velocity.X))+Math.abs(N(p.velocity.Y)))*.01*(N(p.direction,1));p.velocity=Vector2.Multiply(p.velocity,.985);if(N(p.timeLeft)%2===0)try{NewDust(Vector2.Add(p.position,p.velocity),p.width,p.height,Math.random()<.5?15:107,N(p.velocity.X)*.25,N(p.velocity.Y)*.25,0,Color.White,.9);}catch(_){} }
 OnKill(p){const a=Number(ModProjectile.getTypeByName('ManaBoltSmall')||0),b=Number(ModProjectile.getTypeByName('ManaBoltSmall2')||0);if(Number(p.owner)===Number(Terraria.Main.myPlayer)&&a>0&&b>0){const base=Math.atan2(N(p.velocity.Y),N(p.velocity.X));for(let i=0;i<6;i++){const ang=Math.PI*2*i/6-(Math.PI/3-base),v=Vector2.new(Math.cos(ang)*3.5,Math.sin(ang)*3.5);NewProjectile(Source(p),p.Center,v,i<3?a:b,Math.max(1,Math.floor(N(p.damage)*.5)),N(p.knockBack),p.owner,0,0,0,null);}}for(let i=0;i<4;i++)try{NewDust(p.position,p.width,p.height,i%2?15:107,0,0,0,Color.White,1);}catch(_){} }
}
export class ManaBoltSmall extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Magic/ManaBoltSmall';}
 SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=false;p.magic=true;p.penetrate=1;p.timeLeft=60;p.aiStyle=-1;}
 AI(p){p.friendly=N(p.timeLeft)<40;p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;if(N(p.timeLeft)<40)home(p);else p.velocity=Vector2.Multiply(p.velocity,.975);if(N(p.timeLeft)%4===0)try{NewDust(Vector2.Add(p.position,p.velocity),p.width,p.height,15,N(p.velocity.X)*.25,N(p.velocity.Y)*.25,0,Color.White,.75);}catch(_){} }
 OnKill(p){for(let i=0;i<3;i++)try{NewDust(p.position,p.width,p.height,15,0,0,0,Color.White,.8);}catch(_){} }
}
export class ManaBoltSmall2 extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Magic/ManaBoltSmall';}
 SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.magic=true;p.penetrate=1;p.timeLeft=60;p.aiStyle=-1;}
 AI(p){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;p.velocity=Vector2.Multiply(p.velocity,.975);if(N(p.timeLeft)%4===0)try{NewDust(Vector2.Add(p.position,p.velocity),p.width,p.height,107,N(p.velocity.X)*.25,N(p.velocity.Y)*.25,0,Color.White,.75);}catch(_){} }
 OnKill(p){for(let i=0;i<3;i++)try{NewDust(p.position,p.width,p.height,107,0,0,0,Color.White,.8);}catch(_){} }
}
