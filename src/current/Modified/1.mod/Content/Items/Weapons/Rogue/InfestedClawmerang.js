import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import {

    ConsumeStealthStrike,
    SpawnMarkedProjectile,
    StealthDamageMultiplier
} from './../../../../Core/RogueRuntime.js';
const { Vector2 } = Modules;
function NormalizeOr(vector, fallbackX = 1, fallbackY = 0) {
    const x = Number(vector && vector.X) || 0;
    const y = Number(vector && vector.Y) || 0;
    const length = Math.sqrt(x * x + y * y);
    if (length <= 0.001)
        return Vector2.new(fallbackX, fallbackY);
    return Vector2.new(x / length, y / length);
}

function ResolveMobileAim(player, fallbackVelocity) {
    const center = Terraria.PlayerCenter(player);
    try {
        const mouse = Terraria.Main.MouseWorld;
        if (mouse && center) {
            const dx = Number(mouse.X) - Number(center.X);
            const dy = Number(mouse.Y) - Number(center.Y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (Number.isFinite(distance) && distance > 12)
                return Vector2.new(dx / distance, dy / distance);
        }
    } catch (e) { }
    return NormalizeOr(fallbackVelocity, Number(Terraria.PlayerDirection(player)) || 1, 0);
}

export class InfestedClawmerang extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/InfestedClawmerang';
        this.ResearchUnlockCount = 1;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ItemID.Sets.GamepadWholeScreenUseRange[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ItemID.Sets.LockOnIgnoresCollision[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.RoguePrefix = true;
        try {
            this.CloneDefaults(Terraria.ID.ItemID.WoodenBoomerang);
        } catch (e) { }
        const item = this.Item;
        item.width = 26;
        item.height = 50;
        item.damage = 18;
        item.melee = false;
        item.ranged = false;
        item.magic = false;
        item.summon = false;
        item.noMelee = true;
        item.noUseGraphic = true;
        item.useTime = 20;
        item.useAnimation = 20;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.knockBack = 1.5;
        item.UseSound = Terraria.ID.SoundID.Item1;
        item.autoReuse = true;
        item.rare = Terraria.ID.ItemRarityID.Green;
        item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        item.shoot = ModProjectile.getTypeByName('InfestedClawmerangProj');
        item.shootSpeed = 15;
        this.MenuCategories.push('thrown');
    }

    ModifyShootStats(item, player, stats) {
        const direction = ResolveMobileAim(player, stats.velocity);
        const speed = Math.max(0.1, Number(item.shootSpeed) || 15);
        stats.velocity = Vector2.Multiply(direction, speed);
        stats.position = Terraria.PlayerCenter(player);
        if (Math.abs(Number(direction.X)) > 0.04)
            Terraria.SetPlayerDirection(player, Number(direction.X) < 0 ? -1 : 1);
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const stealth = ConsumeStealthStrike(player, item);
        if (!stealth)
            return true;
        SpawnMarkedProjectile(player, item, position, velocity, type, damage * StealthDamageMultiplier(player, 'InfestedClawmerang'), knockBack, 'InfestedClawmerang', true, false);
        return false;
    }
}
