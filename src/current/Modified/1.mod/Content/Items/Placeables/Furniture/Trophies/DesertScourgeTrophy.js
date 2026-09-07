import { Terraria } from './../../../../../TL/ModImports.js';
import { ModItem } from './../../../../../TL/ModItem.js';
import { ModSystem } from './../../../../../TL/ModSystem.js';

export class DesertScourgeTrophy extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Furniture/Trophies/DesertScourgeTrophy';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const nativeTrophyItem = Number(Terraria.ID.ItemID.KingSlimeTrophy || 0);
        if (nativeTrophyItem > 0)
            this.CloneDefaults(nativeTrophyItem);
        else
            this.DefaultToPlaceableTile(240, 0);
        this.Item.width = 30;
        this.Item.height = 30;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.value = Terraria.Item.sellPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Blue;
        this.Item.consumable = true;
    }

    CanUseItem(item, player) {
        const system = ModSystem.getByName('DesertScourgeTrophySystem');
        if (system)
            system.MarkPending(player);
        return true;
    }
}
