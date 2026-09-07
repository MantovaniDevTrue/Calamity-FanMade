import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile, MarkStealthStrike, IsStealthStrike } from './../../../Core/RogueRuntime.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC, ScanFrozenCubeNPCs } from './../../../Core/FrozenCubeTargetRuntime.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2, Color }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function source(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}}function center(p){try{return p.Center;}catch(_){return Vector2.new(N(p.position.X)+N(p.width)/2,N(p.position.Y)+N(p.height)/2);}}function validNpc(n){return !!(n&&n.active&&N(n.life)>0&&n.friendly!==true&&n.dontTakeDamage!==true);}function dust(p,id,count=1,scale=.8){for(let i=0;i<count;i++)try{NewDust(p.position,p.width,p.height,id,(Math.random()-.5)*5,(Math.random()-.5)*5,80,Color.White,scale);}catch(_){}}function nearest(p,range=450,exclude=-1){ScanFrozenCubeNPCs(6);let best=null,bd=range*range;for(const i of FrozenCubeTrackedIndices()){if(Number(i)===Number(exclude))continue;const n=FrozenCubeNPC(i);if(!validNpc(n))continue;const dx=N(n.Center.X)-N(p.Center.X),dy=N(n.Center.Y)-N(p.Center.Y),d=dx*dx+dy*dy;if(d<bd){bd=d;best=n;}}return best;}function toward(a,b,sp){const dx=N(b.X)-N(a.X),dy=N(b.Y)-N(a.Y),l=Math.sqrt(dx*dx+dy*dy)||1;return Vector2.new(dx/l*sp,dy/l*sp);}
export class Brick extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/ThrowingBrick';}
 SetDefaults(){const p=this.Projectile;p.width=19;p.height=19;p.friendly=true;p.timeLeft=240;p.penetrate=1;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'ThrowingBrick',false);FusionEntityData.GetProjectileBag(p,'brick',()=>({age:0}));}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'brick',()=>({age:0}));s.age++;p.direction=N(p.velocity.X)>=0?1:-1;p.rotation=N(p.rotation)+.4*p.direction;p.velocity=Vector2.new(N(p.velocity.X)*.98,Math.min(16,N(p.velocity.Y)+Math.min(.6,s.age/40)));if(Math.random()<1/13)dust(p,9,1,.7);}
 OnKill(p){dust(p,7,IsStealthStrike(p)?12:7,IsStealthStrike(p)?1:.7);try{PlayItemSound(50,p.Center,0,.35);}catch(_){}if(!IsStealthStrike(p)||Number(p.owner)!==Number(Terraria.Main.myPlayer))return;const t=Number(ModProjectile.getTypeByName('BrickFragment')||0);if(!(t>0))return;const back=Vector2.new(-N(p.velocity.X),-N(p.velocity.Y)),bl=Math.sqrt(N(back.X)**2+N(back.Y)**2)||1;for(let i=0;i<5;i++){const a=Math.random()*Math.PI*2,s=3+Math.random()*5,v=Vector2.new(Math.cos(a)*s+N(back.X)/bl*9,Math.sin(a)*s+N(back.Y)/bl*9),id=NewProjectile(source(p),center(p),v,t,Math.max(1,Math.floor(N(p.damage)/2)),N(p.knockBack)/2,p.owner,0,0,0,null);try{let q=null;try{q=Terraria.Main.projectile.get_Item(Number(id));}catch(_){}if(q)MarkRogueProjectile(q,'ThrowingBrick',true);}catch(_){} }}
}
export class BrickFragment extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Rogue/BrickFragment';}
 SetDefaults(){const p=this.Projectile;p.friendly=true;p.width=16;p.height=16;p.scale=.6;p.penetrate=1;p.timeLeft=120;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'ThrowingBrick',true);FusionEntityData.GetProjectileBag(p,'brickFrag',()=>({age:0}));}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'brickFrag',()=>({age:0}));s.age++;p.direction=N(p.velocity.X)>=0?1:-1;p.rotation=N(p.rotation)+Math.PI/60*p.direction;p.velocity=Vector2.new(N(p.velocity.X)*.97,Math.min(16,N(p.velocity.Y)+.27+Math.min(.5,s.age/40)));}
 OnKill(p){dust(p,7,4,.7);}
}
export class SporeKnifeProj extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/SporeKnife';}
 SetDefaults(){const p=this.Projectile;p.width=12;p.height=12;p.friendly=true;p.penetrate=1;p.timeLeft=300;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'SporeKnife',false);FusionEntityData.GetProjectileBag(p,'sporeKnife',()=>({age:0}));}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'sporeKnife',()=>({age:0}));s.age++;p.direction=N(p.velocity.X)>=0?1:-1;if(s.age<30)p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/4;else p.rotation=N(p.rotation)+.4*p.direction;p.velocity=Vector2.new(N(p.velocity.X)*.995,Math.min(16,N(p.velocity.Y)+.07));if(s.age%3===0)dust(p,44,1,.55);}
 OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.Poisoned,120,false);}catch(_){} }
 PreKill(p){const stealth=IsStealthStrike(p),c=center(p);try{p['void Resize(int newWidth, int newHeight)'](120,120);}catch(_){p.width=120;p.height=120;p.Center=c;}p.damage=Math.max(1,Math.floor(N(p.damage)*.3));p.penetrate=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;try{p.Damage();}catch(_){}dust(p,44,10,1);if(stealth&&Number(p.owner)===Number(Terraria.Main.myPlayer)){const t=Number(ModProjectile.getTypeByName('SporeKnifeBud')||0);if(t>0)for(let k=0;k<3;k++){const a=Math.random()*Math.PI*2+k*Math.PI*2/3,v=Vector2.new(Math.cos(a)*9,Math.sin(a)*9),id=NewProjectile(source(p),c,v,t,Math.max(1,Math.floor(N(p.damage)*.5)),0,p.owner,0,0,0,null);try{let q=null;try{q=Terraria.Main.projectile.get_Item(Number(id));}catch(_){}if(q){MarkRogueProjectile(q,'SporeKnife',true);MarkStealthStrike(q,'SporeKnife',true);}}catch(_){} }}return true;}
}
export class SporeKnifeBud extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Rogue/SporeKnifeBud';}
 SetStaticDefaults(){try{Terraria.Main.projFrames[this.Type]=4;}catch(_){} }
 SetDefaults(){const p=this.Projectile;p.width=12;p.height=12;p.friendly=true;p.penetrate=-1;p.tileCollide=false;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=50;p.timeLeft=300;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'SporeKnife',true);FusionEntityData.GetProjectileBag(p,'sporeBud',()=>({age:0,sticky:false,target:-1,off:Vector2.Zero,scan:0}));}
 CanDamage(p){const s=FusionEntityData.GetProjectileBag(p,'sporeBud',()=>({age:0,sticky:false,target:-1,off:Vector2.Zero,scan:0}));return s.age<15?false:null;}
 AI(p){p.frameCounter=N(p.frameCounter)+1;if(N(p.frameCounter)>6){p.frame=(N(p.frame)+1)%4;p.frameCounter=0;}const s=FusionEntityData.GetProjectileBag(p,'sporeBud',()=>({age:0,sticky:false,target:-1,off:Vector2.Zero,scan:0}));s.age++;if(s.sticky){const n=FrozenCubeNPC(s.target);if(!validNpc(n)){s.sticky=false;s.target=-1;return;}p.Center=Vector2.Add(center(n),s.off);p.velocity=Vector2.Zero;p.rotation=0;return;}if(s.age>=15){if(s.scan--<=0){const n=nearest(p,450,-1);s.target=n?Math.floor(N(n.whoAmI,-1)):-1;s.scan=10;}const n=s.target>=0?FrozenCubeNPC(s.target):null;if(validNpc(n)){const desired=toward(center(p),center(n),6.5);p.velocity=Vector2.Divide(Vector2.Add(Vector2.Multiply(p.velocity,19),desired),20);}}p.spriteDirection=p.direction=N(p.velocity.X)>=0?1:-1;p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+(p.spriteDirection===1?0:Math.PI);if(s.age%4===0)dust(p,75,1,.5);}
 OnHitNPC(p,npc){const s=FusionEntityData.GetProjectileBag(p,'sporeBud',()=>({age:0,sticky:false,target:-1,off:Vector2.Zero,scan:0}));s.sticky=true;s.target=Math.floor(N(npc.whoAmI,-1));s.off=Vector2.new(N(center(p).X)-N(center(npc).X),N(center(p).Y)-N(center(npc).Y));try{npc.AddBuff(Terraria.ID.BuffID.Poisoned,60,false);}catch(_){}dust(p,44,4,.7);}
 OnKill(p){dust(p,44,6,.7);}
}
export class SeafoamBombProj extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Rogue/SeafoamBombProj';}
 SetDefaults(){const p=this.Projectile;p.width=14;p.height=20;p.friendly=true;p.penetrate=1;p.timeLeft=240;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'SeafoamBomb',false);}
 AI(p){p.rotation=N(p.rotation)+N(p.velocity.X)*.1;p.velocity=Vector2.new(N(p.velocity.X)*.99,N(p.velocity.Y)+.15);}
 PreKill(p){const stealth=IsStealthStrike(p),c=center(p),size=stealth?256:128;try{p['void Resize(int newWidth, int newHeight)'](size,size);}catch(_){p.width=size;p.height=size;p.Center=c;}p.maxPenetrate=-1;p.penetrate=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;try{p.Damage();}catch(_){}if(Number(p.owner)===Number(Terraria.Main.myPlayer)){const t=Number(ModProjectile.getTypeByName('SeafoamBubble')||0);if(t>0){const count=stealth?5:1;for(let i=0;i<count;i++){const pos=stealth?Vector2.new(N(c.X)+Math.random()*100-50,N(c.Y)+Math.random()*100-50):c,id=NewProjectile(source(p),pos,Vector2.Zero,t,Math.max(1,Math.floor(N(p.damage)*.4)),0,p.owner,0,0,0,null);try{let q=null;try{q=Terraria.Main.projectile.get_Item(Number(id));}catch(_){}if(q)MarkRogueProjectile(q,'SeafoamBomb',true);}catch(_){} }}}dust(p,33,stealth?12:7,1);try{PlayItemSound(14,c,0,.4);}catch(_){}return true;}
}
export class SeafoamBubble extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Rogue/SeafoamBubble';}
 SetDefaults(){const p=this.Projectile;p.width=28;p.height=28;p.friendly=true;p.penetrate=3;p.timeLeft=180;p.tileCollide=false;p.alpha=255;p.scale=1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=30;p.aiStyle=-1;}
 OnSpawn(p){MarkRogueProjectile(p,'SeafoamBomb',true);FusionEntityData.GetProjectileBag(p,'seaBubble',()=>({age:0,nextDouble:60}));}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'seaBubble',()=>({age:0,nextDouble:60}));s.age++;p.alpha=Math.max(50,N(p.alpha)-10);p.scale=N(p.scale,1)+.002;if(s.age>=s.nextDouble){p.damage=Math.max(1,Math.floor(N(p.damage)*2));s.nextDouble+=60;}p.velocity=Vector2.new(N(p.velocity.X)*.98,N(p.velocity.Y)-.01);}
 OnKill(p){dust(p,33,10,1);try{PlayItemSound(54,p.Center,0,.25);}catch(_){} }
}
