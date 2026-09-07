import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class DesertScourgeMask extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Armor/Vanity/DesertScourgeMask';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 28;
        this.Item.height = 20;
        this.Item.maxStack = 1;
        this.Item.value = Terraria.Item.sellPrice(0, 0, 75, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Blue;
        this.Item.vanity = true;
    }
}
