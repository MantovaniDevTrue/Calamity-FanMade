import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';

export class Turbulance extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/Turbulance';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 14;
        i.height = 14;
        i.damage = 20;
        i.melee = false;
        i.ranged = false;
        i.magic = false;
        i.summon = false;
        i.noMelee = true;
        i.noUseGraphic = true;
        i.useAnimation = 18;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.useTime = 18;
        i.knockBack = 5;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('TurbulanceProjectile');
        i.shootSpeed = 12;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const pType = Number(ModProjectile.getTypeByName('TurbulanceProjectile') || type || 0);
        if (!(pType > 0)) return false;
        const stealth = ConsumeStealthStrike(player, item);
        const mult = stealth ? StealthDamageMultiplier(player, 'Turbulance') : 1;
        SpawnMarkedProjectile(player, item, position, velocity, pType, damage * mult, knockBack, 'Turbulance', stealth, false);
        return false;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
