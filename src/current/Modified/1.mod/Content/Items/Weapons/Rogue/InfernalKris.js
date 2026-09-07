import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export class InfernalKris extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/InfernalKris'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 32; i.height = 38; i.damage = 21; i.noMelee = true; i.noUseGraphic = true;
        i.useAnimation = 18; i.useStyle = Terraria.ID.ItemUseStyleID.Swing; i.useTime = 18;
        i.knockBack = 1; i.UseSound = Terraria.ID.SoundID.Item1; i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 4, 0, 0); i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('InfernalKrisProjectile'); i.shootSpeed = 15;
        this.MenuCategories.push('rogue');
    }
    Shoot(item, player, position, velocity, type, damage, kb) {
        const stealth = ConsumeStealthStrike(player, item);
        const t = Number(ModProjectile.getTypeByName('InfernalKrisProjectile') || type || 0);
        if (!(t > 0)) return false;

        // A Kris usa o mesmo spawn validado dos outros rogue do port.
        // Não deixo o Terraria calcular sozinho a classe custom, porque nessa build
        // isso pode criar o projétil com dano 0 mesmo com o sprite/AI funcionando.
        const dmg = Math.max(1, Math.floor(N(damage) > 0 ? N(damage) : N(item.damage, 21)));
        const proj = SpawnMarkedProjectile(
            player, item, position, velocity, t, dmg, N(kb, 1),
            'InfernalKris', stealth, false, 0, stealth ? 1 : 0, 0
        );

        if (proj) {
            try { proj.damage = dmg; } catch (_) { }
            try { proj.originalDamage = dmg; } catch (_) { }
            try { proj.friendly = true; proj.hostile = false; } catch (_) { }
            try { proj.netUpdate = true; } catch (_) { }
            if (stealth) try { proj.penetrate = 1; } catch (_) { }
        }
        return false;
    }
    AddRecipes() {
        this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.HellstoneBar, 10)
            .AddIngredient(Terraria.ID.ItemID.AshWood, 10)
            .AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
