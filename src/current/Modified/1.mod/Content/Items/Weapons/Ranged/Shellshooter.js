import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class Shellshooter extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/Shellshooter';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        try {
            this.CloneDefaults(Terraria.ID.ItemID.WoodenBow);
        } catch (e) { }
        const item = this.Item;
        item.width = 30;
        item.height = 38;
        item.damage = 40;
        item.ranged = true;
        item.crit = 15;
        item.useTime = 70;
        item.useAnimation = 70;
        item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        item.noMelee = true;
        item.knockBack = 6;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.UseSound = Terraria.ID.SoundID.Item5;
        item.autoReuse = true;
        item.shoot = Terraria.ID.ProjectileID.WoodenArrowFriendly;
        item.shootSpeed = 2.5;
        item.useAmmo = Terraria.ID.AmmoID.Arrow;
        this.MenuCategories.push('ranged');
    }

    ModifyShootStats(item, player, stats) {
        const wooden = Number(Terraria.ID.ProjectileID.WoodenArrowFriendly);
        if (Number(stats.type) === wooden) {
            const shell = Number(ModProjectile.getTypeByName('Shell') || 0);
            if (shell > 0)
                stats.type = shell;
        }
    }
}
