import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';

export class ContaminatedBile extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/ContaminatedBile';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const item = this.Item;
        item.width = 24;
        item.height = 24;
        item.damage = 16;
        item.melee = false;
        item.ranged = false;
        item.magic = false;
        item.summon = false;
        item.noMelee = true;
        item.noUseGraphic = true;
        item.useAnimation = 40;
        item.useTime = 40;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.knockBack = 4.5;
        item.rare = Terraria.ID.ItemRarityID.Blue;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.UseSound = Terraria.ID.SoundID.Item106;
        item.autoReuse = true;
        item.shoot = ModProjectile.getTypeByName('ContaminatedBileFlask');
        item.shootSpeed = 12;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const stealth = ConsumeStealthStrike(player, item);
        SpawnMarkedProjectile(player, item, position, velocity, type, damage, knockBack, 'ContaminatedBile', stealth, false, 0, 0, 0);
        return false;
    }
}
