import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModSystem } from './../../../../TL/ModSystem.js';
export class CorruptionEffigy extends ModItem{
 constructor(){super();this.Texture='Items/Placeables/Furniture/CorruptionEffigy';this.ResearchUnlockCount=1;}
 SetDefaults(){this.CloneDefaults(Number(Terraria.ID.ItemID.KingSlimeMasterTrophy||4924));this.Item.createTile=617;this.Item.placeStyle=0;this.Item.useStyle=Terraria.ID.ItemUseStyleID.Swing;this.Item.useAnimation=15;this.Item.useTime=10;this.Item.useTurn=true;this.Item.autoReuse=true;this.Item.consumable=true;this.Item.maxStack=9999;this.Item.width=26;this.Item.height=32;this.Item.value=Terraria.Item.buyPrice(0,10,0,0);this.Item.rare=3;}
 CanUseItem(item,player){const s=ModSystem.getByName('EffigySystem');if(s)s.MarkPending(player,'corruption');return true;}
 AddRecipes(){const other=Number(ModItem.getTypeByName('CrimsonEffigy')||0);if(other>0)this.CreateRecipe().AddIngredient(other,1).AddTile(114).SetProperty('needGraveyardBiome',true).SetProperty('notDecraftable',true).Register();}
}
