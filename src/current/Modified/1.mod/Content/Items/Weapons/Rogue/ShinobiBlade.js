import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export class ShinobiBlade extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/ShinobiBlade'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 16; i.height = 42; i.damage = 24; i.noMelee = true; i.noUseGraphic = true;
        i.useAnimation = 10; i.useTime = 10; i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.knockBack = 1; i.UseSound = Terraria.ID.SoundID.Item1; i.autoReuse = true; i.maxStack = 1;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0); i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('ShinobiBladeProjectile'); i.shootSpeed = 10;
        this.MenuCategories.push('rogue');
    }
    Shoot(item, player, position, velocity, type, damage, kb) {
        const stealth = ConsumeStealthStrike(player, item);
        const t = Number(ModProjectile.getTypeByName('ShinobiBladeProjectile') || type || 0);
        if (!(t > 0)) return false;
        const dmg = Math.max(1, Math.floor(N(damage) > 0 ? N(damage) : N(item.damage, 24)));
        SpawnMarkedProjectile(player, item, position, velocity, t, dmg, N(kb, 1), 'ShinobiBlade', stealth, false, 0, 0, 0);
        return false;
    }
}
