import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { M1GarandRuntime } from './../../../../Core/M1GarandRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function NormalizeOr(vector, fallbackX = 1, fallbackY = 0) {
    const x = Number(vector && vector.X) || 0;
    const y = Number(vector && vector.Y) || 0;
    const length = Math.sqrt(x * x + y * y);
    if (length <= 0.001)
        return Vector2.new(fallbackX, fallbackY);
    return Vector2.new(x / length, y / length);
}

function ResolveMobileAim(player, fallbackVelocity) {
    try {
        const mouse = Terraria.Main.MouseWorld;
        if (mouse) {
            const dx = Number(mouse.X) - Number(player.MountedCenter.X);
            const dy = Number(mouse.Y) - Number(player.MountedCenter.Y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (Number.isFinite(distance) && distance > 12)
                return Vector2.new(dx / distance, dy / distance);
        }
    } catch (e) { }
    return NormalizeOr(fallbackVelocity, Number(Terraria.PlayerDirection(player)) || 1, 0);
}

export class M1Garand extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/M1Garand';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.Item.width = 102;
        this.Item.height = 22;
        this.Item.damage = 75;
        this.Item.ranged = true;
        this.Item.crit = 10;
        this.Item.useTime = 40;
        this.Item.useAnimation = 40;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 2;
        this.Item.autoReuse = false;
        this.Item.channel = true;
        this.Item.shoot = ModProjectile.getTypeByName('M1GarandHoldout');
        this.Item.shootSpeed = 12;
        this.Item.useAmmo = Terraria.ID.AmmoID.Bullet;
        this.Item.noUseGraphic = true;
        this.Item.value = Terraria.Item.buyPrice(0, 20, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('ranged');
    }

    CanUseItem(item, player) {
        const holdoutType = ModProjectile.getTypeByName('M1GarandHoldout');
        return holdoutType > 0 && !M1GarandRuntime.HasActiveHoldout(player, holdoutType);
    }

    ModifyShootStats(item, player, stats) {
        const direction = ResolveMobileAim(player, stats.velocity);
        stats.velocity = Vector2.Multiply(direction, Math.max(0.1, Number(item.shootSpeed) || 12));
        try {
            stats.position = player.MountedCenter;
        } catch (e) { }
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const holdoutType = ModProjectile.getTypeByName('M1GarandHoldout');
        if (!(holdoutType > 0))
            return false;
        const direction = ResolveMobileAim(player, velocity);
        if (Math.abs(Number(direction.X)) > 0.04)
            Terraria.SetPlayerDirection(player, Number(direction.X) < 0 ? -1 : 1);
        const source = player.GetProjectileSource_Item(item);
        const index = NewProjectile(source, player.MountedCenter, direction, holdoutType, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        M1GarandRuntime.SetHoldout(player, index);
        return false;
    }
}
