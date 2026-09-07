import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { WorldDB } from './../../../TL/WorldDB.js';

export class GladiatorsLocket extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/GladiatorsLocket';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 48;
        item.height = 54;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 25, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.accessory = true;
        this.MenuCategories.push('accessory');
    }

    UpdateInventory(item, player) {
        try {
            if (Terraria.Main.netMode !== 1 && WorldDB.Instance && WorldDB.get('calamity:unlock:gladiatorsLocket') !== true)
                WorldDB.set('calamity:unlock:gladiatorsLocket', true);
        } catch (e) { }
    }

    UpdateAccessory(item, player, vanity, hideVisual) {
        const controller = ModPlayer.getByName('GraniteShrineAccessoryPlayer');
        if (controller)
            controller.EnableGladiatorLocket(player);
    }
}
