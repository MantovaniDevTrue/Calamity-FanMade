import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

export class Eviscerator extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/Eviscerator';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 58;
        i.height = 22;
        i.damage = 60;
        i.ranged = true;
        i.crit = 25;
        i.useTime = 60;
        i.useAnimation = 60;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 7.5;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.UseSound = Terraria.ID.SoundID.Item40;
        i.autoReuse = true;
        i.shoot = ModProjectile.getTypeByName('BloodClotFriendly');
        i.shootSpeed = 22;
        i.useAmmo = Terraria.ID.AmmoID.Bullet;
        this.MenuCategories.push('ranged');
    }

    HoldoutOffset() {
        return { X: -7, Y: 0 };
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const bullet = Number(Terraria.ID.ProjectileID.Bullet || 14), chosen = Number(type) === bullet ? Number(ModProjectile.getTypeByName('BloodClotFriendly') || 0) : Number(type);
        if (!(chosen > 0))
            return false;
        const source = player.GetProjectileSource_Item(item);
        Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'](source, position, velocity, chosen, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        return false;
    }
}
