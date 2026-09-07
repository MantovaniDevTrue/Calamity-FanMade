import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class FleshOfInfidelity extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/FleshOfInfidelity';
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
        this.CloneDefaults(Terraria.ID.ItemID.BabyBirdStaff);
        const i = this.Item;
        i.width = 42;
        i.height = 42;
        i.damage = 20;
        i.summon = true;
        i.mana = 10;
        i.useAnimation = 36;
        i.useTime = 36;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.noMelee = true;
        i.knockBack = 2;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.UseSound = Terraria.ID.SoundID.Item44;
        i.autoReuse = true;
        i.buffType = ModBuff.getTypeByName('FleshBallBuff');
        i.shoot = ModProjectile.getTypeByName('FleshBallMinion');
        i.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const b = Number(ModBuff.getTypeByName('FleshBallBuff') || 0), p = Number(ModProjectile.getTypeByName('FleshBallMinion') || 0);
        if (!(b > 0 && p > 0))
            return false;
        player.AddBuff(b, 2, false);
        let spawn = Terraria.PlayerCenter(player);
        try {
            spawn = Terraria.Main.MouseWorld || spawn;
        } catch (e) { }
        const idx = NewProjectile(player.GetProjectileSource_Item(item), spawn, Vector2.Zero, p, damage, knockBack, Terraria.PlayerIndex(player), 0, 0, 0, null);
        if (idx >= 0) {
            const proj = Terraria.Main.projectile[idx];
            if (proj) {
                proj.damage = Math.max(1, Number(damage) || Number(item.damage) || 20);
                proj.originalDamage = Number(item.damage) || 20;
                proj.minion = true; proj.minionSlots = 1; proj.friendly = true; proj.hostile = false;
                proj.netUpdate = true;
            }
        }
        return false;
    }
}
