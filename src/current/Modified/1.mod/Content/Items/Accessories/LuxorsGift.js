import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class LuxorsGift extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/LuxorsGift';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 66;
        item.height = 46;
        item.maxStack = 1;
        item.accessory = true;
        item.value = Terraria.Item.buyPrice(0, 15, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('LuxorPlayer');
        if (state)
            state.SetFunctional(player, item);
    }

    UpdateVanityAccessory(item, player) {
        const state = ModPlayer.getByName('LuxorPlayer');
        if (state)
            state.SetVanity(player, item);
    }
}
