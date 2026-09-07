import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function rotate(v, radians) {
    const x = Number(v.X) || 0, y = Number(v.Y) || 0;
    const c = Math.cos(radians), s = Math.sin(radians);
    return Vector2.new(x * c - y * s, x * s + y * c);
}

export class Galeforce extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/Galeforce';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 32;
        i.height = 52;
        i.damage = 13;
        i.ranged = true;
        i.useTime = 20;
        i.useAnimation = 20;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 3;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.UseSound = Terraria.ID.SoundID.Item5;
        i.autoReuse = true;
        i.shoot = Terraria.ID.ProjectileID.WoodenArrowFriendly;
        i.shootSpeed = 20;
        i.useAmmo = Terraria.ID.AmmoID.Arrow;
        this.MenuCategories.push('ranged');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const feather = Number(ModProjectile.getTypeByName('FeatherLarge') || 0);
        if (feather > 0) {
            let source = null;
            try { source = player.GetProjectileSource_Item(item); } catch (e) { }
            const owner = Terraria.PlayerIndex(player);
            for (let deg = -8; deg <= 8; deg += 8) {
                NewProjectile(source, position, rotate(velocity, deg * Math.PI / 180), feather, Math.max(1, Math.floor(Number(damage) / 4)), 0, owner, 0, 0, 0, null);
            }
        }
        // Preserve the ammo projectile in addition to the three low-damage feathers.
        return true;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
