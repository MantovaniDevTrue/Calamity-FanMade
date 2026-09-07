import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
export class VoidTorch extends ModItem{
 constructor(){super();this.Texture='Items/Placeables/Furniture/VoidTorch';this.ResearchUnlockCount=100;}
 SetDefaults(){this.CloneDefaults(Terraria.ID.ItemID.UltrabrightTorch);const i=this.Item;i.width=14;i.height=16;i.maxStack=9999;i.value=Terraria.Item.sellPrice(0,0,0,10);}
 HoldItem(item,player){try{Terraria.Lighting.AddLight(Terraria.PlayerCenter(player),0.5,0.5,2.0);}catch(e){}}
 PostUpdate(item){try{Terraria.Lighting.AddLight(Math.floor((Number(item.position.X)+7)/16),Math.floor((Number(item.position.Y)+8)/16),0.5,0.5,2.0);}catch(e){}}

 AddRecipes(){this.CreateRecipe(3).AddIngredient(8,3).AddIngredient(ModItem.getTypeByName('Voidstone'),1).Register();}
}
