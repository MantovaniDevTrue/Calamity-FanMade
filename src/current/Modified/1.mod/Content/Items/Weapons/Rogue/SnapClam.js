import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, Rotate } from './../../../../Core/RogueRuntime.js';

export class SnapClam extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/SnapClam';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const item = this.Item;
        item.width = 26;
        item.height = 16;
        item.damage = 14;
        item.melee = false;
        item.ranged = false;
        item.magic = false;
        item.summon = false;
        item.noMelee = true;
        item.noUseGraphic = true;
        item.useTime = 25;
        item.useAnimation = 25;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.knockBack = 3;
        item.UseSound = Terraria.ID.SoundID.Item1;
        item.autoReuse = true;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.shoot = ModProjectile.getTypeByName('SnapClamProj');
        item.shootSpeed = 12;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        if (!ConsumeStealthStrike(player, item))
            return true;
        const stealthType = Number(ModProjectile.getTypeByName('SnapClamStealth') || 0);
        if (!(stealthType > 0))
            return false;
        for (let i = 0; i < 5; i++) {
            const radians = ((i - 2) * 4 + (Math.random() - 0.5) * 5) * Math.PI / 180;
            const speedScale = 0.82 + Math.random() * 0.28;
            SpawnMarkedProjectile(player, item, position, Rotate(velocity, radians, speedScale), stealthType, Math.max(1, Number(damage) / 5), Number(knockBack) / 5, 'SnapClam', true, false);
        }
        return false;
    }
}
