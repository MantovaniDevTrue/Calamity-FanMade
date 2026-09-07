import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';

const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function setWulfrumProsthesisPose(player) {
    const center = SafePlayerCenter(player), aim = AimFromMouse(player, center);
    const dir = FaceAim(player, aim);
    const gravDir = N(player.gravDir, 1) < 0 ? -1 : 1;
    const max = Math.max(1, N(player.itemTimeMax, 24)), time = Math.max(0, N(player.itemTime, 0));
    const progress = 1 - time / max;
    const mounted = player.MountedCenter;
    let px = N(mounted.X) - 2 * dir, py = N(mounted.Y) - gravDir;
    let rotation = Math.atan2(N(aim.Y), N(aim.X));
    if (progress < 0.7) {
        const retreat = (1 - Math.pow(1 - (0.7 - progress) / 0.7, 4)) * 4;
        px -= Math.cos(rotation) * retreat; py -= Math.sin(rotation) * retreat;
    }
    if (progress < 0.4) rotation += -0.45 * Math.pow((0.4 - progress) / 0.4, 2) * dir * gravDir;
    CleanHoldStyleTLPro(player, rotation, Vector2.new(px, py), Vector2.new(28, 14), Vector2.new(-8, 0), { stepDisplace: true });
}

export class WulfrumProsthesis extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/WulfrumProsthesis';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 34;
        i.height = 42;
        i.damage = 18;
        i.magic = true;
        i.mana = 10;
        i.useAnimation = 24;
        i.useTime = 24;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 3;
        i.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        i.rare = Terraria.ID.ItemRarityID.Blue;
        i.UseSound = Terraria.ID.SoundID.Item91;
        i.autoReuse = true;
        i.shoot = ModProjectile.getTypeByName('WulfrumBolt');
        i.shootSpeed = 18;
        this.MenuCategories.push('magic');
    }

    HoldStyle(item, player) { setWulfrumProsthesisPose(player); }
    UseStyle(item, player) { setWulfrumProsthesisPose(player); }

    AddRecipes() {
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 10).AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
