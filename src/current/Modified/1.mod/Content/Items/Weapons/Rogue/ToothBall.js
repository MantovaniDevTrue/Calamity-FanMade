import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import {

    ConsumeStealthStrike,
    SpawnMarkedProjectile,
    StealthDamageMultiplier
} from './../../../../Core/RogueRuntime.js';
export class ToothBall extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/ToothBall';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 30;
        i.height = 30;
        i.damage = 16;
        i.crit = 8;
        i.melee = false;
        i.ranged = false;
        i.magic = false;
        i.summon = false;
        i.noMelee = true;
        i.noUseGraphic = true;
        i.useAnimation = 16;
        i.useTime = 16;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        i.knockBack = 2.5;
        i.UseSound = Terraria.ID.SoundID.Item1;
        i.autoReuse = true;
        i.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        i.rare = Terraria.ID.ItemRarityID.Orange;
        i.shoot = ModProjectile.getTypeByName('ToothBallProjectile');
        i.shootSpeed = 16;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, pos, vel, type, damage, kb) {
        const stealth = ConsumeStealthStrike(player, item);
        SpawnMarkedProjectile(player, item, pos, vel, type, damage * (stealth ? StealthDamageMultiplier(player, 'ToothBall') : 1), kb, 'ToothBall', stealth, false, 1, 0, 0);
        return false;
    }
}
