import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
export class ManaRose extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Magic/ManaRose';this.ResearchUnlockCount=1;}
 SetStaticDefaults(){try{Terraria.Item.staff[this.Type]=true;}catch(_){} }
 SetDefaults(){const i=this.Item;i.width=38;i.height=38;i.damage=20;i.magic=true;i.mana=15;i.useAnimation=38;i.useTime=38;i.useStyle=Terraria.ID.ItemUseStyleID.Shoot;i.noMelee=true;i.knockBack=3.25;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.UseSound=Terraria.ID.SoundID.Item109;i.autoReuse=true;i.shoot=ModProjectile.getTypeByName('ManaBolt');i.shootSpeed=10;this.MenuCategories.push('magic');}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.NaturesGift,1).AddIngredient(Terraria.ID.ItemID.ManaCrystal,1).AddIngredient(Terraria.ID.ItemID.Moonglow,5).AddTile(Terraria.ID.TileID.Anvils).Register();this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.JungleRose,1).AddIngredient(Terraria.ID.ItemID.ManaCrystal,1).AddIngredient(Terraria.ID.ItemID.Moonglow,5).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
