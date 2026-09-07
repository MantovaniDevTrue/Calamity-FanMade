import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

const { Item } = Terraria;
const { ItemRarityID } = Terraria.ID;
export class PearlShard extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Materials/PearlShard';
        this.ResearchUnlockCount = 25;
    }

    SetDefaults() {
        this.Item.width = 20;
        this.Item.height = 26;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.value = Item.sellPrice(0, 0, 1, 0);
        this.Item.rare = ItemRarityID.Green;
        this.Item.material = true;
        this.MenuCategories.push('material');
    }
}
