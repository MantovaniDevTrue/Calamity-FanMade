import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

const { Item } = Terraria;
const { ItemRarityID } = Terraria.ID;
export class EnergyCore extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Materials/EnergyCore';
        this.ResearchUnlockCount = 5;
    }

    SetDefaults() {
        this.Item.width = 22;
        this.Item.height = 22;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.value = Item.sellPrice(0, 0, 0, 40);
        this.Item.rare = ItemRarityID.Blue;
        this.Item.material = true;
        this.MenuCategories.push('material');
    }
}
