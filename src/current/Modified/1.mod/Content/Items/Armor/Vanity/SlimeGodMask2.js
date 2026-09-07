import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class SlimeGodMask2 extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Vanity/SlimeGodMask2';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 28;
        i.height = 20;
        i.rare = Terraria.ID.ItemRarityID.Blue;
        i.value = Terraria.Item.sellPrice(0, 0, 75, 0);
        i.vanity = true;
    }
}
