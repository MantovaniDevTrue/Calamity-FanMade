import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2, Color }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function src(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}}function dust(p,id,count=1,scale=.8){for(let i=0;i<count;i++)try{const d=NewDust(p.position,p.width,p.height,id,(Math.random()-.5)*2,(Math.random()-.5)*2,80,Color.White,scale);let q=null;try{q=Terraria.Main.dust.get_Item(Number(d));}catch(_){}if(q)q.noGravity=true;}catch(_){}}
export class IcicleStaffProj extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Magic/IcicleStaffProj';}
 SetDefaults(){const p=this.Projectile;p.width=14;p.height=14;p.friendly=true;p.magic=true;p.penetrate=1;p.extraUpdates=1;p.timeLeft=600;p.aiStyle=-1;}
 AI(p){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;const s=FusionEntityData.GetProjectileBag(p,'icicle',()=>({age:0}));s.age++;if(s.age>4&&s.age%3===0)dust(p,67,1,.65);}
 OnKill(p){dust(p,67,5,.8);try{PlayItemSound(27,p.Center,0,.25);}catch(_){} }
}
export class AcidGunStream extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=32;p.height=32;p.friendly=true;p.magic=true;p.ignoreWater=true;p.penetrate=2;p.timeLeft=150;p.tileCollide=false;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;p.aiStyle=-1;}
 OnSpawn(p){FusionEntityData.GetProjectileBag(p,'acidStream',()=>({age:0}));}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'acidStream',()=>({age:0}));s.age++;if(s.age>=4)p.tileCollide=true;p.scale=Math.max(.05,N(p.scale,1)-.006);if(s.age>=10)p.velocity=Vector2.new(N(p.velocity.X),N(p.velocity.Y)+.075);if(p.scale<=.06){p.Kill();return;}if(s.age>3){dust(p,75,s.age%2===0?2:1,.9);}}
 OnHitNPC(p,npc){const b=Number(ModBuff.getTypeByName('Irradiated')||0);if(b>0)try{npc.AddBuff(b,120,false);}catch(_){} }
 OnTileCollide(){return true;}
}
export class PlasmaRay extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=4;p.height=4;p.friendly=true;p.magic=true;p.penetrate=1;p.extraUpdates=2;p.timeLeft=80;p.aiStyle=-1;}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'plasma',()=>({age:0}));s.age++;if(s.age>4)dust(p,s.age%2?173:27,1,.65);}
 OnTileCollide(p){if(Number(p.owner)===Number(Terraria.Main.myPlayer)){const t=Number(ModProjectile.getTypeByName('PlasmaRay2')||0);if(t>0){const off=Math.random()*Math.PI*2;for(let i=0;i<8;i++){const a=Math.PI*2*i/8-off,v=Vector2.new(Math.cos(a)*4,Math.sin(a)*4);NewProjectile(src(p),p.Center,v,t,Math.max(1,Math.floor(N(p.damage)*1.75)),N(p.knockBack),p.owner,0,0,0,null);}}}dust(p,173,5,.8);return true;}
 OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.ShadowFlame,180,false);}catch(_){} }
 OnKill(p){dust(p,173,4,.75);}
}
export class PlasmaRay2 extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=4;p.height=4;p.friendly=true;p.magic=true;p.tileCollide=false;p.penetrate=1;p.extraUpdates=1;p.timeLeft=40;p.aiStyle=-1;}
 AI(p){if(N(p.timeLeft)%2===0)dust(p,27,1,.5);}
 OnKill(p){dust(p,27,3,.65);}
}
