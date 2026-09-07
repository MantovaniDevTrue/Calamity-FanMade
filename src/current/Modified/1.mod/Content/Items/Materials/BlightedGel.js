import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class BlightedGel extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Materials/BlightedGel';
        this.ResearchUnlockCount = 25;
    }
    SetStaticDefaults() {
        try { Terraria.ID.ItemID.Sets.SortingPriorityMaterials[this.Type] = 70; } catch (e) { }
    }
    SetDefaults() {
        const i = this.Item;
        i.width = 16;
        i.height = 18;
        i.maxStack = ModItem.CommonMaxStack;
        i.value = Terraria.Item.sellPrice(0, 0, 0, 10);
        i.rare = Terraria.ID.ItemRarityID.Blue;
        i.material = true;
    }
}
