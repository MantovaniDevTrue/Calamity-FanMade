import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class ManaPolarizer extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/ManaPolarizer';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 30;
        i.height = 30;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.accessory = true;
        i.expert = true;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        player.statManaMax2 = Number(player.statManaMax2) + 40;
        const s = ModPlayer.getByName('CalamityPlayerState');
        if (s && s.IsLocalPlayer(player))
            s.ManaPolarizerEquipped = true;
    }
}
