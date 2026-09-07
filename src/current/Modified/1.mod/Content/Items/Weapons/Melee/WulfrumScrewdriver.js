import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class WulfrumScrewdriver extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/WulfrumScrewdriver';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 14;
        i.height = 50;
        i.damage = 12;
        i.melee = true;
        i.useAnimation = 24;
        i.useTime = 24;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.knockBack = 3.75;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        i.rare = Terraria.ID.ItemRarityID.Blue;
        i.noMelee = true;
        i.noUseGraphic = true;
        i.shoot = ModProjectile.getTypeByName('WulfrumScrewdriverProj');
        i.shootSpeed = 3;
        this.MenuCategories.push('melee');
    }

    AddRecipes() {
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 10).AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
