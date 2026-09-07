import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { FlurrystormHoldoutActive, RegisterFlurrystormAim } from './../../../Projectiles/Ranged/FlurrystormCannonProjectiles.js';
const { Vector2 }=Modules;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function Aim(player,v){try{const m=Terraria.Main.MouseWorld,c=player.MountedCenter,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),d=Math.sqrt(dx*dx+dy*dy);if(d>12)return Vector2.new(dx/d,dy/d);}catch(_){}const x=N(v.X),y=N(v.Y),d=Math.sqrt(x*x+y*y);return d>.001?Vector2.new(x/d,y/d):Vector2.new(N(Terraria.PlayerDirection(player),1),0);}function HasAmmo(p,id){try{for(const a of Array.from(p.inventory||[]))if(a&&N(a.ammo)===N(id)&&N(a.stack)>0)return true;}catch(_){}return false;}
export class FlurrystormCannon extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/FlurrystormCannon';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=68;i.height=38;i.damage=10;i.useTime=16;i.useAnimation=16;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.knockBack=1.2;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.UseSound=Terraria.ID.SoundID.Item11;i.noMelee=true;i.noUseGraphic=true;i.ranged=true;i.channel=true;i.autoReuse=true;i.shoot=ModProjectile.getTypeByName('FlurrystormCannonShooting');i.useAmmo=Terraria.ID.AmmoID.Snowball;i.shootSpeed=18;this.MenuCategories.push('ranged');}
 CanUseItem(item,player){const o=Terraria.PlayerIndex(player);return !FlurrystormHoldoutActive(o)&&HasAmmo(player,item.useAmmo);}
 ModifyShootStats(item,player,stats){const a=Aim(player,stats.velocity);stats.velocity=Vector2.Multiply(a,.55);try{stats.position=player.MountedCenter;}catch(_){}}
 Shoot(item,player,position,velocity,type,damage,knockBack){const o=Terraria.PlayerIndex(player),a=Aim(player,velocity),t=Number(ModProjectile.getTypeByName('FlurrystormCannonShooting')||0);if(t<=0)return false;RegisterFlurrystormAim(o,a);let src=null;try{src=player.GetProjectileSource_Item(item);}catch(_){}NewProjectile(src,player.MountedCenter,Vector2.Multiply(a,.55),t,damage,knockBack,o,0,0,0,null);return false;}
 AddRecipes(){
  const addCommon=(recipe)=>recipe.AddIngredient(324,1).AddIngredient(ModItem.getTypeByName('AerialiteBar'),10).AddIngredient(154,10).AddIngredient(ModItem.getTypeByName('PearlShard'),10);
  addCommon(this.CreateRecipe().AddIngredient(1319,1)).AddCondition(()=>Terraria.Main.remixWorld!==true).AddTile(Terraria.ID.TileID.Anvils).Register();
  addCommon(this.CreateRecipe().AddIngredient(725,1)).AddCondition(()=>Terraria.Main.remixWorld===true).AddTile(Terraria.ID.TileID.Anvils).Register();
 }
}
