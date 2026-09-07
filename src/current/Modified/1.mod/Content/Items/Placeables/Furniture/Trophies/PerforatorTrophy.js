import { Terraria } from './../../../../../TL/ModImports.js';
import { ModItem } from './../../../../../TL/ModItem.js';
import { ModSystem } from './../../../../../TL/ModSystem.js';

export class PerforatorTrophy extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Placeables/Furniture/Trophies/PerforatorTrophy';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const t = Number(Terraria.ID.ItemID.KingSlimeTrophy || 0);
        if (t > 0)
            this.CloneDefaults(t);
        else
            this.DefaultToPlaceableTile(240, 0);
        const i = this.Item;
        i.width = 30;
        i.height = 30;
        i.maxStack = ModItem.CommonMaxStack;
        i.value = Terraria.Item.sellPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Blue;
        i.consumable = true;
    }

    CanUseItem(item, player) {
        const s = ModSystem.getByName('PerforatorTrophySystem');
        if (s)
            s.MarkPending(player);
        return true;
    }
}
