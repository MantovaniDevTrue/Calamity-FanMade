import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import {

    SulphurousSeaMaterialRuntime,
    SulphurousSeaMaterialKinds
} from './../../../../Core/SulphurousSeaMaterialRuntime.js';
import { SulphurousSeaAnchorTiles } from './../../../../Core/SulphurousSeaTerrainRuntime.js';
export class HardenedSulphurousSandstone extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/SulphurousSea/HardenedSulphurousSandstone';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        this.DefaultToPlaceableTile(SulphurousSeaAnchorTiles.hardened, 0);
        const item = this.Item;
        item.width = 12;
        item.height = 12;
        item.value = 0;
        item.rare = Terraria.ID.ItemRarityID.White;
        item.material = true;
        this.MenuCategories.push('material');
    }

    CanUseItem(item, player) {
        SulphurousSeaMaterialRuntime.MarkPending(player, SulphurousSeaMaterialKinds.Hardened);
        return true;
    }
}
