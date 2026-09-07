import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { CountOwned } from './../../../../Core/PerforatorRewardRuntime.js';

export class GoldplumeSpear extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/GoldplumeSpear';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() { /* ItemID.Sets.Spears is absent on TLPro mobile; projectile runtime supplies spear behavior. */ }

    SetDefaults() {
        const i = this.Item;
        i.width = 54;
        i.height = 54;
        i.damage = 31;
        i.melee = true;
        i.noMelee = true;
        i.useTurn = true;
        i.noUseGraphic = true;
        i.useAnimation = 25;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.useTime = 25;
        i.knockBack = 5.75;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('GoldplumeSpearProjectile');
        i.shootSpeed = 8;
        this.MenuCategories.push('melee');
    }

    CanUseItem(item, player) {
        return CountOwned(player, Number(item.shoot)) <= 0;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
