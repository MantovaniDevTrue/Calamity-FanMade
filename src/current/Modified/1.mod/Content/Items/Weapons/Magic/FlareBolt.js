import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';

const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

function setFlarePose(player) {
    const center = SafePlayerCenter(player);
    const aim = AimFromMouse(player, center);
    FaceAim(player, aim);
    const gravDir = N(player.gravDir, 1) < 0 ? -1 : 1;

    // UseItemFrame original: (player.Center - mouseWorld).ToRotation() * gravDir + Pi/2.
    const reverseAngle = Math.atan2(-N(aim.Y), -N(aim.X));
    const armRotation = reverseAngle * gravDir + Math.PI / 2;
    try {
        const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
        player.SetCompositeArmFront(true, stretch, armRotation);
    } catch (_) { }

    // UseStyle original deriva a rotação da frente do braço e ancora a arma 4 px
    // à frente do MountedCenter com pivô (-24, 4).
    const itemRotation = armRotation + (Math.PI / 2) * gravDir;
    const mounted = player.MountedCenter;
    const itemPosition = Vector2.new(
        N(mounted.X) + Math.cos(itemRotation) * 4,
        N(mounted.Y) + Math.sin(itemRotation) * 4
    );
    CleanHoldStyleTLPro(player, itemRotation, itemPosition, Vector2.new(34, 38), Vector2.new(-24, 4));
}

export class FlareBolt extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Magic/FlareBolt'; this.ResearchUnlockCount = 1; }

    SetDefaults() {
        const i = this.Item;
        i.width = 34; i.height = 38; i.damage = 40; i.magic = true; i.mana = 40;
        i.useAnimation = 80; i.useTime = 80; i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true; i.knockBack = 5;
        i.value = Terraria.Item.buyPrice(0, 4, 0, 0); i.rare = Terraria.ID.ItemRarityID.Orange;
        i.autoReuse = true; i.shoot = ModProjectile.getTypeByName('FlareBoltProjectile'); i.shootSpeed = 6.5;
        // O som de disparo do original é disparado pelo projétil após a carga.
        this.MenuCategories.push('magic');
    }

    UseStyle(item, player) { setFlarePose(player); }

    AddRecipes() {
        this.CreateRecipe().AddIngredient(Terraria.ID.ItemID.HellstoneBar, 10)
            .AddIngredient(Terraria.ID.ItemID.Fireblossom, 5).AddIngredient(Terraria.ID.ItemID.Ruby, 1)
            .AddTile(Terraria.ID.TileID.Bookcases).Register();
    }
}
