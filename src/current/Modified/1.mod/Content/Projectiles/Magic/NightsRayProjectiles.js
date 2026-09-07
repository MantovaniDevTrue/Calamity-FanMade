import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';
const { Vector2,Color }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function center(e){try{return e.Center;}catch(_){return Vector2.new(N(e.position.X)+N(e.width)*.5,N(e.position.Y)+N(e.height)*.5);}}function valid(n,p){try{return !!n&&n.active&&!n.friendly&&!n.townNPC&&!n.dontTakeDamage&&N(n.life)>0&&n.CanBeChasedBy(p,false);}catch(_){return false;}}function target(p,range){ScanFrozenCubeNPCs(2);let best=null,bd=range,pc=center(p);for(const i of FrozenCubeTrackedIndices()){const n=FrozenCubeNPC(i);if(!valid(n,p))continue;const c=center(n),dx=N(c.X)-N(pc.X),dy=N(c.Y)-N(pc.Y),d=Math.sqrt(dx*dx+dy*dy);if(d<bd){bd=d;best=n;}}return best;}function toward(a,b,s){const dx=N(b.X)-N(a.X),dy=N(b.Y)-N(a.Y),d=Math.sqrt(dx*dx+dy*dy)||1;return Vector2.new(dx/d*s,dy/d*s);}
export class NightsRayBeam extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=4;p.height=4;p.friendly=true;p.magic=true;p.ignoreWater=true;p.penetrate=10;p.extraUpdates=1;p.timeLeft=45;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;p.aiStyle=-1;}
 OnSpawn(p){FusionEntityData.GetProjectileBag(p,'nightsRay',()=>({fired:false,age:0}));}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'nightsRay',()=>({fired:false,age:0}));s.age++;if(s.age>2&&s.age%2===0)try{NewDust(p.position,1,1,27,0,0,0,Color.White,.9);}catch(_){} }
 OnHitNPC(p,npc){const s=FusionEntityData.GetProjectileBag(p,'nightsRay',()=>({fired:false,age:0}));if(s.fired)return;s.fired=true;const t=Number(ModProjectile.getTypeByName('NightOrb')||0);if(!(t>0))return;const c=center(npc),r=40;for(let i=0;i<4;i++){const a=Math.PI*2*i/4+Math.random()*.25,pos=Vector2.new(N(c.X)+Math.cos(a)*r,N(c.Y)+Math.sin(a)*r);NewProjectile(p.GetProjectileSource_FromThis(),pos,Vector2.Zero,t,Math.max(1,Math.floor(N(p.damage)*.8)),N(p.knockBack),p.owner,0,0,0,null);}}
}
export class NightOrb extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=14;p.height=14;p.friendly=false;p.magic=true;p.alpha=255;p.penetrate=-1;p.timeLeft=30;p.ignoreWater=true;p.tileCollide=false;p.aiStyle=-1;}
 CanDamage(){return false;}
 AI(p){if(N(p.timeLeft)%5!==0||Number(p.owner)!==Number(Terraria.Main.myPlayer))return;const n=target(p,300);if(!n)return;const t=Number(ModProjectile.getTypeByName('NightBolt')||0);if(!(t>0))return;NewProjectile(p.GetProjectileSource_FromThis(),center(p),toward(center(p),center(n),6),t,Math.max(1,N(p.damage)),N(p.knockBack),p.owner,0,0,0,null);}
}
export class NightBolt extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=4;p.height=4;p.extraUpdates=3;p.friendly=true;p.magic=true;p.timeLeft=30;p.ignoreWater=true;p.penetrate=1;p.aiStyle=-1;}
 AI(p){if(N(p.timeLeft)%3===0)try{NewDust(p.position,1,1,27,0,0,0,Color.White,1.05);}catch(_){} }
}
