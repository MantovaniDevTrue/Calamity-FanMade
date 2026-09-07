import { Terraria } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ConsumeStealthStrike, SpawnMarkedProjectile } from './../../../../Core/RogueRuntime.js';
import { AimFromMouse, FaceAim, SafePlayerCenter } from './../Batch6HeldPose.js';

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function clamp01(v) { return Math.max(0, Math.min(1, N(v))); }
function circIn(v) { const x = clamp01(v); return 1 - Math.sqrt(Math.max(0, 1 - x * x)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function deg(v) { return v * Math.PI / 180; }

// TLPro equivalent of Calamity's ExtraArmAnimations.ThrowArmAnimationFast.
// ThrowingBrick hides the item sprite, so the composite arms are its entire
// visible use animation; leaving vanilla Swing here made the throw look broken.
function setFastThrowArms(player, item) {
    if (!player) return;
    const center = SafePlayerCenter(player);
    const aim = AimFromMouse(player, center);
    const dir = FaceAim(player, aim);
    const useAnimation = Math.max(1, N(item?.useAnimation, 25));
    const itemAnimation = Math.max(0, N(player.itemAnimation, useAnimation));
    const gg = clamp01(itemAnimation / useAnimation);
    const eased = circIn(gg);
    const angleToMouse = Math.atan2(N(aim.Y), N(aim.X));
    const facingCompensation = dir === 1 ? Math.PI : 0;
    const value1 = dir * -90;
    const value2 = dir * 180;
    const value3 = dir * -240;
    const front = angleToMouse + facingCompensation + deg(lerp(value2, value1, eased));
    const back = angleToMouse + facingCompensation + deg(lerp(value1, value3, eased));
    try {
        const full = Terraria.Player.CompositeArmStretchAmount.Full;
        player.SetCompositeArmFront(true, full, front);
        player.SetCompositeArmBack(true, full, back);
    } catch (_) { }
}

export class ThrowingBrick extends ModItem {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/ThrowingBrick'; this.ResearchUnlockCount = 99; }
    SetDefaults() {
        this.RoguePrefix = true;
        const i = this.Item;
        i.width = 28; i.height = 20; i.damage = 14; i.crit = 20; i.shootSpeed = 15;
        i.shoot = ModProjectile.getTypeByName('Brick'); i.useAnimation = 25; i.useTime = 25;
        i.useStyle = Terraria.ID.ItemUseStyleID.Swing; i.knockBack = 5; i.value = 4;
        i.rare = Terraria.ID.ItemRarityID.White; i.maxStack = 9999; i.UseSound = Terraria.ID.SoundID.Item1;
        i.consumable = true; i.noMelee = true; i.noUseGraphic = true; this.MenuCategories.push('thrown');
    }
    UseStyle(item, player) { setFastThrowArms(player, item); }
    Shoot(item, player, position, velocity, type, damage, kb) {
        const stealth = ConsumeStealthStrike(player, item), t = Number(ModProjectile.getTypeByName('Brick') || type || 0);
        const dmg = Math.max(1, Math.floor(Number(damage) || Number(item.damage) || 14));
        SpawnMarkedProjectile(player, item, position, velocity, t, dmg, kb, 'ThrowingBrick', stealth, false, stealth ? 1 : 0, 0, 0);
        return false;
    }
    AddRecipes() { this.CreateRecipe(10).AddIngredient(Terraria.ID.ItemID.RedBrick, 1).AddTile(Terraria.ID.TileID.WorkBenches).Register(); }
}
