import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class GiantPearl extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/GiantPearl';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 42;
        i.height = 32;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Green;
        i.accessory = true;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        const s = ModPlayer.getByName('CalamityPlayerState');
        if (!s || !s.IsLocalPlayer(player))
            return;
        s.GiantPearlEquipped = true;
        s.GiantPearlCenterX = Terraria.PlayerCenterX(player);
        s.GiantPearlCenterY = Terraria.PlayerCenterY(player);
        try {
            Terraria.Lighting.AddLight(Terraria.PlayerCenter(player), 0.18, 0.32, 0.32);
        } catch (e) { }
    }
}
