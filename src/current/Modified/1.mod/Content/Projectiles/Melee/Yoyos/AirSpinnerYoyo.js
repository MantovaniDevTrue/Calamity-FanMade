import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../../Core/FusionEntityData.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function setArray(holder,name,index,value){try{let a=holder[name];const n=Number(index)+1;if(Number(a.length)<n){a=a.cloneResized(n);holder[name]=a;}a[Number(index)]=value;}catch(e){}}
function resolve(found){if(found===null||found===undefined)return null;try{if(found.active!==undefined)return found;}catch(e){}const i=Math.floor(Number(found));if(i>=0&&i<200){try{return Terraria.Main.npc.get_Item(i);}catch(e){try{return Terraria.Main.npc[i];}catch(_){}}}return null;}
function center(e){try{return e.Center;}catch(e2){const r=e['Rectangle getRect()']();return Vector2.new(Number(r.X)+Number(r.Width)*.5,Number(r.Y)+Number(r.Height)*.5);}}
function source(){try{return null;}catch(e){return null;}}
export class AirSpinnerYoyo extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Melee/Yoyos/AirSpinnerYoyo';}
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'YoyosLifeTimeMultiplier',this.Type,60);setArray(Terraria.ID.ProjectileID.Sets,'YoyosMaximumRange',this.Type,330);setArray(Terraria.ID.ProjectileID.Sets,'YoyosTopSpeed',this.Type,16);setArray(Terraria.ID.ProjectileID.Sets,'TrailCacheLength',this.Type,4);setArray(Terraria.ID.ProjectileID.Sets,'TrailingMode',this.Type,0);}
 SetDefaults(){const p=this.Projectile;p.aiStyle=99;p.width=16;p.height=16;p.friendly=true;p.melee=true;p.penetrate=-1;p.extraUpdates=1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=30;}
 AI(p){
   // Official MagnetSphereHitscan runs every 60 projectile updates. This yoyo has one
   // extra update, so the real cadence remains about once per 30 game ticks.
   const bag=FusionEntityData.GetProjectileBag(p,'airSpinner',()=>({timer:0}));bag.timer=(Number(bag.timer)||0)+1;if(bag.timer<=60)return;bag.timer=0;
   if(Number(p.owner)!==Number(Terraria.Main.myPlayer))return;
   let target=null;try{target=resolve(p.FindTargetWithinRange(300,true));}catch(e){}
   if(!target||!target.active||target.friendly||target.dontTakeDamage||Number(target.life)<=0)return;
   const pc=center(p),tc=center(target),sx=Number(pc.X)+Number(p.velocity.X)*4,sy=Number(pc.Y)+Number(p.velocity.Y)*4,dx=Number(tc.X)-sx,dy=Number(tc.Y)-sy,l=Math.sqrt(dx*dx+dy*dy)||1;
   const type=Number(ModProjectile.getTypeByName('Feather')||0);if(!(type>0))return;
   NewProjectile(source(),Vector2.new(sx,sy),Vector2.new(dx/l*6,dy/l*6),type,Math.max(1,Math.floor(Number(p.damage)*0.25)),Number(p.knockBack)||0,p.owner,0,0,0,null);
 }
}
