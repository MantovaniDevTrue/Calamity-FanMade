import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { CnidarianActive } from './../../../Projectiles/Summon/PreHardmodeSummonBatch11Projectiles.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;} function source(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}} function spawned(id){try{return Terraria.Main.projectile.get_Item(Number(id));}catch(_){return null;}}
function setNative(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a.set_Item(Number(index),value);return true;}catch(_){}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}return false;}catch(_){return false;}}
function safeSpawn(pos,player,w,h){const x=N(pos?.X),y=N(pos?.Y);function solid(c){try{return Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'](Vector2.new(N(c.X)-w/2,N(c.Y)-h/2),w,h);}catch(_){return false;}}const wanted=Vector2.new(x,y);if(!solid(wanted))return wanted;let base=null;try{base=player.MountedCenter;}catch(_){base=wanted;}for(const oy of [-40,-72,-104,40]){const c=Vector2.new(N(base.X),N(base.Y)+oy);if(!solid(c))return c;}return base;}
const SpriteEffects=new NativeClass('Microsoft.Xna.Framework.Graphics','SpriteEffects');
let CnidarianInventoryTexture=null;
function clamp01(v){return Math.max(0,Math.min(1,N(v)));}
function setCnidarianPose(player){
    const center=SafePlayerCenter(player),aim=AimFromMouse(player,center);FaceAim(player,aim);
    const grav=N(player.gravDir,1)<0?-1:1;
    let pointing=Math.atan2(N(aim.Y),N(aim.X));
    if(pointing<Math.PI/2&&pointing>=-Math.PI/2)
        pointing=-Math.PI/4+(Math.PI/2)*clamp01((pointing+Math.PI/2)/Math.PI);
    else if(pointing>0)
        pointing=Math.PI*3/4+(Math.PI/4)*clamp01((pointing-Math.PI/2)/(Math.PI/2));
    else
        pointing=-Math.PI+(Math.PI/4)*clamp01((pointing+Math.PI)/(Math.PI*3/4));
    const arm=pointing*grav-Math.PI/2;
    try{const stretch=Terraria.Player.CompositeArmStretchAmount.Full;player.SetCompositeArmBack(true,stretch,arm);player.SetCompositeArmFront(true,stretch,arm);}catch(_){}
    const itemRotation=arm+Math.PI/2*grav,m=player.MountedCenter,hand=Vector2.new(N(m.X)+Math.cos(itemRotation)*11,N(m.Y)+Math.sin(itemRotation)*11);
    CleanHoldStyleTLPro(player,itemRotation,hand,Vector2.new(42,34),Vector2.new(-15,11),{flipAngle:true});
}
function cnidarianInventoryTex(){if(CnidarianInventoryTexture)return CnidarianInventoryTexture;try{CnidarianInventoryTexture=tl.texture.load('Textures/Items/Weapons/Summon/Cnidarian.png');}catch(_){}return CnidarianInventoryTexture;}

export class EnchantedKnifeStaff extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Summon/EnchantedKnifeStaff';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){setNative(Terraria.Item,'staff',this.Type,true);try{Terraria.Item.staff[this.Type]=true;}catch(_){}setNative(Terraria.ID.ItemID.Sets,'GamepadWholeScreenUseRange',this.Type,true);try{Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type]=true;}catch(_){}setNative(Terraria.ID.ItemID.Sets,'LockOnIgnoresCollision',this.Type,true);try{Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type]=true;}catch(_){}setNative(Terraria.ID.ItemID.Sets,'StaffMinionSlotsRequired',this.Type,1);try{Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type]=1;}catch(_){} }
 SetDefaults(){try{this.CloneDefaults(Terraria.ID.ItemID.BabyBirdStaff);}catch(_){}const i=this.Item;i.damage=10;i.summon=true;i.shoot=ModProjectile.getTypeByName('EnchantedKnifeSummon');i.buffType=ModBuff.getTypeByName('EnchantedKnifeStaffBuff');i.knockBack=2;i.useTime=i.useAnimation=15;i.mana=10;i.noMelee=true;i.autoReuse=true;i.width=i.height=50;i.value=Terraria.Item.buyPrice(0,1,0,0);i.rare=Terraria.ID.ItemRarityID.Blue;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.Item8;i.shootSpeed=1;this.MenuCategories.push('summon');}
 ModifyShootStats(item,player,s){try{s.position=safeSpawn(Terraria.Main.MouseWorld,player,32,32);s.velocity=Vector2.Zero;}catch(_){} }
 Shoot(item,player,pos,vel,type,damage,kb){const t=Number(ModProjectile.getTypeByName('EnchantedKnifeSummon')||0),b=Number(ModBuff.getTypeByName('EnchantedKnifeStaffBuff')||0);if(!(t>0&&b>0))return false;try{player.AddBuff(b,2,false);}catch(_){}const base=Math.max(1,Math.floor(N(item.damage,10))),spawnDamage=Math.max(1,Math.floor(N(damage)>0?N(damage):base)),id=NewProjectile(source(player,item),pos,Vector2.Zero,t,spawnDamage,N(kb,2),Terraria.PlayerIndex(player),0,0,0,null),p=spawned(id);if(p){p.damage=spawnDamage;p.originalDamage=base;p.minionSlots=1;p.friendly=true;p.hostile=false;p.netUpdate=true;}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.SuspiciousLookingEye,1).AddTile(Terraria.ID.TileID.WorkBenches).Register();}
}
export class Cnidarian extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Summon/CnidarianFishingRod';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=30;i.height=26;i.summon=true;i.damage=8;i.knockBack=3;i.useTime=i.useAnimation=25;i.autoReuse=true;i.holdStyle=16;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.Item1;i.channel=true;i.noMelee=true;i.noUseGraphic=false;i.shoot=ModProjectile.getTypeByName('CnidarianJellyfishOnTheString');i.shootSpeed=10;i.rare=Terraria.ID.ItemRarityID.Green;i.value=Terraria.Item.buyPrice(0,1,0,0);this.MenuCategories.push('summon');}
 HoldStyle(item,player){setCnidarianPose(player);}
 UseStyle(item,player){setCnidarianPose(player);}
 PreDrawInInventory(item,context,sb,position,scale,maxScale,color,itemFade,flip){const tex=cnidarianInventoryTex();if(!tex)return true;try{const draw=sb['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];if(!draw)return true;draw(tex,position,null,color,0,Vector2.new(N(tex.Width)/2,N(tex.Height)/2),N(scale,1),SpriteEffects.None,0);return false;}catch(_){return true;}}
 CanUseItem(item,player){return !CnidarianActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,pos,vel,type,damage,kb){const t=Number(ModProjectile.getTypeByName('CnidarianJellyfishOnTheString')||0);if(t>0)NewProjectile(source(player,item),Terraria.Main.MouseWorld,Vector2.Zero,t,Math.max(1,Math.floor(N(damage,N(item.damage,8)))),N(kb,3),Terraria.PlayerIndex(player),0,0,0,null);return false;}
 AddRecipes(){const s=Number(ModItem.getTypeByName('SeaRemains')||0);if(s>0)this.CreateRecipe().AddIngredient(s,2).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
