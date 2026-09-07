import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { SpawnProjectile } from './../../../../Core/SeaKingArsenalRuntime.js';
const { Vector2 } = Modules;
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}

export class RustyBeaconPrototype extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Summon/RustyBeaconPrototype'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        const i = this.Item;
        i.width = 28; i.height = 20; i.mana = 10; i.damage = 7;
        i.useAnimation = 30; i.useTime = 30; i.useStyle = Terraria.ID.ItemUseStyleID.HoldUp;
        i.noMelee = true; i.knockBack = 0.5; i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Blue; i.UseSound = Terraria.ID.SoundID.Item15;
        i.autoReuse = true; i.shootSpeed = 10; i.summon = true; i.sentry = true;
        i.shoot = ModProjectile.getTypeByName('RustyDrone');
        this.MenuCategories.push('summon');
    }
    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const drone = Number(ModProjectile.getTypeByName('RustyDrone') || type || 0);
        if (!(drone > 0)) return false;
        let spawn = Terraria.PlayerCenter(player);
        try { const m = Terraria.Main.MouseWorld; if (m) spawn = Vector2.new(N(m.X),N(m.Y)); } catch (_) { }
        let src = null;
        try { src = player.GetProjectileSource_Item(item); } catch (_) { }
        const id = SpawnProjectile(src, spawn, Vector2.Zero, drone, Math.max(1,Math.floor(N(damage,7))), N(knockBack,.5), Terraria.PlayerIndex(player), 16, 0, 0);
        if (id >= 0) {
            try {
                const p = Terraria.Main.projectile.get_Item(Math.floor(N(id,-1)));
                if (p) { p.originalDamage = Math.max(1,Math.floor(N(item.damage,7))); p.netUpdate = true; }
            } catch (_) { }
        }
        try { player.UpdateMaxTurrets(); } catch (_) { }
        return false;
    }
}
