import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class SkylineWings extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Accessories/Wings/SkylineWings';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 22;
        item.height = 20;
        item.maxStack = 1;
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.accessory = true;
        this.MenuCategories.push('accessory', 'wings');
    }

    SetStaticDefaults() {
        this.SetWingStats(80, 6.25, 1);
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 10)
            .AddIngredient(Number(Terraria.ID.ItemID.Feather || 320), 5)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
