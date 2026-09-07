import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class HeronRod extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Fishing/FishingRods/HeronRod';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.WoodFishingPole);
        const item = this.Item;
        item.width = 24;
        item.height = 28;
        item.useAnimation = 8;
        item.useTime = 8;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.UseSound = Terraria.ID.SoundID.Item1;
        item.fishingPole = 25;
        item.shootSpeed = 14.5;
        item.shoot = ModProjectile.getTypeByName('HeronBobber');
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.noMelee = true;
        this.MenuCategories.push('fishingPole');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
