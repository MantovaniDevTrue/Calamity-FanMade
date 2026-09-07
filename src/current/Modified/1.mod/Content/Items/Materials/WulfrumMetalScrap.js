import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

const { Item } = Terraria;
const { ItemRarityID } = Terraria.ID;
export class WulfrumMetalScrap extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Materials/WulfrumMetalScrap';
        this.ResearchUnlockCount = 25;
    }

    SetDefaults() {
        this.Item.width = 13;
        this.Item.height = 10;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.value = Item.sellPrice(0, 0, 0, 10);
        this.Item.rare = ItemRarityID.Blue;
        this.Item.material = true;
        this.MenuCategories.push('material');
    }
}
