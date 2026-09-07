import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class BloodyWormScarf extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/BloodyWormScarf';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 26;
        i.height = 42;
        i.defense = 2;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.accessory = true;
        i.expert = true;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player) {
        const s = ModPlayer.getByName('CalamityPlayerState');
        if (s && s.IsLocalPlayer(player))
            s.BloodyWormToothEquipped = true;
        player.endurance = Number(player.endurance || 0) + 0.10;
    }

    AddRecipes() {
        try {
            this.CreateRecipe().AddIngredient(ModItem.getTypeByName('BloodyWormTooth'), 1).AddIngredient(Terraria.ID.ItemID.WormScarf, 1).AddIngredient(Terraria.ID.ItemID.TissueSample, 3).AddTile(Terraria.ID.TileID.Anvils).Register();
        } catch (e) {
            tl.log(`[CalamityPort] Bloody Worm Scarf recipe failed: ${e}`);
        }
    }
}
