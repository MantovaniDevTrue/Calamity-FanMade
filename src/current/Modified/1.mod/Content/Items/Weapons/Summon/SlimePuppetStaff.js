import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function summonPosition(player) {
    let center = Vector2.Zero;
    try { center = Terraria.PlayerCenter(player); } catch (e) { }
    try {
        const mouse = Terraria.Main.MouseWorld;
        const mx = Number(mouse?.X), my = Number(mouse?.Y);
        const cx = Number(center?.X), cy = Number(center?.Y);
        if (Number.isFinite(mx) && Number.isFinite(my) && Number.isFinite(cx) && Number.isFinite(cy)) {
            const dx = mx - cx, dy = my - cy, d2 = dx * dx + dy * dy;
            if (d2 >= 16 * 16 && d2 <= 700 * 700) return Vector2.new(mx, my);
        }
    } catch (e) { }
    try { return Vector2.new(Number(center.X) + (Number(Terraria.PlayerDirection(player)) || 1) * 72, Number(center.Y) - 18); } catch (e) { }
    return center;
}

export class SlimePuppetStaff extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/SlimePuppetStaff';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try { Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type] = true; } catch (e) { }
        try { Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type] = true; } catch (e) { }
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 32;
        i.height = 34;
        i.damage = 10;
        i.summon = true;
        i.mana = 10;
        i.useAnimation = 29;
        i.useTime = 29;
        i.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        i.noMelee = true;
        i.knockBack = 3.6;
        i.value = Terraria.Item.buyPrice(0, 10, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.LightRed;
        i.UseSound = Terraria.ID.SoundID.Item44;
        i.shoot = ModProjectile.getTypeByName('SlimePuppet');
        i.shootSpeed = 10;
        i.autoReuse = true;
        this.MenuCategories.push('summon');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const projectileType = Number(ModProjectile.getTypeByName('SlimePuppet') || type || 0);
        if (!(projectileType > 0) || typeof NewProjectile !== 'function') return false;
        let source = null;
        try { source = player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (e) { }
        const spawn = summonPosition(player);
        try {
            const index = NewProjectile(source, spawn, Vector2.Zero, projectileType, Number(damage) || 10, Number(knockBack) || 3.6, Terraria.PlayerIndex(player), 0, 0, 0, null);
            if (index >= 0) {
                let p = null; try { p = Terraria.Main.projectile.get_Item(Number(index)); } catch (_) { try { p = Terraria.Main.projectile[index]; } catch (__) { } }
                if (p) { p.damage = Math.max(1, Number(damage) || Number(item.damage) || 10); p.originalDamage = Number(item.damage) || 10; p.minion = true; p.minionSlots = 0; p.friendly = true; p.hostile = false; p.netUpdate = true; }
            }
        } catch (e) {
            try { tl.log(`[CalamityPort 12.84.4] Slime Puppet item spawn exception: ${e}`); } catch (_) { }
        }
        return false;
    }

    AddRecipes(){
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('PurifiedGel'),18).AddIngredient(ModItem.getTypeByName('BlightedGel'),18).AddTile(220).Register();
    }
}
