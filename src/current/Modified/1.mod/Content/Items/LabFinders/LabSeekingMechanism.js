import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
export class LabSeekingMechanism extends ModItem{
 constructor(){super();this.Texture='Items/LabFinders/LabSeekingMechanism';this.ResearchUnlockCount=5;}
 SetDefaults(){const i=this.Item;i.width=24;i.height=26;i.value=Terraria.Item.sellPrice(0,0,50,0);i.rare=Terraria.ID.ItemRarityID.Orange;}
 AddRecipes(){const d=Number(ModItem.getTypeByName('DubiousPlating')||0),c=Number(ModItem.getTypeByName('MysteriousCircuitry')||0);if(d<=0||c<=0)return;for(const bar of [22,704])this.CreateRecipe().AddIngredient(c,4).AddIngredient(d,4).AddIngredient(bar,10).AddTile(16).Register();}
}
