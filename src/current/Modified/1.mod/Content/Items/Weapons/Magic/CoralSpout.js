import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { CoralSpoutActive, RegisterCoralAim } from './../../../Projectiles/Magic/PreHardmodeMagicBatch6Projectiles.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function source(player, item) { try { return player['IEntitySource GetProjectileSource_Item(Item item)'](item); } catch (_) { return null; } }

function setCoralPose(player) {
    const center = SafePlayerCenter(player);
    const aim = AimFromMouse(player, center);
    FaceAim(player, aim);
    const aimAngle = Math.atan2(N(aim.Y), N(aim.X));

    // UseItemFrame do PC aponta os dois braços diretamente para o cursor.
    try {
        const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
        player.SetCompositeArmBack(true, stretch, aimAngle - Math.PI / 2);
        player.SetCompositeArmFront(true, stretch, aimAngle - Math.PI / 2);
    } catch (_) { }

    // O PC usa GetFrontHandPosition. O bridge mobile não expõe esse caminho de
    // forma confiável, então reproduzimos a posição da mão Full a partir do
    // MountedCenter sem fazer reflection por frame.
    const mounted = player.MountedCenter;
    const hand = Vector2.new(N(mounted.X) + N(aim.X) * 10, N(mounted.Y) + N(aim.Y) * 10);
    CleanHoldStyleTLPro(player, aimAngle, hand, Vector2.new(32, 0), Vector2.new(-10, 8));
}

export class CoralSpout extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Magic/CoralSpout'; this.ResearchUnlockCount = 1; }

    SetDefaults() {
        const i = this.Item;
        i.width = 28; i.height = 30; i.damage = 9; i.magic = true; i.mana = 30;
        i.useAnimation = 26; i.useTime = 26; i.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        i.noMelee = true; i.channel = true; i.knockBack = 2; i.armorPenetration = 5;
        i.value = Terraria.Item.buyPrice(0, 2, 0, 0); i.rare = Terraria.ID.ItemRarityID.Green;
        i.UseSound = Terraria.ID.SoundID.Item17;
        i.autoReuse = true; i.shoot = ModProjectile.getTypeByName('CoralSpoutHoldout'); i.shootSpeed = 16;
        this.MenuCategories.push('magic');
    }

    CanUseItem(item, player) { return !CoralSpoutActive(Terraria.PlayerIndex(player)); }
    UseStyle(item, player) { setCoralPose(player); }

    Shoot(item, player, position, velocity, type, damage, kb) {
        const t = Number(ModProjectile.getTypeByName('CoralSpoutHoldout') || 0);
        if (!(t > 0)) return false;
        const a = AimFromMouse(player, player.MountedCenter, N(velocity?.X, 1), N(velocity?.Y));
        const owner = Terraria.PlayerIndex(player);
        RegisterCoralAim(owner, a);
        NewProjectile(source(player, item), player.MountedCenter, a, t,
            Math.max(1, Math.floor(N(damage) > 0 ? N(damage) : N(item.damage, 9))), N(kb, 2), owner, 0, 0, 0, null);
        return false;
    }

    AddRecipes() {
        const sea = Number(ModItem.getTypeByName('SeaRemains') || 0);
        if (sea > 0) this.CreateRecipe().AddIngredient(sea, 2).AddIngredient(Terraria.ID.ItemID.Coral, 5).AddTile(Terraria.ID.TileID.Bookcases).Register();
    }
}
