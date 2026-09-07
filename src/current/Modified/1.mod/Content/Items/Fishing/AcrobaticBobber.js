import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class AcrobaticBobber extends ModItem {
    constructor() {
        super();
        // Official item deliberately reuses the Heron Bobber projectile sprite.
        this.Texture = 'Projectiles/Typeless/HeronBobber';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 9;
        item.height = 9;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.accessory = true;
        this.MenuCategories.push('accessory');
    }

    UpdateAccessory(item, player, hideVisual) {
        // Official Fishing Bobber accessory flag (+10 fishing power on vanilla 1.4.4).
        try { player.accFishingBobber = true; } catch (e) { }
        const runtime = ModPlayer.getByName('AcrobaticFishingPlayer');
        if (runtime) runtime.Enable(player);
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(5139, 1) // Fishing Bobber
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 5)
            .AddIngredient(320, 1) // Feather
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
