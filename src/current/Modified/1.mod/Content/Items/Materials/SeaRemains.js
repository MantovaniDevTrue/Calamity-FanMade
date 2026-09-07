import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class SeaRemains extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Materials/SeaRemains';
        this.ResearchUnlockCount = 25;
        this.MenuCategories.push('material');
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.SortingPriorityMaterials[this.Type] = 60;
        } catch (e) { }
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 30;
        item.height = 24;
        item.maxStack = ModItem.CommonMaxStack;
        item.material = true;
        item.value = Terraria.Item.sellPrice(0, 0, 36, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('PearlShard'), 2)
            .AddIngredient(275, 2)
            .AddIngredient(2626, 2)
            .AddIngredient(2625, 2)
            .AddTile(17)
            .Register();
    }
}
