import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';
import { FishboneActiveCount } from './../../../Projectiles/Rogue/PreHardmodeRogueBatch4Projectiles.js';
export class FishboneBoomerang extends ModItem{
 constructor(){super();this.Texture='Items/Weapons/Rogue/FishboneBoomerang';this.ResearchUnlockCount=1;}
 SetDefaults(){this.RoguePrefix=true;const i=this.Item;i.width=18;i.height=34;i.damage=27;i.noMelee=true;i.noUseGraphic=true;i.useAnimation=30;i.useTime=30;i.useStyle=Terraria.ID.ItemUseStyleID.Swing;i.knockBack=5.5;i.UseSound=Terraria.ID.SoundID.Item1;i.value=Terraria.Item.buyPrice(0,0,40,0);i.rare=Terraria.ID.ItemRarityID.Green;i.shoot=ModProjectile.getTypeByName('FishboneBoomerangProjectile');i.shootSpeed=3;i.autoReuse=true;this.MenuCategories.push('thrown');}
 CanUseItem(item,player){return FishboneActiveCount(Terraria.PlayerIndex(player))<3;}
 Shoot(item,player,position,velocity,type,damage,kb){const stealth=ConsumeStealthStrike(player,item),base=Number(damage)>0?Number(damage):Number(item.damage)||27,t=Number(ModProjectile.getTypeByName('FishboneBoomerangProjectile')||type||0);SpawnMarkedProjectile(player,item,position,velocity,t,base,kb,'FishboneBoomerang',stealth,false,0,0,0);return false;}
 AddRecipes(){const sea=ModItem.getTypeByName('SeaRemains');if(sea>0)this.CreateRecipe().AddIngredient(sea,2).AddTile(Terraria.ID.TileID.Anvils).Register();}
}