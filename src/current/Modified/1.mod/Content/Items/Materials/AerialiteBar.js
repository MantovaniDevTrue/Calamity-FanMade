import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class AerialiteBar extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Materials/AerialiteBar';
        this.ResearchUnlockCount = 25;
    }
    SetStaticDefaults() {
        try { Terraria.ID.ItemID.Sets.SortingPriorityMaterials[this.Type] = 69; } catch (e) { }
    }
    SetDefaults() {
        const item = this.Item;
        item.width = 30; item.height = 24; item.maxStack = ModItem.CommonMaxStack;
        item.value = Terraria.Item.sellPrice(0, 0, 30, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.material = true;
    }
    AddRecipes() {
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('AerialiteOre'), 4).AddTile(17).Register();
    }
}
