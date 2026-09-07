import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
export class KelpTorch extends ModItem {
    constructor(){super();this.Texture='Items/Placeables/Furniture/KelpTorch';this.ResearchUnlockCount=100;}
    SetDefaults(){
        const base=Number(Terraria.ID.ItemID.CoralTorch||Terraria.ID.ItemID.Torch||8);
        this.CloneDefaults(base);
        const i=this.Item;i.width=14;i.height=18;i.maxStack=9999;i.value=Terraria.Item.sellPrice(0,0,0,10);
        this.MenuCategories.push('placeable');
    }
    HoldItem(item,player){try{Terraria.Lighting.AddLight(Terraria.PlayerCenter(player),1.5,1.35,0.3);}catch(_){} }

    AddRecipes(){this.CreateRecipe(3).AddIngredient(8,3).AddIngredient(ModItem.getTypeByName('PlantyMush'),1).Register();}
}
