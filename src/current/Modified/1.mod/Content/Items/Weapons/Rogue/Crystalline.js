import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier } from './../../../../Core/RogueRuntime.js';

export class Crystalline extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/Crystalline';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 50;
        i.height = 50;
        i.damage = 16;
        i.crit = 4;
        i.melee = false;
        i.ranged = false;
        i.magic = false;
        i.summon = false;
        i.noMelee = true;
        i.noUseGraphic = true;
        i.useAnimation = 18;
        i.useTime = 18;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.knockBack = 3;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Green;
        i.shoot = ModProjectile.getTypeByName('CrystallineProj');
        i.shootSpeed = 10;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const pType = Number(ModProjectile.getTypeByName('CrystallineProj') || type || 0);
        if (!(pType > 0)) return false;
        const stealth = ConsumeStealthStrike(player, item);
        const mult = stealth ? StealthDamageMultiplier(player, 'Crystalline') : 1;
        SpawnMarkedProjectile(player, item, position, velocity, pType, damage * mult, knockBack, 'Crystalline', stealth, false);
        return false;
    }

    AddRecipes() {
        const knife = Number(ModItem.getTypeByName('WulfrumKnife') || 0);
        if (!(knife > 0)) return;
        this.CreateRecipe()
            .AddIngredient(knife, 1)
            .AddIngredient(Terraria.ID.ItemID.Diamond, 3)
            .AddIngredient(Terraria.ID.ItemID.FallenStar, 3)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
