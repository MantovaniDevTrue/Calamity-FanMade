import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC, ScanFrozenCubeNPCs } from './../../../Core/FrozenCubeTargetRuntime.js';
const { Vector2,Color }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const State=new Map();function setArray(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}try{a.set_Item(Number(index),value);return true;}catch(_){}return false;}catch(_){return false;}}
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function K(p){return Math.floor(N(p.whoAmI,-1));}function P(o){try{return Terraria.Main.player[o];}catch(_){try{return Terraria.Main.player.get_Item(Number(o));}catch(__){return null;}}}function valid(n){return !!(n&&n.active&&N(n.life)>0&&n.friendly!==true&&n.dontTakeDamage!==true);}function Source(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}}function hasBuff(pl,type){if(!pl||!(type>0))return false;try{return Math.floor(N(pl.FindBuffIndex(type),-1))>=0;}catch(_){return false;}}function target(p,pl){ScanFrozenCubeNPCs(10);let best=null,bd=1200*1200;for(const i of FrozenCubeTrackedIndices()){const n=FrozenCubeNPC(i);if(!valid(n))continue;const dx=N(n.Center.X)-N(p.Center.X),dy=N(n.Center.Y)-N(p.Center.Y),d=dx*dx+dy*dy;if(d<bd){bd=d;best=n;}}return best;}
export class CinderBlossom extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/CinderBlossom';}
 SetStaticDefaults(){setArray(Terraria.Main,'projPet',this.Type,true); setArray(Terraria.ID.ProjectileID.Sets,'MinionSacrificable',this.Type,true);setArray(Terraria.ID.ProjectileID.Sets,'MinionTargetingFeature',this.Type,true);}
 SetDefaults(){const p=this.Projectile;p.minionSlots=1;p.penetrate=-1;p.width=42;p.height=42;p.netImportant=true;p.friendly=false;p.ignoreWater=true;p.tileCollide=false;p.minion=true;p.timeLeft=2;p.aiStyle=-1;}
 CanDamage(){return false;}
 OnSpawn(p){State.set(K(p),{cool:0,scan:0,target:-1});for(let i=0;i<12;i++)try{NewDust(p.position,p.width,p.height,6,(Math.random()-.5)*5,(Math.random()-.5)*5,0,Color.White,1);}catch(_){} }
 AI(p){const pl=P(p.owner),s=State.get(K(p))||{cool:0,scan:0,target:-1};State.set(K(p),s);if(!pl||pl.active===false||pl.dead===true){p.Kill();return;}const buff=Number(ModBuff.getTypeByName('CinderBlossomBuff')||0);if(!(buff>0&&hasBuff(pl,buff))){try{p.Kill();}catch(_){p.active=false;}return;}try{pl.AddBuff(buff,2,true);}catch(_){}p.Center=Vector2.new(N(Terraria.PlayerCenter(pl).X),N(Terraria.PlayerCenter(pl).Y)-60+N(pl.gfxOffY));p.rotation=N(p.rotation)+Math.PI/36*N(Terraria.PlayerDirection(pl),1);p.timeLeft=2;if(s.scan--<=0){const t=target(p,pl);s.target=t?Math.floor(N(t.whoAmI,-1)):-1;s.scan=20;}if(s.cool>0)s.cool--;let n=null;try{if(s.target>=0)n=FrozenCubeNPC(s.target);}catch(_){}if(valid(n)&&s.cool<=0&&Number(p.owner)===Number(Terraria.Main.myPlayer)){const dx=N(n.Center.X)-N(p.Center.X),dy=N(n.Center.Y)-N(p.Center.Y),l=Math.sqrt(dx*dx+dy*dy)||1,v=Vector2.new(dx/l*20,dy/l*20),t=Number(ModProjectile.getTypeByName('CinderShot')||0);if(t>0)NewProjectile(Source(p),p.Center,v,t,Math.max(1,Math.floor(N(p.damage,16))),N(p.knockBack,2),p.owner,0,0,0,null);s.cool=35;}}
 OnKill(p){State.delete(K(p));}
}
export class CinderShot extends ModProjectile{
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'MinionShot',this.Type,true);}
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=12;p.height=12;p.friendly=true;p.tileCollide=false;p.penetrate=3;p.timeLeft=180;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;p.aiStyle=-1;}
 AI(p){if(N(p.timeLeft)%2===0)try{const d=NewDust(p.position,p.width,p.height,6,0,-1,80,Color.White,.9);const q=Terraria.Main.dust[d];if(q)q.noGravity=true;}catch(_){} }
 OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.OnFire,180,false);}catch(_){}for(let i=0;i<6;i++)try{const a=Math.random()*Math.PI*2,s=2+Math.random()*3;NewDust(p.position,p.width,p.height,6,Math.cos(a)*s,Math.sin(a)*s,0,Color.White,.9);}catch(_){} }
 OnTileCollide(){return false;}
}
