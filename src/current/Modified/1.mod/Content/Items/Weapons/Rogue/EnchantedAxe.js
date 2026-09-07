import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';
export class EnchantedAxe extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/EnchantedAxe';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=40;i.height=36;i.damage=19;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=19;i.useTime=19;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=1;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.maxStack=1;i.rare=Terraria.ID.ItemRarityID.Orange;i.value=Terraria.Item.buyPrice(0,1,0,0);i.shoot=ModProjectile.getTypeByName('EnchantedAxeProj');i.shootSpeed=30;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),base=Number(damage)>0?Number(damage):Number(item.damage)||19,t=Number(ModProjectile.getTypeByName('EnchantedAxeProj')||type||0);SpawnMarkedProjectile(player,item,position,velocity,t,base,kb,'EnchantedAxe',stealth,false,0,0,0);return false;}
 AddRecipes(){const pearl=ModItem.getTypeByName('PearlShard');if(pearl>0){this.CreateRecipe().AddIngredient(ModItem.getTypeByName('IronFrancisca'),1).AddIngredient(Terraria.ID.ItemID.FallenStar,5).AddIngredient(pearl,10).AddIngredient(Terraria.ID.ItemID.Bone,30).AddTile(Terraria.ID.TileID.Anvils).Register();this.CreateRecipe().AddIngredient(ModItem.getTypeByName('LeadTomahawk'),1).AddIngredient(Terraria.ID.ItemID.FallenStar,5).AddIngredient(pearl,10).AddIngredient(Terraria.ID.ItemID.Bone,30).AddTile(Terraria.ID.TileID.Anvils).Register();}}
}