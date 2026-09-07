import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, ReedMouth, SetReedArms, SafePlayerCenter } from './../Batch6HeldPose.js';

const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

function setItemInHand(player, frontArm) {
    const center = SafePlayerCenter(player);
    const baseAim = AimFromMouse(player, center);
    FaceAim(player, baseAim);

    const mouth = ReedMouth(player);
    const mouthAim = AimFromMouse(player, mouth, N(baseAim.X), N(baseAim.Y));
    const dir = N(Terraria.PlayerDirection(player), 1) < 0 ? -1 : 1;
    const gravDir = N(player.gravDir, 1) < 0 ? -1 : 1;
    let fullRotation = 0;
    try { fullRotation = N(player.fullRotation); } catch (_) { }

    // Código de pose do Calamity PC: mira pela boca e aplica o offset angular
    // específico da Reed antes do CleanHoldStyle.
    const pointingDirection = Math.atan2(N(mouthAim.Y), N(mouthAim.X)) + (Math.PI / 12) * dir * gravDir - fullRotation;
    CleanHoldStyleTLPro(player, pointingDirection, mouth, Vector2.new(50, 18), Vector2.new(-23, 6));
    SetReedArms(player, frontArm);
}

export class ReedBlowgun extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Ranged/ReedBlowgun'; this.ResearchUnlockCount = 1; }

    SetDefaults() {
        const i = this.Item;
        i.width = 22; i.height = 46; i.damage = 25; i.ranged = true;
        i.useTime = 32; i.useAnimation = 32; i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.holdStyle = 16;
        i.noMelee = true; i.knockBack = 4.5;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0); i.rare = Terraria.ID.ItemRarityID.Green;
        // No PC o UseSound é null. No TLPro deixamos sem atribuição para evitar
        // escrever null num campo nativo e o som real continua no projétil.
        i.autoReuse = true; i.shoot = ModProjectile.getTypeByName('PressurizedBubbleStream'); i.shootSpeed = 16;
        this.MenuCategories.push('ranged');
    }

    HoldStyle(item, player) { setItemInHand(player, false); }
    UseStyle(item, player) { setItemInHand(player, true); }

    ModifyShootStats(item, player, stats) {
        // RotatedByRandom(0.01f) do PC, mas sem substituir o spawn nativo.
        const a = (Math.random() - 0.5) * 0.02;
        const x = N(stats.velocity?.X), y = N(stats.velocity?.Y), c = Math.cos(a), sn = Math.sin(a);
        stats.velocity = Vector2.new(x * c - y * sn, x * sn + y * c);
    }

    Shoot(item, player, position, velocity, type, damage, kb) {
        // O PC não substitui o spawn da Reed. Deixar o Terraria criar o projétil
        // preserva damage/owner/hit registration no TLPro e mantém a pose acima intacta.
        return true;
    }

    AddRecipes() {
        const sea = Number(ModItem.getTypeByName('SeaRemains') || 0);
        if (sea > 0) this.CreateRecipe().AddIngredient(sea, 2).AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
