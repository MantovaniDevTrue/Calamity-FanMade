import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import {

    SunkenSeaMaterialRuntime,
    SunkenSeaMaterialKinds,
    SunkenSeaAnchorTiles
} from './../../../../Core/SunkenSeaMaterialRuntime.js';
export class SeaPrism extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/SunkenSea/SeaPrism';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        this.DefaultToPlaceableTile(SunkenSeaAnchorTiles.seaprism, 0);
        const item = this.Item;
        item.width = 18;
        item.height = 20;
        item.value = Terraria.Item.sellPrice(0, 0, 5, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.material = true;
        this.MenuCategories.push('material');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('PrismShard'), 5)
            .AddTile(16)
            .Register();
    }

    CanUseItem(item, player) {
        SunkenSeaMaterialRuntime.MarkPending(player, SunkenSeaMaterialKinds.SeaPrism);
        return true;
    }
}
