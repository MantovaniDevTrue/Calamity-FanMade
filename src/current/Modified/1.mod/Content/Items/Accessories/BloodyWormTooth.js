import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class BloodyWormTooth extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/BloodyWormTooth';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 12;
        i.height = 15;
        i.defense = 2;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.accessory = true;
        i.expert = true;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player) {
        const s = ModPlayer.getByName('CalamityPlayerState');
        if (s && s.IsLocalPlayer(player))
            s.BloodyWormToothEquipped = true;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('RottenBrain'), 1)
            .AddTile(Terraria.ID.TileID.TinkerersWorkbench)
            .SetProperty('needGraveyardBiome', true)
            .SetProperty('notDecraftable', true)
            .Register();
    }
}
