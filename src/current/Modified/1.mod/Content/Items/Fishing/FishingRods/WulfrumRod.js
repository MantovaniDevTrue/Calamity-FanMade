import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class WulfrumRod extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Fishing/FishingRods/WulfrumRod';
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
        item.rare = Terraria.ID.ItemRarityID.Blue;
        item.fishingPole = 10;
        item.shootSpeed = 10;
        item.shoot = Terraria.ID.ProjectileID.BobberWooden;
        item.noMelee = true;
        item.value = Terraria.Item.buyPrice(0, 0, 50, 0);
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 5)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
