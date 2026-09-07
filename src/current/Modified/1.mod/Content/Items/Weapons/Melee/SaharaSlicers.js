import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';

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
            if (Number.isFinite(distance) && distance > 12) {
                return Vector2.new(dx / distance, dy / distance);
            }
        }
    } catch (e) { }
    return NormalizeOr(fallbackVelocity, Number(Terraria.PlayerDirection(player)) || 1, 0);
}

export class SaharaSlicers extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/SaharaSlicers';
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
        try {
            const shortsword = Number(Terraria.ID.ItemID.CopperShortsword);
            if (shortsword > 0)
                this.CloneDefaults(shortsword);
        } catch (e) { }
        this.Item.width = 43;
        this.Item.height = 34;
        this.Item.damage = 23;
        this.Item.melee = true;
        this.Item.noMelee = true;
        this.Item.noUseGraphic = true;
        this.Item.autoReuse = true;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.useTime = 12;
        this.Item.useAnimation = 12;
        this.Item.knockBack = 6;
        this.Item.UseSound = Terraria.ID.SoundID.Item1;
        this.Item.channel = true;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.shoot = ModProjectile.getTypeByName('SaharaSlicersBlade');
        this.Item.shootSpeed = 3.3;
        this.MenuCategories.push('melee');
    }

    HoldItem(item, player) {
        const state = ModPlayer.getByName('CalamityPlayerState');
        if (state && state.MarkSaharaSlicersHeld)
            state.MarkSaharaSlicersHeld(player);
    }

    ModifyShootStats(item, player, stats) {
        const direction = ResolveMobileAim(player, stats.velocity);
        const speed = Math.max(0.1, Number(item.shootSpeed) || 3.3);
        stats.velocity = Vector2.Multiply(direction, speed);
        try {
            stats.position = player.MountedCenter;
        } catch (e) { }
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const normalBlade = ModProjectile.getTypeByName('SaharaSlicersBlade');
        const altBlade = ModProjectile.getTypeByName('SaharaSlicersBladeAlt');
        if (!(normalBlade > 0 && altBlade > 0))
            return false;
        const state = ModPlayer.getByName('CalamityPlayerState');
        const direction = ResolveMobileAim(player, velocity);
        const useAlt = state && state.NextSaharaSlicersBlade ? state.NextSaharaSlicersBlade(player) : false;
        const projectileType = useAlt ? altBlade : normalBlade;
        const baseSpeed = Math.max(0.1, Number(item.shootSpeed) || 3.3);
        const speed = useAlt ? baseSpeed : baseSpeed * 0.75;
        const shotVelocity = Vector2.Multiply(direction, speed);
        if (Math.abs(Number(direction.X)) > 0.04)
            Terraria.SetPlayerDirection(player, Number(direction.X) < 0 ? -1 : 1);
        const source = player.GetProjectileSource_Item(item);
        NewProjectile(source, position, shotVelocity, projectileType, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        return false;
    }
}
