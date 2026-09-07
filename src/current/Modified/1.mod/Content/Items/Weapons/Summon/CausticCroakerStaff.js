import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { SpawnProjectile } from './../../../../Core/SeaKingArsenalRuntime.js';

const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export class CausticCroakerStaff extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Summon/CausticCroakerStaff';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 36;
        i.height = 42;
        i.damage = 8;
        i.summon = true;
        i.sentry = true;
        i.mana = 10;
        i.useAnimation = 30;
        i.useTime = 30;
        i.knockBack = 0.25;
        i.shoot = ModProjectile.getTypeByName('EXPLODINGFROG');
        i.shootSpeed = 10;
        i.UseSound = Terraria.ID.SoundID.Item44;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.autoReuse = true;
        i.noMelee = true;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Green;
        this.MenuCategories.push('summon');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const frog = Number(ModProjectile.getTypeByName('EXPLODINGFROG') || type || 0);
        if (!(frog > 0)) return false;

        // TLPro mobile does not expose a proven FindSentryRestingSpot bridge.
        // Spawn at the touch/cursor position and let the sentry's vanilla-like
        // gravity + tile collision settle it onto the nearest floor.
        let spawn = Terraria.PlayerCenter(player);
        try {
            const mouse = Terraria.Main.MouseWorld;
            if (mouse) spawn = mouse;
        } catch (_) { }

        const source = player.GetProjectileSource_Item(item);
        const index = SpawnProjectile(source, spawn, Vector2.Zero, frog, damage, knockBack, Terraria.PlayerIndex(player), 75, 0, 0);
        if (index >= 0) {
            try {
                const p = Terraria.Main.projectile.get_Item(Math.floor(N(index, -1)));
                if (p) {
                    p.originalDamage = item.damage;
                    p.netUpdate = true;
                }
            } catch (_) { }
        }
        try { player.UpdateMaxTurrets(); } catch (_) { }
        return false;
    }
}
