import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class SeashineSword extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/SeashineSword';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.EnchantedSword);
        this.Item.width = 40;
        this.Item.height = 40;
        this.Item.damage = 25;
        this.Item.melee = true;
        this.Item.noMelee = false;
        this.Item.noUseGraphic = false;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        this.Item.useTime = 30;
        this.Item.useAnimation = 30;
        this.Item.knockBack = 4.0;
        this.Item.shootSpeed = 12.0;
        this.Item.shoot = ModProjectile.getTypeByName('SeashineSwordProj');
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        this.Item.UseSound = Terraria.ID.SoundID.Item1;
        this.Item.autoReuse = true;
        this.MenuCategories.push('melee');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('PearlShard'), 3)
            .AddIngredient(ModItem.getTypeByName('SeaPrism'), 7)
            .AddIngredient(ModItem.getTypeByName('Navystone'), 10)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
