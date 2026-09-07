import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function findSlot(player, type) {
    for (let i = 0; i < 58; i++) {
        const it = player.inventory[i];
        if (it && Number(it.type) === Number(type) && Number(it.stack) > 0)
            return i;
    }
    return -1;
}


function setWulfrumBlunderbussPose(player) {
    const center = SafePlayerCenter(player);
    const aim = AimFromMouse(player, center);
    const dir = FaceAim(player, aim);
    const gravDir = Number(player.gravDir) < 0 ? -1 : 1;
    const max = Math.max(1, Number(player.itemTimeMax) || 55);
    const time = Math.max(0, Number(player.itemTime) || 0);
    const progress = 1 - time / max;

    // Same recoil curve used by the PC item. UseStyle and UseItemFrame are
    // folded together because TLPro has no separate ModItem.UseItemFrame hook.
    let armRotation = Math.atan2(-Number(aim.Y), -Number(aim.X)) * gravDir + Math.PI / 2;
    if (progress < 0.4)
        armRotation += -0.45 * Math.pow((0.4 - progress) / 0.4, 2) * dir;
    try { player.SetCompositeArmFront(true, Terraria.Player.CompositeArmStretchAmount.Full, armRotation); } catch (_) { }

    // A simplified reload/back-arm pose is safer than probing tML's ToStretchAmount
    // extension through the mobile bridge, while preserving the visible animation.
    if (progress > 0.5 && progress < 0.9) {
        try { player.SetCompositeArmBack(true, Terraria.Player.CompositeArmStretchAmount.Quarter, armRotation + 0.52 * dir); } catch (_) { }
    }

    const itemRotation = armRotation + (Math.PI / 2) * gravDir;
    const mounted = player.MountedCenter;
    const itemPosition = Vector2.new(Number(mounted.X) + Math.cos(itemRotation) * 7, Number(mounted.Y) + Math.sin(itemRotation) * 7);
    CleanHoldStyleTLPro(player, itemRotation, itemPosition, Vector2.new(46, 16), Vector2.new(-13, 3));
}

function consumeOne(player, type) {
    const i = findSlot(player, type);
    if (i < 0)
        return false;
    const it = player.inventory[i];
    it.stack = Number(it.stack) - 1;
    if (it.stack <= 0)
        it.TurnToAir();
    return true;
}

export class WulfrumBlunderbuss extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Ranged/WulfrumBlunderbuss';
        this.ResearchUnlockCount = 1;
        this.Stored = Object.create(null);
    }

    SetDefaults() {
        const i = this.Item;
        i.width = 46;
        i.height = 16;
        i.damage = 11;
        i.ranged = true;
        i.useTime = 55;
        i.useAnimation = 55;
        i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true;
        i.knockBack = 2.25;
        i.value = Terraria.Item.buyPrice(0, 0, 50, 0);
        i.rare = Terraria.ID.ItemRarityID.Blue;
        i.UseSound = Terraria.ID.SoundID.Item36;
        i.autoReuse = false;
        i.shoot = ModProjectile.getTypeByName('WulfrumScrapBullet');
        i.shootSpeed = 15;
        this.MenuCategories.push('ranged');
    }

    CanUseItem(item, player) {
        const key = String(Number(Terraria.PlayerIndex(player)));
        if (Number(this.Stored[key] || 0) > 0)
            return true;
        const scrap = Number(ModItem.getTypeByName('WulfrumMetalScrap') || 0);
        return findSlot(player, scrap) >= 0 || findSlot(player, Terraria.ID.ItemID.MusketBall) >= 0;
    }

    UseStyle(item, player) { setWulfrumBlunderbussPose(player); }

    Shoot(item, player, pos, vel, type, damage, kb) {
        const key = String(Number(Terraria.PlayerIndex(player)));
        let stored = Number(this.Stored[key] || 0);
        if (stored <= 0) {
            const scrap = Number(ModItem.getTypeByName('WulfrumMetalScrap') || 0);
            if (!(consumeOne(player, scrap) || consumeOne(player, Terraria.ID.ItemID.MusketBall)))
                return false;
            stored = 30;
        }
        this.Stored[key] = stored - 1;
        const base = Math.atan2(Number(vel.Y), Number(vel.X));
        const source = player.GetProjectileSource_Item(item);
        for (let k = 0; k < 6; k++) {
            const a = base + (Math.random() - .5) * 0.55;
            const speed = 22.5 + Math.random() * 7.5;
            NewProjectile(source, pos, Vector2.new(Math.cos(a) * speed, Math.sin(a) * speed), Number(type), Math.max(1, damage), kb, Terraria.PlayerIndex(player), 0, 0, 0, null);
        }
        return false;
    }

    AddRecipes() {
        this.CreateRecipe().AddIngredient(ModItem.getTypeByName('WulfrumMetalScrap'), 10).AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
