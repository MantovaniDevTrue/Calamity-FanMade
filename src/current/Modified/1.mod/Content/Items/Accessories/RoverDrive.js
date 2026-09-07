import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class RoverDrive extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/RoverDrive';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 34;
        item.height = 30;
        item.maxStack = 1;
        item.accessory = true;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const state = ModPlayer.getByName('RoverDrivePlayer');
        if (state)
            state.SetEquipped(player, hideVisual !== true);
    }
}
