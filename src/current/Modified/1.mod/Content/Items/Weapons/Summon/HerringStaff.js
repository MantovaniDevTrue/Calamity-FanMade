import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function Source(player,item){try{return player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(_){}try{return null;}catch(_){return null;}}

export class HerringStaff extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Summon/HerringStaff'; this.ResearchUnlockCount = 1; }
    SetStaticDefaults() {
        try { Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type] = 1; } catch (_) { }
    }
    SetDefaults() {
        const i = this.Item;
        i.width = 48; i.height = 48; i.damage = 15; i.summon = true; i.mana = 10;
        i.useTime = 36; i.useAnimation = 36; i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.noMelee = true; i.knockBack = 1.25; i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange; i.UseSound = Terraria.ID.SoundID.Item21;
        i.autoReuse = true; i.buffType = ModBuff.getTypeByName('HerringBuff');
        i.shoot = ModProjectile.getTypeByName('Herring'); i.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }
    ModifyShootStats(item, player, stats) {
        try {
            const m = Terraria.Main.MouseWorld;
            if (m && Number.isFinite(Number(m.X)) && Number.isFinite(Number(m.Y))) stats.position = Vector2.new(Number(m.X), Number(m.Y));
            else stats.position = Terraria.PlayerCenter(player);
        } catch (_) { stats.position = Terraria.PlayerCenter(player); }
        stats.velocity = Vector2.Zero;
    }
    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const p = Number(ModProjectile.getTypeByName('Herring') || type || 0);
        const b = Number(ModBuff.getTypeByName('HerringBuff') || 0);
        if (!(p > 0 && b > 0)) return false;
        try { player.AddBuff(b, 2, false); } catch (_) { }
        const src=Source(player,item);
        try {
            const id = NewProjectile(src, position, Vector2.Zero, p, Number(damage) || 15, Number(knockBack) || 1.25, Terraria.PlayerIndex(player), 0, 0, 0, null);
            if (id >= 0 && id < 1000) {
                const q = Terraria.Main.projectile[id];
                if (q) {
                    q.damage = Math.max(1, Number(damage) || Number(item.damage) || 15);
                    q.originalDamage = Number(item.damage) || 15;
                    q.minion = true; q.minionSlots = 1; q.friendly = true; q.hostile = false; q.netUpdate = true;
                }
            }
        } catch (e) { try { tl.log(`[CalamityPort HerringStaff] spawn failed: ${e}`); } catch (_) { } }
        return false;
    }
}
