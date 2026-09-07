import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export class HardenedHoneycomb extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/HardenedHoneycomb'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 30; i.height = 32; i.damage = 19; i.noMelee = true; i.noUseGraphic = true;
        i.useAnimation = 18; i.useTime = 18; i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.knockBack = 3; i.UseSound = Terraria.ID.SoundID.Item1; i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0); i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('Honeycomb'); i.shootSpeed = 14;
        this.MenuCategories.push('rogue');
    }
    Shoot(item, player, position, velocity, type, damage, kb) {
        const stealth = ConsumeStealthStrike(player, item);
        const t = Number(ModProjectile.getTypeByName('Honeycomb') || type || 0);
        if (!(t > 0)) return false;
        let dmg = Math.max(1, Math.floor(N(damage) > 0 ? N(damage) : N(item.damage, 19)));
        if (stealth) dmg = Math.max(1, Math.floor(dmg * StealthDamageMultiplier(player, 'HardenedHoneycomb')));
        SpawnMarkedProjectile(player, item, position, velocity, t, dmg, N(kb, 3), 'HardenedHoneycomb', stealth);
        return false;
    }
}
