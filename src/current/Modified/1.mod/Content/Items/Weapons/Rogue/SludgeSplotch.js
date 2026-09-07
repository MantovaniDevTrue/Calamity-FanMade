import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, MarkRogueProjectile, MarkStealthStrike } from './../../../../Core/RogueRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function source(player, item) { try { return player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { return null; } }
function getSpawn(id) { try { return Terraria.Main.projectile.get_Item(Number(id)); } catch (_) { return null; } }

export class SludgeSplotch extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/SludgeSplotch'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 32; i.height = 30; i.damage = 30; i.noMelee = true; i.noUseGraphic = true;
        i.useAnimation = 18; i.useTime = 18; i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.knockBack = 1; i.autoReuse = true; i.UseSound = Terraria.ID.SoundID.Item1;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0); i.rare = Terraria.ID.ItemRarityID.Green;
        i.shoot = ModProjectile.getTypeByName('SludgeSplotchProj1'); i.shootSpeed = 10;
        this.MenuCategories.push('rogue');
    }
    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const stealth = ConsumeStealthStrike(player, item);
        const t = Number(ModProjectile.getTypeByName('SludgeSplotchProj1') || type || 0);
        if (!(t > 0)) return false;
        const mult = stealth ? 1.2 : 1;
        const v = Vector2.new(N(velocity.X) * mult, N(velocity.Y) * mult);
        const kb = N(knockBack, 1) * (stealth ? 3 : 1);
        const dmg = Math.max(1, Math.floor(N(damage) > 0 ? N(damage) : N(item.damage, 30)));
        const id = NewProjectile(source(player, item), position, v, t, dmg, kb, Terraria.PlayerIndex(player), 0, stealth ? 1 : 0, 0, null);
        const p = getSpawn(id);
        if (p) {
            MarkRogueProjectile(p, 'SludgeSplotch', false);
            if (stealth) MarkStealthStrike(p, 'SludgeSplotch', false);
        }
        return false;
    }
    AddRecipes() {
        const gel = Number(ModItem.getTypeByName('BlightedGel') || 0); if (!(gel > 0)) return;
        const ids = Terraria.ID.ItemID;
        const mats = [Number(ids.ShadowScale || 86), Number(ids.TissueSample || 1329)].filter(v => v > 0);
        for (const mat of mats) this.CreateRecipe().AddIngredient(gel, 50).AddIngredient(mat, 8).Register();
    }
}
