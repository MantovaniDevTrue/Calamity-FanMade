import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';
export class SporeKnife extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/SporeKnife';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=12;i.height=40;i.damage=18;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=20;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.useTime=20;i.knockBack=1.75;i.UseSound=Terraria.ID.SoundID.Item1;i.autoReuse=true;i.value=Terraria.Item.buyPrice(0,5,0,0);i.rare=Terraria.ID.ItemRarityID.Orange;i.shoot=ModProjectile.getTypeByName('SporeKnifeProj');i.shootSpeed=15;this.MenuCategories.push('thrown');}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),t=Number(ModProjectile.getTypeByName('SporeKnifeProj')||type||0),base=Math.max(1,Number(damage)||Number(item.damage)||18),dmg=Math.floor(base*(stealth?StealthDamageMultiplier(player,'SporeKnife'):1));SpawnMarkedProjectile(player,item,position,velocity,t,dmg,kb,'SporeKnife',stealth,false,0,0,0);return false;}
 AddRecipes(){this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.JungleSpores,12).AddIngredient(Terraria.ID.ItemID.Stinger,8).AddTile(Terraria.ID.TileID.Anvils).Register();}
}
