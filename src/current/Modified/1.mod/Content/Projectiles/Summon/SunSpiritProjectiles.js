import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { RegisterSunSpirit, UnregisterSunSpirit, SunSpiritState, SunSpiritPower } from './../../../Core/PreBossArsenalRuntime.js';
import { ProjectileSource } from './../../../Core/SeaKingArsenalRuntime.js';
const {Vector2,Color}=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function setArray(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}try{a.set_Item(Number(index),value);return true;}catch(_){}return false;}catch(_){return false;}}
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function ownerOf(p){const i=I(p.owner);if(i<0)return null;try{if(i===I(Terraria.Main.myPlayer))return Terraria.Main.LocalPlayer;}catch(_){}try{return Terraria.Main.player.get_Item(i)||null;}catch(_){return null;}}
function target(found){if(found==null)return null;try{if(found.active!==undefined)return found;}catch(_){}const i=I(found);if(i<0||i>=200)return null;try{return Terraria.Main.npc.get_Item(i);}catch(_){return null;}}
function valid(n){try{return !!n&&n.active&&!n.friendly&&!n.townNPC&&!n.dontTakeDamage&&N(n.life)>0;}catch(_){return false;}}
export class SunSpiritMinion extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/SunSpiritMinion';this.BuffType=0;this.BeamType=0;}
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'MinionSacrificable',this.Type,true);setArray(Terraria.ID.ProjectileID.Sets,'MinionTargetingFeature',this.Type,true);}
 PostSetupContent(){this.BuffType=Number(ModBuff.getTypeByName('SolarSpirit')||0);this.BeamType=Number(ModProjectile.getTypeByName('SunSpiritBeam')||0);}
 SetDefaults(){const p=this.Projectile;p.width=50;p.height=50;p.netImportant=true;p.friendly=false;p.hostile=false;p.ignoreWater=true;p.minionSlots=1;p.timeLeft=18000;p.penetrate=-1;p.tileCollide=false;p.minion=true;p.aiStyle=-1;}
 OnSpawn(p){RegisterSunSpirit(p);}
 AI(p){const pl=ownerOf(p);if(!pl||!pl.active||pl.dead){try{p.Kill();}catch(_){p.active=false;}return;}if(!(this.BuffType>0))this.BuffType=Number(ModBuff.getTypeByName('SolarSpirit')||0);let bi=-1;try{bi=pl.FindBuffIndex(this.BuffType);}catch(_){}if(bi<0){try{p.Kill();}catch(_){p.active=false;}return;}try{pl.AddBuff(this.BuffType,2,true);}catch(_){}p.timeLeft=2;const st=SunSpiritState(p),power=SunSpiritPower(p);try{p.minionSlots=power;}catch(_){}const pc=Terraria.PlayerCenter(pl);p.position=Vector2.new(N(pc.X)-p.width/2,N(pc.Y)-80-p.height/2);p.velocity=Vector2.Zero;p.rotation=N(p.rotation)+0.025;const tick=I(Terraria.Main.GameUpdateCount,0);let n=valid(st.target)?st.target:null;if(tick>=I(st.nextTarget,0)||!n){st.nextTarget=tick+8;st.target=null;try{n=target(p.FindTargetWithinRange(800,true));if(valid(n))st.target=n;}catch(_){} }else n=st.target;if(!valid(n))return;if(tick<I(st.nextShot,0))return;st.nextShot=tick+Math.max(12,Math.floor(50/Math.max(1,power)));if(I(p.owner)!==I(Terraria.Main.myPlayer))return;if(!(this.BeamType>0))this.BeamType=Number(ModProjectile.getTypeByName('SunSpiritBeam')||0);if(!(this.BeamType>0))return;const nc=n.Center,dx=N(nc.X)-N(pc.X),dy=N(nc.Y)-(N(pc.Y)-80),len=Math.sqrt(dx*dx+dy*dy)||1;const v=Vector2.new(dx/len*15,dy/len*15);const src=ProjectileSource(p,pl);if(src)NewProjectile(src,p.Center,v,this.BeamType,N(p.damage),N(p.knockBack),I(p.owner),0,0,0,null);}
 CanDamage(){return false;}
 OnKill(p){UnregisterSunSpirit(p);}
}
export class SunSpiritBeam extends ModProjectile{
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'MinionShot',this.Type,true);}
 constructor(){super();this.Texture='ExtraTextures/TinyGreyscaleCircle';}
 SetDefaults(){const p=this.Projectile;p.width=14;p.height=14;p.friendly=true;p.hostile=false;p.penetrate=1;p.timeLeft=90;p.tileCollide=true;p.ignoreWater=true;p.aiStyle=-1;p.light=0.45;}
 AI(p){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X));if((I(p.timeLeft)%4)===0){try{NewDust(p.position,p.width,p.height,Terraria.ID.DustID.GoldFlame,N(p.velocity.X)*0.1,N(p.velocity.Y)*0.1,80,Color.White,0.8);}catch(_){}}}
 GetAlpha(p,light){try{return Color.new(255,210,70,220);}catch(_){return light;}}
}
