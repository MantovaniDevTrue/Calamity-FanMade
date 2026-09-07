import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

const { Item } = Terraria;
const { ItemRarityID } = Terraria.ID;
export class WulfrumBattery extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/WulfrumBattery';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 20;
        this.Item.height = 22;
        this.Item.maxStack = 1;
        this.Item.accessory = true;
        this.Item.value = Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = ItemRarityID.Blue;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        player.minionDamage += 0.07;
    }
}
