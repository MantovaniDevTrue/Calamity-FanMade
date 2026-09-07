import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export class WebBall extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/WebBall'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 20; i.height = 18; i.damage = 11; i.noMelee = true; i.noUseGraphic = true;
        i.useAnimation = 20; i.useTime = 20; i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.knockBack = 3; i.UseSound = Terraria.ID.SoundID.Item1;
        i.value = 0; i.rare = Terraria.ID.ItemRarityID.White;
        i.shoot = ModProjectile.getTypeByName('WebBallBol'); i.shootSpeed = 6.5;
        this.MenuCategories.push('rogue');
    }
    Shoot(item, player, position, velocity, type, damage, kb) {
        const stealth = ConsumeStealthStrike(player, item);
        const t = Number(ModProjectile.getTypeByName('WebBallBol') || type || 0);
        if (!(t > 0)) return false;
        const dmg = Math.max(1, Math.floor(N(damage) > 0 ? N(damage) : N(item.damage, 11)));
        SpawnMarkedProjectile(player, item, position, velocity, t, dmg, N(kb, 3), 'WebBall', stealth);
        return false;
    }
    AddRecipes() { this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Cobweb, 30).Register(); }
}
