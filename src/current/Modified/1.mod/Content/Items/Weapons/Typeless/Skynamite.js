import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function source(player, item) { try { return player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { return null; } }

export class Skynamite extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Typeless/Skynamite'; this.ResearchUnlockCount = 99; }
    SetDefaults() {
        const i = this.Item;
        i.width = 8; i.height = 28; i.damage = 0; i.useAnimation = 40; i.useTime = 40;
        i.maxStack = 9999; i.consumable = true; i.shootSpeed = 5; i.shoot = ModProjectile.getTypeByName('AeroExplosive');
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing; i.noMelee = true; i.noUseGraphic = true;
        i.UseSound = Terraria.ID.SoundID.Item1; i.value = Terraria.Item.sellPrice(0, 0, 4, 0); i.rare = Terraria.ID.ItemRarityID.Blue;
        this.MenuCategories.push('thrown');
    }
    Shoot(item, player, position, velocity) {
        const t = Number(ModProjectile.getTypeByName('AeroExplosive') || 0); if (!(t > 0)) return false;
        NewProjectile(source(player, item), position, velocity, t, 1, 0, Terraria.PlayerIndex(player), 0, 0, 0, null);
        return false;
    }
    AddRecipes() { this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.Dynamite, 1).AddTile(Terraria.ID.TileID.SkyMill).Register(); }
}
