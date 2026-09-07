import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

export class WulfrumDiggingTurtle extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Tools/WulfrumDiggingTurtle';
        this.ResearchUnlockCount = 10;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 30;
        item.height = 38;
        item.useAnimation = 8;
        item.useTime = 8;
        item.maxStack = ModItem.CommonMaxStack;
        item.consumable = true;
        item.shootSpeed = 20;
        item.shoot = ModProjectile.getTypeByName('WulfrumDiggingTurtleProjectile');
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.noMelee = true;
        item.noUseGraphic = true;
        item.UseSound = Terraria.ID.SoundID.Item1;
        item.value = Terraria.Item.sellPrice(0, 0, 2, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
    }

    AddRecipes() {
        this.CreateRecipe(15)
            .AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 3)
            .AddIngredient(ModItem.getTypeByName('EnergyCore'), 1)
            .Register();
    }
}
