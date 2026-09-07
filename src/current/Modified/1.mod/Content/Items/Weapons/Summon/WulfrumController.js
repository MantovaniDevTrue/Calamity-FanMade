import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { ModPlayer } from './../../../../TL/ModPlayer.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

export class WulfrumController extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/WulfrumController';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type] = true;
            Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type] = true;
            Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type] = 1;
        } catch (e) { }
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 28;
        item.height = 20;
        item.damage = 19;
        item.summon = true;
        item.mana = 10;
        item.useAnimation = 36;
        item.useTime = 36;
        item.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        item.noMelee = true;
        item.knockBack = 0.5;
        item.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        item.rare = Terraria.ID.ItemRarityID.Blue;
        item.UseSound = Terraria.ID.SoundID.Item15;
        item.autoReuse = true;
        item.buffType = ModBuff.getTypeByName('WulfrumDroidBuff');
        item.shoot = ModProjectile.getTypeByName('WulfrumDroid');
        item.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    AltFunctionUse() {
        return true;
    }

    CanUseItem(item, player) {
        if (Number(player.altFunctionUse) !== 2)
            return true;
        const state = ModPlayer.getByName('WulfrumControllerPlayer');
        if (state)
            state.ToggleMode(player, true);
        return false;
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        if (Number(player.altFunctionUse) === 2)
            return false;

        const buffType = Number(ModBuff.getTypeByName('WulfrumDroidBuff') || 0);
        const projectileType = Number(ModProjectile.getTypeByName('WulfrumDroid') || 0);
        if (!(buffType > 0 && projectileType > 0))
            return false;

        const state = ModPlayer.getByName('WulfrumControllerPlayer');
        if (state && state.CountOwnedDroids(player) <= 0)
            state.SetMode(player, false, false);

        player.AddBuff(buffType, 2, false);
        let spawn = Terraria.PlayerCenter(player);
        try {
            if (Terraria.Main.MouseWorld)
                spawn = Terraria.Main.MouseWorld;
        } catch (e) { }

        const index = NewProjectile(
            player.GetProjectileSource_Item(item),
            spawn,
            Vector2.Zero,
            projectileType,
            damage,
            knockBack,
            Terraria.PlayerIndex(player),
            0,
            1,
            0,
            null
        );
        if (index >= 0) {
            const projectile = Terraria.Main.projectile[index];
            if (projectile) {
                projectile.damage = Math.max(1, Number(damage) || Number(item.damage) || 19);
                projectile.originalDamage = Number(item.damage) || 19;
                projectile.minion = true; projectile.minionSlots = 1; projectile.friendly = true; projectile.hostile = false;
                projectile.netUpdate = true;
            }
        }
        return false;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 10)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
