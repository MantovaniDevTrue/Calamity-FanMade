import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Rand, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const BurstStateByPlayer = [];
export class Shadethrower extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/Shadethrower';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.Item.width = 76;
        this.Item.height = 30;
        this.Item.damage = 21;
        this.Item.ranged = true;
        this.Item.useTime = 10;
        this.Item.useAnimation = 40;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 1.5;
        this.Item.UseSound = Terraria.ID.SoundID.Item34;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.Item.autoReuse = true;
        this.Item.shoot = ModProjectile.getTypeByName('ShadeFire');
        this.Item.shootSpeed = 8;
        this.Item.useAmmo = 0;
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

    CanConsumeAmmo(player) {
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

    GetBurstState(player) {
        const owner = Math.max(0, Number(Terraria.PlayerIndex(player)) || 0);
        let state = BurstStateByPlayer[owner];
        if (!state) {
            state = {
                lastAnimation: -1, ready: false, ammoDamage: 0, ammoKnockBack: 0, ammoSpeed: 0
            };
            BurstStateByPlayer[owner] = state;
        }
        return state;
    }

    IsFirstShotOfBurst(player, state) {
        const animation = Math.max(0, Number(player.itemAnimation) || 0);
        const animationMax = Math.max(1, Number(player.itemAnimationMax) || Number(this.Item.useAnimation) || 40);
        const previous = Number(state.lastAnimation);
        const first = !Number.isFinite(previous) || previous < 0 || animation >= animationMax - 1 || animation > previous;
        state.lastAnimation = animation;
        return first;
    }

    CanUseItem(item, player) {
        const state = this.GetBurstState(player);
        if (Number(player.itemAnimation) > 0 && state.ready)
            return true;
        return this.PickAmmo(player, Terraria.ID.AmmoID.Gel) != null;
    }

    ConsumeBurstAmmo(player, ammo) {
        if (!ammo || !ammo.consumable || !this.CanConsumeAmmo(player))
            return;
        ammo.stack = Math.max(0, Number(ammo.stack) - 1);
        if (Number(ammo.stack) <= 0)
            ammo.TurnToAir(true);
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const state = this.GetBurstState(player);
        const firstShot = this.IsFirstShotOfBurst(player, state);
        if (firstShot || !state.ready) {
            const ammo = this.PickAmmo(player, Terraria.ID.AmmoID.Gel);
            if (!ammo) {
                state.ready = false;
                return false;
            }
            state.ammoDamage = Number(ammo.damage) || 0;
            state.ammoKnockBack = Number(ammo.knockBack) || 0;
            state.ammoSpeed = Math.max(0, Number(ammo.shootSpeed) || 0);
            state.ready = true;
            this.ConsumeBurstAmmo(player, ammo);
        }
        const projectileType = Number(ModProjectile.getTypeByName('ShadeFire') || 0);
        if (!(projectileType > 0))
            return false;
        const vx = Number(velocity.X) || 0;
        const vy = Number(velocity.Y) || 0;
        const baseSpeed = Math.sqrt(vx * vx + vy * vy);
        const direction = baseSpeed > 0.001
            ? Vector2.Normalize(velocity)
            : Vector2.new(Number(Terraria.PlayerDirection(player)) || 1, 0);
        const finalVelocity = Vector2.Multiply(direction, baseSpeed + state.ammoSpeed);
        const rangedMultiplier = Math.max(0, Number(player.rangedDamage) || 1);
        const shotDamage = Math.max(1, Math.floor(Number(damage) + state.ammoDamage * rangedMultiplier));
        const shotKnockback = Number(knockBack) + state.ammoKnockBack;
        const source = player.GetProjectileSource_Item(item);
        Terraria.SetPlayerDirection(player, Number(finalVelocity.X) < 0 ? -1 : 1);
        NewProjectile(source, position, finalVelocity, projectileType, shotDamage, shotKnockback, Terraria.PlayerIndex(player), 0, 0, 0, null);
        return false;
    }
}
