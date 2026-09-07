import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { IsStealthStrike, MarkRogueProjectile } from './../../../Core/RogueRuntime.js';
import { MarkAntlionCloud } from './../../../Core/PreBossArsenalRuntime.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';
import { ProjectileSource } from './../../../Core/SeaKingArsenalRuntime.js';
const {Vector2,Color}=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function rot(v,a,m=1){const x=N(v.X),y=N(v.Y),c=Math.cos(a),s=Math.sin(a);return Vector2.new((x*c-y*s)*m,(x*s+y*c)*m);}
function spawnFrom(p,type,vel,damage,kb,sub=true){if(!(type>0))return null;let owner=null;try{const oi=I(p.owner);owner=oi===I(Terraria.Main.myPlayer)?Terraria.Main.LocalPlayer:Terraria.Main.player.get_Item(oi);}catch(_){}const src=ProjectileSource(p,owner);if(!src)return null;const idx=NewProjectile(src,p.Center,vel,type,Math.max(0,I(damage,0)),N(kb),I(p.owner,0),0,0,0,null);if(idx>=0&&idx<1000){let q=null;try{q=Terraria.Main.projectile.get_Item(Number(idx));}catch(_){}if(q)MarkRogueProjectile(q,'AntlionSkewer',sub);return q;}return null;}
export class AntlionSkewerProj extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/AntlionSkewer';this.Blast=0;this.Cloud=0;}
 PostSetupContent(){this.Blast=Number(ModProjectile.getTypeByName('AntlionSkewerSandBlast')||0);this.Cloud=Number(ModProjectile.getTypeByName('AntlionSkewerSandCloud')||0);}
 SetDefaults(){const p=this.Projectile;p.width=30;p.height=30;p.friendly=true;p.hostile=false;p.penetrate=2;p.timeLeft=180;p.tileCollide=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=20;}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'antlionSkewer',()=>({age:0,spat:false}));s.age++;p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/4;if(!s.spat&&s.age>=15){s.spat=true;if(!(this.Blast>0))this.PostSetupContent();const stealth=IsStealthStrike(p),base=Math.max(1,Math.floor(N(p.damage)*0.5));if(stealth){for(let i=0;i<4;i++)spawnFrom(p,this.Blast,rot(p.velocity,(Math.random()*2-1)*24*Math.PI/180),base,N(p.knockBack)*0.5);for(let i=0;i<9;i++){const a=(-30+60*(i/8))*Math.PI/180;spawnFrom(p,this.Cloud,rot(p.velocity,a,i%2===0?0.5:0.33),0,0);}}spawnFrom(p,this.Blast,p.velocity,base,N(p.knockBack)*0.5);}if(s.age>15&&s.age<=45)p.velocity=Vector2.new(N(p.velocity.X)*1.015,N(p.velocity.Y)*1.015);}
}
export class AntlionSkewerSandBlast extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.hostile=false;p.penetrate=1;p.timeLeft=120;p.tileCollide=true;p.aiStyle=-1;}
 AI(p){p.rotation=N(p.rotation)+0.1;if((I(p.timeLeft)%2)===0){try{NewDust(p.position,p.width,p.height,Terraria.ID.DustID.Sand,N(p.velocity.X)*0.15,N(p.velocity.Y)*0.15,0,Color.White,0.8);}catch(_){}}}
}
export class AntlionSkewerSandCloud extends ModProjectile{
 constructor(){super();this.Texture='ExtraTextures/TinyGreyscaleCircle';}
 SetDefaults(){const p=this.Projectile;p.width=20;p.height=20;p.friendly=false;p.hostile=false;p.timeLeft=300;p.tileCollide=false;p.ignoreWater=true;p.aiStyle=-1;p.scale=5;}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'antlionCloud',()=>({next:0}));p.rotation=N(p.rotation)+N(p.velocity.X)*0.004;p.velocity=Vector2.new(N(p.velocity.X)*0.985,N(p.velocity.Y)*0.985);const tick=I(Terraria.Main.GameUpdateCount,0);if(tick<I(s.next,0))return;s.next=tick+8;ScanFrozenCubeNPCs(1);const c=p.Center;for(const idx of FrozenCubeTrackedIndices()){const n=FrozenCubeNPC(idx);try{if(!n||!n.active||n.friendly||n.townNPC||n.dontTakeDamage)continue;const nc=n.Center,dx=N(nc.X)-N(c.X),dy=N(nc.Y)-N(c.Y);if(dx*dx+dy*dy<=80*80)MarkAntlionCloud(n,30);}catch(_){}}}
 CanDamage(){return false;}
 GetAlpha(p,light){try{return Color.new(214,175,92,Math.max(30,Math.min(140,Math.floor(N(p.timeLeft)/300*140))));}catch(_){return light;}}
}
