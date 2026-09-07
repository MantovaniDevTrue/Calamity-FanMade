import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
export class SandstreamScepter extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/SandstreamScepter';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() { try { Terraria.Item.staff[this.Type] = true; } catch (_) { } }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.AmethystStaff);
        this.Item.width = 50;
        this.Item.height = 56;
        this.Item.damage = 16;
        this.Item.magic = true;
        this.Item.mana = 7;
        this.Item.useTime = 20;
        this.Item.useAnimation = 20;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 1;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.UseSound = Terraria.ID.SoundID.Item72;
        this.Item.autoReuse = true;
        this.Item.shoot = ModProjectile.getTypeByName('Sandstream');
        this.Item.shootSpeed = 11;
        this.MenuCategories.push('magic');
    }

    ModifyShootStats(item, player, stats) {
        const vx = Number(stats.velocity.X);
        const vy = Number(stats.velocity.Y);
        const length = Math.sqrt(vx * vx + vy * vy);
        const direction = length > 0.001
            ? Vector2.new(vx / length, vy / length)
            : Vector2.new(Terraria.PlayerDirection(player) || 1, 0);
        stats.position = Vector2.Add(stats.position, Vector2.Multiply(direction, 55));
    }
}
