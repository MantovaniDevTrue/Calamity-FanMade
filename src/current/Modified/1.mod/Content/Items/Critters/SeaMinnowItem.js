import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModNPC } from './../../../TL/ModNPC.js';

export class SeaMinnowItem extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Critters/SeaMinnowItem';
        this.ResearchUnlockCount = 5;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 30;
        item.height = 26;
        item.maxStack = 999;
        item.consumable = true;
        item.useStyle = 1;
        item.useTime = 15;
        item.useAnimation = 15;
        item.noUseGraphic = true;
        item.makeNPC = Number(ModNPC.getTypeByName('SeaMinnow') || 0);
        item.bait = 20;
        item.value = Terraria.Item.sellPrice(0, 0, 10, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        this.MenuCategories.push('material');
    }
}
