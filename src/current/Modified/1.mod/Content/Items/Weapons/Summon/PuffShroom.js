import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function ResolveSummonPosition(player) {
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

export class PuffShroom extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/PuffShroom';
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
        this.Item.width = 32;
        this.Item.height = 32;
        this.Item.damage = 14;
        this.Item.mana = 10;
        this.Item.useAnimation = 36;
        this.Item.useTime = 36;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        this.Item.noMelee = true;
        this.Item.knockBack = 2;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.UseSound = Terraria.ID.SoundID.Item42;
        this.Item.autoReuse = true;
        this.Item.summon = true;
        this.Item.melee = false;
        this.Item.ranged = false;
        this.Item.magic = false;
        this.Item.buffType = ModBuff.getTypeByName('PuffWarriorBuff');
        this.Item.shoot = ModProjectile.getTypeByName('PuffWarrior');
        this.Item.shootSpeed = 0;
        this.Item.maxStack = 1;
        this.Item.consumable = false;
        this.MenuCategories.push('summon');
    }

    ModifyShootStats(item, player, stats) {
        stats.position = ResolveSummonPosition(player);
        stats.velocity = Vector2.Zero;
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const buffType = ModBuff.getTypeByName('PuffWarriorBuff');
        const minionType = ModProjectile.getTypeByName('PuffWarrior');
        if (!(buffType > 0 && minionType > 0))
            return false;
        player.AddBuff(buffType, 2, false);
        let source = null;
        try {
            source = player.GetProjectileSource_Item(item);
        } catch (e) { }
        const index = NewProjectile(source, ResolveSummonPosition(player), Vector2.Zero, minionType, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        if (index >= 0) {
            const proj = Terraria.Main.projectile[index];
            if (proj)
                proj.originalDamage = item.damage;
        }
        return false;
    }
}
