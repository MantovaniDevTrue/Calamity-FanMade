import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { WorldDB } from './../../../../TL/WorldDB.js';
import { OwnerIndex } from './../../../../Core/DraedonTier1Runtime.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';
const { Vector2 }=Modules;const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function setPulsePistolPose(player){
 const center=SafePlayerCenter(player),aim=AimFromMouse(player,center);FaceAim(player,aim);
 const grav=N(player.gravDir,1)<0?-1:1,rev=Math.atan2(-N(aim.Y),-N(aim.X));
 const arm=rev*grav+Math.PI/2;try{player.SetCompositeArmFront(true,Terraria.Player.CompositeArmStretchAmount.Full,arm);}catch(_){}
 const itemRotation=arm+(Math.PI/2)*grav;
 const max=Math.max(1,N(player.itemTimeMax,64)),time=Math.max(0,N(player.itemTime,0));
 const progress=.5-time/max;let pullback=7;
 if(progress<.4) pullback-=2.75*Math.pow((.6-progress)/.6,2);
 const mounted=player.MountedCenter,pos=Vector2.new(N(mounted.X)+Math.cos(itemRotation)*pullback,N(mounted.Y)+Math.sin(itemRotation)*pullback);
 CleanHoldStyleTLPro(player,itemRotation,pos,Vector2.new(54,38),Vector2.new(-24,4));
}
function Source(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){}try{return null;}catch(_){return null;}}
export class PulsePistol extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/DraedonsArsenal/PulsePistol';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=54;i.height=38;i.magic=true;i.damage=42;i.knockBack=3;i.useAnimation=64;i.useTime=64;i.autoReuse=true;i.mana=25;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.UseSound=Terraria.ID.SoundID.Item91;i.noMelee=true;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.shoot=ModProjectile.getTypeByName('PulsePistolShot');i.shootSpeed=8;this.MenuCategories.push('magic');}
 UseStyle(item,player){setPulsePistolPose(player);}
 Shoot(item,player,position,velocity,type,damage,knockBack){const t=Number(ModProjectile.getTypeByName('PulsePistolShot')||type||0);if(!(t>0))return false;const pos=Vector2.new(N(position.X)+N(velocity.X)*4,N(position.Y)+N(velocity.Y)*4);try{NewProjectile(Source(player,item),pos,velocity,t,Math.max(1,Math.floor(N(damage,42))),N(knockBack,3),OwnerIndex(player),0,0,0,null);}catch(_){}return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(ModItem.getTypeByName('MysteriousCircuitry'),5).AddIngredient(ModItem.getTypeByName('DubiousPlating'),7).AddIngredient(ModItem.getTypeByName('AerialiteBar'),4).AddIngredient(ModItem.getTypeByName('SeaPrism'),7).AddCondition(() => !!WorldDB.Instance && WorldDB.get('calamity:draedon:sunkenSeaSchematicFound') === true).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
