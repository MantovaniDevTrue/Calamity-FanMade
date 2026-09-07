import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { AbyssTerrainProxyTiles } from './../../../../Core/AbyssTerrainRuntime.js';

export class PyreMantleMolten extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Abyss/PyreMantleMolten';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        this.DefaultToPlaceableTile(AbyssTerrainProxyTiles.PyreMantleMolten, 0);
        const item = this.Item;
        item.width = 16;
        item.height = 16;
        item.value = 0;
        item.rare = Terraria.ID.ItemRarityID.White;
        item.material = true;
        this.MenuCategories.push('material');
    }

    AddRecipes() {
        this.CreateRecipe(25).AddIngredient(207, 1).AddIngredient(ModItem.getTypeByName('PyreMantle'), 25).AddTile(17).Register();
    }
}
