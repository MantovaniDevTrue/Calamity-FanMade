import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class PrismShard extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/SunkenSea/PrismShard';
        this.ResearchUnlockCount = 100;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 14;
        item.height = 18;
        item.maxStack = ModItem.CommonMaxStack;
        item.value = Terraria.Item.sellPrice(0, 0, 1, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.material = true;
        this.MenuCategories.push('material');
    }
}
