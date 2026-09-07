import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Rand, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class Fungicide extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/Fungicide';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 40;
        this.Item.height = 26;
        this.Item.damage = 19;
        this.Item.ranged = true;
        this.Item.useTime = 22;
        this.Item.useAnimation = 22;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 2.5;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.UseSound = Terraria.ID.SoundID.Item61;
        this.Item.autoReuse = true;
        this.Item.shoot = ModProjectile.getTypeByName('FungiOrb');
        this.Item.shootSpeed = 14;
        this.Item.useAmmo = Terraria.ID.AmmoID.Bullet;
        this.MenuCategories.push('ranged');
    }

    HoldoutOffset() {
        return { X: -5, Y: 0 };
    }

    PickAmmo(player, ammoId) {
        const inventory = player.inventory;
        let ammo = null;
        for (let i = 54; i < 58; i++) {
            const candidate = inventory[i];
            if (candidate && Number(candidate.ammo) === Number(ammoId) && Number(candidate.stack) > 0) {
                ammo = candidate;
                break;
            }
        }
        if (!ammo) {
            for (let i = 0; i < 54; i++) {
                const candidate = inventory[i];
                if (candidate && Number(candidate.ammo) === Number(ammoId) && Number(candidate.stack) > 0) {
                    ammo = candidate;
                    break;
                }
            }
        }
        return ammo;
    }

    CanConsumeAmmo(player, ammoId) {
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
        const fungalRound = Number(ModProjectile.getTypeByName('FungiOrb') || 0);
        if (!(fungalRound > 0))
            return false;
        const vx = Number(velocity.X) || 0;
        const vy = Number(velocity.Y) || 0;
        const weaponSpeed = Math.sqrt(vx * vx + vy * vy);
        const direction = weaponSpeed > 0.001
            ? Vector2.Normalize(velocity)
            : Vector2.new(Number(Terraria.PlayerDirection(player)) || 1, 0);
        const ammoSpeed = Math.max(0, Number(ammo.shootSpeed) || 0);
        const finalVelocity = Vector2.Multiply(direction, weaponSpeed + ammoSpeed);
        const bulletType = Number(Terraria.ID.ProjectileID.Bullet);
        const ammoProjectile = Number(ammo.shoot);
        const projectileType = Number.isFinite(ammoProjectile) && ammoProjectile > 0 && ammoProjectile !== bulletType
            ? Math.floor(ammoProjectile)
            : fungalRound;
        const rangedMultiplier = Math.max(0, Number(player.rangedDamage) || 1);
        const shotDamage = Math.max(1, Math.floor(Number(damage) + (Number(ammo.damage) || 0) * rangedMultiplier));
        const shotKnockback = Number(knockBack) + (Number(ammo.knockBack) || 0);
        const source = player.GetProjectileSource_Item(item);
        Terraria.SetPlayerDirection(player, Number(finalVelocity.X) < 0 ? -1 : 1);
        NewProjectile(source, position, finalVelocity, projectileType, shotDamage, shotKnockback, Terraria.PlayerIndex(player), 0, 0, 0, null);
        this.ConsumeSelectedAmmo(player, ammo, item.useAmmo);
        return false;
    }
}
