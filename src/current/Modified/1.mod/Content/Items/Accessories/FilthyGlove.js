import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class FilthyGlove extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/FilthyGlove';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 24;
        this.Item.height = 38;
        this.Item.maxStack = 1;
        this.Item.accessory = true;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.FilthyGloveEquipped = true;
    }
}
