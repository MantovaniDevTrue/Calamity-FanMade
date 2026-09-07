import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile, StealthDamageMultiplier, Rotate } from './../../../../Core/RogueRuntime.js';

export class FeatherKnife extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/FeatherKnife';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.RoguePrefix = true;
        const item = this.Item;
        item.width = 18;
        item.height = 32;
        item.damage = 22;
        item.melee = false;
        item.ranged = false;
        item.magic = false;
        item.summon = false;
        item.noMelee = true;
        item.noUseGraphic = true;
        item.useAnimation = 30;
        item.useTime = 30;
        item.knockBack = 2;
        item.autoReuse = true;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.UseSound = Terraria.ID.SoundID.Item1;
        item.shoot = ModProjectile.getTypeByName('FeatherKnifeProjectile');
        item.shootSpeed = 25;
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        this.MenuCategories.push('thrown');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const projectileType = Number(ModProjectile.getTypeByName('FeatherKnifeProjectile') || type || 0);
        if (!(projectileType > 0)) return false;
        const stealth = ConsumeStealthStrike(player, item);
        const damageMultiplier = stealth ? StealthDamageMultiplier(player, 'FeatherKnife') : 1;
        if (!stealth) {
            SpawnMarkedProjectile(player, item, position, velocity, projectileType, damage, knockBack, 'FeatherKnife', false, false);
            return false;
        }
        let spreadDegrees = 6;
        for (let k = 0; k < 4; k++) {
            const jitterX = (Math.random() * 7 - 3);
            const jitterY = (Math.random() * 7 - 3);
            const speedX = Number(velocity.X) + jitterX;
            const speedY = Number(velocity.Y) + jitterY;
            const v = Rotate({ X: speedX, Y: speedY }, spreadDegrees * Math.PI / 180, 1);
            SpawnMarkedProjectile(player, item, position, v, projectileType, damage * damageMultiplier, knockBack, 'FeatherKnife', true, false);
            spreadDegrees -= 2 + Math.floor(Math.random() * 4);
        }
        return false;
    }

    AddRecipes() {
        this.CreateRecipe()
            .AddIngredient(ModItem.getTypeByName('AerialiteBar'), 7)
            .AddTile(Terraria.ID.TileID.Anvils)
            .Register();
    }
}
