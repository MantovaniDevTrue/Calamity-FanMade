import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function source(player, item) {
    try { return player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { }
    try { return null; } catch (_) { return null; }
}
function projectileAt(index) {
    try { return Terraria.Main.projectile.get_Item(Number(index)); } catch (_) { return null; }
}

export class AquamarineStaff extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/AquamarineStaff';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try { Terraria.Item.staff[this.Type] = true; } catch (_) { }
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 82;
        i.height = 84;
        i.damage = 17;
        i.magic = true;
        i.mana = 10;
        i.useAnimation = 22;
        i.useTime = 22;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 2.5;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Green;
        i.UseSound = Terraria.ID.SoundID.Item43;
        i.autoReuse = true;
        i.shoot = ModProjectile.getTypeByName('AquamarineBolt');
        i.shootSpeed = 14;
        this.MenuCategories.push('magic');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const projectileType = Number(ModProjectile.getTypeByName('AquamarineBolt') || type || 0);
        if (!(projectileType > 0)) return false;
        const src = source(player, item);
        const owner = Terraria.PlayerIndex(player);
        for (let n = 0; n < 2; n++) {
            const vx = Number(velocity.X) + (Math.floor(Math.random() * 61) - 30) * 0.05;
            const vy = Number(velocity.Y) + (Math.floor(Math.random() * 61) - 30) * 0.05;
            const id = NewProjectile(src, position, Vector2.new(vx, vy), projectileType, damage, knockBack, owner, 0, 0, 0, null);
            const p = projectileAt(id);
            if (p) p.timeLeft = 180;
        }
        return false;
    }

    AddRecipes() {
        const pearl = Number(ModItem.getTypeByName('PearlShard') || 0);
        const prism = Number(ModItem.getTypeByName('SeaPrism') || 0);
        const navi = Number(ModItem.getTypeByName('Navystone') || 0);
        if (!(pearl > 0 && prism > 0 && navi > 0)) return;
        for (const staff of [Terraria.ID.ItemID.AmethystStaff, Terraria.ID.ItemID.TopazStaff]) {
            this.CreateRecipe()
                .AddIngredient(staff, 1)
                .AddIngredient(pearl, 3)
                .AddIngredient(prism, 5)
                .AddIngredient(navi, 25)
                .AddTile(Terraria.ID.TileID.Anvils)
                .Register();
        }
    }
}
