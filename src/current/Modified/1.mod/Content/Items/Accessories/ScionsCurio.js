import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class ScionsCurio extends ModItem {
    constructor() { super(); this.Texture = 'Items/Accessories/ScionsCurio'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const i = this.Item;
        i.width = 32; i.height = 38; i.rare = Terraria.ID.ItemRarityID.Blue;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0); i.accessory = true;
        this.MenuCategories.push('accessory');
    }
}
