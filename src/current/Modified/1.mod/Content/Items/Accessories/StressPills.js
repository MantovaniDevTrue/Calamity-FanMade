import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class StressPills extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/StressPills';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 26;
        this.Item.height = 26;
        this.Item.maxStack = 1;
        this.Item.accessory = true;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.IsLocalPlayer(player))
            state.StressPillsEquipped = true;
    }
}
