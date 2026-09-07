import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import {

    SunkenSeaMaterialRuntime,
    SunkenSeaMaterialKinds,
    SunkenSeaAnchorTiles
} from './../../../../Core/SunkenSeaMaterialRuntime.js';
export class Navystone extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/SunkenSea/Navystone';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        this.DefaultToPlaceableTile(SunkenSeaAnchorTiles.navystone, 0);
        const item = this.Item;
        item.width = 16;
        item.height = 18;
        item.value = 0;
        item.rare = Terraria.ID.ItemRarityID.White;
        item.material = true;
        this.MenuCategories.push('material');
    }

    CanUseItem(item, player) {
        SunkenSeaMaterialRuntime.MarkPending(player, SunkenSeaMaterialKinds.Navystone);
        return true;
    }
}
