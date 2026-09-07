import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { AddGenericDamage } from './../../../../Core/StatigelRuntime.js';

export class StatigelGreaves extends ModItem {
    constructor(){ super(); this.Texture='Items/Armor/Statigel/StatigelGreaves'; this.ResearchUnlockCount=1; }
    SetDefaults(){ const i=this.Item; i.width=18; i.height=18; i.maxStack=1; i.value=Terraria.Item.buyPrice(0,10,0,0); i.rare=Terraria.ID.ItemRarityID.LightRed; i.defense=8; }
    UpdateEquip(item,player){ AddGenericDamage(player,0.05); player.moveSpeed=Number(player.moveSpeed||0)+0.05; }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),7).AddIngredient(ModItem.getTypeByName('BlightedGel'),7).AddTile(220).Register();
    }
}
