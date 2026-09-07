import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, MarkRogueProjectile, MarkStealthStrike } from './../../../../Core/RogueRuntime.js';

const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function source(player, item) { try { return player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { return null; } }
function getSpawn(id) { try { return Terraria.Main.projectile.get_Item(Number(id)); } catch (_) { return null; } }

export class MeteorFist extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/MeteorFist'; this.ResearchUnlockCount = 1; }
    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 22; i.height = 28; i.damage = 31; i.useAnimation = 25; i.useTime = 25;
        i.knockBack = 5.75; i.shootSpeed = 4; i.noMelee = true; i.useTurn = true; i.noUseGraphic = true;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot; i.UseSound = Terraria.ID.SoundID.Item20; i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0); i.rare = Terraria.ID.ItemRarityID.Green;
        i.shoot = ModProjectile.getTypeByName('MeteorFistProj');
        this.MenuCategories.push('rogue');
    }
    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const stealth = ConsumeStealthStrike(player, item);
        const t = Number(ModProjectile.getTypeByName('MeteorFistProj') || type || 0); if (!(t > 0)) return false;
        const dmg = Math.max(1, Math.floor(N(damage) > 0 ? N(damage) : N(item.damage, 31)));
        const id = NewProjectile(source(player, item), position, velocity, t, dmg, N(knockBack, 5.75), Terraria.PlayerIndex(player), 0, 0, 0, null);
        const p = getSpawn(id);
        if (p) { MarkRogueProjectile(p, 'MeteorFist', false); if (stealth) MarkStealthStrike(p, 'MeteorFist', false); }
        return false;
    }
    AddRecipes() { this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.MeteoriteBar, 10).AddTile(Terraria.ID.TileID.Anvils).Register(); }
}
