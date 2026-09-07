import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { SpawnProjectile } from './../../../../Core/SeaKingArsenalRuntime.js';

const { Vector2 } = Modules;
export class Waywasher extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/Waywasher';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 30;
        item.height = 30;
        item.damage = 16;
        item.magic = true;
        item.mana = 4;
        item.useTime = 15;
        item.useAnimation = 15;
        item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        item.noMelee = true;
        item.knockBack = 2.5;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.UseSound = Terraria.ID.SoundID.Item8;
        item.autoReuse = true;
        item.shoot = ModProjectile.getTypeByName('WaywasherProj');
        item.shootSpeed = 12;
        this.MenuCategories.push('magic');
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const source = player.GetProjectileSource_Item(item);
        const spread = Vector2.new(Number(velocity.X) + (Math.random() * 2 - 1), Number(velocity.Y) + (Math.random() * 2 - 1));
        SpawnProjectile(source, position, spread, type, damage, knockBack, Terraria.PlayerIndex(player));
        return false;
    }
}
