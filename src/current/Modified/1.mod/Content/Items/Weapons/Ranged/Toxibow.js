import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
export class Toxibow extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Ranged/Toxibow';this.ResearchUnlockCount=1;}
 SetDefaults(){const i=this.Item;i.width=22;i.height=60;i.damage=15;i.ranged=true;i.useAnimation=28;i.useTime=28;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=3;i.value=Terraria.Item.buyPrice(0,2,0,0);i.rare=Terraria.ID.ItemRarityID.Green;i.UseSound=Terraria.ID.SoundID.Item5;i.autoReuse=true;i.shoot=Terraria.ID.ProjectileID.WoodenArrowFriendly;i.shootSpeed=15;i.useAmmo=Terraria.ID.AmmoID.Arrow;this.MenuCategories.push('ranged');}
 ModifyShootStats(item,player,stats){try{if(Number(stats.type)===Number(Terraria.ID.ProjectileID.WoodenArrowFriendly)){const t=Number(ModProjectile.getTypeByName('ToxicArrow')||0);if(t>0)stats.type=t;}}catch(_){} }
 AddRecipes(){const wood=Number(ModItem.getTypeByName('Acidwood')||0),scale=Number(ModItem.getTypeByName('SulphuricScale')||0);if(wood>0&&scale>0)this.CreateRecipe().AddIngredient(wood,15).AddIngredient(scale,12).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
