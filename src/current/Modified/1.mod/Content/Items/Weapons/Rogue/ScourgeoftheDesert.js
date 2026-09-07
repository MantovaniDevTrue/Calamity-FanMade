import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import {

    ConsumeStealthStrike,
    SpawnMarkedProjectile,
    StealthDamageMultiplier,
    Rotate
} from './../../../../Core/RogueRuntime.js';
export class ScourgeoftheDesert extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/ScourgeoftheDesert';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 112;
        i.height = 116;
        i.damage = 12;
        i.melee = false;
        i.ranged = false;
        i.magic = false;
        i.summon = false;
        i.noMelee = true;
        i.noUseGraphic = true;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.useAnimation = 24;
        i.useTime = 24;
        i.knockBack = 3.5;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Green;
        i.shoot = ModProjectile.getTypeByName('ScourgeoftheDesertProj');
        i.shootSpeed = 12;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, pos, vel, type, damage, kb) {
        const stealth = ConsumeStealthStrike(player, item);
        if (!stealth)
            return true;
        const mult = StealthDamageMultiplier(player, 'ScourgeoftheDesert');
        for (const deg of [-5, 5]) {
            const p = SpawnMarkedProjectile(player, item, pos, Rotate(vel, deg * Math.PI / 180), type, damage * mult, kb, 'ScourgeoftheDesert', true, false);
            if (p)
                p.penetrate = 4;
        }
        return false;
    }
}
