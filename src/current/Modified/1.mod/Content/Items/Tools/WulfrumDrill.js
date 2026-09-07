import { Terraria } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

export class WulfrumDrill extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Tools/WulfrumDrill';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.CobaltDrill);
        const item = this.Item;
        item.width = 46;
        item.height = 38;
        item.damage = 5;
        item.melee = true;
        item.armorPenetration = 15;
        item.pick = 35;
        item.tileBoost = 1;
        item.useAnimation = 16;
        item.useTime = 5;
        item.knockBack = 0.5;
        item.shoot = ModProjectile.getTypeByName('WulfrumDrillProj');
        item.UseSound = Terraria.ID.SoundID.Item23;
        item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        item.autoReuse = true;
        item.channel = true;
        item.noMelee = true;
        item.noUseGraphic = true;
        item.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
        this.MenuCategories.push('pick');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 5)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
