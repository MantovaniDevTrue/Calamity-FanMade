import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class BloodstainedGlove extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/BloodstainedGlove';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 26;
        i.height = 36;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.accessory = true;
        i.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player) {
        const s = ModPlayer.getByName('CalamityPlayerState');
        if (s && s.IsLocalPlayer(player))
            s.BloodstainedGloveEquipped = true;
    }
}
