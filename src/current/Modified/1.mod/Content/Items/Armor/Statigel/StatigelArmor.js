import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { AddGenericCrit } from './../../../../Core/StatigelRuntime.js';

export class StatigelArmor extends ModItem {
    constructor(){ super(); this.Texture='Items/Armor/Statigel/StatigelArmor'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=18; i.height=18; i.maxStack=1; i.value=Terraria.Item.buyPrice(0,10,0,0); i.rare=Terraria.ID.ItemRarityID.LightRed; i.defense=10; }
    UpdateEquip(item,player){ AddGenericCrit(player,5); }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),12).AddIngredient(ModItem.getTypeByName('BlightedGel'),12).AddTile(220).Register();
    }
}
