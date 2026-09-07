import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class LoreHiveMind extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/LoreItems/LoreHiveMind';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 20;
        this.Item.height = 20;
        this.Item.maxStack = 1;
        this.Item.value = 0;
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.Item.consumable = false;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('HiveMindTrophy'), 1)
            .AddTile(Terraria.ID.TileID.Bookcases)
            .Register();
    }
}
