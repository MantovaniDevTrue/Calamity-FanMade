import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class LoreSlimeGod extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/LoreItems/LoreSlimeGod';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 20;
        i.height = 20;
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.consumable = false;
        i.maxStack = 1;
    }

    AddRecipes() {
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('SlimeGodTrophy'), 1).AddTile(101).Register();
    }
}
