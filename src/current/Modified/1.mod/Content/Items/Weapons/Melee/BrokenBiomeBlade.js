import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModRecipe } from './../../../../TL/ModRecipe.js';
import { PlayItemSound } from './../../../../Common/Snippets/LegacySoundCompat.js';
import {
    BrokenBiomeAttunement,
    BrokenBiomeBladeState,
    BrokenBiomeBladeMultiplier,
    SeedBrokenBiomeProjectile,
    SetBrokenBiomeBladeType,
    BrokenBiomeRightDown,
    MarkBrokenBiomeComboUsed,
    AttunementName,
    StopBrokenBiomeHeldAttack,
    RegisterBrokenBiomeHeldAttack,
    BrokenBiomeHeldAttackActive
} from './../../../../Core/BrokenBiomeBladeRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let AnyWoodenSwordGroup = null;
let AnyStoneBlockGroup = null;

function N(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function ownerIndex(player) { return Math.max(0, Math.floor(N(Terraria.PlayerIndex(player), N(Terraria.Main.myPlayer)))); }
function rightDown(player, item = null) {
    if (item) {
        try { if (BrokenBiomeRightDown(item, player)) return true; } catch (e) { }
    }
    try { if (Math.floor(N(player.altFunctionUse)) === 2) return true; } catch (e) { }
    try { if (player.controlUseTile === true) return true; } catch (e) { }
    return false;
}
function aimVector(player, fallbackSpeed = 12) {
    const c = Terraria.PlayerCenter(player);
    let dx = (N(Terraria.PlayerDirection(player), 1) || 1) * 100, dy = 0;
    try { const m = Terraria.Main.MouseWorld; if (m) { dx = N(m.X) - N(c.X); dy = N(m.Y) - N(c.Y); } } catch (e) { }
    let len = Math.sqrt(dx * dx + dy * dy);
    if (!(len > 0.0001)) { dx = N(Terraria.PlayerDirection(player), 1) || 1; dy = 0; len = 1; }
    return Vector2.new(dx / len * fallbackSpeed, dy / len * fallbackSpeed);
}

function brokenBiomeGrounded(player) {
    try {
        const r = Terraria.PlayerRect(player);
        const x = N(r.X) + 2;
        const y = N(r.Y) + N(r.Height);
        const w = Math.max(4, Math.floor(N(r.Width) - 4));
        const h = 4;
        try {
            const solidTiles = Terraria.Collision['bool SolidTiles(Vector2 position, int width, int height)'];
            if (typeof solidTiles === 'function' && solidTiles(Vector2.new(x, y), w, h) === true) return true;
        } catch (e) { }
        try {
            const solidOrSloped = Terraria.WorldGen['bool SolidOrSlopedTile(int x, int y)'];
            if (typeof solidOrSloped === 'function') {
                const minX = Math.max(1, Math.floor(x / 16));
                const minY = Math.max(1, Math.floor(y / 16));
                const maxX = Math.min(Math.floor(N(Terraria.Main.maxTilesX, minX + 1)) - 2, Math.floor((x + w - 1) / 16));
                const maxY = Math.min(Math.floor(N(Terraria.Main.maxTilesY, minY + 1)) - 2, Math.floor((y + h - 1) / 16));
                for (let ty = minY; ty <= maxY; ty++) {
                    for (let tx = minX; tx <= maxX; tx++) {
                        if (solidOrSloped(tx, ty) === true) return true;
                    }
                }
            }
        } catch (e) { }
        try {
            return Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'](Vector2.new(x, y), w, h) === true;
        } catch (e) { }
    } catch (e) { }
    return false;
}

function applyMode(item, attunement) {
    item.useAnimation = 30;
    item.useTime = 30;
    item.useTurn = true;
    item.knockBack = 5;
    item.autoReuse = true;
    item.shootSpeed = 12;
    item.melee = true;

    if (attunement === BrokenBiomeAttunement.None) {
        item.noUseGraphic = false;
        item.noMelee = false;
        item.channel = false;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.shoot = Terraria.ID.ProjectileID.PurificationPowder;
        // TLPro/IL2CPP: leave the nullable UseSound field untouched.
        // Unattuned Item1 is played through the numeric legacy-sound bridge in UseItem().
        return;
    }

    item.noUseGraphic = true;
    item.noMelee = true;
    // IMPORTANT: never assign null to Item.UseSound through TLPro's IL2CPP bridge.
    // il2cpp_field_set_value(..., null) aborts the native process on Android.
    if (attunement === BrokenBiomeAttunement.PureClarity) {
        item.channel = true;
        item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        item.shoot = ModProjectile.getTypeByName('PureClarity');
        item.shootSpeed = 0;
    } else if (attunement === BrokenBiomeAttunement.AridGrandeur) {
        item.channel = true;
        item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        item.shoot = ModProjectile.getTypeByName('AridGrandeur');
    } else if (attunement === BrokenBiomeAttunement.BitingEmbrace) {
        item.channel = true;
        item.useStyle = Terraria.ID.ItemUseStyleID.Shoot;
        item.shoot = ModProjectile.getTypeByName('BitingEmbrace');
    } else {
        item.channel = false;
        // Terraria's thrust style is numeric 3 on the supported mobile build.
        item.useStyle = (Terraria.ID.ItemUseStyleID.Thrust ?? 3);
        item.shoot = ModProjectile.getTypeByName('DecaysRetort');
    }
}
function uniquePositive(values) {
    const result = [];
    for (const value of values) {
        const n = Math.floor(N(value));
        if (n > 0 && !result.includes(n)) result.push(n);
    }
    return result;
}

export class BrokenBiomeBlade extends ModItem {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/BrokenBiomeBlade';
        this.ResearchUnlockCount = 1;
    }

    SetDefaults() {
        const item = this.Item;
        item.width = 36;
        item.height = 36;
        item.damage = 38;
        item.melee = true;
        item.useAnimation = 30;
        item.useTime = 30;
        item.useTurn = true;
        item.useStyle = Terraria.ID.ItemUseStyleID.Swing;
        item.shoot = Terraria.ID.ProjectileID.PurificationPowder;
        item.knockBack = 5;
        item.autoReuse = true;
        // CalamityGlobalItem.RarityOrangeBuyPrice = 5 gold.
        item.value = Terraria.Item.buyPrice(0, 5, 0, 0);
        item.rare = Terraria.ID.ItemRarityID.Orange;
        item.shootSpeed = 12;
        this.MenuCategories.push('melee');
    }

    PostSetupContent() { SetBrokenBiomeBladeType(this.Type); }
    AltFunctionUse() { return true; }

    ModifyWeaponDamage(item, player, damage) {
        return N(damage, 1) * BrokenBiomeBladeMultiplier(BrokenBiomeBladeState(item, player).main);
    }

    UseItem(item, player) {
        // The unattuned form is the only form that uses Terraria's normal Item1 swing sound.
        // Play it through the numeric bridge so no nullable LegacySoundStyle field writes occur.
        const state = BrokenBiomeBladeState(item, player);
        if (state.main === BrokenBiomeAttunement.None && !rightDown(player, item)) {
            try { PlayItemSound(1, Terraria.PlayerCenter(player), 0, 1); } catch (e) { }
        }
        return true;
    }

    CanUseItem(item, player) {
        if (rightDown(player, item)) return false;
        const state = BrokenBiomeBladeState(item, player);
        // TLPro/mobile timing normalization for the cold combo. The official projectile
        // uses extraUpdates=1, but that advances the held blade twice per rendered game
        // tick on this bridge and makes the sword outrun the player's hand. Run one AI
        // update per game tick and match the native item animation to the current combo
        // stage (15 / 20 / 50), preserving the official stage durations numerically.
        if (state.main === BrokenBiomeAttunement.BitingEmbrace) {
            const mode = ((Math.floor(N(state.combo)) % 3) + 3) % 3;
            const duration = mode === 0 ? 15 : (mode === 1 ? 20 : 50);
            item.useAnimation = duration;
            item.useTime = duration;
        } else {
            item.useAnimation = 30;
            item.useTime = 30;
        }
        // Hard overlap gate. TLPro can call the next auto-reuse cycle before an old
        // held projectile wrapper reports its final OnKill. owner + whoAmI + type
        // tracking now blocks a second Broken Biome Blade attack until the first
        // live projectile slot is actually gone.
        return !BrokenBiomeHeldAttackActive(ownerIndex(player));
    }

    CanShoot(item, player) {
        const state = BrokenBiomeBladeState(item, player);
        return state.main !== BrokenBiomeAttunement.None && !rightDown(player, item);
    }

    HoldItem(item, player) {
        const state = BrokenBiomeBladeState(item, player);
        applyMode(item, state.main);
        if (state.lastAppliedMain !== state.main) {
            state.lastAppliedMain = state.main;
            try { tl.log(`[CalamityPort BrokenBiomeBlade] held mode applied=${AttunementName(state.main)}; slot=${state.slot}; shoot=${Math.floor(N(item.shoot))}; noUseGraphic=${item.noUseGraphic === true}; useSoundField=untouched.`); } catch (e) { }
        }
        if (state.main !== BrokenBiomeAttunement.BitingEmbrace) state.combo = 0;

        if (brokenBiomeGrounded(player)) state.canLunge = 1;

        // Secondary-use capture is intentionally handled in BrokenBiomeBladeInputPlayer.
        // TLPro calls HoldItem after the native ItemCheck path, where mobile controlUseTile
        // may already have been consumed/reset. Capturing it in PreItemCheck/PostItemCheck
        // preserves the official hold-to-attune behavior on Android.
    }

    UpdateInventory(item, player) {
        // Combo timeout is maintained from GameUpdateCount in BrokenBiomeBladeState.
        // This avoids binding inventory state to unstable IL2CPP Item wrapper identity.
    }

    Shoot(item, player, position, velocity, type, damage, knockBack) {
        const state = BrokenBiomeBladeState(item, player);
        const attunement = state.main;
        if (attunement === BrokenBiomeAttunement.None || rightDown(player, item)) return false;

        const owner = ownerIndex(player);
        const source = player.GetProjectileSource_Item(item);
        const aim = aimVector(player, 12);
        let projectileType = 0;
        let seed = {};

        let nextPureSwingDir = 0;
        if (attunement === BrokenBiomeAttunement.PureClarity) {
            projectileType = ModProjectile.getTypeByName('PureClarity');
            // Do NOT commit the alternating swing direction until a real held projectile
            // is created. TLPro may call Shoot again while the previous held attack is
            // still locked; toggling here would consume invisible alternations and make
            // consecutive visible Pure Clarity swings appear to travel the same way.
            nextPureSwingDir = state.pureSwingDir > 0 ? -1 : 1;
            seed = { aimX: N(aim.X), aimY: N(aim.Y), useAnimation: Math.max(1, Math.floor(N(item.useAnimation, 30))), swingDir: nextPureSwingDir };
        } else if (attunement === BrokenBiomeAttunement.AridGrandeur) {
            projectileType = ModProjectile.getTypeByName('AridGrandeur');
            seed = { aimX: N(aim.X), aimY: N(aim.Y) };
        } else if (attunement === BrokenBiomeAttunement.BitingEmbrace) {
            projectileType = ModProjectile.getTypeByName('BitingEmbrace');
            const mode = ((Math.floor(N(state.combo)) % 3) + 3) % 3;
            seed = { mode, maxTime: mode === 0 ? 15 : (mode === 1 ? 20 : 50), aimX: N(aim.X), aimY: N(aim.Y) };
            state.combo = (mode + 1) % 3;
            MarkBrokenBiomeComboUsed(state, 50);
        } else if (attunement === BrokenBiomeAttunement.DecaysRetort) {
            projectileType = ModProjectile.getTypeByName('DecaysRetort');
            seed = { maxTime: 26, canLunge: state.canLunge > 0, aimX: N(aim.X), aimY: N(aim.Y) };
            state.canLunge = 0;
        }

        if (!(projectileType > 0)) return false;
        const speed = attunement === BrokenBiomeAttunement.PureClarity ? Vector2.Zero : aim;
        // Official Cold/Evil attunements originate at player.Center; Default/Hot use the Shoot position.
        const spawnPosition = (attunement === BrokenBiomeAttunement.BitingEmbrace || attunement === BrokenBiomeAttunement.DecaysRetort)
            ? Terraria.PlayerCenter(player)
            : position;
        // HARD TLPro invariant: one Broken Biome Blade held attack per player.
        // Never create a second swing while the current live projectile slot exists.
        // This is safer than repeatedly calling Kill() on an unstable IL2CPP wrapper.
        if (BrokenBiomeHeldAttackActive(owner)) return false;
        // Clear a stale lock only if one survived while its projectile already died.
        StopBrokenBiomeHeldAttack(owner, 'stale-before-new-swing');
        const index = NewProjectile(source, spawnPosition, speed, projectileType, damage, knockBack, owner, 0, 0, 0, null);
        if (index >= 0) {
            // The official Pure Clarity reverses SwingDir only when a new animation
            // actually begins. Commit the alternation here, after successful spawn.
            if (attunement === BrokenBiomeAttunement.PureClarity) state.pureSwingDir = nextPureSwingDir;
            SeedBrokenBiomeProjectile(index, owner, seed);
            RegisterBrokenBiomeHeldAttack(owner, index, projectileType, attunement);
        }
        try { tl.log(`[CalamityPort BrokenBiomeBlade] attack spawned=${AttunementName(attunement)}; heldProjectile=${index}; type=${projectileType}; slot=${state.slot}; singleHeld=true${attunement === BrokenBiomeAttunement.PureClarity ? `; swingDir=${nextPureSwingDir}` : ''}.`); } catch (e) { }
        return false;
    }

    AddRecipeGroups() {
        if (!AnyWoodenSwordGroup) {
            const id = Terraria.ID.ItemID;
            const wooden = uniquePositive([
                id.WoodenSword, id.BorealWoodSword, id.PalmWoodSword, id.RichMahoganySword,
                id.EbonwoodSword, id.ShadewoodSword, id.PearlwoodSword, id.AshWoodSword
            ]);
            if (wooden.length) AnyWoodenSwordGroup = ModRecipe.CreateRecipeGroup('Any Wooden Sword', wooden);
        }
        if (!AnyStoneBlockGroup) {
            const id = Terraria.ID.ItemID;
            const stone = uniquePositive([id.StoneBlock, id.EbonstoneBlock, id.CrimstoneBlock, id.PearlstoneBlock]);
            if (stone.length) AnyStoneBlockGroup = ModRecipe.CreateRecipeGroup('Any Stone Block', stone);
        }
    }

    AddRecipes() {
        const aerialite = ModItem.getTypeByName('AerialiteBar');
        if (!(aerialite > 0)) return;
        const recipe = this.CreateRecipe();
        if (AnyWoodenSwordGroup) recipe.AddRecipeGroup(AnyWoodenSwordGroup, 1);
        else recipe.AddIngredient(Terraria.ID.ItemID.WoodenSword, 1);
        recipe
            .AddIngredient(aerialite, 10)
            .AddIngredient(Terraria.ID.ItemID.HellstoneBar, 10)
            .AddIngredient(Terraria.ID.ItemID.DirtBlock, 50);
        if (AnyStoneBlockGroup) recipe.AddRecipeGroup(AnyStoneBlockGroup, 50);
        else recipe.AddIngredient(Terraria.ID.ItemID.StoneBlock, 50);
        recipe.AddTile(Terraria.ID.TileID.Anvils).Register();
    }
}
