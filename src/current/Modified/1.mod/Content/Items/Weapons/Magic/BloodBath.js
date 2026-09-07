import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function mouseWorld(player, velocity) {
    try {
        const m = Terraria.Main.MouseWorld;
        if (m)
            return m;
    } catch (e) { }
    return Vector2.Add(Terraria.PlayerCenter(player), Vector2.Multiply(velocity, 40));
}

export class BloodBath extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/BloodBath';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.Item.staff[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.Item.width = 52;
        this.Item.height = 50;
        this.Item.damage = 24;
        this.Item.magic = true;
        this.Item.mana = 12;
        this.Item.useTime = 15;
        this.Item.useAnimation = 30;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 5.75;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.Item.UseSound = Terraria.ID.SoundID.Item21;
        this.Item.autoReuse = true;
        this.Item.shoot = ModProjectile.getTypeByName('BloodBeam');
        this.Item.shootSpeed = 9;
        this.MenuCategories.push('magic');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const projectile = Number(ModProjectile.getTypeByName('BloodBeam') || 0);
        if (!(projectile > 0))
            return false;
        const target = mouseWorld(player, velocity), count = Math.random() < 1 / 3 ? 3 : 2, source = player.GetProjectileSource_Item(item);
        for (let i = 0; i < count; i++) {
            const spawn = Vector2.new((Number(target.X) + Number(Terraria.PlayerCenterX(player))) / 2 + (Math.random() - 0.5) * 400, Number(Terraria.PlayerCenterY(player)) - 600 - i * 100);
            let dx = Number(target.X) - Number(spawn.X), dy = Math.max(20, Number(target.Y) - Number(spawn.Y));
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const v = Vector2.new(dx / len * 9 + (Math.random() - 0.5) * 1.2, dy / len * 9 + (Math.random() - 0.5) * 1.2);
            NewProjectile(source, spawn, v, projectile, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        }
        return false;
    }
}
