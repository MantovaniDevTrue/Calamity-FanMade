import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function setNative(holder,name,index,value){try{let a=holder[name],need=Number(index)+1,len=Number(a&&a.Length);if(!Number.isFinite(len))len=Number(a&&a.length)||0;if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a.set_Item(Number(index),value);return true;}catch(_){}try{a['void SetValue(Object value, int index)'](value,Number(index));return true;}catch(_){}return false;}catch(_){return false;}}

export class BrittleStarStaff extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/BrittleStarStaff';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        // PC Calamity explicitly marks Brittle Star Staff as an Item.staff item.
        setNative(Terraria.Item, 'staff', this.Type, true);
        setNative(Terraria.ID.ItemID.Sets, 'GamepadWholeScreenUseRange', this.Type, true);
        setNative(Terraria.ID.ItemID.Sets, 'LockOnIgnoresCollision', this.Type, true);
        setNative(Terraria.ID.ItemID.Sets, 'StaffMinionSlotsRequired', this.Type, 1);
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.BabyBirdStaff);
        this.Item.width = 44;
        this.Item.height = 64;
        this.Item.damage = 10;
        this.Item.mana = 10;
        this.Item.useAnimation = 36;
        this.Item.useTime = 36;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 2;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.UseSound = Terraria.ID.SoundID.Item44;
        this.Item.autoReuse = true;
        this.Item.summon = true;
        this.Item.buffType = ModBuff.getTypeByName('BrittleStar');
        this.Item.shoot = ModProjectile.getTypeByName('BrittleStarMinion');
        this.Item.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    ModifyShootStats(item, player, stats) {
        try {
            const mouse = Terraria.Main.MouseWorld;
            if (mouse && Number.isFinite(Number(mouse.X)) && Number.isFinite(Number(mouse.Y))) {
                stats.position = mouse;
            } else {
                stats.position = Terraria.PlayerCenter(player);
            }
        } catch (e) {
            stats.position = Terraria.PlayerCenter(player);
        }
        stats.velocity = Vector2.Zero;
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const buffType = ModBuff.getTypeByName('BrittleStar');
        const minionType = ModProjectile.getTypeByName('BrittleStarMinion');
        if (!(buffType > 0 && minionType > 0))
            return false;
        player.AddBuff(buffType, 2, false);
        const existingCount = Math.max(0, Number(player.ownedProjectileCounts[minionType]) || 0);
        const projIndex = NewProjectile(player.GetProjectileSource_Item(item), position, Vector2.Zero, minionType, damage, knockBack, Terraria.PlayerIndex(player), 0, -1, existingCount, null);
        if (projIndex >= 0) {
            const proj = Terraria.Main.projectile[projIndex];
            if (proj) {
                proj.damage = Math.max(1, Number(damage) || Number(item.damage) || 10);
                proj.originalDamage = Number(item.damage) || 10;
                proj.minion = true; proj.minionSlots = 1; proj.friendly = true; proj.hostile = false; proj.netUpdate = true;
            }
        }
        return false;
    }
}
