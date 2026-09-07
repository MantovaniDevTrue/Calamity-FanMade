import { Terraria, Modules } from './../TL/ModImports.js';
import { ModPlayer } from './../TL/ModPlayer.js';
import { ModSystem } from './../TL/ModSystem.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ModItem } from './../TL/ModItem.js';
import { PlayerDB } from './../TL/PlayerDB.js';
import { ModLocalization } from './../TL/ModLocalization.js';
import { DustLoader } from './../TL/Loaders/DustLoader.js';
import { CleanupSlimeGodIfNoLivingPlayers } from './SlimeGodRuntime.js';
import { CleanupGiantClamIfNoLivingPlayers } from './GiantClamRuntime.js';
import { AndroidSound } from './../Common/Snippets/AndroidSound.js';
import { PlayItemSound, PlayRoarSound } from '../Common/Snippets/LegacySoundCompat.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './FrozenCubeTargetRuntime.js';

const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
// Use the TLPro wrapper: NativeClass Color.new() only accepts zero arguments on Android.
const { Vector2, Color } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const PlayNamedLegacySound = Terraria.Audio.SoundEngine['SoundEffectInstance PlaySound(LegacySoundStyle type, Vector2 position, float pitchOffset, float volumeScale)'];
let SaharaNamedLegacyLogged = false;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
let CachedBrittleStarType = 0;
let CachedSaharaSlicersType = 0;
let CachedSaharaBoltType = 0;
let CachedRottenBrainSpawnerType = 0;
let CachedRottenBrainCloudType = 0;
let CachedRogueItemTypes = null;
let CachedAerospecFeatherType = 0;
function ResolveModProjectileType(cacheValue, name) {
    if (cacheValue > 0)
        return cacheValue;
    return Number(ModProjectile.getTypeByName(name) || 0);
}

function ResolveModItemType(cacheValue, name) {
    if (cacheValue > 0)
        return cacheValue;
    return Number(ModItem.getTypeByName(name) || 0);
}

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function Tell(text, r = 120, g = 220, b = 255) {
    try {
        NewText(String(text), r, g, b);
    } catch (e) { }
}

function InventoryItem(player, index) {
    try {
        const inventory = player?.inventory;
        if (!inventory) return null;
        if (typeof inventory.get_Item === 'function') return inventory.get_Item(index);
        const getter = inventory['Item get_Item(int index)'];
        if (typeof getter === 'function') return getter(index);
    } catch (_) { }
    return null;
}

function EnsureDifficultySelector(player) {
    if (!player) return false;
    const type = Number(ModItem.getTypeByName('DeathModeToggle') || 0);
    if (!(type > 0)) return false;

    let empty = null;
    for (let i = 0; i < 50; i++) {
        const item = InventoryItem(player, i);
        if (!item) continue;
        const itemType = Number(item.type || 0);
        if (itemType === type) return true;
        if (!empty && itemType <= 0) empty = item;
    }

    if (empty) {
        try {
            empty['void SetDefaults(int Type, ItemVariant variant)'](type, null);
            empty.stack = 1;
            return true;
        } catch (_) { }
    }

    // Inventory full: use Terraria's own pickup path instead of overwriting an item.
    try {
        const source = null;
        player['void QuickSpawnItem(IEntitySource source, int item, int stack)'](source, type, 1);
        return true;
    } catch (_) { return false; }
}

function RipperSoundVolume(multiplier = 1) {
    const value = Number(Terraria.Main.soundVolume);
    const gameVolume = Number.isFinite(value) ? value : 1;
    return Clamp(gameVolume * Number(multiplier), 0, 1);
}

function PlayAdrenalineActivationSound() {
    if (Terraria.Main.netMode === 2)
        return false;
    const result = AndroidSound.PlayExclusive(
        'ripper-adrenaline-activation',
        'Sounds/Custom/AbilitySounds/AdrenalineActivate.ogg',
        RipperSoundVolume(1),
        null,
        null,
        1200,
        390,
        0,
        true
    );
    return result && result.ok === true;
}

function PlayAdrenalineMajorLossSound() {
    if (Terraria.Main.netMode === 2)
        return false;
    let getFixedBoi = false;
    try { getFixedBoi = Terraria.Main.zenithWorld === true; } catch (e) { }
    const file = getFixedBoi
        ? 'Sounds/Custom/AdrenalineMajorLossGFB.ogg'
        : 'Sounds/Custom/AdrenalineMajorLoss.ogg';
    const result = AndroidSound.PlayExclusive(
        'ripper-adrenaline-loss',
        file,
        RipperSoundVolume(1),
        null,
        null,
        1200,
        getFixedBoi ? 100 : 150,
        10,
        true
    );
    return result && result.ok === true;
}

export class CalamityPlayerState extends ModPlayer {
    constructor() {
        super();
        this.Loaded = false;
        this.RageUnlocked = false;
        this.AdrenalineUnlocked = false;
        this.PermanentHealthBonus = 0;
        this.ZoneSunkenSea = false;
        this.ZoneSulphurousSea = false;
        this.ZoneAbyss = false;
        this.ZoneAbyssLayer1 = false;
        this.ZoneAbyssLayer2 = false;
        this.ZoneAbyssLayer3 = false;
        this.ZoneAbyssLayer4 = false;
        this.ZoneAstral = false;
        this.Rage = 0;
        this.RageMax = 100;
        this.RageModeActive = false;
        this.RageCombatFrames = 0;
        this.RageReadyHeld = false;
        this.RageReadyTimer = 0;
        this.RageReadyDuration = 8 * 60;
        this.RageReadyGraceUsed = false;
        this.RageDuration = 9 * 60;
        this.RageDamageBoost = 0.35;
        this.Adrenaline = 0;
        this.AdrenalineMax = 100;
        this.AdrenalineModeActive = false;
        this.AdrenalinePauseTimer = 0;
        this.AdrenalineReadyHeld = false;
        this.AdrenalineDuration = 8 * 60;
        this.AdrenalineChargeTime = 30 * 60;
        this.AdrenalineFadeTime = 2 * 60;
        this.AdrenalineDamageBoost = 1.50;
        this.RipperSaveTimer = 0;
        this.RageVisualTimer = 0;
        this.AdrenalineVisualTimer = 0;
        this.WasRageModeActive = false;
        this.WasAdrenalineModeActive = false;
        this.LastBossActive = false;
        this.LastProximityRage = 0;
        this.LastDamageMultiplier = 1;
        this.LastAdrenalineLoss = 0;
        this.LastAdrenalineDR = false;
        this.RageScanTimer = 0;
        this.CachedRageProximity = { multiplier: 0, bossAlive: false };
        this.CachedWorldState = null;
        this.SnowRuffianSetActive = false;
        this.SnowRuffianGliding = false;
        this.AerospecSetActive = false;
        this.AerospecClass = '';
        this.SnowRuffianGlideFrames = 0;
        this.SnowRuffianLastVelocityBefore = 0;
        this.SnowRuffianLastVelocityAfter = 0;
        this.WulfrumSetActive = false;
        this.WulfrumBastionActiveFrames = 0;
        this.WulfrumBastionCooldownFrames = 0;
        this.WulfrumBastionBuildFrames = 0;
        this.WulfrumBastionMaxActive = 30 * 60;
        this.WulfrumBastionMaxCooldown = 20 * 60;
        this.WulfrumBastionBuildDuration = 33;
        this.WulfrumBastionHitPenalty = 2 * 60;
        this.WulfrumPreviousSelectedItem = 0;
        this.WulfrumCannonType = 0;
        this.WulfrumCannonReady = false;
        this.WulfrumBastionActivationCount = 0;
        this.BrittleStarDefenseMode = false;
        this.BrittleStarDefenseBonus = 0;
        this.BrittleStarCount = 0;
        this.BrittleStarMissingFrames = 0;
        this.BrittleStarCountTick = -1;
        this.BrittleStarCountOwner = -1;
        this.BrittleStarCountCache = 0;
        this.BrittleStarFallbackNextTick = -1;
        this.SaharaSlicersBolts = 0;
        this.SaharaSlicersAltBlade = true;
        this.SaharaSlicersAimX = 1;
        this.SaharaSlicersAimY = 0;
        this.SaharaSlicersHeldThisFrame = false;
        this.FilthyGloveEquipped = false;
        this.RottenBrainEquipped = false;
        this.HeartOfDarknessEquipped = false;
        this.StressPillsEquipped = false;
        this.RogueEmblemEquipped = false;
        this.BloodstainedGloveEquipped = false;
        this.BloodyWormToothEquipped = false;
        this.ManaPolarizerEquipped = false;
        this.GiantPearlEquipped = false;
        this.GiantPearlCenterX = NaN;
        this.GiantPearlCenterY = NaN;
        // Phase 13.26.0 pre-Hardmode accessory state. Cooldown is shared by the three band accessories.
        this.BlackGlassBandEquipped = false;
        this.BlackGlassBandVisual = true;
        this.ProtolithBangleEquipped = false;
        this.ProtolithBangleVisual = true;
        this.BatholithBangleEquipped = false;
        this.BatholithBangleVisual = true;
        this.CrawCarapaceEquipped = false;
        this.CrownJewelEquipped = false;
        this.HoneyDewEquipped = false;
        this.HoneyDewRegenFraction = 0;
        this.OceanCrestEquipped = false;
        this.BandCooldownFrames = 0;
        this.AmidiasPendantCountdown = 0;
        this.ElectrolyteGelPackUsed = false;
        this.RogueDamageBonus = 0;
        this.RogueCritBonus = 0;
        this.RogueUseSpeedBonus = 0;
        this.RogueKnockbackBonus = 0;
        this.WearingRogueArmor = false;
        this.RogueStealth = 0;
        this.RogueStealthMax = 0;
        this.RogueStealthCostFraction = 1;
        this.RogueStealthStandstillBonus = 0;
        this.RogueStealthMovingBonus = 0;
        this.RogueStealthReady = false;
        this.RogueStealthStrikeThisFrame = false;
        this.RogueStealthStrikeCount = 0;
        this.RogueLastStrikeItem = '';
        this.AerospecSetActive = false;
        this.AerospecClass = '';
        this.AerospecFeatherCooldown = 0;
    }
    static Prefix(key) {
        return `calamity:player:${key}`;
    }

    GetWorldState() {
        if (!this.CachedWorldState)
            this.CachedWorldState = ModSystem.getByName('CalamityWorldState');
        return this.CachedWorldState;
    }

    IsRevengeanceEnabled() {
        const world = this.GetWorldState();
        return !!(world && world.RevengeanceMode === true);
    }

    SetRippersEnabled(enabled) {
        const active = enabled === true;
        this.RageUnlocked = active;
        this.AdrenalineUnlocked = active;
        this.RageScanTimer = 0;
        this.CachedRageProximity = { multiplier: 0, bossAlive: false };
        this.LastBossActive = false;
        this.LastProximityRage = 0;
        if (!active) {
            this.RageModeActive = false;
            this.AdrenalineModeActive = false;
            this.RageReadyHeld = false;
            this.RageReadyTimer = 0;
            this.RageReadyGraceUsed = false;
            this.AdrenalineReadyHeld = false;
            this.AdrenalinePauseTimer = 0;
        }
        this.SaveRippers();
        return active;
    }

    SetupStartingItems(player, mediumCoreDeath) {
        // New characters receive the selector after Terraria creates the vanilla loadout.
        // Mediumcore respawns deliberately do not receive another copy.
        if (mediumCoreDeath === true) return;
        EnsureDifficultySelector(player);
    }

    OnEnterWorld(player) {
        this.Loaded = true;
        // World difficulty is authoritative. Old character data must not keep Rippers disabled
        // after a world has already entered Revengeance/Death Mode.
        const rippersEnabled = this.IsRevengeanceEnabled();
        this.RageUnlocked = rippersEnabled;
        this.AdrenalineUnlocked = rippersEnabled;
        this.PermanentHealthBonus = Number(PlayerDB.get(CalamityPlayerState.Prefix('permanentHealthBonus')) || 0);
        this.Rage = Clamp(Number(PlayerDB.get(CalamityPlayerState.Prefix('rage')) || 0), 0, this.RageMax);
        this.Adrenaline = Clamp(Number(PlayerDB.get(CalamityPlayerState.Prefix('adrenaline')) || 0), 0, this.AdrenalineMax);
        this.RageModeActive = false;
        this.AdrenalineModeActive = false;
        this.RageVisualTimer = 0;
        this.AdrenalineVisualTimer = 0;
        this.WasRageModeActive = false;
        this.WasAdrenalineModeActive = false;
        this.RageCombatFrames = 0;
        this.RageReadyHeld = false;
        this.RageReadyTimer = 0;
        this.RageReadyGraceUsed = false;
        this.AdrenalinePauseTimer = 0;
        this.BrittleStarDefenseMode = false;
        this.BrittleStarDefenseBonus = 0;
        this.BrittleStarCount = 0;
        this.BrittleStarMissingFrames = 0;
        this.BrittleStarCountTick = -1;
        this.BrittleStarCountOwner = -1;
        this.BrittleStarCountCache = 0;
        this.BrittleStarFallbackNextTick = -1;
        this.SaharaSlicersBolts = 0;
        this.SaharaSlicersAltBlade = true;
        this.SaharaSlicersAimX = Number(player && Terraria.PlayerDirection(player)) || 1;
        this.SaharaSlicersAimY = 0;
        this.SaharaSlicersHeldThisFrame = false;
        this.WulfrumSetActive = false;
        this.WulfrumBastionActiveFrames = 0;
        this.WulfrumBastionCooldownFrames = 0;
        this.WulfrumBastionBuildFrames = 0;
        this.WulfrumPreviousSelectedItem = 0;
        this.WulfrumCannonReady = false;
        this.FilthyGloveEquipped = false;
        this.RottenBrainEquipped = false;
        this.HeartOfDarknessEquipped = false;
        this.StressPillsEquipped = false;
        this.RogueEmblemEquipped = false;
        this.BloodstainedGloveEquipped = false;
        this.BloodyWormToothEquipped = false;
        this.ManaPolarizerEquipped = false;
        this.GiantPearlEquipped = false;
        this.GiantPearlCenterX = NaN;
        this.GiantPearlCenterY = NaN;
        this.BlackGlassBandEquipped = false;
        this.BlackGlassBandVisual = true;
        this.ProtolithBangleEquipped = false;
        this.ProtolithBangleVisual = true;
        this.BatholithBangleEquipped = false;
        this.BatholithBangleVisual = true;
        this.CrawCarapaceEquipped = false;
        this.CrownJewelEquipped = false;
        this.HoneyDewEquipped = false;
        this.HoneyDewRegenFraction = 0;
        this.OceanCrestEquipped = false;
        this.BandCooldownFrames = 0;
        this.AmidiasPendantCountdown = 0;
        this.ElectrolyteGelPackUsed = PlayerDB.get(CalamityPlayerState.Prefix('adrenalineBoostOne')) === true;
        this.RogueDamageBonus = 0;
        this.RogueCritBonus = 0;
        this.RogueUseSpeedBonus = 0;
        this.RogueKnockbackBonus = 0;
        this.WearingRogueArmor = false;
        this.RogueStealth = 0;
        this.RogueStealthMax = 0;
        this.RogueStealthCostFraction = 1;
        this.RogueStealthStandstillBonus = 0;
        this.RogueStealthMovingBonus = 0;
        this.RogueStealthReady = false;
        this.RogueStealthStrikeThisFrame = false;
        this.RageScanTimer = 0;
        this.CachedRageProximity = { multiplier: 0, bossAlive: false };
        this.CachedWorldState = ModSystem.getByName('CalamityWorldState');

        // Migration for characters created before the selector became a starting item.
        // This executes only on world entry, then a persistent marker prevents future work.
        if (this.IsLocalPlayer(player) && PlayerDB.get(CalamityPlayerState.Prefix('difficultySelectorGrantedV1')) !== true) {
            if (EnsureDifficultySelector(player)) {
                PlayerDB.set(CalamityPlayerState.Prefix('difficultySelectorGrantedV1'), true);
                try { PlayerDB.Instance?.Save(); } catch (_) { }
            }
        }
        PlayerDB.set(CalamityPlayerState.Prefix('schemaVersion'), 3);
    }

    ResetEffects(player) {
        this.ZoneSunkenSea = false;
        this.ZoneSulphurousSea = false;
        this.ZoneAbyss = false;
        this.ZoneAbyssLayer1 = false;
        this.ZoneAbyssLayer2 = false;
        this.ZoneAbyssLayer3 = false;
        this.ZoneAbyssLayer4 = false;
        this.ZoneAstral = false;
        this.SnowRuffianSetActive = false;
        this.SnowRuffianGliding = false;
        this.AerospecSetActive = false;
        this.AerospecClass = '';
        if (this.IsLocalPlayer(player))
            this.WulfrumSetActive = false;
        this.LastDamageMultiplier = 1;
        this.LastAdrenalineDR = false;
        if (this.IsLocalPlayer(player)) {
            this.BrittleStarDefenseBonus = 0;
            const currentStars = this.CountBrittleStars(player);
            if (currentStars > 0)
                this.BrittleStarCount = currentStars;
            this.SaharaSlicersHeldThisFrame = false;
            this.FilthyGloveEquipped = false;
            this.RottenBrainEquipped = false;
            this.HeartOfDarknessEquipped = false;
            this.StressPillsEquipped = false;
            this.RogueEmblemEquipped = false;
            this.RogueDamageBonus = 0;
            this.RogueCritBonus = 0;
            this.RogueUseSpeedBonus = 0;
            this.RogueKnockbackBonus = 0;
            this.WearingRogueArmor = false;
            this.RogueStealthMax = 0;
            this.RogueStealthCostFraction = 1;
            this.RogueStealthStandstillBonus = 0;
            this.RogueStealthMovingBonus = 0;
            this.RogueStealthStrikeThisFrame = false;
            this.BloodstainedGloveEquipped = false;
            this.BloodyWormToothEquipped = false;
            this.ManaPolarizerEquipped = false;
            this.GiantPearlEquipped = false;
            this.GiantPearlCenterX = NaN;
            this.GiantPearlCenterY = NaN;
            this.BlackGlassBandEquipped = false;
            this.BlackGlassBandVisual = true;
            this.ProtolithBangleEquipped = false;
            this.ProtolithBangleVisual = true;
            this.BatholithBangleEquipped = false;
            this.BatholithBangleVisual = true;
            this.CrawCarapaceEquipped = false;
            this.CrownJewelEquipped = false;
            this.HoneyDewEquipped = false;
            this.OceanCrestEquipped = false;
        }
    }

    UpdateDead(player) {
        this.SnowRuffianSetActive = false;
        this.SnowRuffianGliding = false;
        this.AerospecSetActive = false;
        this.AerospecClass = '';
        this.AerospecFeatherCooldown = 0;
        if (this.IsLocalPlayer(player)) {
            this.WulfrumSetActive = false;
            this.EndWulfrumBastion(player, true);
        }
        this.RageModeActive = false;
        this.AdrenalineModeActive = false;
        this.RageReadyHeld = false;
        this.RageReadyTimer = 0;
        this.RageReadyGraceUsed = false;
        this.Rage = 0;
        this.Adrenaline = 0;
        if (this.IsLocalPlayer(player)) {
            this.BrittleStarDefenseMode = false;
            this.BrittleStarDefenseBonus = 0;
            this.BrittleStarCount = 0;
            this.BrittleStarMissingFrames = 0;
            this.SaharaSlicersBolts = 0;
            this.SaharaSlicersAltBlade = true;
            this.SaharaSlicersHeldThisFrame = false;
            this.FilthyGloveEquipped = false;
            this.RottenBrainEquipped = false;
            this.HeartOfDarknessEquipped = false;
            this.StressPillsEquipped = false;
            this.RogueEmblemEquipped = false;
            this.RogueDamageBonus = 0;
            this.RogueCritBonus = 0;
            this.RogueUseSpeedBonus = 0;
            this.RogueKnockbackBonus = 0;
            this.WearingRogueArmor = false;
            this.RogueStealthMax = 0;
            this.RogueStealthCostFraction = 1;
            this.RogueStealthStandstillBonus = 0;
            this.RogueStealthMovingBonus = 0;
            this.RogueStealth = 0;
            this.RogueStealthReady = false;
            this.RogueStealthStrikeThisFrame = false;
            this.BloodstainedGloveEquipped = false;
            this.BloodyWormToothEquipped = false;
            this.ManaPolarizerEquipped = false;
            this.GiantPearlEquipped = false;
            this.GiantPearlCenterX = NaN;
            this.GiantPearlCenterY = NaN;
            this.BlackGlassBandEquipped = false;
            this.ProtolithBangleEquipped = false;
            this.BatholithBangleEquipped = false;
            this.CrawCarapaceEquipped = false;
            this.CrownJewelEquipped = false;
            this.HoneyDewEquipped = false;
            this.HoneyDewRegenFraction = 0;
            this.OceanCrestEquipped = false;
            this.BandCooldownFrames = 0;
        }
        this.SaveRippers();
    }

    IsLocalPlayer(player) {
        if (!player)
            return false;
        try {
            return Number(Terraria.PlayerIndex(player)) === Number(Terraria.Main.myPlayer);
        } catch (e) { }
        return false;
    }

    GetBrittleStarType() {
        CachedBrittleStarType = ResolveModProjectileType(CachedBrittleStarType, 'BrittleStarMinion');
        return CachedBrittleStarType;
    }

    GetSaharaSlicersType() {
        CachedSaharaSlicersType = ResolveModItemType(CachedSaharaSlicersType, 'SaharaSlicers');
        return CachedSaharaSlicersType;
    }

    GetSaharaSlicersBoltType() {
        CachedSaharaBoltType = ResolveModProjectileType(CachedSaharaBoltType, 'SaharaSlicersBolt');
        return CachedSaharaBoltType;
    }

    CountBrittleStars(player) {
        if (!player || !player.active)
            return 0;
        const type = this.GetBrittleStarType();
        if (!(type > 0))
            return 0;
        const owner = Number(Terraria.PlayerIndex(player));
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        if (this.BrittleStarCountTick === tick && this.BrittleStarCountOwner === owner) {
            return this.BrittleStarCountCache;
        }
        let count = 0;
        try {
            const nativeCount = Number(player.ownedProjectileCounts[type]);
            if (Number.isFinite(nativeCount))
                count = Math.max(0, Math.floor(nativeCount));
            else
                throw new Error('ownedProjectileCounts unavailable');
        } catch (e) {
            if (this.BrittleStarCountOwner === owner && tick < Number(this.BrittleStarFallbackNextTick || -1)) {
                return this.BrittleStarCountCache;
            }
            this.BrittleStarFallbackNextTick = tick + 5;
            for (let i = 0; i < 1000; i++) {
                try {
                    const proj = Terraria.Main.projectile[i];
                    if (proj && proj.active && Number(proj.owner) === owner && Number(proj.type) === type)
                        count++;
                } catch (ignored) { }
            }
        }
        this.BrittleStarCountTick = tick;
        this.BrittleStarCountOwner = owner;
        this.BrittleStarCountCache = count;
        return count;
    }

    ApplyBrittleStarDefense(player) {
        if (!this.IsLocalPlayer(player))
            return 0;
        const count = this.CountBrittleStars(player);
        if (count > 0) {
            this.BrittleStarCount = count;
            this.BrittleStarMissingFrames = 0;
        }
        const bonus = this.BrittleStarDefenseMode && count > 0 ? count * 3 : 0;
        this.BrittleStarDefenseBonus = bonus;
        if (bonus > 0)
            player.statDefense += bonus;
        return bonus;
    }

    SetBrittleStarDefenseMode(player, enabled, announce = true) {
        if (!this.IsLocalPlayer(player))
            return false;
        const count = this.CountBrittleStars(player);
        this.BrittleStarCount = count;
        if (enabled && count <= 0) {
            this.BrittleStarDefenseMode = false;
            this.BrittleStarDefenseBonus = 0;
            if (announce)
                Tell('Invoque ao menos uma Estrela Frágil primeiro.', 255, 190, 90);
            return false;
        }
        this.BrittleStarDefenseMode = enabled === true;
        this.BrittleStarMissingFrames = 0;
        this.BrittleStarDefenseBonus = this.BrittleStarDefenseMode ? count * 3 : 0;
        if (announce) {
            if (this.BrittleStarDefenseMode) {
                Tell(`MODO DEFENSIVO: ${count} estrela(s), +${this.BrittleStarDefenseBonus} de defesa.`, 110, 235, 255);
            } else {
                Tell('MODO DE ATAQUE: as Estrelas Frágeis voltarão a perseguir inimigos.', 255, 220, 120);
            }
        }
        return true;
    }

    ToggleBrittleStarDefenseMode(player, announce = true) {
        return this.SetBrittleStarDefenseMode(player, !this.BrittleStarDefenseMode, announce);
    }

    GetBrittleStarSummary(player) {
        const count = this.CountBrittleStars(player);
        const bonus = this.BrittleStarDefenseMode ? count * 3 : 0;
        return `mode=${this.BrittleStarDefenseMode ? 'defense' : 'attack'}, stars=${count}, defenseBonus=${bonus}, missingFrames=${this.BrittleStarMissingFrames}`;
    }

    MarkSaharaSlicersHeld(player) {
        if (!this.IsLocalPlayer(player))
            return;
        this.SaharaSlicersHeldThisFrame = true;
    }

    SetSaharaSlicersAim(player, vector) {
        if (!this.IsLocalPlayer(player) || !vector)
            return;
        const x = Number(vector.X) || 0;
        const y = Number(vector.Y) || 0;
        const length = Math.sqrt(x * x + y * y);
        if (length <= 0.001)
            return;
        this.SaharaSlicersAimX = x / length;
        this.SaharaSlicersAimY = y / length;
    }

    NextSaharaSlicersBlade(player) {
        if (!this.IsLocalPlayer(player))
            return false;
        const useAlt = this.SaharaSlicersAltBlade === true;
        this.SaharaSlicersAltBlade = !useAlt;
        return useAlt;
    }

    AddSaharaSlicersBolts(player, amount = 2) {
        if (!this.IsLocalPlayer(player))
            return { before: 0, after: 0, added: 0 };
        const before = Clamp(Math.floor(Number(this.SaharaSlicersBolts) || 0), 0, 10);
        const after = Clamp(before + Math.max(0, Math.floor(Number(amount) || 0)), 0, 10);
        this.SaharaSlicersBolts = after;
        return { before, after, added: after - before };
    }

    ClearSaharaSlicersBolts(player) {
        if (!this.IsLocalPlayer(player))
            return;
        this.SaharaSlicersBolts = 0;
        this.SaharaSlicersAltBlade = true;
    }

    UpdateSaharaSlicers(player) {
        if (!this.IsLocalPlayer(player))
            return;
        const type = this.GetSaharaSlicersType();
        let held = null;
        try {
            held = player.HeldItem;
        } catch (e) { }
        if (!held) {
            try {
                held = player.inventory[player.selectedItem];
            } catch (e) { }
        }
        const holding = !!(type > 0 && held && Number(held.type) === Number(type));
        this.SaharaSlicersHeldThisFrame = holding;
        if (!holding && this.SaharaSlicersBolts > 0)
            this.ClearSaharaSlicersBolts(player);
    }

    FindSaharaSlicersTargetDirection(player, range = 900) {
        let best = null;
        let bestDistance = Number(range);
        for (let i = 0; i < 200; i++) {
            const npc = Terraria.Main.npc[i];
            if (!npc || !npc.active || npc.friendly || npc.dontTakeDamage || Number(npc.lifeMax) <= 5)
                continue;
            const dx = Number(npc.Center.X) - Number(Terraria.PlayerCenterX(player));
            const dy = Number(npc.Center.Y) - Number(Terraria.PlayerCenterY(player));
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bestDistance && distance > 0.001) {
                bestDistance = distance;
                best = { x: dx / distance, y: dy / distance };
            }
        }
        return best;
    }

    FireSaharaSlicersBolt(player, announce = false) {
        if (!this.IsLocalPlayer(player))
            return false;
        const itemType = this.GetSaharaSlicersType();
        const projectileType = this.GetSaharaSlicersBoltType();
        let held = null;
        try {
            held = player.HeldItem;
        } catch (e) { }
        if (!held || Number(held.type) !== Number(itemType) || !(projectileType > 0)) {
            if (announce)
                Tell('Segure os Fatiadores do Saara para lançar os dardos.', 255, 190, 90);
            return false;
        }
        const stored = Clamp(Math.floor(Number(this.SaharaSlicersBolts) || 0), 0, 10);
        if (stored <= 0) {
            try {
                PlayItemSound(7, Terraria.PlayerCenter(player), 0.2, 0.8);
            } catch (e) { }
            if (announce)
                Tell('Nenhum dardo armazenado. Acerte inimigos com as adagas primeiro.', 255, 190, 90);
            return false;
        }
        let aimX = Number(this.SaharaSlicersAimX) || 0;
        let aimY = Number(this.SaharaSlicersAimY) || 0;
        let aimLength = Math.sqrt(aimX * aimX + aimY * aimY);
        if (aimLength <= 0.001) {
            const target = this.FindSaharaSlicersTargetDirection(player, 900);
            if (target) {
                aimX = target.x;
                aimY = target.y;
                aimLength = 1;
            }
        }
        if (aimLength <= 0.001) {
            aimX = Number(Terraria.PlayerDirection(player)) || 1;
            aimY = 0;
            aimLength = 1;
        }
        aimX /= aimLength;
        aimY /= aimLength;
        const direction = Vector2.new(aimX, aimY);
        const position = Vector2.Add(player.MountedCenter, Vector2.Multiply(direction, 22));
        const velocity = Vector2.Multiply(direction, 6.6);
        let damage = Math.max(1, Math.floor(Number(held.damage) * 1.2));
        let knockBack = Math.max(0, Number(held.knockBack) * 1.2);
        try {
            damage = Math.max(1, Math.floor(Number(player['int GetWeaponDamage(Item sItem)'](held)) * 1.2));
        } catch (e) { }
        try {
            knockBack = Number(player['float GetWeaponKnockback(Item sItem, float KnockBack)'](held, held.knockBack)) * 1.2;
        } catch (e) { }
        const source = player.GetProjectileSource_Item(held);
        NewProjectile(source, position, velocity, projectileType, damage, knockBack, Terraria.PlayerIndex(player), 1, 0, 0, null);
        this.SaharaSlicersBolts = stored - 1;
        this.SetSaharaSlicersAim(player, direction);
        Terraria.SetPlayerDirection(player, aimX < 0 ? -1 : 1);
        try {
            if (!SaharaNamedLegacyLogged) {
                SaharaNamedLegacyLogged = true;
                try { tl.log('[CalamityPort AudioCompat] named legacy exception used: DD2_GhastlyGlaivePierce.'); } catch (_) { }
            }
            PlayNamedLegacySound(Terraria.ID.SoundID.DD2_GhastlyGlaivePierce, Terraria.PlayerCenter(player), 1.5, 0.85);
        } catch (e) {
            try {
                PlayItemSound(1, Terraria.PlayerCenter(player), 1.0, 0.85);
            } catch (e2) { }
        }
        if (announce)
            Tell(`Dardo lançado. Restantes: ${this.SaharaSlicersBolts}/10.`, 120, 220, 255);
        return true;
    }

    GetSaharaSlicersSummary(player) {
        return `held=${this.SaharaSlicersHeldThisFrame}, bolts=${this.SaharaSlicersBolts}/10, next=${this.SaharaSlicersAltBlade ? 'alt' : 'normal'}, aim=${this.SaharaSlicersAimX.toFixed(2)},${this.SaharaSlicersAimY.toFixed(2)}`;
    }

    ApplyWulfrumSet(player) {
        if (!this.IsLocalPlayer(player))
            return;
        this.WulfrumSetActive = true;
        player.setBonus = ModLocalization.getTranslationArmorSetBonus('Wulfrum');
        if (this.IsWulfrumBastionActive()) {
            player.statDefense = Number(player.statDefense || 0) + 12;
            player.endurance = Number(player.endurance || 0) + 0.10;
        }
    }

    IsWulfrumBastionActive() {
        return Number(this.WulfrumBastionActiveFrames) > 0;
    }

    IsWulfrumBastionReady() {
        return this.WulfrumSetActive === true && !this.IsWulfrumBastionActive() && Number(this.WulfrumBastionCooldownFrames) <= 0;
    }

    IsWulfrumBastionCannonReady(player) {
        return !!(this.IsLocalPlayer(player) && this.WulfrumSetActive === true && this.IsWulfrumBastionActive() && Number(this.WulfrumBastionBuildFrames) <= 0 && !player.dead);
    }

    ActivateWulfrumBastion(player, announce = false) {
        if (!this.IsLocalPlayer(player) || !this.IsWulfrumBastionReady() || player.dead) {
            if (announce) {
                const reason = this.IsWulfrumBastionActive() ? 'O Bastião já está ativo.' : (Number(this.WulfrumBastionCooldownFrames) > 0 ? `Recarga: ${(Number(this.WulfrumBastionCooldownFrames) / 60).toFixed(1)}s.` : 'Equipe as três peças Wulfrum.');
                Tell(reason, 255, 190, 90);
            }
            return false;
        }
        this.WulfrumPreviousSelectedItem = Clamp(Math.floor(Number(player.selectedItem) || 0), 0, 9);
        this.WulfrumBastionActiveFrames = this.WulfrumBastionMaxActive;
        this.WulfrumBastionBuildFrames = this.WulfrumBastionBuildDuration;
        this.WulfrumBastionCooldownFrames = 0;
        this.WulfrumCannonReady = false;
        this.WulfrumBastionActivationCount += 1;
        try {
            PlayItemSound(91, Terraria.PlayerCenter(player), 0.2, 0.9);
        } catch (e) { }
        if (announce)
            Tell('Bastião Wulfrum ativado por 30 segundos.', 130, 255, 130);
        return true;
    }

    EnsureWulfrumCannon(player) {
        if (!this.IsWulfrumBastionCannonReady(player))
            return false;
        if (!(this.WulfrumCannonType > 0))
            this.WulfrumCannonType = Number(ModItem.getTypeByName('WulfrumFusionCannon') || 0);
        if (!(this.WulfrumCannonType > 0))
            return false;
        try {
            const slot = player.inventory[58];
            if (!slot)
                return false;
            if (Number(slot.type) !== Number(this.WulfrumCannonType))
                slot['void SetDefaults(int Type, ItemVariant variant)'](this.WulfrumCannonType, null);
            slot.stack = 1;
            player.selectedItem = 58;
            this.WulfrumCannonReady = true;
            return true;
        } catch (e) {
            this.WulfrumCannonReady = false;
            return false;
        }
    }

    ClearWulfrumCannon(player) {
        this.WulfrumCannonReady = false;
        if (!player)
            return;
        try {
            const slot = player.inventory[58];
            if (slot && Number(slot.type) === Number(this.WulfrumCannonType))
                slot.TurnToAir(false);
            if (Number(player.selectedItem) === 58)
                player.selectedItem = Clamp(this.WulfrumPreviousSelectedItem, 0, 9);
        } catch (e) { }
    }

    EndWulfrumBastion(player, violent = false) {
        const wasActive = this.IsWulfrumBastionActive();
        this.WulfrumBastionActiveFrames = 0;
        this.WulfrumBastionBuildFrames = 0;
        this.ClearWulfrumCannon(player);
        if (!wasActive)
            return;
        this.WulfrumBastionCooldownFrames = Math.max(Number(this.WulfrumBastionCooldownFrames) || 0, this.WulfrumBastionMaxCooldown);
        try {
            PlayItemSound(violent ? 14 : 27, Terraria.PlayerCenter(player), violent ? -0.1 : 0.2, 0.8);
        } catch (e) { }
    }

    UpdateWulfrumBastion(player) {
        if (!this.IsLocalPlayer(player))
            return;
        if (!this.IsWulfrumBastionActive() && Number(this.WulfrumBastionCooldownFrames) > 0)
            this.WulfrumBastionCooldownFrames -= 1;
        if (!this.IsWulfrumBastionActive()) {
            if (this.WulfrumCannonReady)
                this.ClearWulfrumCannon(player);
            return;
        }
        if (player.dead || this.WulfrumSetActive !== true) {
            this.EndWulfrumBastion(player, true);
            return;
        }
        this.WulfrumBastionActiveFrames -= 1;
        if (Number(this.WulfrumBastionBuildFrames) > 0)
            this.WulfrumBastionBuildFrames -= 1;
        if (Number(this.WulfrumBastionActiveFrames) <= 0) {
            this.EndWulfrumBastion(player, false);
            return;
        }
        if (Number(this.WulfrumBastionBuildFrames) <= 0)
            this.EnsureWulfrumCannon(player);
    }

    GetWulfrumBastionSummary() {
        return `set=${this.WulfrumSetActive}, active=${this.WulfrumBastionActiveFrames}/${this.WulfrumBastionMaxActive}, build=${this.WulfrumBastionBuildFrames}, cooldown=${this.WulfrumBastionCooldownFrames}/${this.WulfrumBastionMaxCooldown}, cannon=${this.WulfrumCannonReady}, activations=${this.WulfrumBastionActivationCount}`;
    }

    ApplySnowRuffianSet(player) {
        this.SnowRuffianSetActive = true;
        player.setBonus = ModLocalization.getTranslationArmorSetBonus('SnowRuffian');
    }

    FindRageProximity(player) {
        let enemyDistance = 801;
        let bossDistance = 801;
        let bossAlive = false;
        const playerX = Number(Terraria.PlayerCenterX(player));
        const playerY = Number(Terraria.PlayerCenterY(player));
        for (const i of FrozenCubeTrackedIndices()) {
            const npc = FrozenCubeNPC(i);
            if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.lifeMax <= 5 || npc.dontTakeDamage)
                continue;
            if (npc.type === Terraria.ID.NPCID.TargetDummy)
                continue;
            let centerX = NaN;
            let centerY = NaN;
            let generousRadius = 0;
            try {
                const rect = npc['Rectangle getRect()']();
                centerX = Number(rect.X) + Number(rect.Width) * 0.5;
                centerY = Number(rect.Y) + Number(rect.Height) * 0.5;
                generousRadius = Math.max(Number(rect.Width), Number(rect.Height)) * 0.5;
            } catch (_) { }
            if (!Number.isFinite(centerX) || !Number.isFinite(centerY))
                continue;
            if (npc.boss === true)
                bossAlive = true;
            const dx = centerX - playerX;
            const dy = centerY - playerY;
            const maximumRelevantDistance = 800 + generousRadius;
            if (Math.abs(dx) > maximumRelevantDistance || Math.abs(dy) > maximumRelevantDistance)
                continue;
            const edgeDistance = Math.sqrt(dx * dx + dy * dy) - generousRadius;
            if (edgeDistance < enemyDistance)
                enemyDistance = edgeDistance;
            if (npc.boss === true && edgeDistance < bossDistance)
                bossDistance = edgeDistance;
        }
        const rageFromDistance = (distance) => {
            const d = Math.max(Number(distance) - 160, 0);
            const value = 1 / (0.034 * d + 2) + (590.5 - d) / 1181;
            return Clamp(value, 0, 1);
        };
        let multiplier = 0;
        if (enemyDistance <= 800)
            multiplier = Math.max(multiplier, rageFromDistance(enemyDistance));
        if (bossDistance <= 800)
            multiplier = Math.max(multiplier, 3 * rageFromDistance(bossDistance));
        return { multiplier, bossAlive };
    }

    UpdateBadLifeRegen(player) {
        if (!player || !player.active || player.dead) return;
        // TLPro invokes this callback before vanilla UpdateLifeRegen. Crown Jewel's final
        // DoT reduction is therefore applied in UpdateLifeRegen below, after vanilla.
    }

    EstimateNaturalLifeRegen(player) {
        // Terraria keeps natural regeneration separate from flat regen sources. TLPro does not expose
        // ModPlayer.NaturalLifeRegen, so reconstruct only the vanilla natural portion from the same
        // public fields and cap it by the observed positive regen. This prevents Honey Dew from
        // multiplying campfires, Crown Jewel, Mana Polarizer, lifesteal, potions, or other flat healing.
        const observed = Math.max(0, Number(player.lifeRegen) || 0);
        if (!(observed > 0)) return 0;
        const ticks = Math.max(0, Math.min(3600, Number(player.lifeRegenTime) || 0));
        let timeFactor = ticks < 1800 ? ticks / 300 : 6 + (ticks - 1800) / 600;
        timeFactor = Math.max(0, Math.min(9, timeFactor));
        const maxLife = Math.max(1, Number(player.statLifeMax2) || 100);
        let special = Math.abs(Number(player.velocity?.X) || 0) > 0.01 ? 0.5 : 1.25;
        let wellFed = false;
        try {
            const ids = Terraria.ID.BuffID;
            for (const id of [Number(ids.WellFed || 26), Number(ids.WellFed2 || 206), Number(ids.WellFed3 || 207)])
                if (id > 0 && player.FindBuffIndex(id) >= 0) { wellFed = true; break; }
        } catch (_) { }
        try { if (Terraria.Main.expertMode === true && !wellFed) special *= 0.5; } catch (_) { }
        const natural = Math.max(0, (maxLife / 400 * 0.85 + 0.15) * timeFactor * special);
        return Math.min(observed, natural);
    }

    UpdateLifeRegen(player) {
        if (!player || !player.active || player.dead) return;

        // Honey Dew: exactly a natural-regeneration multiplier, not a generic healing multiplier.
        if (this.HoneyDewEquipped && Number(player.lifeRegen) > 0) {
            const bonusRate = this.EstimateNaturalLifeRegen(player) * 0.5;
            const accumulated = Math.max(0, Number(this.HoneyDewRegenFraction) || 0) + bonusRate;
            const whole = Math.floor(accumulated);
            this.HoneyDewRegenFraction = accumulated - whole;
            if (whole > 0) player.lifeRegen = Number(player.lifeRegen) + whole;
        } else {
            this.HoneyDewRegenFraction = 0;
        }

        if (this.CrownJewelEquipped) {
            const regen = Number(player.lifeRegen) || 0;
            // Crown is resolved before Calamity's later flat regen effects. That way its DoT
            // reduction only mitigates actual incoming DoT and does not cancel Mana Polarizer's
            // own negative-regeneration tradeoff.
            player.lifeRegen = regen < 0 ? Math.min(0, regen + 4) : regen + 1;
        }

        if (this.ManaPolarizerEquipped) {
            const ratio = Math.max(0, Math.min(1, Number(player.statMana) / Math.max(1, Number(player.statManaMax2))));
            let regen = Math.round(4 + (-8 * ratio));
            try {
                if (player.FindBuffIndex(Number(Terraria.ID.BuffID.ManaSickness || 94)) >= 0)
                    regen = Math.round(regen * 0.5);
            } catch (e) { }
            player.lifeRegen = Number(player.lifeRegen) + regen;
        }
    }

    UpdateRippers(player) {
        const enabled = this.IsRevengeanceEnabled();
        // Keep the player state synchronized every update. These are plain JS booleans and do
        // not touch native arrays, so a selector/world reload cannot leave the HUD half-enabled.
        this.RageUnlocked = enabled;
        this.AdrenalineUnlocked = enabled;
        let nearby = this.CachedRageProximity || { multiplier: 0, bossAlive: false };
        if (enabled) {
            // Keep the compact NPC registry warm with a bounded incremental sweep. OnSpawn is
            // normally enough, but vanilla NPCs can reach the TLPro global hook before their
            // final slot is visible. Eight reads every four updates discovers the full 200-slot
            // array in at most ~1.7 seconds without restoring a hot 200-NPC scan.
            let tick = 0;
            try { tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0); } catch (_) { }
            if ((tick & 3) === 0)
                ScanFrozenCubeNPCs(8);
            if (this.RageScanTimer <= 0) {
                nearby = this.FindRageProximity(player);
                this.CachedRageProximity = nearby;
                this.RageScanTimer = 15;
            } else {
                this.RageScanTimer--;
            }
        } else {
            nearby = { multiplier: 0, bossAlive: false };
            this.CachedRageProximity = nearby;
            this.RageScanTimer = 0;
        }
        this.LastBossActive = nearby.bossAlive;
        this.LastProximityRage = nearby.multiplier;
        if (this.RageCombatFrames > 0)
            this.RageCombatFrames--;
        if (this.AdrenalinePauseTimer > 0)
            this.AdrenalinePauseTimer--;
        if (!enabled) {
            this.RageModeActive = false;
            this.AdrenalineModeActive = false;
            this.RageReadyHeld = false;
            this.RageReadyTimer = 0;
            this.RageReadyGraceUsed = false;
            this.Rage = Math.max(0, this.Rage - this.RageMax / (2 * 60));
            this.Adrenaline = Math.max(0, this.Adrenaline - this.AdrenalineMax / (2 * 60));
            return;
        }
        let rageChange = 0;
        this.RageReadyHeld = false;
        if (this.HeartOfDarknessEquipped)
            rageChange += this.RageMax * 0.02 / 60;
        if (this.RageModeActive) {
            this.RageReadyTimer = 0;
            rageChange -= this.RageMax / this.RageDuration;
        } else {
            if (this.Rage >= this.RageMax - 0.001 && !this.RageReadyGraceUsed) {
                this.RageReadyTimer = this.RageReadyDuration;
                this.RageReadyGraceUsed = true;
            }
            if (this.RageReadyTimer > 0) {
                this.RageReadyTimer--;
                this.Rage = this.RageMax;
                this.RageReadyHeld = true;
            } else if (nearby.multiplier > 0) {
                rageChange += nearby.multiplier * this.RageMax / (45 * 60);
                this.RageCombatFrames = Math.max(this.RageCombatFrames, 3);
            } else if (this.RageCombatFrames <= 0 && !this.HeartOfDarknessEquipped) {
                rageChange -= this.RageMax / (30 * 60);
            }
        }
        if (!this.RageReadyHeld) {
            this.Rage = Clamp(this.Rage + rageChange, 0, this.RageMax);
        }
        if (this.Rage < this.RageMax * 0.95) {
            this.RageReadyGraceUsed = false;
        }
        if (this.RageModeActive && this.Rage <= 0.001) {
            this.Rage = 0;
            this.RageModeActive = false;
            this.RageReadyGraceUsed = false;
        }
        let adrenalineChange = 0;
        this.AdrenalineReadyHeld = false;
        if (this.AdrenalineModeActive) {
            adrenalineChange -= this.AdrenalineMax / this.AdrenalineDuration;
        } else if (this.Adrenaline >= this.AdrenalineMax - 0.001) {
            this.Adrenaline = this.AdrenalineMax;
            this.AdrenalineReadyHeld = true;
        } else if (nearby.bossAlive) {
            adrenalineChange += this.AdrenalineMax / this.AdrenalineChargeTime;
        } else {
            adrenalineChange -= this.AdrenalineMax / this.AdrenalineFadeTime;
        }
        if (adrenalineChange > 0 && this.StressPillsEquipped)
            adrenalineChange *= 1.2;
        if (!this.AdrenalineReadyHeld && (this.AdrenalinePauseTimer <= 0 || adrenalineChange < 0)) {
            this.Adrenaline = Clamp(this.Adrenaline + adrenalineChange, 0, this.AdrenalineMax);
        }
        if (this.AdrenalineModeActive && this.Adrenaline <= 0.001) {
            this.Adrenaline = 0;
            this.AdrenalineModeActive = false;
        }
        this.RipperSaveTimer++;
        if (this.RipperSaveTimer >= 300) {
            this.RipperSaveTimer = 0;
            this.SaveRippers();
        }
    }

    SetDustProperties(index, velocityX, velocityY, noGravity = true, noLight = false) {
        if (!(Number(index) >= 0))
            return;
        try {
            const dust = Terraria.Main.dust[Number(index)];
            if (!dust)
                return;
            dust.velocity = Vector2.new(Number(velocityX) || 0, Number(velocityY) || 0);
            dust.noGravity = noGravity === true;
            dust.noLight = noLight === true;
        } catch (e) { }
    }

    SpawnNamedDustPoint(name, x, y, velocityX, velocityY, color, scale, noGravity = true, noLight = false, alpha = 0) {
        const index = DustLoader.newDust(
            name,
            Vector2.new(Number(x), Number(y)),
            1,
            1,
            Number(velocityX) || 0,
            Number(velocityY) || 0,
            Number(alpha) || 0,
            color,
            Number(scale) || 1
        );
        this.SetDustProperties(index, velocityX, velocityY, noGravity, noLight);
        return index;
    }

    SpawnRawDustPoint(type, x, y, velocityX, velocityY, color, scale, noGravity = false, noLight = false, alpha = 0) {
        let index = -1;
        try {
            index = NewDust(
                Vector2.new(Number(x), Number(y)),
                1,
                1,
                Math.floor(Number(type)),
                Number(velocityX) || 0,
                Number(velocityY) || 0,
                Math.floor(Number(alpha) || 0),
                color,
                Number(scale) || 1
            );
        } catch (e) {
            return -1;
        }
        this.SetDustProperties(index, velocityX, velocityY, noGravity, noLight);
        return index;
    }

    SpawnRipperRing(player, kind, count, radius, speed, scale, angleOffset = 0) {
        if (!player || Terraria.Main.netMode === 2)
            return;
        const rage = kind === 'rage';
        const center = Terraria.PlayerCenter(player);
        const color = rage ? Color.Red : Color.new(100, 255, 210, 255);
        const name = rage ? 'RageDust' : 'AdrenalineDust';
        const velocity = Terraria.PlayerVelocity(player);
        const amount = Math.max(6, Math.floor(Number(count)));
        for (let i = 0; i < amount; i++) {
            const angle = Number(angleOffset) + Math.PI * 2 * i / amount;
            const dx = Math.cos(angle), dy = Math.sin(angle);
            const x = Number(center.X) + dx * Number(radius);
            const y = Number(center.Y) + dy * Number(radius);
            const vx = dx * Number(speed) + Number(velocity.X) * 0.12;
            const vy = dy * Number(speed) + Number(velocity.Y) * 0.12;
            this.SpawnNamedDustPoint(name, x, y, vx, vy, color, Number(scale) * (0.85 + Math.random() * 0.3), true, false, 20);
        }
    }

    SpawnActivationDust(player, kind) {
        if (!player || Terraria.Main.netMode === 2)
            return;
        const isRage = kind === 'rage';
        const center = Terraria.PlayerCenter(player);
        if (isRage) {
            // Source-style 132-particle radial eruption. This is a one-shot effect only.
            for (let i = 0; i < 132; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.sqrt(16 + Math.random() * 105);
                const scale = 0.9 + Math.random() * 1.2;
                this.SpawnNamedDustPoint(
                    'RageDust',
                    center.X,
                    center.Y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    Color.Red,
                    scale,
                    Math.random() >= 0.25,
                    false,
                    0
                );
            }
            this.SpawnRipperRing(player, 'rage', 28, 46, 4.6, 1.25, Math.PI / 28);
            try { PlayItemSound(74, center, -0.18, 1); } catch (e) { }
            try { PlayRoarSound(center, 0.25, 0.55); } catch (e) { }
            try { Terraria.Lighting.AddLight(center, 1.15, 0.08, 0.03); } catch (e) { }
            return;
        }

        // Source-shaped adrenaline sigil: three dust segments form the Calamity triangle.
        const points = [
            [0, -120, -48, 24],
            [-48, 24, 48, -24],
            [48, -24, 0, 120]
        ];
        const dustPerSegment = 64;
        for (const segment of points) {
            for (let i = 0; i < dustPerSegment; i++) {
                const t = (i + 0.5) / dustPerSegment;
                const x = Number(center.X) + segment[0] + (segment[2] - segment[0]) * t;
                const y = Number(center.Y) + segment[1] + (segment[3] - segment[1]) * t;
                const angle = Math.random() * Math.PI * 2;
                const accent = Math.random() < 0.25;
                const spread = (0.5 + Math.random() * 0.7) * (accent ? 4 : 1);
                const vx = Math.cos(angle) * spread;
                const vy = Math.sin(angle) * spread;
                const scale = 1.2 + Math.random() * 0.6;
                if (accent)
                    this.SpawnRawDustPoint(Math.random() < 0.5 ? 131 : 132, x, y, vx, vy, Color.White, scale, false, false, 0);
                else
                    this.SpawnNamedDustPoint('AdrenalineDust', x, y, vx, vy, Color.new(100, 255, 210, 255), scale, true, false, 0);
            }
        }
        this.SpawnRipperRing(player, 'adrenaline', 30, 54, 4.2, 1.2, 0);
        if (!PlayAdrenalineActivationSound()) {
            try { PlayItemSound(29, center, 0.55, 0.95); } catch (e) { }
            try { PlayItemSound(91, center, 0.18, 0.7); } catch (e) { }
        }
        try { Terraria.Lighting.AddLight(center, 0.32, 0.95, 0.72); } catch (e) { }
    }

    UpdateRipperVisuals(player) {
        if (!player || !player.active || player.dead)
            return;
        const center = Terraria.PlayerCenter(player);
        const velocity = Terraria.PlayerVelocity(player);
        if (this.RageModeActive) {
            this.RageVisualTimer = Number(this.RageVisualTimer || 0) + 1;
            try { Terraria.Lighting.AddLight(center, 0.48, 0.035, 0.015); } catch (e) { }
            if (this.RageVisualTimer % 2 === 0) {
                const x = Number(Terraria.PlayerPositionX(player)) + Math.random() * Math.max(1, Number(Terraria.PlayerWidth(player)));
                const y = Number(Terraria.PlayerPositionY(player)) + Math.random() * Math.max(1, Number(Terraria.PlayerHeight(player)));
                this.SpawnNamedDustPoint('RageDust', x, y, -Number(velocity.X) / 3, -Number(velocity.Y) / 3, Color.Red, 0.3 + Math.random() * 0.15, true, false, 20);
            }
            if (this.RageVisualTimer === 60)
                this.SpawnRipperRing(player, 'rage', 22, 22, 3.2, 0.72, 0);
            if (this.RageVisualTimer >= 90) {
                this.SpawnRipperRing(player, 'rage', 18, 18, 2.6, 0.62, Math.PI / 18);
                this.RageVisualTimer = 0;
            }
        } else {
            if (this.WasRageModeActive) {
                this.SpawnRipperRing(player, 'rage', 24, 20, 3.5, 0.72, 0);
                try { PlayItemSound(27, center, -0.25, 0.65); } catch (e) { }
            }
            this.RageVisualTimer = 0;
        }

        if (this.AdrenalineModeActive) {
            this.AdrenalineVisualTimer = Number(this.AdrenalineVisualTimer || 0) + 1;
            try { Terraria.Lighting.AddLight(center, 0.282, 0.765, 0.555); } catch (e) { }
            if (this.AdrenalineVisualTimer % 2 === 0) {
                for (let i = 0; i < 2; i++) {
                    const trail = Math.random() < 0.2 ? 1.5 : 0;
                    const x = Number(Terraria.PlayerPositionX(player)) - Number(velocity.X) * trail + Math.random() * Math.max(1, Number(Terraria.PlayerWidth(player)));
                    const y = Number(Terraria.PlayerPositionY(player)) - Number(velocity.Y) * trail + Math.random() * Math.max(1, Number(Terraria.PlayerHeight(player)));
                    this.SpawnNamedDustPoint('AdrenalineDust', x, y, Number(velocity.X) * 0.5, Number(velocity.Y) * 0.5, Color.new(100, 255, 210, 255), 0.4 + Math.random() * 0.8, true, false, 0);
                }
            }
            if (this.AdrenalineVisualTimer % 30 === 0)
                this.SpawnRipperRing(player, 'adrenaline', 14, 20, 2.1, 0.55, this.AdrenalineVisualTimer * 0.08);
        } else {
            if (this.WasAdrenalineModeActive) {
                this.SpawnRipperRing(player, 'adrenaline', 28, 24, 4.0, 0.8, Math.PI / 28);
                try { PlayItemSound(29, center, -0.25, 0.55); } catch (e) { }
            }
            this.AdrenalineVisualTimer = 0;
        }
        this.WasRageModeActive = this.RageModeActive === true;
        this.WasAdrenalineModeActive = this.AdrenalineModeActive === true;
    }

    TryActivateRage(player, fromTouch = false) {
        if (!this.IsRevengeanceEnabled()) {
            if (fromTouch)
                Tell('Ative o Modo Revengeance primeiro.', 255, 190, 90);
            return false;
        }
        if (this.RageModeActive || this.Rage < this.RageMax - 0.001) {
            if (fromTouch)
                Tell(`Fúria: ${Math.floor(this.Rage)}%.`, 255, 160, 120);
            return false;
        }
        this.RageModeActive = true;
        this.RageReadyHeld = false;
        this.RageReadyTimer = 0;
        this.RageVisualTimer = 0;
        this.SpawnActivationDust(player, 'rage');
        Tell('MODO FÚRIA ATIVADO: +35% de dano por 9 segundos.', 255, 90, 90);
        this.SaveRippers();
        return true;
    }

    TryActivateAdrenaline(player, fromTouch = false) {
        if (!this.IsRevengeanceEnabled()) {
            if (fromTouch)
                Tell('Ative o Modo Revengeance primeiro.', 255, 190, 90);
            return false;
        }
        if (this.AdrenalineModeActive || this.Adrenaline < this.AdrenalineMax - 0.001) {
            if (fromTouch)
                Tell(`Adrenalina: ${Math.floor(this.Adrenaline)}%.`, 120, 255, 210);
            return false;
        }
        this.AdrenalineModeActive = true;
        this.AdrenalineVisualTimer = 0;
        this.SpawnActivationDust(player, 'adrenaline');
        Tell('MODO ADRENALINA ATIVADO: +150% de dano por 8 segundos.', 90, 255, 190);
        this.SaveRippers();
        return true;
    }

    GetPortedRogueWeaponTypes() {
        if (CachedRogueItemTypes)
            return CachedRogueItemTypes;
        const types = new Set();
        for (const name of ['WulfrumKnife', 'ScourgeoftheDesert', 'InfestedClawmerang', 'Mycoroot', 'RotBall', 'ToothBall']) {
            const type = Number(ModItem.getTypeByName(name) || 0);
            if (type > 0)
                types.add(type);
        }
        CachedRogueItemTypes = types;
        return types;
    }

    IsPortedRogueWeapon(item) {
        if (!item || !(Number(item.type) > 0))
            return false;
        return this.GetPortedRogueWeaponTypes().has(Number(item.type));
    }

    GetRogueStealthCostFraction() {
        return Clamp(Number(this.RogueStealthCostFraction) || 1, 0.05, 1);
    }

    StealthStrikeAvailable() {
        const max = Number(this.RogueStealthMax) || 0;
        if (this.WearingRogueArmor !== true || !(max > 0))
            return false;
        return Number(this.RogueStealth) >= max * this.GetRogueStealthCostFraction() - 0.0001;
    }

    ConsumeRogueStealth(item) {
        if (!this.StealthStrikeAvailable())
            return false;
        const max = Math.max(0, Number(this.RogueStealthMax) || 0);
        const cost = max * this.GetRogueStealthCostFraction();
        this.RogueStealth = Clamp(Number(this.RogueStealth) - cost, 0, max);
        this.RogueStealthReady = false;
        this.RogueStealthStrikeThisFrame = true;
        this.RogueStealthStrikeCount += 1;
        this.RogueLastStrikeItem = String(item && Number(item.type) || 'Rogue');
        return true;
    }

    UpdateRogueStealth(player) {
        if (!this.IsLocalPlayer(player))
            return;
        if (!this.WearingRogueArmor || !(Number(this.RogueStealthMax) > 0) || player.dead) {
            this.RogueStealth = 0;
            this.RogueStealthReady = false;
            return;
        }
        this.RogueStealth = Clamp(this.RogueStealth, 0, this.RogueStealthMax);
        const attacking = Number(player.itemAnimation) > 0;
        if (attacking) {
            let held = null;
            try {
                held = player.inventory[Math.max(0, Math.min(58, Math.floor(Number(player.selectedItem) || 0)))];
            } catch (e) { }
            const damaging = !!(held && Number(held.damage) > 0 && (held.noMelee !== true || Number(held.shoot) > 0));
            const tool = !!(held && (Number(held.pick) > 0 || Number(held.axe) > 0 || Number(held.hammer) > 0 || Number(held.createTile) >= 0));
            if (damaging && !tool && this.RogueStealthStrikeThisFrame !== true) {
                this.RogueStealth = 0;
                this.RogueStealthReady = false;
            }
        } else {
            const velocity = Terraria.PlayerVelocity(player);
            const moving = Math.abs(Number(velocity.X)) + Math.abs(Number(velocity.Y)) > 0.10;
            const frames = moving ? 240 : 120;
            const bonus = moving ? Number(this.RogueStealthMovingBonus) || 0 : Number(this.RogueStealthStandstillBonus) || 0;
            const generationMultiplier = Math.max(0.05, 1 + bonus);
            this.RogueStealth = Clamp(this.RogueStealth + this.RogueStealthMax / frames * generationMultiplier, 0, this.RogueStealthMax);
        }
        const ready = this.StealthStrikeAvailable();
        if (ready && !this.RogueStealthReady) {
            try {
                PlayItemSound(29, Terraria.PlayerCenter(player), 0.15, 0.65);
            } catch (e) { }
        }
        this.RogueStealthReady = ready;
    }

    GetRogueSummary() {
        return `wearing=${this.WearingRogueArmor}, stealth=${Number(this.RogueStealth).toFixed(3)}/${Number(this.RogueStealthMax).toFixed(3)}, ready=${this.StealthStrikeAvailable()}, damageBonus=${(Number(this.RogueDamageBonus) * 100).toFixed(1)}%, crit=${this.RogueCritBonus}, speed=${this.RogueUseSpeedBonus}, knockback=${this.RogueKnockbackBonus}, strikes=${this.RogueStealthStrikeCount}`;
    }

    ModifyWeaponDamage(player, item, damage) {
        let bonus = 0;
        if (this.RageModeActive)
            bonus += this.RageDamageBoost;
        if (this.AdrenalineModeActive)
            bonus += this.AdrenalineDamageBoost + (this.ElectrolyteGelPackUsed ? 0.20 : 0);
        if (this.ManaPolarizerEquipped && item && item.magic === true) {
            const ratio = Math.max(0, Math.min(1, Number(player.statMana) / Math.max(1, Number(player.statManaMax2))));
            bonus += 0.05 + ratio * 0.10;
        }
        const isRogue = this.IsPortedRogueWeapon(item);
        if (isRogue) {
            bonus += Math.max(0, Number(this.RogueDamageBonus) || 0);
            if (this.RogueEmblemEquipped)
                bonus += 0.15;
        }
        if (this.BloodyWormToothEquipped && item && item.melee === true)
            bonus += 0.10;
        this.LastDamageMultiplier = 1 + bonus;
        this.WeaponDamage = Number(damage) * this.LastDamageMultiplier;
    }

    ModifyHurt(player, modifiers) {
        if (this.IsRevengeanceEnabled() && !this.AdrenalineModeActive && this.Adrenaline >= this.AdrenalineMax - 0.001) {
            modifiers.damage = Math.max(1, Math.floor(Number(modifiers.damage) * (this.ElectrolyteGelPackUsed ? 0.45 : 0.5)));
            this.LastAdrenalineDR = true;
        }
    }

    CountOwnedProjectiles(player, types) {
        if (!player)
            return 0;
        const wantedTypes = types.map(value => Math.floor(Number(value))).filter(value => value > 0);
        if (wantedTypes.length <= 0)
            return 0;
        let count = 0;
        try {
            for (const type of wantedTypes) {
                const nativeCount = Number(player.ownedProjectileCounts[type]);
                if (!Number.isFinite(nativeCount))
                    throw new Error('ownedProjectileCounts unavailable');
                count += Math.max(0, Math.floor(nativeCount));
            }
            return count;
        } catch (e) { }
        const wanted = new Set(wantedTypes);
        for (let i = 0; i < 1000; i++) {
            try {
                const proj = Terraria.Main.projectile[i];
                if (proj && proj.active && Number(proj.owner) === Number(Terraria.PlayerIndex(player)) && wanted.has(Number(proj.type)))
                    count++;
            } catch (ignored) { }
        }
        return count;
    }

    BestClassDamage(player, baseDamage) {
        let multiplier = 1;
        // This Terraria/TLPro build exposes the four legacy class multipliers
        // below. Probing allDamage, genericDamage, summonDamage or thrownDamage
        // causes a complete native Player reflection dump because those members
        // do not exist here. Generic bonuses are already folded into the exposed
        // class multipliers by Terraria.
        for (const key of ['meleeDamage', 'rangedDamage', 'magicDamage', 'minionDamage']) {
            try {
                const value = Number(player[key]);
                if (Number.isFinite(value))
                    multiplier = Math.max(multiplier, value);
            } catch (e) { }
        }
        try {
            multiplier = Math.max(multiplier, 1 + Math.max(0, Number(this.RogueDamageBonus || 0)));
        } catch (e) { }
        return Math.max(1, Math.floor(Number(baseDamage) * multiplier));
    }

    TrySpawnRottenBrainNimbus(player) {
        if (!this.RottenBrainEquipped || !this.IsLocalPlayer(player) || !player.active || player.dead)
            return false;
        CachedRottenBrainSpawnerType = ResolveModProjectileType(CachedRottenBrainSpawnerType, 'ShadeNimbusSpawner');
        CachedRottenBrainCloudType = ResolveModProjectileType(CachedRottenBrainCloudType, 'ShadeNimbus');
        const spawnerType = CachedRottenBrainSpawnerType;
        const cloudType = CachedRottenBrainCloudType;
        if (!(spawnerType > 0) || this.CountOwnedProjectiles(player, [spawnerType, cloudType]) > 0)
            return false;
        let source = null;
        try {
            source = player.GetProjectileSource_Item(player.HeldItem);
        } catch (e) { }
        const damage = this.BestClassDamage(player, 8);
        try {
            NewProjectile(source, Terraria.PlayerCenter(player), Vector2.new(0, -12.5), spawnerType, damage, 0, Terraria.PlayerIndex(player), 0, 0, 1, null);
            return true;
        } catch (e) {
            tl.log(`[CalamityPort] Rotten Brain shade nimbus spawn failed: ${e}`);
            return false;
        }
    }

    TrySpawnAerospecFeathers(player, damage, cooldownCounter) {
        const counter = Number(cooldownCounter);
        if (!this.AerospecSetActive || Number(damage) <= 25 || !this.IsLocalPlayer(player))
            return false;
        if (Number.isFinite(counter) && counter !== -1 && counter !== 1)
            return false;
        CachedAerospecFeatherType = ResolveModProjectileType(CachedAerospecFeatherType, 'AerospecFeather');
        if (!(CachedAerospecFeatherType > 0))
            return false;
        let source = null;
        try { source = player.GetProjectileSource_Item(player.HeldItem); } catch (e) { }
        const center = Terraria.PlayerCenter(player);
        const owner = Number(Terraria.PlayerIndex(player));
        const baseDamage = Terraria.Main.masterMode === true ? 45 : (Terraria.Main.expertMode === true ? 30 : 15);
        let featherDamage = this.BestClassDamage(player, baseDamage);
        featherDamage = Math.max(featherDamage, Math.floor(baseDamage * (1 + Math.max(0, Number(this.RogueDamageBonus) || 0))));
        for (let i = 0; i < 4; i++) {
            const x = Number(center.X) + (Math.random() * 800 - 400);
            const y = Number(center.Y) - (500 + Math.random() * 300);
            let vx = Number(center.X) - x + (Math.random() * 200 - 100);
            let vy = Number(center.Y) - y;
            const length = Math.sqrt(vx * vx + vy * vy) || 1;
            vx = vx / length * 20;
            vy = vy / length * 20;
            try { NewProjectile(source, Vector2.new(x, y), Vector2.new(vx, vy), CachedAerospecFeatherType, featherDamage, 1, owner, 0, 0, 0, null); } catch (e) { }
        }
        return true;
    }

    IsBandTarget(npc) {
        try { return !!npc && npc.active && !npc.friendly && !npc.townNPC && !npc.dontTakeDamage && Number(npc.life) > 0 && Number(npc.lifeMax) > 5; } catch (_) { return false; }
    }

    StrikeAccessoryTarget(player, npc, baseDamage, crit = true, scaleWithClass = true) {
        if (!this.IsBandTarget(npc)) return 0;
        const rawDamage = Math.max(1, Number(baseDamage) || 1);
        const damage = scaleWithClass === false ? rawDamage : this.BestClassDamage(player, rawDamage);
        let dir = 1;
        try { dir = Number(npc.Center.X) >= Number(Terraria.PlayerCenter(player).X) ? 1 : -1; } catch (_) { }
        try {
            return Number(npc['double StrikeNPC(int Damage, float knockBack, int hitDirection, bool crit, bool noEffect, bool fromNet, int owner)'](damage, 0, dir, crit === true, false, false, Terraria.PlayerIndex(player))) || damage;
        } catch (_) { return 0; }
    }

    BandBurst(npc, kind, visible) {
        if (visible !== true || !npc) return;
        let dust = Number(Terraria.ID.DustID.PurpleTorch || 27);
        if (kind === 'protolith') dust = Number(Terraria.ID.DustID.GemRuby || 90);
        if (kind === 'batholith') dust = Number(Terraria.ID.DustID.Electric || 226);
        try {
            const r = npc['Rectangle getRect()']();
            for (let i = 0; i < 10; i++)
                NewDust(Vector2.new(Number(r.X), Number(r.Y)), Number(r.Width), Number(r.Height), dust, Math.random() * 6 - 3, Math.random() * 6 - 3, 80, Color.White, 1.1);
        } catch (_) { }
    }

    TryBandStrike(player, npc, source, isProjectile) {
        if (!this.IsLocalPlayer(player) || Number(this.BandCooldownFrames) > 0 || !this.IsBandTarget(npc)) return;
        let kind = '', baseDamage = 0, cooldown = 0, visual = true;
        const magic = !!(source && source.magic === true);
        const ranged = !!(source && source.ranged === true);
        if (this.BatholithBangleEquipped && magic) { kind='batholith';baseDamage=50;cooldown=600;visual=this.BatholithBangleVisual; }
        else if (this.ProtolithBangleEquipped && ranged) { kind='protolith';baseDamage=30;cooldown=420;visual=this.ProtolithBangleVisual; }
        else if (this.BlackGlassBandEquipped) { kind='black';baseDamage=20;cooldown=300;visual=this.BlackGlassBandVisual; }
        else return;
        this.BandCooldownFrames = cooldown;
        this.BandBurst(npc, kind, visual);
        if (kind !== 'protolith') {
            this.StrikeAccessoryTarget(player, npc, baseDamage, true);
            // Black Glass Band halves its shared cooldown when the flash finishes the target.
            if (kind === 'black') {
                let killed = false;
                try { killed = npc.active !== true || Number(npc.life) <= 0; } catch (_) { }
                if (killed) this.BandCooldownFrames = Math.min(Number(this.BandCooldownFrames) || 300, 150);
            }
            return;
        }
        // Protolith's marble flash can catch multiple enemies. This full NPC scan only runs once per 7-second proc.
        let center = null; try { center = npc.Center; } catch (_) { }
        if (!center) { this.StrikeAccessoryTarget(player, npc, baseDamage, true); return; }
        let hitAny = false;
        for (let i = 0; i < 200; i++) {
            let other = null; try { other = Terraria.Main.npc.get_Item(i); } catch (_) { }
            if (!this.IsBandTarget(other)) continue;
            let c = null; try { c = other.Center; } catch (_) { }
            if (!c) continue;
            const dx = Number(c.X) - Number(center.X), dy = Number(c.Y) - Number(center.Y);
            if (dx * dx + dy * dy > 150 * 150) continue;
            if (this.StrikeAccessoryTarget(player, other, baseDamage, true) > 0) hitAny = true;
        }
        if (!hitAny) this.StrikeAccessoryTarget(player, npc, baseDamage, true);
    }

    ApplyCrawCarapaceThorns(player, damageSource) {
        if (!this.CrawCarapaceEquipped || !this.IsLocalPlayer(player)) return;
        let index = -1;
        try { index = Math.floor(Number(damageSource?._sourceNPCIndex)); } catch (_) { }
        if (!(index >= 0 && index < 200)) return;
        let npc = null; try { npc = Terraria.Main.npc.get_Item(index); } catch (_) { }
        if (!this.IsBandTarget(npc)) return;
        const base = Terraria.Main.masterMode === true ? 60 : (Terraria.Main.expertMode === true ? 40 : 20);
        // Craw Carapace thorns use their own difficulty-scaled damage and do not inherit the player's best class.
        this.StrikeAccessoryTarget(player, npc, base, false, false);
    }

    UpdateOceanCrest(player) {
        if (!this.OceanCrestEquipped || !player || player.dead || player.wet !== true) return;
        const vx = Number(player.velocity?.X || 0), vy = Number(player.velocity?.Y || 0);
        if (Math.abs(vx) > 0.03 || Math.abs(vy) > 0.03) return;
        try {
            const max = Number(player.breathMax || 200);
            const breath = Number(player.breath || 0);
            if (breath < max) player.breath = Math.min(max, breath + 3);
        } catch (_) { }
    }

    OnHurt(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        if (Number(damage) > 0) this.ApplyCrawCarapaceThorns(player, damageSource);
        if (Number(damage) > 0)
            this.TrySpawnAerospecFeathers(player, damage, cooldownCounter);
        if (Number(damage) > 0)
            this.TrySpawnRottenBrainNimbus(player);
        if (Number(damage) > 0 && this.IsLocalPlayer(player) && this.IsWulfrumBastionActive()) {
            this.WulfrumBastionActiveFrames = Math.max(0, Number(this.WulfrumBastionActiveFrames) - this.WulfrumBastionHitPenalty);
            if (Number(this.WulfrumBastionActiveFrames) <= 0)
                this.EndWulfrumBastion(player, true);
            else {
                try {
                    PlayItemSound(10, Terraria.PlayerCenter(player), 0.3, 0.6);
                } catch (e) { }
            }
        }
        if (!this.IsRevengeanceEnabled())
            return;
        this.RageCombatFrames = 10 * 60;
        this.LastAdrenalineLoss = 0;
        if (Number(damage) <= 0 || this.AdrenalineModeActive)
            return;
        this.AdrenalinePauseTimer += 60;
        const before = this.Adrenaline;
        if (before >= this.AdrenalineMax - 0.001) {
            if (this.IsLocalPlayer(player) && !PlayAdrenalineMajorLossSound()) {
                try { PlayItemSound(29, Terraria.PlayerCenter(player), -0.35, 0.8); } catch (e) { }
            }
            this.Adrenaline = 0;
        } else {
            const hpRatio = Number(damage) / Math.max(1, Number(player.statLifeMax2));
            const smallHitRatio = Clamp(hpRatio / 0.05, 0, 1);
            const lossFraction = 0.25 + 0.75 * smallHitRatio;
            this.Adrenaline = Math.max(0, before - before * lossFraction);
        }
        this.LastAdrenalineLoss = before - this.Adrenaline;
        this.SaveRippers();
    }

    Kill(player, damageSource, damage, hitDirection, pvp) {
        if (!this.IsLocalPlayer(player))
            return;
        try {
            CleanupSlimeGodIfNoLivingPlayers();
        } catch (e) { }
        try {
            CleanupGiantClamIfNoLivingPlayers();
        } catch (e) { }
    }

    OnHitNPC(player, item, npc, damageDone, knockBack) {
        this.RageCombatFrames = 10 * 60;
        if (Number(damageDone) > 0) this.TryBandStrike(player, npc, item, false);
    }

    OnHitNPCWithProj(player, npc, projectile) {
        this.RageCombatFrames = 10 * 60;
        if (projectile && Number(projectile.damage || 0) > 0) this.TryBandStrike(player, npc, projectile, true);
        if (this.ManaPolarizerEquipped && projectile && projectile.magic === true && player && player.active && !player.dead) {
            const hits = Math.max(0, Number(projectile.numHits || 0));
            const mult = Math.max(0, 0.10 - hits * 0.025);
            const amount = Math.min(20, Math.max(0, Math.round(Number(projectile.damage || 0) * mult)));
            const before = Number(player.statLife), max = Number(player.statLifeMax2);
            if (amount > 0 && before < max) {
                const healed = Math.min(amount, max - before);
                player.statLife = before + healed;
                try {
                    player.HealEffect(healed, true);
                } catch (e) { }
            }
        }
    }

    PostUpdate(player) {
        const isLocal = this.IsLocalPlayer(player);
        if (isLocal) {
            if (Number(this.BandCooldownFrames) > 0) this.BandCooldownFrames = Math.max(0, Number(this.BandCooldownFrames) - 1);
            this.UpdateOceanCrest(player);
            this.UpdateSaharaSlicers(player);
            this.UpdateRippers(player);
            this.UpdateRipperVisuals(player);
            this.UpdateRogueStealth(player);
        }
        if (isLocal) {
            const currentStars = this.CountBrittleStars(player);
            if (currentStars > 0) {
                this.BrittleStarCount = currentStars;
                this.BrittleStarMissingFrames = 0;
            } else {
                this.BrittleStarMissingFrames += 1;
                if (this.BrittleStarMissingFrames >= 30) {
                    this.BrittleStarCount = 0;
                    this.BrittleStarDefenseMode = false;
                    this.BrittleStarDefenseBonus = 0;
                }
            }
        }
        if (isLocal)
            this.UpdateWulfrumBastion(player);
        this.SnowRuffianGliding = false;
        if (!this.SnowRuffianSetActive || player.dead)
            return;
        const measuredVelocity = Terraria.PlayerVelocity(player);
        const falling = player.gravDir === -1
            ? Number(measuredVelocity.Y) < -0.05
            : Number(measuredVelocity.Y) > 0.05;
        const mounted = player.mount && player.mount.Active === true;
        if (player.controlJump && falling && !mounted) {
            const before = Number(measuredVelocity.Y);
            player.slowFall = true;
            player.maxFallSpeed = Math.min(Number(player.maxFallSpeed) || 10, Math.max(2.5, Math.abs(before) * 0.90));
            player.noFallDmg = true;
            player.fallStart = Math.floor(Terraria.PlayerPositionY(player) / 16);
            this.SnowRuffianGliding = true;
            this.SnowRuffianGlideFrames += 1;
            this.SnowRuffianLastVelocityBefore = before;
            this.SnowRuffianLastVelocityAfter = Math.sign(before || 1) * Math.min(Math.abs(before), Number(player.maxFallSpeed));
        }
    }

    SaveRippers() {
        if (!this.Loaded || !PlayerDB.Instance)
            return;
        PlayerDB.set(CalamityPlayerState.Prefix('rageUnlocked'), this.RageUnlocked === true);
        PlayerDB.set(CalamityPlayerState.Prefix('adrenalineUnlocked'), this.AdrenalineUnlocked === true);
        PlayerDB.set(CalamityPlayerState.Prefix('rage'), Number(this.Rage));
        PlayerDB.set(CalamityPlayerState.Prefix('adrenaline'), Number(this.Adrenaline));
    }

    SetPersistentFlag(key, value) {
        const boolValue = value === true;
        PlayerDB.set(CalamityPlayerState.Prefix(key), boolValue);
        return boolValue;
    }

    GetPersistentFlag(key, fallback = false) {
        const value = PlayerDB.get(CalamityPlayerState.Prefix(key));
        return value == null ? fallback : value === true;
    }

    GetRipperSummary() {
        return `revengeance=${this.IsRevengeanceEnabled()}, rage=${this.Rage.toFixed(1)}/${this.RageMax}, rageActive=${this.RageModeActive}, rageReadyHeld=${this.RageReadyHeld}, rageGrace=${this.RageReadyTimer}, prox=${this.LastProximityRage.toFixed(2)}, adrenaline=${this.Adrenaline.toFixed(1)}/${this.AdrenalineMax}, adrenalineActive=${this.AdrenalineModeActive}, readyHeld=${this.AdrenalineReadyHeld}, boss=${this.LastBossActive}, pause=${this.AdrenalinePauseTimer}, damageMult=${this.LastDamageMultiplier.toFixed(2)}, lastAdrenalineLoss=${this.LastAdrenalineLoss.toFixed(1)}, fullAdrenalineDR=${this.LastAdrenalineDR}`;
    }

    GetSummary() {
        return `loaded=${this.Loaded}, rage=${this.Rage.toFixed(1)}, adrenaline=${this.Adrenaline.toFixed(1)}, hpBonus=${this.PermanentHealthBonus}, snowRuffianSet=${this.SnowRuffianSetActive}, gliding=${this.SnowRuffianGliding}, wulfrum=${this.GetWulfrumBastionSummary()}, glideFrames=${this.SnowRuffianGlideFrames}, lastVelocity=${this.SnowRuffianLastVelocityBefore.toFixed(2)}->${this.SnowRuffianLastVelocityAfter.toFixed(2)}`;
    }
}
