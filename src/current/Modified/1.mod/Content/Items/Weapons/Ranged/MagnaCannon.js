import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { MagnaHoldoutActive, RegisterMagnaAim } from './../../../Projectiles/Ranged/PreHardmodeRangedBatch6Projectiles.js';
const { Vector2 }=Modules; const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;} function src(p,i){try{return p['IEntitySource GetProjectileSource_Item(Item item)'](i);}catch(_){return null;}} function aim(p,v){try{const m=Terraria.Main.MouseWorld,c=p.MountedCenter,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),l=Math.sqrt(dx*dx+dy*dy);if(l>1)return Vector2.new(dx/l,dy/l);}catch(_){}const x=N(v&&v.X,1),y=N(v&&v.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l,y/l);}
export class MagnaCannon extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/MagnaCannon';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=56;i.height=34;i.damage=25;i.ranged=true;i.useAnimation=30;i.useTime=30;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.noUseGraphic=true;i.channel=true;i.knockBack=2.5;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.autoReuse=false;i.shootSpeed=12;i.shoot=ModProjectile.getTypeByName('MagnaCannonHoldout');this.MenuCategories.push('ranged');}
 CanUseItem(item,player){return !MagnaHoldoutActive(Terraria.PlayerIndex(player));}
 Shoot(item,player,position,velocity,type,damage,kb){const t=Number(ModProjectile.getTypeByName('MagnaCannonHoldout')||0);if(!(t>0))return false;const a=aim(player,velocity),o=Terraria.PlayerIndex(player);RegisterMagnaAim(o,a);NewProjectile(src(player,item),player.MountedCenter,a,t,Math.max(1,Math.floor(N(damage)>0?N(damage):N(item.damage,25))),N(kb,2.5),o,0,0,0,null);return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Granite,25).AddIngredient(Terraria.ID.ItemID.MeteoriteBar,12).AddIngredient(Terraria.ID.ItemID.Diamond,3).AddIngredient(Terraria.ID.ItemID.Sapphire,5).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
