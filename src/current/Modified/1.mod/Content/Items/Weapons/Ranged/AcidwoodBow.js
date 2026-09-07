import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';

export class AcidwoodBow extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/AcidwoodBow';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.WoodenBow);
        this.Item.width = 20;
        this.Item.height = 50;
        this.Item.damage = 8;
        this.Item.ranged = true;
        this.Item.useTime = 27;
        this.Item.useAnimation = 27;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 0.0;
        this.Item.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.White;
        this.Item.UseSound = Terraria.ID.SoundID.Item5;
        this.Item.autoReuse = true;
        this.Item.shoot = Terraria.ID.ProjectileID.WoodenArrowFriendly;
        this.Item.shootSpeed = 6.6;
        this.Item.useAmmo = Terraria.ID.AmmoID.Arrow;
        this.MenuCategories.push('ranged');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('Acidwood'), 10)
            .AddTile(Terraria.ID.TileID.WorkBenches)
            .Register();
    }
}
