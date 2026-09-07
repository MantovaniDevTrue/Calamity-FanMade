import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import {

    ConsumeStealthStrike,
    SpawnMarkedProjectile,
    StealthDamageMultiplier,
    Rotate
} from './../../../../Core/RogueRuntime.js';
const { Vector2 } = Modules;
export class WulfrumKnife extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/WulfrumKnife';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 16;
        i.height = 40;
        i.damage = 11;
        i.melee = false;
        i.ranged = false;
        i.magic = false;
        i.summon = false;
        i.noMelee = true;
        i.noUseGraphic = true;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.useTime = 28;
        i.useAnimation = 28;
        i.knockBack = 1;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        i.rare = Terraria.ID.ItemRarityID.Blue;
        i.shoot = ModProjectile.getTypeByName('WulfrumKnifeProj');
        i.shootSpeed = 12;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, pos, vel, type, damage, kb) {
        const stealth = ConsumeStealthStrike(player, item);
        const mult = stealth ? StealthDamageMultiplier(player, 'WulfrumKnife') : 1;
        const speed = stealth ? 1.25 : 1;
        for (let k = -1; k <= 1; k++) {
            const angle = k * .065 + (Math.random() - .5) * .035;
            const v = Rotate(vel, angle, speed);
            const p = SpawnMarkedProjectile(player, item, pos, v, type, damage * mult, kb, 'WulfrumKnife', stealth, false);
            if (p && stealth)
                p.penetrate = 2;
        }
        return false;
    }

    AddRecipes() {
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 10).AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
