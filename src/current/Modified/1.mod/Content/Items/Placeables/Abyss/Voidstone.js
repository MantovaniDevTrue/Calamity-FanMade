import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { AbyssTerrainProxyTiles } from './../../../../Core/AbyssTerrainRuntime.js';

export class Voidstone extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Abyss/Voidstone';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        this.DefaultToPlaceableTile(AbyssTerrainProxyTiles.Voidstone, 0);
        const item = this.Item;
        item.width = 16;
        item.height = 16;
        item.value = 0;
        item.rare = Terraria.ID.ItemRarityID.White;
        item.material = true;
        this.MenuCategories.push('material');
    }
}
