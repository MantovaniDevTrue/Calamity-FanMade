import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { AbyssTerrainProxyTiles } from './../../../../Core/AbyssTerrainRuntime.js';

export class ScoriaOre extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Ores/ScoriaOre';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        this.DefaultToPlaceableTile(AbyssTerrainProxyTiles.ScoriaOre, 0);
        const item = this.Item;
        item.width = 20;
        item.height = 22;
        item.value = Terraria.Item.sellPrice(0, 0, 25, 0);
        item.rare = Terraria.ID.ItemRarityID.Yellow;
        item.material = true;
        this.MenuCategories.push('material');
    }
}
