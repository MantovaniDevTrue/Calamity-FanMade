import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class ShaderainStaff extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/ShaderainStaff';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.Item.staff[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.Item.width = 42;
        this.Item.height = 42;
        this.Item.damage = 19;
        this.Item.magic = true;
        this.Item.mana = 14;
        this.Item.useAnimation = 34;
        this.Item.useTime = 34;
        this.Item.knockBack = 0.25;
        this.Item.shoot = ModProjectile.getTypeByName('Shaderain');
        this.Item.shootSpeed = 11;
        this.Item.UseSound = Terraria.ID.SoundID.Item66;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.autoReuse = true;
        this.Item.noMelee = true;
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.MenuCategories.push('magic');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const rain = Number(ModProjectile.getTypeByName('Shaderain') || 0);
        const cloud = Number(ModProjectile.getTypeByName('ShadeNimbusCloud') || 0);
        if (!(rain > 0 && cloud > 0))
            return false;
        const source = player.GetProjectileSource_Item(item);
        for (let i = 0; i < 2; i++) {
            const multiplier = 0.9 + Math.random() * 0.3;
            NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Multiply(velocity, multiplier), rain, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        }
        NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Multiply(velocity, 1.25), cloud, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        return false;
    }
}
