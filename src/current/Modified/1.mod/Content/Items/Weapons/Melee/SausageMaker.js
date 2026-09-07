import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { CanUseSausageMaker } from './../../../../Core/SausageMakerRuntime.js';

export class SausageMaker extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/SausageMaker';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() { /* ItemID.Sets.Spears is absent on TLPro mobile; projectile runtime supplies spear behavior. */ }

    SetDefaults() {
        const i = this.Item;
        i.width = 44;
        i.height = 42;
        i.damage = 32;
        i.melee = true;
        i.noMelee = true;
        i.useTurn = true;
        i.noUseGraphic = true;
        i.useAnimation = 20;
        i.useTime = 20;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.knockBack = 6.25;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('SausageMakerSpear');
        i.shootSpeed = 6;
        this.MenuCategories.push('melee');
    }

    CanUseItem(item, player) {
        return CanUseSausageMaker(player, Number(item.shoot));
    }
}
