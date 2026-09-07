import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { SpawnProjectile } from './../../../../Core/SeaKingArsenalRuntime.js';

const { Vector2 } = Modules;
export class PolypLauncher extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/PolypLauncher';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 26;
        item.height = 56;
        item.damage = 12;
        item.summon = true;
        item.sentry = true;
        item.mana = 10;
        item.useAnimation = 30;
        item.useTime = 30;
        item.knockBack = 0.25;
        item.shoot = ModProjectile.getTypeByName('PolypLauncherSentry');
        item.shootSpeed = 10;
        item.UseSound = Terraria.ID.SoundID.Item44;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.autoReuse = true;
        item.noMelee = true;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        this.MenuCategories.push('summon');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        let spawn = Terraria.PlayerCenter(player);
        try {
            if (Terraria.Main.MouseWorld)
                spawn = Terraria.Main.MouseWorld;
        } catch (e) { }
        const index = SpawnProjectile(player.GetProjectileSource_Item(item), spawn, Vector2.Zero, type, damage, knockBack, Terraria.PlayerIndex(player), 20, 0, 0);
        if (index >= 0) {
            const proj = Terraria.Main.projectile[index];
            if (proj) {
                proj.originalDamage = item.damage;
                proj.netUpdate = true;
            }
        }
        try {
            player.UpdateMaxTurrets();
        } catch (e) { }
        return false;
    }
}
