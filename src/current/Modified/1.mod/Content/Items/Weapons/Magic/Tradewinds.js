import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class Tradewinds extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/Tradewinds';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 28;
        i.height = 30;
        i.damage = 23;
        i.magic = true;
        i.mana = 6;
        i.useAnimation = 15;
        i.useTime = 15;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 5;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.UseSound = Terraria.ID.SoundID.Item7;
        i.autoReuse = true;
        i.shoot = ModProjectile.getTypeByName('TradewindsProjectile');
        i.shootSpeed = 25;
        this.MenuCategories.push('magic');
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7)
            .AddTile(Terraria.ID.TileID.Bookcases)
            .Register();
    }
}
