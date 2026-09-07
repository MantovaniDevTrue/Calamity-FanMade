import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';

export class StormlionMandible extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Materials/StormlionMandible';
        this.frameCount = 8;
        this.ticksPerFrame = 6;
        this.ResearchUnlockCount = 5;
    }

    SetDefaults() {
        this.Item.width = 36;
        this.Item.height = 38;
        this.Item.maxStack = ModItem.CommonMaxStack;
        this.Item.value = Terraria.Item.sellPrice(0, 0, 0, 40);
        this.Item.rare = Terraria.ID.ItemRarityID.Blue;
        this.Item.material = true;
    }
}
