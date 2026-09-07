import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function rotate(v, a, m = 1) {
    const c = Math.cos(a), s = Math.sin(a);
    return Vector2.new((Number(v.X) * c - Number(v.Y) * s) * m, (Number(v.X) * s + Number(v.Y) * c) * m);
}

export class OverloadedBlaster extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/OverloadedBlaster';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 42;
        i.height = 34;
        i.damage = 19;
        i.ranged = true;
        i.useAnimation = 28;
        i.useTime = 28;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 1.5;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.UseSound = Terraria.ID.SoundID.Item9;
        i.autoReuse = true;
        i.shootSpeed = 5;
        i.shoot = ModProjectile.getTypeByName('SlimeBolt');
        i.useAmmo = Terraria.ID.AmmoID.Gel;
        this.MenuCategories.push('ranged');
    }

    HoldoutOffset() {
        return { X: -4, Y: -5 };
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const p = Number(ModProjectile.getTypeByName('SlimeBolt') || 0);
        if (!(p > 0))
            return false;
        const source = player.GetProjectileSource_Item(item), spawn = Vector2.new(Number(position.X) + Number(velocity.X) * 6, Number(position.Y) + Number(velocity.Y) * 6);
        for (let k = 0; k < 3; k++) {
            const a = (Math.random() - 0.5) * (26 * Math.PI / 180), m = 0.8 + Math.random() * 0.4;
            NewProjectile(source, spawn, rotate(velocity, a, m), p, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        }
        return false;
    }
}
