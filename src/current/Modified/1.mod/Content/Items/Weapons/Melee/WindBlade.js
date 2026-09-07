import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

export class WindBlade extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/WindBlade';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 58;
        i.height = 58;
        i.damage = 30;
        i.melee = true;
        i.useTime = 22;
        i.useAnimation = 22;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.useTurn = true;
        i.knockBack = 5;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('Cyclone');
        i.shootSpeed = 5;
        this.MenuCategories.push('melee');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const pType = Number(ModProjectile.getTypeByName('Cyclone') || type || 0);
        if (!(pType > 0)) return false;
        let source = null;
        try { source = player.GetProjectileSource_Item(item); } catch (e) { }
        NewProjectile(source, position, velocity, pType, Math.max(1, Math.floor(Number(damage) * 0.6)), Number(knockBack) || 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
        return false;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
