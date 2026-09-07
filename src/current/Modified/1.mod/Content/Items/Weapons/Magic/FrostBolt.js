import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';
import { AimFromMouse, CleanHoldStyleTLPro, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';

let AnyIceBlockGroup = null;

const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function setFrostBoltPose(player) {
    const center = SafePlayerCenter(player);
    const aim = AimFromMouse(player, center);
    FaceAim(player, aim);
    const gravDir = N(player.gravDir, 1) < 0 ? -1 : 1;
    const reverseAngle = Math.atan2(-N(aim.Y), -N(aim.X));
    const armRotation = reverseAngle * gravDir + Math.PI / 2;
    try { player.SetCompositeArmFront(true, Terraria.Player.CompositeArmStretchAmount.Full, armRotation); } catch (_) { }
    const itemRotation = armRotation + (Math.PI / 2) * gravDir;
    const mounted = player.MountedCenter;
    const itemPosition = Vector2.new(N(mounted.X) + Math.cos(itemRotation) * 4, N(mounted.Y) + Math.sin(itemRotation) * 4);
    CleanHoldStyleTLPro(player, itemRotation, itemPosition, Vector2.new(34, 38), Vector2.new(-24, 4));
}


export class FrostBolt extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Magic/FrostBolt';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ItemID.AmethystStaff);
        this.Item.width = 34;
        this.Item.height = 38;
        this.Item.damage = 25;
        this.Item.magic = true;
        this.Item.mana = 8;
        this.Item.useTime = 30;
        this.Item.useAnimation = 30;
        this.Item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        this.Item.noMelee = true;
        this.Item.knockBack = 3.5;
        this.Item.value = Terraria.Item.buyPrice(0, 1, 0, 0);
        this.Item.rare = Terraria.ID.ItemRarityID.Green;
        this.Item.UseSound = Terraria.ID.SoundID.Item20;
        this.Item.autoReuse = true;
        this.Item.shoot = ModProjectile.getTypeByName('FrostBoltProjectile');
        this.Item.shootSpeed = 8.0;
        this.MenuCategories.push('magic');
    }

    UseStyle(item, player) { setFrostBoltPose(player); }

    AddRecipeGroups() {
        if (AnyIceBlockGroup) return;
        const id = Terraria.ID.ItemID;
        const types = [id.IceBlock, id.PurpleIceBlock, id.RedIceBlock, id.PinkIceBlock]
            .map(Number).filter(type => Number.isFinite(type) && type > 0);
        if (types.length) AnyIceBlockGroup = ModRecipe.CreateRecipeGroup('Any Ice Block', types);
    }

    AddRecipes() {
        const recipe = this.CreateRecipe();
        if (AnyIceBlockGroup) recipe.AddRecipeGroup(AnyIceBlockGroup, 20);
        else recipe.AddIngredient(Terraria.ID.ItemID.IceBlock, 20);
        recipe
            // Astral Snow is not in this pre-Hardmode port yet, so the official AnySnowBlock
            // group currently resolves to its only available member: vanilla Snow Block.
            .AddIngredient(Terraria.ID.ItemID.SnowBlock, 10)
            .AddIngredient(Terraria.ID.ItemID.Shiverthorn, 2)
            .AddIngredient(Terraria.ID.ItemID.Sapphire, 1)
            .AddTile(Terraria.ID.TileID.Bookcases)
            .Register();
    }
}
