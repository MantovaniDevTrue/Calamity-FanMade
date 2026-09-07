import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
export class SmoothVoidstone extends ModItem{
 constructor(){super();this.Texture='Items/Placeables/FurnitureVoid/SmoothVoidstone';this.ResearchUnlockCount=100;}
 SetDefaults(){this.DefaultToPlaceableTile(1,0);this.Item.width=16;this.Item.height=16;this.Item.maxStack=9999;this.Item.value=Terraria.Item.sellPrice(0,0,0,5);}

 AddRecipes(){this.CreateRecipe().AddIngredient(ModItem.getTypeByName('Voidstone'),1).AddTile(18).Register();}
}
