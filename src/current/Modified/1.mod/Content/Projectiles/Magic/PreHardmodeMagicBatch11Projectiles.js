import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';
const { Vector2, Color }=Modules;
const SpriteEffects=new NativeClass('Microsoft.Xna.Framework.Graphics','SpriteEffects');
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function owner(p){const i=I(p.owner);try{return i===I(Terraria.Main.myPlayer,-2)?Terraria.Main.LocalPlayer:Terraria.Main.player.get_Item(i);}catch(_){return null;}}function norm(v,s=1){const x=N(v?.X),y=N(v?.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*s,y/l*s);}function source(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}}function spawned(id){try{return Terraria.Main.projectile.get_Item(Number(id));}catch(_){return null;}}
function dust(p,count=1,scale=1){for(let i=0;i<count;i++)try{NewDust(p.position,p.width,p.height,Terraria.ID.DustID.Torch,(Math.random()-.5)*5,(Math.random()-.5)*5,0,Color.White,scale);}catch(_){} }
let CauldronTexture=null;function cauldronTex(){if(CauldronTexture)return CauldronTexture;try{CauldronTexture=tl.texture.load('Textures/Items/Weapons/Magic/TheCauldron.png');}catch(_){}return CauldronTexture;}
const CauldronHB=new Map();
export function CauldronHoldoutActive(o){const now=I(Terraria.Main.GameUpdateCount,0),t=I(CauldronHB.get(Number(o)),-9999);if(now-t<=3)return true;CauldronHB.delete(Number(o));return false;}
export class CauldronHoldout extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Magic/TheCauldron';this.ShotType=0;}
 PostSetupContent(){this.ShotType=Number(ModProjectile.getTypeByName('CauldronProj')||0);}
 SetDefaults(){const p=this.Projectile;p.width=p.height=46;p.friendly=false;p.hostile=false;p.penetrate=-1;p.tileCollide=false;p.ignoreWater=true;p.timeLeft=2;p.aiStyle=-1;}
 OnSpawn(p){CauldronHB.set(Number(p.owner),I(Terraria.Main.GameUpdateCount,0));FusionEntityData.GetProjectileBag(p,'cauldronHold',()=>({cool:Math.max(0,I(p.ai.val0,46)),age:0}));}
 AI(p){const pl=owner(p),s=FusionEntityData.GetProjectileBag(p,'cauldronHold',()=>({cool:46,age:0}));if(!pl||pl.active===false||pl.dead===true||(!pl.channel&&!pl.controlUseItem)){p.Kill();return;}s.age++;CauldronHB.set(Number(p.owner),I(Terraria.Main.GameUpdateCount,0));p.timeLeft=2;const holdScale=.55*N(pl.HeldItem?.shootSpeed,12);let a=norm(p.velocity,holdScale);try{const c=pl.MountedCenter,m=Terraria.Main.MouseWorld;a=norm(Vector2.new(N(m.X)-N(p.Center.X),N(m.Y)-N(p.Center.Y)),holdScale);}catch(_){}p.velocity=a;const dir=N(a.X)>=0?1:-1;p.direction=dir;p.spriteDirection=dir;try{Terraria.SetPlayerDirection(pl,dir);}catch(_){}p.Center=Vector2.new(N(pl.MountedCenter.X)-(dir===1?6:0),N(pl.MountedCenter.Y)-30);p.rotation=Math.atan2(N(a.Y),N(a.X))+Math.PI/4;try{pl.heldProj=p.whoAmI;pl.itemTime=2;pl.itemAnimation=2;pl.itemRotation=Math.atan2(N(p.velocity.Y)*dir,N(p.velocity.X)*dir);const stretch=Terraria.Player.CompositeArmStretchAmount.Full;pl.SetCompositeArmFront(true,stretch,Math.PI);pl.SetCompositeArmBack(true,stretch,Math.PI);}catch(_){}if(s.cool>0){s.cool--;return;}const held=pl.HeldItem,cost=(pl.lavaWet===true||pl.ZoneUnderworldHeight===true)?6:30;if(N(pl.statMana)<cost){p.Kill();return;}pl.statMana=N(pl.statMana)-cost;s.cool=60;if(!(this.ShotType>0))this.ShotType=Number(ModProjectile.getTypeByName('CauldronProj')||0);if(this.ShotType>0&&I(p.owner)===I(Terraria.Main.myPlayer)){const v=norm(a,18),id=NewProjectile(source(p),p.Center,v,this.ShotType,Math.max(1,I(p.damage,N(held?.damage,56))),N(p.knockBack,8),p.owner,0,0,0,null),q=spawned(id);if(q)q.originalDamage=Math.max(1,I(p.damage,56));try{PlayItemSound(20,p.Center,-.1,.5);}catch(_){}dust(p,6,1.2);}}
 CanDamage(){return false;}
 PreDraw(p,lightColor){const tex=cauldronTex();if(!tex)return true;try{const draw=Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];if(!draw)return true;const pos=Vector2.new(N(p.Center.X)-N(Terraria.Main.screenPosition.X),N(p.Center.Y)-N(Terraria.Main.screenPosition.Y)+N(p.gfxOffY));draw(tex,pos,null,lightColor,N(p.rotation),Vector2.new(N(tex.Width)/2,N(tex.Height)/2),N(p.scale,1),SpriteEffects.None,0);return false;}catch(_){return true;}}
 OnKill(p){CauldronHB.delete(Number(p.owner));}
}
export class CauldronProj extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Magic/CauldronProj';this.SmallType=0;}
 PostSetupContent(){this.SmallType=Number(ModProjectile.getTypeByName('CauldronProjSmall')||0);}
 SetDefaults(){const p=this.Projectile;p.width=p.height=28;p.friendly=true;p.hostile=false;p.tileCollide=false;p.penetrate=1;p.timeLeft=180;p.magic=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'cauldronBomb',()=>({age:0,exploded:false}));s.age++;if(s.age>3)p.tileCollide=true;if(s.age>10)p.velocity=Vector2.new(N(p.velocity.X)*.97,N(p.velocity.Y)+.4);p.rotation+=N(p.velocity.X)*.05;if(s.age%2===0)dust(p,1,1.1);}
 OnHitNPC(p,n){try{n.AddBuff(Terraria.ID.BuffID.OnFire,90,false);}catch(_){} }
 OnTileCollide(){return true;}
 Explode(p){const s=FusionEntityData.GetProjectileBag(p,'cauldronBomb',()=>({exploded:false}));if(s.exploded)return;s.exploded=true;const c=p.Center,base=Math.max(1,I(p.damage,56));try{p['void Resize(int newWidth, int newHeight)'](128,128);p.Center=c;p.penetrate=-1;p.damage=Math.max(1,Math.floor(base*.66));p.Damage();}catch(_){}if(!(this.SmallType>0))this.SmallType=Number(ModProjectile.getTypeByName('CauldronProjSmall')||0);if(this.SmallType>0&&I(p.owner)===I(Terraria.Main.myPlayer))for(let i=0;i<3;i++){const a=-Math.PI/2+(Math.random()-.5)*Math.PI/3,v=Vector2.new(Math.cos(a)*(8+Math.random()*2),Math.sin(a)*(8+Math.random()*2));NewProjectile(source(p),c,v,this.SmallType,Math.max(1,Math.floor(base*.33)),3,p.owner,0,0,0,null);}dust(p,24,1.5);try{PlayItemSound(62,c,0,.45);}catch(_){} }
 PreKill(p){this.Explode(p);return true;}
}
export class CauldronProjSmall extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Magic/CauldronProjSmall';}
 SetDefaults(){const p=this.Projectile;p.width=p.height=14;p.friendly=true;p.hostile=false;p.penetrate=1;p.timeLeft=120;p.magic=true;p.aiStyle=-1;}
 AI(p){const s=FusionEntityData.GetProjectileBag(p,'smallCauldron',()=>({age:0}));s.age++;if(s.age>8)p.velocity=Vector2.new(N(p.velocity.X)*.97,N(p.velocity.Y)+.38);p.rotation+=N(p.velocity.X)*.05;if(s.age%3===0)dust(p,1,.75);}
 CanDamage(p){return N(p.velocity.Y)<0?false:null;}
 OnHitNPC(p,n){try{n.AddBuff(Terraria.ID.BuffID.OnFire,90,false);}catch(_){} }
 OnKill(p){dust(p,8,1);try{PlayItemSound(62,p.Center,.4,.3);}catch(_){} }
}
