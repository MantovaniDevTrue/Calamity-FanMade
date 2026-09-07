import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { CountOwned } from './../../../../Core/PerforatorRewardRuntime.js';
import { ConsumeStealthStrike, GetRogueState, SpawnMarkedProjectile, Rotate } from './../../../../Core/RogueRuntime.js';

export class SandDollar extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/SandDollar';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const item = this.Item;
        item.width = 30;
        item.height = 28;
        item.damage = 26;
        item.melee = false;
        item.ranged = false;
        item.magic = false;
        item.summon = false;
        item.noMelee = true;
        item.noUseGraphic = true;
        item.useTime = 15;
        item.useAnimation = 15;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.knockBack = 3.5;
        item.autoReuse = true;
        item.UseSound = Terraria.ID.SoundID.Item1;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.shoot = ModProjectile.getTypeByName('SandDollarProj');
        item.shootSpeed = 14;
        this.MenuCategories.push('thrown');
    }

    CanUseItem(item, player) {
        const state = GetRogueState(player);
        return CountOwned(player, Number(item.shoot)) < 2 || !!(state && state.StealthStrikeAvailable());
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        if (!ConsumeStealthStrike(player, item))
            return true;
        const stealthType = Number(ModProjectile.getTypeByName('SandDollarStealth') || 0);
        if (!(stealthType > 0))
            return false;
        for (let i = 0; i < 2; i++) {
            const radians = ((i === 0 ? -2 : 2) + (Math.random() - 0.5) * 3) * Math.PI / 180;
            SpawnMarkedProjectile(player, item, position, Rotate(velocity, radians, 1.5), stealthType, damage, knockBack, 'SandDollar', true, false);
        }
        return false;
    }
}
