import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function setArray(holder, name, index, value) { try { let a = holder[name], need = Number(index) + 1, len = Number(a && a.Length); if (!Number.isFinite(len)) len = Number(a && a.length) || 0; if (len < need) { a = a.cloneResized(need); holder[name] = a; } try { a['void SetValue(Object value, int index)'](value, Number(index)); return true; } catch (_) { } try { a.set_Item(Number(index), value); return true; } catch (_) { } return false; } catch (_) { return false; } }
function src(p, i) { try { return p['IEntitySource GetProjectileSource_Item(Item item)'](i); } catch (_) { return null; } }
function norm(x, y, s) { const l = Math.sqrt(x * x + y * y) || 1; return Vector2.new(x / l * s, y / l * s); }

export class HellwingStaff extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Magic/HellwingStaff'; this.ResearchUnlockCount = 1; }
    SetStaticDefaults() { setArray(Terraria.Item, 'staff', this.Type, true); }
    SetDefaults() {
        const i = this.Item;
        i.width = 70; i.height = 60; i.damage = 21; i.magic = true; i.mana = 18;
        i.useTime = 30; i.useAnimation = 30; i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true; i.knockBack = 5; i.value = Terraria.Item.buyPrice(0, 4, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange; i.autoReuse = true;
        i.shoot = ModProjectile.getTypeByName('HellwingBat'); i.shootSpeed = 9; i.UseSound = Terraria.ID.SoundID.Item43;
        this.MenuCategories.push('magic');
    }
    Shoot(item, player, position, velocity, type, damage, kb) {
        const t = Number(ModProjectile.getTypeByName('HellwingBat') || type || 0);
        if (!(t > 0)) return false;

        const owner = Terraria.PlayerIndex(player);
        const mounted = player.MountedCenter;
        let halfWidth = 10;
        try { halfWidth = Math.max(1, N(Terraria.PlayerWidth(player), 20) * 0.5); } catch (_) { }

        let mx = N(mounted.X) + N(velocity?.X, 1) * 160;
        let my = N(mounted.Y) + N(velocity?.Y) * 160;
        try {
            const mouse = Terraria.Main.MouseWorld;
            mx = N(mouse.X, mx);
            my = N(mouse.Y, my);
        } catch (_) { }

        // velocity.Length() do Shoot original.
        const speed = Math.sqrt(N(velocity?.X) ** 2 + N(velocity?.Y) ** 2) || 9;
        const dmg = Math.max(1, Math.floor(N(damage) > 0 ? N(damage) : N(item.damage, 21)));
        const knock = N(kb, 5);

        for (let k = 0; k < 4; k++) {
            // Fórmula exata do PC, sem ler player.position herdado:
            // Center.X - position.X == width / 2.
            const sx = (N(mounted.X) + mx + halfWidth) * 0.5;
            const sy = N(mounted.Y) - 100 * k;

            const dx = mx - sx;
            let dy = Math.abs(my - sy);
            if (dy < 20) dy = 20;

            let v = norm(dx, dy, speed);
            v = Vector2.new(
                N(v.X) + (Math.random() * 0.8 - 0.4),
                N(v.Y) + (Math.random() * 0.8 - 0.4)
            );

            NewProjectile(src(player, item), Vector2.new(sx, sy), v, t, dmg, knock, owner, 0, 0, 0, null);
        }
        return false;
    }
    AddRecipes() {
        this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.HellstoneBar, 10)
            .AddIngredient(Terraria.ID.ItemID.AshWood, 10)
            .AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
