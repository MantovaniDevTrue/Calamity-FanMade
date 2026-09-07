import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function SummonPosition(player) {
    try {
        const mouse = Terraria.Main.MouseWorld;
        if (mouse && Number.isFinite(Number(mouse.X)) && Number.isFinite(Number(mouse.Y)))
            return mouse;
    } catch (e) { }
    try {
        return Terraria.PlayerCenter(player);
    } catch (e) { }
    return Vector2.Zero;
}

export class DankStaff extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/DankStaff';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type] = 1;
        } catch (e) { }
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.BabyBirdStaff);
        this.Item.width = 58;
        this.Item.height = 58;
        this.Item.damage = 14;
        this.Item.mana = 10;
        this.Item.useAnimation = 36;
        this.Item.useTime = 36;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        this.Item.noMelee = true;
        this.Item.knockBack = 2.25;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Orange;
        this.Item.UseSound = Terraria.ID.SoundID.Item44;
        this.Item.autoReuse = true;
        this.Item.summon = true;
        this.Item.buffType = ModBuff.getTypeByName('DankCreeperBuff');
        this.Item.shoot = ModProjectile.getTypeByName('DankCreeperMinion');
        this.Item.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    ModifyShootStats(item, player, stats) {
        stats.position = SummonPosition(player);
        stats.velocity = Vector2.Zero;
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const buff = Number(ModBuff.getTypeByName('DankCreeperBuff') || 0);
        const minion = Number(ModProjectile.getTypeByName('DankCreeperMinion') || 0);
        if (!(buff > 0 && minion > 0))
            return false;
        player.AddBuff(buff, 2, false);
        let source = null;
        try {
            source = player.GetProjectileSource_Item(item);
        } catch (e) { }
        const spawnPosition = position || SummonPosition(player);
        const index = NewProjectile(source, spawnPosition, Vector2.Zero, minion, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        if (index >= 0) {
            const proj = Terraria.Main.projectile[index];
            if (proj) {
                proj.damage = Math.max(1, Number(damage) || Number(item.damage) || 14);
                proj.originalDamage = Number(item.damage) || 14;
                proj.minion = true; proj.minionSlots = 1; proj.friendly = true; proj.hostile = false;
                proj.netUpdate = true;
            }
        }
        return false;
    }
}
