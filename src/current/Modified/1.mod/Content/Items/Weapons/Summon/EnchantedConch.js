import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModBuff } from './../../../../TL/ModBuff.js';
import { SpawnProjectile } from './../../../../Core/SeaKingArsenalRuntime.js';

const { Vector2 } = Modules;
export class EnchantedConch extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/EnchantedConch';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.StaffMinionSlotsRequired[this.Type] = 1;
        } catch (e) { }
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 40;
        item.height = 26;
        item.damage = 20;
        item.summon = true;
        item.buffType = ModBuff.getTypeByName('HermitCrab');
        item.shoot = ModProjectile.getTypeByName('HermitCrabMinion');
        item.knockBack = 2;
        item.useAnimation = 36;
        item.useTime = 36;
        item.mana = 10;
        item.noMelee = true;
        item.autoReuse = true;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        item.UseSound = Terraria.ID.SoundID.Item44;
        item.shootSpeed = 0;
        this.MenuCategories.push('summon');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const buff = Number(ModBuff.getTypeByName('HermitCrab') || 0);
        const minion = Number(ModProjectile.getTypeByName('HermitCrabMinion') || 0);
        if (!(buff > 0 && minion > 0))
            return false;
        player.AddBuff(buff, 2, false);
        let spawn = Terraria.PlayerCenter(player);
        try {
            if (Terraria.Main.MouseWorld)
                spawn = Terraria.Main.MouseWorld;
        } catch (e) { }
        const randomVelocity = Vector2.new((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        const index = SpawnProjectile(player.GetProjectileSource_Item(item), spawn, randomVelocity, minion, damage, knockBack, Terraria.PlayerIndex(player));
        if (index >= 0) {
            const proj = Terraria.Main.projectile[index];
            if (proj) {
                proj.originalDamage = item.damage;
                proj.netUpdate = true;
            }
        }
        return false;
    }
}
