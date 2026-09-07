import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Rand, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function Source(player,item){try{return player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(_){}try{return null;}catch(_){return null;}}
function rotate(v, a) {
    const c = Math.cos(a), s = Math.sin(a), x = N(v?.X), y = N(v?.Y);
    return Vector2.new(x * c - y * s, x * s + y * c);
}

export class Archerfish extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Ranged/Archerfish'; this.ResearchUnlockCount = 1; }

    SetDefaults() {
        const i = this.Item;
        i.width = 78; i.height = 36; i.damage = 16; i.ranged = true;
        i.useTime = 11; i.useAnimation = 11; i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true; i.knockBack = 2; i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange; i.UseSound = Terraria.ID.SoundID.Item85;
        i.autoReuse = true; i.shoot = ModProjectile.getTypeByName('ArcherfishShot'); i.shootSpeed = 11;
        i.useAmmo = Terraria.ID.AmmoID.Bullet;
        this.MenuCategories.push('ranged');
    }

    HoldoutOffset() { return { X: -10, Y: -5 }; }

    PickAmmo(player, ammoId) {
        const inv = player?.inventory;
        if (!inv) return null;
        for (let i = 54; i < 58; i++) {
            const a = inv[i];
            if (a && N(a.ammo) === N(ammoId) && N(a.stack) > 0) return a;
        }
        for (let i = 0; i < 54; i++) {
            const a = inv[i];
            if (a && N(a.ammo) === N(ammoId) && N(a.stack) > 0) return a;
        }
        return null;
    }

    CanUseItem(item, player) { return this.PickAmmo(player, item.useAmmo) != null; }

    ShouldConsumeAmmo(player) {
        // Official Archerfish has a flat 33% save chance, then vanilla ammo-saving effects apply.
        if (Rand.NextInt(0, 100) < 33) return false;
        try { if (player.ammoBox && Rand.NextInt(0, 5) === 0) return false; } catch (_) { }
        try { if (player.ammoPotion && Rand.NextInt(0, 5) === 0) return false; } catch (_) { }
        try { if (player.chloroAmmoCost80 && Rand.NextInt(0, 5) === 0) return false; } catch (_) { }
        try { if (player.ammoCost80 && Rand.NextInt(0, 5) === 0) return false; } catch (_) { }
        try { if (player.ammoCost75 && Rand.NextInt(0, 4) === 0) return false; } catch (_) { }
        return true;
    }

    ConsumeAmmo(player, ammo) {
        if (!ammo || ammo.consumable !== true || !this.ShouldConsumeAmmo(player)) return;
        ammo.stack = Math.max(0, N(ammo.stack) - 1);
        if (N(ammo.stack) <= 0) try { ammo.TurnToAir(true); } catch (_) { }
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const ammo = this.PickAmmo(player, item.useAmmo);
        if (!ammo || typeof NewProjectile !== 'function') return false;
        const water = N(ModProjectile.getTypeByName('ArcherfishShot'));
        const ring = N(ModProjectile.getTypeByName('ArcherfishRing'));
        if (!(water > 0 && ring > 0)) return false;

        const source=Source(player,item);
        const vx = N(velocity?.X), vy = N(velocity?.Y);
        const baseSpeed = Math.max(0.001, Math.sqrt(vx * vx + vy * vy));
        const dir = Vector2.new(vx / baseSpeed, vy / baseSpeed);
        const ammoSpeed = Math.max(0, N(ammo.shootSpeed));
        const finalVelocity = Vector2.Multiply(dir, baseSpeed + ammoSpeed);

        // Official muzzle position is 60px from the player along the barrel.
        const side = Math.abs(N(dir.X)) < 0.02 ? -2 : -8;
        const muzzleOffset = rotate(Vector2.new(60, N(player.direction, 1) * side), Math.atan2(N(dir.Y), N(dir.X)));
        const muzzle = Vector2.Add(position, muzzleOffset);

        const rangedMult = Math.max(0, N(player.rangedDamage, 1));
        const shotDamage = Math.max(1, Math.floor(N(damage, 16) + N(ammo.damage) * rangedMult));
        const shotKB = N(knockBack, 2) + N(ammo.knockBack);
        const bullet = N(Terraria.ID.ProjectileID.Bullet);
        const ammoProj = N(ammo.shoot);
        const shotType = ammoProj > 0 && ammoProj !== bullet ? ammoProj : water;

        try {
            NewProjectile(source, muzzle, finalVelocity, shotType, shotDamage, shotKB, Terraria.PlayerIndex(player), 0, 0, 0, null);
            NewProjectile(source, muzzle, Vector2.Multiply(finalVelocity, 0.5), ring, Math.max(1, Math.floor(shotDamage * 0.5)), shotKB + 5, Terraria.PlayerIndex(player), 0, 0, 0, null);
            this.ConsumeAmmo(player, ammo);
        } catch (e) {
            try { tl.log(`[CalamityPort Archerfish] shoot failed: ${e}`); } catch (_) { }
        }
        return false;
    }
}
