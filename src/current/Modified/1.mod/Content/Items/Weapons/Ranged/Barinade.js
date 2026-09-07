import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Rand, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class Barinade extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/Barinade';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 52;
        this.Item.height = 80;
        this.Item.damage = 5;
        this.Item.ranged = true;
        this.Item.useTime = 24;
        this.Item.useAnimation = 24;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 2.2;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.UseSound = Terraria.ID.SoundID.Item5;
        this.Item.autoReuse = true;
        this.Item.shoot = ModProjectile.getTypeByName('BarinadeArrow');
        this.Item.shootSpeed = 15;
        this.Item.useAmmo = Terraria.ID.AmmoID.Arrow;
        this.MenuCategories.push('ranged');
    }

    HoldoutOffset(item, player) {
        return { X: 0, Y: 4 };
    }

    PickAmmo(player, ammoId) {
        const inventory = player.inventory;
        let ammo = null;
        for (let i = 54; i < 58; i++) {
            const candidate = inventory[i];
            if (candidate && candidate.ammo === ammoId && candidate.stack > 0) {
                ammo = candidate;
                break;
            }
        }
        if (!ammo) {
            for (let i = 0; i < 54; i++) {
                const candidate = inventory[i];
                if (candidate && candidate.ammo === ammoId && candidate.stack > 0) {
                    ammo = candidate;
                    break;
                }
            }
        }
        return ammo;
    }

    CanConsumeAmmo(player, ammoId) {
        if (player.magicQuiver && (ammoId === Terraria.ID.AmmoID.Arrow || ammoId === Terraria.ID.AmmoID.Stake) && Rand.NextInt(0, 5) === 0)
            return false;
        if (player.ammoBox && Rand.NextInt(0, 5) === 0)
            return false;
        if (player.ammoPotion && Rand.NextInt(0, 5) === 0)
            return false;
        if (player.chloroAmmoCost80 && Rand.NextInt(0, 5) === 0)
            return false;
        if (player.ammoCost80 && Rand.NextInt(0, 5) === 0)
            return false;
        if (player.ammoCost75 && Rand.NextInt(0, 4) === 0)
            return false;
        return true;
    }

    ConsumeSelectedAmmo(player, ammo, ammoId) {
        if (!ammo || !ammo.consumable || !this.CanConsumeAmmo(player, ammoId))
            return;
        ammo.stack--;
        if (ammo.stack <= 0)
            ammo.TurnToAir(true);
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const ammo = this.PickAmmo(player, item.useAmmo);
        if (!ammo)
            return false;
        const projectileType = ModProjectile.getTypeByName('BarinadeArrow');
        if (!(projectileType > 0))
            return false;
        const originalSpeed = Math.sqrt(Number(velocity.X) * Number(velocity.X) + Number(velocity.Y) * Number(velocity.Y));
        const direction = originalSpeed > 0.001 ? Vector2.Normalize(velocity) : Vector2.new(Terraria.PlayerDirection(player) || 1, 0);
        const ammoSpeed = Math.max(0, Number(ammo.shootSpeed) || 0);
        const fullVelocity = Vector2.Multiply(direction, originalSpeed + ammoSpeed);
        const rangedMultiplier = Math.max(0, Number(player.rangedDamage) || 1);
        const shotDamage = Math.max(1, Math.floor(Number(damage) + (Number(ammo.damage) || 0) * rangedMultiplier));
        const shotKnockback = Number(knockBack) + (Number(ammo.knockBack) || 0);
        Terraria.SetPlayerDirection(player, (position.X + fullVelocity.X) < Terraria.PlayerCenterX(player) ? -1 : 1);
        const leftPosition = Vector2.Add(position, Vector2.RotatedBy(fullVelocity, -0.95));
        const rightPosition = Vector2.Add(position, Vector2.RotatedBy(fullVelocity, 0.95));
        const leftVelocity = Vector2.RotatedBy(fullVelocity, 0.025);
        const rightVelocity = Vector2.RotatedBy(fullVelocity, -0.025);
        const source = player.GetProjectileSource_Item(item);
        NewProjectile(source, leftPosition, leftVelocity, projectileType, shotDamage, shotKnockback, Terraria.PlayerIndex(player), 0, 0, 0, null);
        NewProjectile(source, rightPosition, rightVelocity, projectileType, shotDamage, shotKnockback, Terraria.PlayerIndex(player), 0, 0, 0, null);
        this.ConsumeSelectedAmmo(player, ammo, item.useAmmo);
        return false;
    }
}
