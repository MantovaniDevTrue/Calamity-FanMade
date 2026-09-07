import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { CountOwned } from './../../../../Core/PerforatorRewardRuntime.js';

export class AmidiasTrident extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/AmidiasTrident';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() { /* ItemID.Sets.Spears is absent on TLPro mobile; projectile runtime supplies spear behavior. */ }

    SetDefaults() {
        const item = this.Item;
        item.width = 44;
        item.height = 44;
        item.damage = 12;
        item.melee = true;
        item.noMelee = true;
        item.useTurn = true;
        item.noUseGraphic = true;
        item.useAnimation = 17;
        item.useTime = 17;
        item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        item.knockBack = 4.5;
        item.UseSound = Terraria.ID.SoundID.Item1;
        item.autoReuse = true;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.shoot = ModProjectile.getTypeByName('AmidiasTridentProj');
        item.shootSpeed = 6;
        this.MenuCategories.push('melee');
    }

    CanUseItem(item, player) {
        return CountOwned(player, Number(item.shoot)) <= 0;
    }
}
