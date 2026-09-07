import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class RustyChest extends ModItem {
    constructor() { super(); this.Texture = 'Items/Placeables/Furniture/RustyChest'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const i = this.Item;
        i.width = 26; i.height = 22; i.maxStack = ModItem.CommonMaxStack;
        i.consumable = true; i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.useAnimation = 15; i.useTime = 10; i.useTurn = true; i.autoReuse = true;
        i.value = Terraria.Item.sellPrice(0, 0, 10, 0);
    }

    AddRecipes() {
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('HardenedSulphurousSandstone'), 8).AddRecipeGroup('IronBar', 2).AddTile(16).Register();
    }
}
