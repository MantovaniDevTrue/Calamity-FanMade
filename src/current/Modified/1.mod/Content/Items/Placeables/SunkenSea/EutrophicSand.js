import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import {

    SunkenSeaMaterialRuntime,
    SunkenSeaMaterialKinds,
    SunkenSeaAnchorTiles
} from './../../../../Core/SunkenSeaMaterialRuntime.js';
export class EutrophicSand extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/SunkenSea/EutrophicSand';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        this.DefaultToPlaceableTile(SunkenSeaAnchorTiles.eutrophic, 0);
        const item = this.Item;
        item.width = 12;
        item.height = 12;
        item.value = 0;
        item.rare = Terraria.ID.ItemRarityID.White;
        item.material = true;
        this.MenuCategories.push('material');
    }

    CanUseItem(item, player) {
        SunkenSeaMaterialRuntime.MarkPending(player, SunkenSeaMaterialKinds.Eutrophic);
        return true;
    }
}
