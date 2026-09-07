import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, Rotate } from './../../../../Core/RogueRuntime.js';
const { Vector2 } = Modules;

export class Lionfish extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/Lionfish'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 40; i.height = 40; i.damage = 33;
        i.melee = false; i.ranged = false; i.magic = false; i.summon = false;
        i.noMelee = true; i.noUseGraphic = true; i.useAnimation = 26; i.useTime = 26;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing; i.knockBack = 2.5; i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true; i.value = Terraria.Item.buyPrice(0, 1, 0, 0); i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('LionfishProjectile'); i.shootSpeed = 12;
        this.MenuCategories.push('thrown');
    }
    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const fish = Number(ModProjectile.getTypeByName('LionfishProjectile') || type || 0);
        if (!(fish > 0)) return false;
        const stealth = ConsumeStealthStrike(player, item);
        const main = SpawnMarkedProjectile(player, item, position, velocity, fish, damage, knockBack, 'Lionfish', stealth, false);
        if (!main) return false;
        if (stealth) {
            const spike = Number(ModProjectile.getTypeByName('UrchinSpikeFugu') || 0);
            if (spike > 0) {
                for (let s = 0; s < 5; s++) {
                    const scale = 0.85 + Math.random() * 0.40;
                    const angle = (Math.random() - 0.5) * Math.PI * 0.25;
                    const v = Rotate(velocity, angle, scale);
                    SpawnMarkedProjectile(player, item, position, v, spike, Math.max(1, Math.floor(Number(damage) * 0.5)), Number(knockBack) * 0.5, 'LionfishSpike', true, true, -10, 1, 0);
                }
            }
        }
        return false;
    }
}
