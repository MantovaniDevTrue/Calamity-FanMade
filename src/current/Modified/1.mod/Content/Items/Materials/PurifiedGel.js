import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class PurifiedGel extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Materials/PurifiedGel';
        this.ResearchUnlockCount = 25;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.SortingPriorityMaterials[this.Type] = 71;
        } catch (e) { }
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 20;
        i.height = 36;
        i.maxStack = ModItem.CommonMaxStack;
        i.value = Terraria.Item.sellPrice(0, 0, 5, 0);
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.material = true;
    }
}
