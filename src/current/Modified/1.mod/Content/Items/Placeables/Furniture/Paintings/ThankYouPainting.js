import { Terraria } from './../../../../../TL/ModImports.js';
import { ModItem } from './../../../../../TL/ModItem.js';
import { ModSystem } from './../../../../../TL/ModSystem.js';

export class ThankYouPainting extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Furniture/Paintings/ThankYouPainting';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.DefaultToPlaceableTile(242, 0);
        this.Item.width = 96;
        this.Item.height = 64;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.value = Terraria.Item.sellPrice(0, 0, 40, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Blue;
        this.Item.consumable = true;
    }

    CanUseItem(item, player) {
        const system = ModSystem.getByName('ThankYouPaintingSystem');
        if (system)
            system.MarkPending(player);
        return true;
    }
}
