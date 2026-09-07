import { Terraria, Modules } from './../ModImports.js';
import { CombinedLoader } from './../Loaders/CombinedLoader.js';
import { PlayerLoader } from './../Loaders/PlayerLoader.js';
import { ItemLoader } from './../Loaders/ItemLoader.js';
import { TileLoader } from './../Loaders/TileLoader.js';
import { BiomeLoader } from './../Loaders/BiomeLoader.js';
import { BuffLoader } from './../Loaders/BuffLoader.js';
import { NPCLoader } from './../Loaders/NPCLoader.js';
import { SystemLoader } from './../Loaders/SystemLoader.js';
import { ProjectileLoader } from './../Loaders/ProjectileLoader.js';
import { TileData } from './../Modules/TileData.js';
import { SubworldLoader } from './../Loaders/SubworldLoader.js';
import { AchievementLoader } from './../Loaders/AchievementLoader.js';
import { MountLoader } from './../Loaders/MountLoader.js';
import { ModItem } from './../ModItem.js';
import { BeginVirtualWormMeleeProxy, EndVirtualWormMeleeProxy } from './../../Core/SingleEntityWormRuntime.js';

const { Color, Rand, Vector2 } = Modules;
const PlaySound = Terraria.Audio.SoundEngine['SoundEffectInstance PlaySound(int type, int x, int y, int Style, float volumeScale, float pitchOffset)'];

// TLPro 1.4 mobile performance bridge:
// Reading LegacySoundStyle.SoundId / _style from a NativeObject makes the bridge dump the
// entire LegacySoundStyle member table. This happens on the gameplay thread and was visible
// in device logs as repeated ~65-line reflection blocks during weapon use. Keep the sound
// identity entirely in JavaScript instead. These entries are generated from the UseSound
// declarations of the 57 current ported items; 2=item, 3=NPC hit, 4=NPC death in Terraria's
// legacy numeric sound API.
const DeclaredItemSounds = [
    ['AbyssShocker', 2, 13], // Item13
    ['AbyssalTome', 2, 17], // Item17
    ['AcidwoodBow', 2, 5], // Item5
    ['AmidiasTrident', 2, 1], // Item1
    ['AnechoicCoating', 2, 3], // Item3
    ['Aorta', 2, 1], // Item1
    ['Barinade', 2, 5], // Item5
    ['BloodBath', 2, 21], // Item21
    ['Bloodfin', 2, 3], // Item3
    ['BloodyVein', 3, 9], // NPCHit9
    ['BrittleStarStaff', 2, 44], // Item44
    ['ContaminatedBile', 2, 106], // Item106
    ['CorroslimeStaff', 2, 44], // Item44
    ['CrimslimeStaff', 2, 44], // Item44
    ['DankStaff', 2, 44], // Item44
    ['EldritchTome', 2, 103], // Item103
    ['ElectrolyteGelPack', 2, 122], // Item122
    ['EnchantedConch', 2, 44], // Item44
    ['Eviscerator', 2, 40], // Item40
    ['FleshOfInfidelity', 2, 44], // Item44
    ['FrostBolt', 2, 20], // Item20
    ['Fungicide', 2, 61], // Item61
    ['HadalStew', 2, 2], // Item2
    ['HyphaeRod', 2, 8], // Item8
    ['InfestedClawmerang', 2, 1], // Item1
    ['MycelialClaws', 2, 1], // Item1
    ['Mycoroot', 2, 1], // Item1
    ['OverloadedBlaster', 2, 9], // Item9
    ['PerfectDark', 2, 1], // Item1
    ['PolypLauncher', 2, 44], // Item44
    ['PuffShroom', 2, 42], // Item42
    ['RotBall', 2, 1], // Item1
    ['RottingEyeball', 3, 2], // NPCHit2
    ['Roxcalibur', 3, 42], // NPCHit42
    ['SaharaSlicers', 2, 1], // Item1
    ['SandDollar', 2, 1], // Item1
    ['SandstreamScepter', 2, 72], // Item72
    ['SausageMaker', 2, 1], // Item1
    ['ScourgeoftheDesert', 2, 1], // Item1
    ['SeashineSword', 2, 1], // Item1
    ['ShaderainStaff', 2, 66], // Item66
    ['Shadethrower', 2, 34], // Item34
    ['Shellshooter', 2, 5], // Item5
    ['SnapClam', 2, 1], // Item1
    ['ToothBall', 2, 1], // Item1
    ['UrchinStinger', 2, 1], // Item1
    ['VeinBurster', 2, 1], // Item1
    ['Waywasher', 2, 8], // Item8
    ['WulfrumBlunderbuss', 2, 36], // Item36
    ['WulfrumController', 2, 15], // Item15
    ['WulfrumDiggingTurtle', 2, 1], // Item1
    ['WulfrumDrill', 2, 23], // Item23
    ['WulfrumFusionCannon', 2, 91], // Item91
    ['WulfrumKnife', 2, 1], // Item1
    ['WulfrumProsthesis', 2, 91], // Item91
    ['WulfrumRod', 2, 1], // Item1
    ['WulfrumScrewdriver', 2, 1], // Item1
];
let ItemSoundByType = null;
let ItemSoundRegistryLogged = false;

function EnsureItemSoundRegistry() {
    if (ItemSoundByType)
        return ItemSoundByType;
    const map = new Map();
    for (const spec of DeclaredItemSounds) {
        try {
            const itemType = Number(ModItem.getTypeByName(spec[0]) || 0);
            if (itemType > 0)
                map.set(itemType, { type: Number(spec[1]), style: Number(spec[2]) });
        } catch (e) { }
    }
    ItemSoundByType = map;
    if (!ItemSoundRegistryLogged) {
        ItemSoundRegistryLogged = true;
        try { tl.log(`[CalamityPort AudioCompat] static item sound registry active; mapped=${map.size}, LegacySoundStyle member reads=0.`); } catch (e) { }
    }
    return map;
}

function IsForeignCustomItem(item) {
    const type = Math.floor(Number(item?.type) || 0);
    return type >= ItemLoader.MAX_VANILLA_ID && !ItemLoader.isModType(type);
}

function PlayItemSound(item, player) {
    if (!item || !player)
        return;
    const sound = EnsureItemSoundRegistry().get(Number(item.type));
    if (!sound)
        return;
    const center = Terraria.PlayerCenter(player);
    PlaySound(
        sound.type,
        Math.floor(Number(center.X)),
        Math.floor(Number(center.Y)),
        sound.style,
        1,
        Number(item.useSoundPitch) || 0
    );
}

export class PlayerHooks {
    static initialized = false;
    static worldLoaded = false;
    
    // Here you can disable the hooks that won't be used in your mod to avoid unnecessary processing
    static HookList = {
        All: (info) => true,
        Spawn: (info) => info.hasPlayers,
        TileInteractionsCheck: (info) => info.hasGlobalTiles,
        TileInteractionsCheckLongDistance: (info) => info.hasGlobalTiles,
        TileInteractionsUse: (info) => info.hasGlobalTiles,
        GetPickaxeDamage: (info) => info.hasGlobalTiles,
        ItemCheck: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        ItemCheck_CheckCanUse: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        ItemCheck_ApplyUseStyle: (info) => info.hasItems || info.hasGlobalItems,
        ItemCheck_ApplyHoldStyle: (info) => info.hasItems || info.hasGlobalItems,
        ItemCheck_StartActualUse: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        ApplyItemTime: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        ApplyItemAnimation: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        ApplyLifeAndOrMana: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        CheckMana: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        GetWeaponDamage: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        GetWeaponCrit: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        GetWeaponKnockback: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        ItemCheck_Shoot: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        ApplyNPCOnHitEffects: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers || info.hasNPCs || info.hasGlobalNPCs,
        UpdateEquips: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        UpdateInventory: (info) => false, // Requires UpdateEquips, disabled by default.
        ApplyEquipFunctional: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        ApplyEquipVanity: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        UpdateDyes: (info) => PlayerLoader.HasCallbacks('UpdateDyes'),
        UpdateArmorSets: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        WingMovement: (info) => ItemLoader.hasAnyHandlers('WingMovement') || PlayerLoader.HasCallbacks('WingMovement'),
        CanAcceptItemIntoInventory: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        GetItem: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers || info.hasAchievements,
        ExtractinatorUse: (info) => info.hasItems || info.hasGlobalItems || info.hasPlayers,
        RecalculateLuck: (info) => PlayerLoader.HasCallbacks('PreModifyLuck') || PlayerLoader.HasCallbacks('ModifyLuck'),
        Update: (info) => info.hasPlayers,
        UpdateLifeRegen: (info) => info.hasPlayers,
        UpdateManaRegen: (info) => PlayerLoader.HasCallbacks('UpdateManaRegen'),
        UpdateBuffs: (info) => info.hasPlayers || info.hasBuffs,
        UpdateDead: (info) => info.hasPlayers,
        UpdateBiomes: (info) => info.hasBiomes,
        BordersMovement: (info) => PlayerLoader.HasCallbacks('UpdateMovement'),
        ResetEffects: (info) => info.hasPlayers || info.hasBuffs,
        Hurt: (info) => info.hasPlayers,
        KillMe: (info) => PlayerLoader.HasCallbacks('PreKill') || PlayerLoader.HasCallbacks('Kill'),
        GetDyeTraderReward: (info) => PlayerLoader.HasCallbacks('GetDyeTraderReward'),
        GetAnglerQuestReward: (info) => PlayerLoader.HasCallbacks('AnglerQuestReward'),
        SellItem: (info) => PlayerLoader.HasCallbacks('CanSellItem') || PlayerLoader.HasCallbacks('PostSellItem'),
        SetupStartingItems: (info) => PlayerLoader.HasCallbacks('SetupStartingItems'),
        AddBuff_ActuallyTryToAddTheBuff: (info) => info.hasBuffs,
        AddBuff_TryUpdatingExistingBuffTime: (info) => info.hasBuffs,
        GUIBuffs: (info) => info.hasBuffs,
        DrawPlayerLayers: (info) => PlayerLoader.HasCallbacks('ShouldDrawParts') || info.hasMounts || info.hasItems
    };
    
    static Initialize(info) {
        if (!this.HookList.All(info) || this.initialized) return;

        // Resolve optional dispatch paths once at loader initialization.  These flags
        // stay stable for the lifetime of the loaded mod set and avoid walking empty
        // loader paths in Terraria's hottest item/mana hooks.
        const hasCanAutoReuseItem = ItemLoader.hasAnyHandlers('CanAutoReuseItem')
            || PlayerLoader.HasCallbacks('CanAutoReuseItem');
        const hasUseAnimation = ItemLoader.hasAnyHandlers('UseAnimation')
            || PlayerLoader.HasCallbacks('UseAnimation');
        const hasGetHealMana = ItemLoader.hasAnyHandlers('GetHealMana')
            || PlayerLoader.HasCallbacks('GetHealMana');
        const hasOnConsumeMana = ItemLoader.hasAnyHandlers('OnConsumeMana')
            || PlayerLoader.HasCallbacks('OnConsumeMana');
        
        Terraria.Player.Hooks.EnterWorld.hook((original, playerIndex) => {
            const player = Terraria.Main.player[playerIndex];
            
            // Resize arrays
            player.buffImmune = player.buffImmune.cloneResized(BuffLoader.BuffCount);
            player.ownedProjectileCounts = player.ownedProjectileCounts.cloneResized(ProjectileLoader.ProjectileCount);
            player.npcTypeNoAggro = player.npcTypeNoAggro.cloneResized(NPCLoader.NPCCount);
            
            // Fix double-click crash on buffs
            player.AddBuff(185, 2, false);
            
            BiomeLoader.SetupPlayer(player);
            
            if (!this.worldLoaded) {
                this.worldLoaded = true;
                SystemLoader.OnWorldLoad();
            }
            
            original(playerIndex);
            AchievementLoader.OnEnterWorld(player);
            PlayerLoader.OnEnterWorld(player);
            
            if (SubworldLoader.AnySubworldActive) {
                SubworldLoader.ActiveSubworld.OnEnter(player);
            }
        });
        
        if (this.HookList.Spawn(info)) {
            Terraria.Player['void Spawn(PlayerSpawnContext context)'
            ].hook((original, self, context) => {
                original(self, context);
                if (context.ReviveFromDeath) {
                    if (self.difficulty === 1) PlayerLoader.SetupStartingItems(self, true);
                    PlayerLoader.OnRespawn(self);
                }
            });
        }
        
        if (this.HookList.TileInteractionsCheck(info)) {
            Terraria.Player['void TileInteractionsCheck(int myX, int myY)'
            ].hook((original, self, mX, mY) => {
                original(self, mX, mY);
                const type = new TileData(mX, mY).type;
                TileLoader.MouseOver(self, mX, mY, type);
            });
        }
        
        if (this.HookList.TileInteractionsCheckLongDistance(info)) {
            Terraria.Player['void TileInteractionsCheckLongDistance(int myX, int myY)'
            ].hook((original, self, mX, mY) => {
                original(self, mX, mY);
                const type = new TileData(mX, mY).type;
                TileLoader.MouseOverFar(self, mX, mY, type);
            });
        }
        
        if (this.HookList.TileInteractionsUse(info)) {
            Terraria.Player['void TileInteractionsUse(int myX, int myY)'
            ].hook((original, self, mX, mY) => {
                if (Terraria.GameContent.UI.WiresUI.Open || self.ownedProjectileCounts[651] > 0) return;
                
                const releaseUseTile = self.releaseUseTile;
                if (!self.tileInteractAttempted) return;
                
                const type = new TileData(mX, mY).type;
                
                if (releaseUseTile) {
                    let flag1 = TileLoader.RightClick(self, mX, mY, type);
                    if (flag1 !== false) {
                        original(self, mX, mY);
                    }
                    if (flag1 === true) {
                        self.tileInteractionHappened = true;
                    }
                }
            });
        }
        
        if (this.HookList.GetPickaxeDamage(info)) {
            Terraria.Player['int GetPickaxeDamage(int x, int y, int pickPower, int hitBufferIndex, Tile tileTarget)'
            ].hook((original, self, x, y, pickPower, hitBufferIndex, tile) => {
                const damage = original(self, x, y, pickPower, hitBufferIndex, tile);
                return TileLoader.PickPowerCheck(self, pickPower, x, y, tile, damage);
            });
        }
        
        if (this.HookList.ItemCheck(info)) {
            Terraria.Player['void ItemCheck()'
            ].hook((original, self) => {
                // Do not short-circuit on this mod's item IDs here. Each loaded mod's
                // hook must get a chance to dispatch HoldItem/Player callbacks for its own
                // content, matching the compatibility behavior in ExMod/Thorium.
                if (PlayerLoader.PreItemCheck(self)) {
                    original(self);
                    const item = self.HeldItem;
                    if (item && item.type > 0) {
                        CombinedLoader.HoldItem(item, self);
                    }
                }
                PlayerLoader.PostItemCheck(self);
            });
        }
        
        if (this.HookList.ItemCheck_CheckCanUse(info)) {
            Terraria.Player['bool ItemCheck_CheckCanUse_Inner(Item sItem, bool ignoreCursed)'
            ].hook((original, self, item, ignoreCursed) => {
                if (!CombinedLoader.CanUseItem(item, self)) return false;
                if (hasCanAutoReuseItem && !CombinedLoader.CanAutoReuseItem(item, self)) {
                    self.disableUseUntilRelease = true;
                }
                return original(self, item, ignoreCursed);
            });
        }
        
        if (this.HookList.ItemCheck_ApplyUseStyle(info)) {
            Terraria.Player['void ItemCheck_ApplyUseStyle(float mountOffset, Item sItem, Rectangle heldItemFrame)'
            ].hook((original, self, mountOffset, item, heldItemFrame) => {
                // TLPro/mobile compatibility: the native Shoot use-style may enter this
                // method with a stale movement-facing direction for modded items whose
                // Shoot hook returns false. Staff/book rendering uses Player.direction
                // when choosing its pivot and flip, so sync facing to the live aim BEFORE
                // Terraria computes itemLocation/itemRotation.
                if (item && ItemLoader.isModType(item.type)) {
                    // Other TLPro mods may resize Terraria's shared managed static arrays
                    // after this mod's own loader ran. Reassert only the held Calamity item
                    // immediately before vanilla reads Item.staff / Spears / RMB sets.
                    ItemLoader.EnsureCalamityWeaponStaticSetsForType(item.type);
                    if (item.useStyle === Terraria.ID.ItemUseStyleID.Shoot) {
                        try {
                            const center = self.MountedCenter;
                            const mouse = Terraria.Main.MouseWorld;
                            const dx = Number(mouse.X) - Number(center.X);
                            if (Math.abs(dx) > 0.001) Terraria.SetPlayerDirection(self, dx < 0 ? -1 : 1);
                        } catch (e) { }
                    }
                }
                original(self, mountOffset, item, heldItemFrame);
                CombinedLoader.UseStyle(item, self, mountOffset, heldItemFrame);
            });
        }
        
        if (this.HookList.ItemCheck_ApplyHoldStyle(info)) {
            Terraria.Player['void ItemCheck_ApplyHoldStyle(float mountOffset, Item sItem, Rectangle heldItemFrame)'
            ].hook((original, self, mountOffset, item, heldItemFrame) => {
                original(self, mountOffset, item, heldItemFrame);
                CombinedLoader.HoldStyle(item, self, mountOffset, heldItemFrame);
            });
        }
        
        if (this.HookList.ApplyItemTime(info)) {
            Terraria.Player['void ApplyItemTime(Item sItem)'
            ].hook((original, self, item) => {
                // A replacement hook must never consume another mod's custom item.
                // Delegate first so the owning mod's hook remains in the chain.
                if (IsForeignCustomItem(item)) return original(self, item);
                self.SetItemTime(item.useTime * CombinedLoader.UseSpeedMultiplier(item, self));
            });
        }
        
        if (this.HookList.ApplyItemAnimation(info)) {
            Terraria.Player['void ApplyItemAnimation(Item sItem)'
            ].hook((original, self, item) => {
                // Same ownership rule as ApplyItemTime. This is especially important
                // for Example Mod/ExMod weapons with custom animation multipliers.
                if (IsForeignCustomItem(item)) return original(self, item);
                const multiplier = CombinedLoader.UseAnimationMultiplier(item, self);
                if (item.melee) {
                    self['void SetItemAnimation(int frames)'](item.useAnimation * self.meleeSpeed * multiplier);
                } else if (item.summon && Terraria.ID.ItemID.Sets.SummonerWeaponThatScalesWithAttackSpeed[item.type]) {
                    self['void SetItemAnimation(int frames)'](item.useAnimation * self.meleeSpeed * multiplier);
                } else if (item.createTile >= 0) {
                    self['void SetItemAnimation(int frames)'](item.useAnimation * self.tileSpeed * multiplier);
                } else if (item.createWall >= 0) {
                    self['void SetItemAnimation(int frames)'](item.useAnimation * self.wallSpeed * multiplier);
                } else {
                    self['void SetItemAnimation(int frames)'](item.useAnimation * multiplier);
                    self.reuseDelay = item.reuseDelay;
                }
                if (hasUseAnimation && self.itemAnimation === self.itemAnimationMax) {
                    CombinedLoader.UseAnimation(item, self);
                }
            });
        }
        
        if (this.HookList.ItemCheck_StartActualUse(info)) {
            Terraria.Player['void ItemCheck_StartActualUse(Item sItem)'
            ].hook((original, self, item) => {
                const customPlayer = PlayerLoader.HasCallbacks('UseItem')
                    || PlayerLoader.HasCallbacks('OnConsumeItem')
                    || PlayerLoader.HasCallbacks('ConsumeItem');
                if ((!ItemLoader.isModType(item.type) && !ItemLoader.HasGlobalItems() && !customPlayer)
                    || (item.type >= ItemLoader.MAX_VANILLA_ID && !ItemLoader.isModType(item.type))) {
                    original(self, item);
                    return;
                }
                let flag = true;
                if (Terraria.ID.ItemID.Sets.BossBag[item.type]) {
                    self.disableUseUntilRelease = true;
                    ItemLoader.OpenBossBag(item, self);
                    flag = false;
                }
                else {
                    flag = CombinedLoader.UseItem(item, self);
                }
                
                if (!flag) {
                    let flag1 = item.type === 4711;
                    if (((item.pick > 0 || item.axe > 0 ? 1 : (item.hammer > 0 ? 1 : 0)) | (flag1 ? 1 : 0)) != 0)
                        self.toolTime = 1;
                    if (self.grappling[0] > -1) {
                        self.pulley = false;
                        self.pulleyDir = 1;
                        if (self.controlRight)
                            Terraria.SetPlayerDirection(self, 1);
                        else if (self.controlLeft)
                            Terraria.SetPlayerDirection(self, -1);
                    }
                    self['void StartChanneling(Item item)'](item);
                    self.attackCD = 0;
                    self.ResetMeleeHitCooldowns();
                    //self.ApplyItemAnimation(item);
                    let flag2 = Terraria.ID.ItemID.Sets.SkipsInitialUseSound[item.type];
                    const isModItemSound = ItemLoader.isModType(item.type);
                    const mappedUseSound = isModItemSound
                        ? EnsureItemSoundRegistry().get(Number(item.type))
                        : null;
                    const hasUseSound = isModItemSound ? !!mappedUseSound : !!item.UseSound;
                    if (hasUseSound && !flag2) {
                        let flag3 = item.useStyle === 5 || item.useStyle === 13 || item.shoot > 0;
                        let nullable = Terraria.ID.ItemID.Sets.NetUseSoundSync[item.type];
                        if (nullable?.HasValue) flag3 = nullable.Value;
                            if (((Terraria.PlayerIndex(self) !== Terraria.Main.myPlayer ? 0 : (Terraria.Main.netMode === 1 ? 1 : 0)) & (flag3 ? 1 : 0)) !== 0) {
                            Terraria.NetMessage.SendData(152, -1, -1, null, Terraria.PlayerIndex(self), 0, 0, 0, 0, 0, 0);
                        }
                        if (Terraria.PlayerIndex(self) === Terraria.Main.myPlayer || flag3)
                            PlayItemSound(item, self);
                    }
                } else {
                    original(self, item);
                }
                
                if (ItemLoader.isModType(item.type)) {
                    if (item.maxStack === 1 
                        || item.createTile !== -1
                        || item.createWall !== -1
                        || item.buffType !== 0
                        || item.potion
                        || item.shoot > 0
                    ) return;
                    if (CombinedLoader.ConsumeItem(item, self)) {
                        if (item.stack > 1) --item.stack;
                        else item.TurnToAir(true);
                        CombinedLoader.OnConsumeItem(item, self);
                    }
                }
            });
        }
        
        if (this.HookList.ApplyLifeAndOrMana(info)) {
            Terraria.Player['void ApplyLifeAndOrMana(Item item)'
            ].hook((original, self, item) => {
                if (IsForeignCustomItem(item)) return original(self, item);
                const customPlayer = PlayerLoader.HasCallbacks('GetHealLife')
                    || PlayerLoader.HasCallbacks('GetHealMana');
                if (!ItemLoader.isModType(item.type) && !ItemLoader.HasGlobalItems() && !customPlayer) {
                    original(self, item);
                    return;
                }
                let healAmount = item.healLife;
                let healMana = item.healMana;
                if (item.type === 3001) {
                    let healLife = item.healLife;
                    let num1 = 120;
                    healAmount = Rand.Next(healLife, num1 + 1);
                    if (Terraria.Main.myPlayer === Terraria.PlayerIndex(self)) {
                        let num2 = Rand.NextFloat();
                        let time = 0;
                        if (num2 <= 0.10000000149011612) time = 240;
                        else if (num2 <= 0.30000001192092896) time = 120;
                        else if (num2 <= 0.60000002384185791) time = 60;
                        if (time > 0) self.SetImmuneTimeForAllTypes(time);
                    }
                }
                healAmount = CombinedLoader.GetHealLife(item, self, healAmount);
                if (hasGetHealMana) healMana = CombinedLoader.GetHealMana(item, self, healMana);
                self.statLife = Math.max(0, Math.min(self.statLife + healAmount, self.statLifeMax2));
                self.statMana = Math.max(0, Math.min(self.statMana + healMana, self.statManaMax2));
                if (healAmount > 0 && Terraria.Main.myPlayer === Terraria.PlayerIndex(self)) {
                    self.HealEffect(healAmount, true);
                }
                if (healMana > 0) {
                    self.AddBuff(94, Terraria.Player.manaSickTime, false);
                    if (Terraria.Main.myPlayer === Terraria.PlayerIndex(self)) self.ManaEffect(healMana);
                }
            });
        }
        
        if (this.HookList.CheckMana(info)) {
            Terraria.Player['bool ItemCheck_CheckCanUse_CanPayMana(Item sItem, bool canUse)'
            ].hook((original, self, item, canUse) => {
                if (IsForeignCustomItem(item)) return original(self, item, canUse);
                const customMana = ItemLoader.isModType(item?.type)
                    || ItemLoader.HasGlobalItems()
                    || PlayerLoader.HasCallbacks('ModifyManaCost')
                    || PlayerLoader.HasCallbacks('OnMissingMana')
                    || PlayerLoader.HasCallbacks('OnConsumeMana');
                if (!customMana) return original(self, item, canUse);
                let altFire = self.altFunctionUse === 2;
                let skipUsageCheck = self.ItemCheck_PayMana_ShouldSkipManaUse(item, altFire);
                let rawAmountToPay = Terraria.Player.ItemCheck_PayMana_GetManaCostToPay(item, altFire);
                if (skipUsageCheck) return canUse;
                if (!self.CheckManaPredictWithoutUse(rawAmountToPay, true)) {
                    let num = Math.floor(rawAmountToPay * self.manaCost);
                    let missing = num - self.statMana;
                    if (missing > 0) CombinedLoader.OnMissingMana(item, self, missing);
                    if (!self.CheckManaPredictWithoutUse(rawAmountToPay, false)) {
                        return false;
                    }
                }
                return canUse;
            });
            
            Terraria.Player['bool CheckMana(int amount, bool pay, bool blockQuickMana)'
            ].hook((original, self, amount, pay, blockQuickMana) => {
                let item = self.inventory[self.selectedItem];
                if (IsForeignCustomItem(item)) return original(self, amount, pay, blockQuickMana);
                const customMana = ItemLoader.isModType(item?.type)
                    || ItemLoader.HasGlobalItems()
                    || PlayerLoader.HasCallbacks('ModifyManaCost')
                    || PlayerLoader.HasCallbacks('OnMissingMana')
                    || PlayerLoader.HasCallbacks('OnConsumeMana');
                if (!customMana) return original(self, amount, pay, blockQuickMana);
                let num = Math.floor(amount * self.manaCost);
                num = Math.floor(CombinedLoader.ModifyManaCost(item, self, num));
                if (self.statMana >= num) {
                    if (pay) {
                        self.statMana -= num;
                        if (hasOnConsumeMana) CombinedLoader.OnConsumeMana(item, self, num);
                    }
                    return true;
                }
                if (!self.manaFlower || blockQuickMana) {
                    CombinedLoader.OnMissingMana(item, self, num - self.statMana);
                    if (self.statMana >= num) {
                        if (pay) {
                            self.statMana -= num;
                            if (hasOnConsumeMana) CombinedLoader.OnConsumeMana(item, self, num);
                        }
                        return true;
                    }
                    return false;
                }
                self.QuickMana();
                if (self.statMana < num) {
                    CombinedLoader.OnMissingMana(item, self, num - self.statMana);
                    if (self.statMana >= num) {
                        if (pay) {
                            self.statMana -= num;
                            if (hasOnConsumeMana) CombinedLoader.OnConsumeMana(item, self, num);
                        }
                        return true;
                    }
                    return false;
                }
                if (pay) {
                    self.statMana -= num;
                    if (hasOnConsumeMana) CombinedLoader.OnConsumeMana(item, self, num);
                }
                return true;
            });
        }
        
        if (this.HookList.GetWeaponDamage(info)) {
            Terraria.Player['int GetWeaponDamage(Item sItem)'
            ].hook((original, self, item) => {
                return CombinedLoader.ModifyWeaponDamage(item, self, original(self, item));
            });
        }
        
        if (this.HookList.GetWeaponCrit(info)) {
            Terraria.Player['int GetWeaponCrit(Item sItem)'
            ].hook((original, self, item) => {
                return Math.max(0, Math.floor(CombinedLoader.ModifyWeaponCrit(item, self, original(self, item))));
            });
        }
        
        if (this.HookList.GetWeaponKnockback(info)) {
            Terraria.Player['float GetWeaponKnockback(Item sItem, float KnockBack)'
            ].hook((original, self, item, KnockBack) => {
                const nativeValue = original(self, item, KnockBack);
                if (!ItemLoader.isModType(item?.type) && !ItemLoader.HasGlobalItems()
                    && !PlayerLoader.HasCallbacks('ModifyWeaponKnockback')) return nativeValue;
                return CombinedLoader.ModifyWeaponKnockback(item, self, nativeValue);
            });
        }
        
        if (this.HookList.ItemCheck_Shoot(info)) {
            Terraria.Player['void ItemCheck_Shoot(int i, Item sItem, int weaponDamage, bool withAudioVisualFeedback)'
            ].hook((original, self, i, item, damage, withAudioVisualFeedback) => {
                const customShoot = ItemLoader.isModType(item?.type)
                    || ItemLoader.HasGlobalItems()
                    || PlayerLoader.HasCallbacks('CanShoot')
                    || PlayerLoader.HasCallbacks('ModifyShootStats')
                    || PlayerLoader.HasCallbacks('Shoot');
                if (!customShoot) return original(self, i, item, damage, withAudioVisualFeedback);
                if (!CombinedLoader.CanShoot(item, self)) {
                    self['void ApplyItemTime(Item sItem)'](item);
                    return;
                }
                
                let type = item.shoot;
                let knockBack = self.GetWeaponKnockback(item, item.knockBack);
                let position = self.RotatedRelativePoint(self.MountedCenter, true, true);
                
                let velocity = Vector2.new(
                    Terraria.Main.mouseX + Terraria.Main.screenPosition.X - position.X,
                    Terraria.Main.mouseY + Terraria.Main.screenPosition.Y - position.Y
                );
                velocity = Vector2.Multiply(Vector2.Normalize(velocity), item.shootSpeed);
                
                const stats = CombinedLoader.ModifyShootStats(item, self, position, velocity, type, damage, knockBack);
                position = stats.position;
                velocity = stats.velocity;
                type = stats.type;
                damage = stats.damage;
                knockBack = stats.knockBack;
                
                if (CombinedLoader.Shoot(item, self, position, velocity, type, damage, knockBack)) {
                    const oldType = item.shoot;
                    const oldAmmo = item.useAmmo;
                    if (item.shoot !== type) {
                        item.shoot = type;
                        item.useAmmo = -1;
                    }
                    original(self, i, item, damage, withAudioVisualFeedback);
                    item.shoot = oldType;
                    item.useAmmo = oldAmmo;
                } else {
                    self['void ApplyItemTime(Item sItem)'](item);
                    if (item.useStyle === 5) {
                        const c = self.RotatedRelativePoint(self.MountedCenter, true, true);
                        let x = Terraria.Main.mouseX + Terraria.Main.screenPosition.X - c.X;
                        let y = Terraria.Main.mouseY + Terraria.Main.screenPosition.Y - c.Y;
                        let rot = item.shootSpeed / Math.sqrt(x * x + y * y);
                        let rotX = x * rot;
                        let rotY = y * rot;
                        self.itemRotation = Math.atan2(rotY * Terraria.PlayerDirection(self), rotX * Terraria.PlayerDirection(self)) - self.fullRotation;
                    }
                }
            });
        }
        
        // Single-entity worm melee hurtboxes: no body NPCs are spawned.
        // Move only the real head to the touched virtual segment for the duration
        // of Terraria's synchronous melee-NPC collision pass.
        if (info.hasNPCs) {
            let meleeHitNPCs = null;
            try { meleeHitNPCs = Terraria.Player['void ItemCheck_MeleeHitNPCs(Item sItem, Rectangle itemRectangle, int originalDamage, float knockBack)']; } catch (e) { }
            if (meleeHitNPCs && meleeHitNPCs.hook) {
                meleeHitNPCs.hook((original, self, item, itemRect, damage, knockBack) => {
                    const restores = BeginVirtualWormMeleeProxy(itemRect);
                    try { return original(self, item, itemRect, damage, knockBack); }
                    finally { EndVirtualWormMeleeProxy(restores); }
                });
            }
        }

        if (this.HookList.ApplyNPCOnHitEffects(info)) {
            Terraria.Player['void ApplyNPCOnHitEffects(Item sItem, Rectangle itemRectangle, int damage, float knockBack, int npcIndex, int dmgRandomized, int dmgDone)'
            ].hook((original, self, item, itemRect, damage, knockBack, npcIndex, dmgRandomized, dmgDone) => {
                original(self, item, itemRect, damage, knockBack, npcIndex, dmgRandomized, dmgDone);
                CombinedLoader.OnHitNPC(item, self, Terraria.Main.npc[npcIndex], dmgDone, knockBack, dmgDone >= dmgRandomized * 2);
            });
        }
        
        if (this.HookList.UpdateEquips(info)) {
            const updateInventory = this.HookList.UpdateInventory(info) ?? false;
            Terraria.Player['void UpdateEquips(int i)'
            ].hook((original, self, i) => {
                original(self, i);
                if (Terraria.Main.myPlayer === i) {
                    CombinedLoader.UpdateEquips(self, updateInventory);
                }
            });
        }
        
        if (this.HookList.ApplyEquipFunctional(info)) {
            Terraria.Player['void ApplyEquipFunctional(int itemSlot, Item currentItem)'
            ].hook((original, self, itemSlot, item) => {
                original(self, itemSlot, item);
                if (ItemLoader.isModType(item.type) || ItemLoader.HasGlobalItems()
                    || PlayerLoader.HasCallbacks('UpdateAccessory')) {
                    CombinedLoader.UpdateAccessory(item, self, false, self.hideVisibleAccessory[itemSlot]);
                }
            });
        }
        
        if (this.HookList.ApplyEquipVanity(info)) {
            Terraria.Player['void ApplyEquipVanity(int itemSlot, Item currentItem)'
            ].hook((original, self, itemSlot, item) => {
                original(self, itemSlot, item);
                if (ItemLoader.isModType(item.type) || ItemLoader.HasGlobalItems()
                    || PlayerLoader.HasCallbacks('UpdateAccessory')) {
                    CombinedLoader.UpdateAccessory(item, self, true);
                }
            });
        }
        
        if (this.HookList.UpdateDyes(info)) {
            Terraria.Player['void UpdateDyes()'
            ].hook((original, self) => {
                original(self);
                PlayerLoader.UpdateDyes(self);
            });
        }
        
        if (this.HookList.UpdateArmorSets(info)) {
            if (info.hasItems) {
                Terraria.DataStructures.ArmorSetBonuses.Benefits['void Pumpkin(Player player)'
                ].hook((original, player) => {
                    let head = player.armor[0].type ?? -1;
                    let body = player.armor[1].type ?? -1;
                    let legs = player.armor[2].type ?? -1;
                    
                    if (ItemLoader.isModType(head) || ItemLoader.isModType(body) || ItemLoader.isModType(legs)) {
                        for (let i = 0; i < 3; i++) {
                            const item = player.armor[i];
                            if (!item || item.type === 0) continue;
                            ItemLoader.UpdateArmorSet(item, player);
                        }
                    } else {
                        // Foreign custom armor belongs to the next hook in the chain.
                        // The old ItemCount range test could swallow another mod's set
                        // depending solely on load order and numeric IDs.
                        original(player);
                    }
                });
            }
            
            Terraria.Player['void UpdateArmorSets(int i)'
            ].hook((original, self, i) => {
                original(self, i);
                CombinedLoader.UpdateArmorSets(self);
            });
        }
        
        if (this.HookList.WingMovement(info)) {
            Terraria.Player['void WingMovement()'
            ].hook((original, self) => {
                original(self);
                if (PlayerLoader.HasCallbacks('WingMovement')) {
                    CombinedLoader.WingMovement(self);
                    return;
                }
                const armor = self.armor;
                for (let i = 3; i < 10; i++) {
                    const item = armor[i];
                    if (item && ItemLoader.isModType(item.type) && item.wingSlot === self.wings) {
                        CombinedLoader.WingMovement(self);
                        break;
                    }
                }
            });
        }
        
        if (this.HookList.CanAcceptItemIntoInventory(info)) {
            Terraria.Player['bool CanAcceptItemIntoInventory(Item item)'
            ].hook((original, self, item) => {
                if (!ItemLoader.isModType(item.type) && !ItemLoader.HasGlobalItems()
                    && !PlayerLoader.HasCallbacks('CanPickup')) return original(self, item);
                return CombinedLoader.CanPickup(item, self) ? original(self, item) : false;
            });
        }
        
        if (this.HookList.GetItem(info)) {
            Terraria.Player['Item GetItem(Item newItem, GetItemSettings settings, bool disableMerge)'
            ].hook((original, self, newItem, settings, disableMerge) => {
                const result = original(self, newItem, settings, disableMerge);
                if (result.type === 0 && (ItemLoader.isModType(newItem.type)
                    || ItemLoader.HasGlobalItems() || PlayerLoader.HasCallbacks('OnPickup'))) {
                    CombinedLoader.OnPickup(newItem, self);
                }
                return result;
            });
        }
        
        if (this.HookList.ExtractinatorUse(info)) {
            Terraria.Player['void ExtractinatorUse(int extractType, int extractinatorBlockType)'
            ].hook((original, self, extractType, extractinatorBlockType) => {
                const item = self.inventory[self.selectedItem];
                if (CombinedLoader.ExtractinatorUse(item, self, extractType, extractinatorBlockType)) {
                    original(self, extractType, extractinatorBlockType);
                }
            });
        }
        
        if (this.HookList.RecalculateLuck(info)) {
            Terraria.Player['void RecalculateLuck()'
            ].hook((original, self) => {
                if (PlayerLoader.PreModifyLuck(self, self.luck)) {
                    original(self);
                    PlayerLoader.ModifyLuck(self, self.luck);
                }
            });
        }
        
        if (this.HookList.Update(info)) {
            Terraria.Player['void Update(int i)'
            ].hook((original, self, i) => {
                PlayerLoader.PreUpdate(self, i);
                original(self, i);
                PlayerLoader.PostUpdate(self, i);
            });
        }
        
        if (this.HookList.UpdateLifeRegen(info)) {
            Terraria.Player['void UpdateLifeRegen()'
            ].hook((original, self) => {
                PlayerLoader.UpdateBadLifeRegen(self);
                original(self);
                PlayerLoader.UpdateLifeRegen(self);
            });
        }
        
        if (this.HookList.UpdateManaRegen(info)) {
            Terraria.Player['void UpdateManaRegen()'
            ].hook((original, self) => {
                original(self);
                PlayerLoader.UpdateManaRegen(self);
            });
        }
        
        if (this.HookList.UpdateBuffs(info)) {
            Terraria.Player['void UpdateBuffs(int i)'
            ].hook((original, self, i) => {
                PlayerLoader.PreUpdateBuffs(self);
                original(self, i);
                PlayerLoader.PostUpdateBuffs(self);
            });
            
            if (info.hasBuffs) {
                Terraria.Player['void UpdateHungerBuffs()'
                ].hook((original, self) => {
                    const buffType = self.buffType;
                    for (let i = 0; i < Terraria.Player.maxBuffs; i++) {
                        if (buffType[i] < 1 || !BuffLoader.isModType(buffType[i])) continue;
                        BuffLoader.UpdatePlayer(self, i);
                    }
                    original(self);
                });
            }
        }
        
        if (this.HookList.UpdateDead(info)) {
            Terraria.Player['void UpdateDead()'
            ].hook((original, self) => {
                original(self);
                PlayerLoader.UpdateDead(self);
            });
        }
        
        if (this.HookList.UpdateBiomes(info)) {
            Terraria.Player['void UpdateBiomes()'
            ].hook((original, self) => {
                original(self);
                BiomeLoader.UpdateBiomes(self);
            });
        }
        
        if (this.HookList.BordersMovement(info)) {
            Terraria.Player['void BordersMovement()'].hook((original, self) => {
                PlayerLoader.UpdateMovement(self);
                original(self);
            });
        }
        
        if (this.HookList.ResetEffects(info)) {
            Terraria.Player['void ResetEffects()'
            ].hook((original, self) => {
                original(self);
                // O array já é redimensionado no EnterWorld. Nenhum conteúdo atual do
                // Calamity escreve imunidade de player em IDs de buff modded, então eu
                // não atravesso a bridge centenas de vezes por tick só para gravar false.
                PlayerLoader.ModifyMaxStats(self);
                PlayerLoader.ResetEffects(self);
            });
        }
        
        if (this.HookList.Hurt(info)) {
            Terraria.Player['double Hurt(PlayerDeathReason damageSource, int Damage, int hitDirection, bool pvp, bool quiet, bool Crit, int cooldownCounter, bool dodgeable)'
            ].hook((original, self, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) => {
                if (PlayerLoader.ImmuneTo(self, damageSource, cooldownCounter, dodgeable)) {
                    return 0.0;
                }
                
                if (PlayerLoader.FreeDodge(self, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable)) {
                    return 0.0;
                }
                
                const modifiers = CombinedLoader.ModifyPlayerHurt(self, damageSource, damage, hitDirection, quiet, crit, dodgeable);
                damageSource = modifiers.damageSource;
                damage = modifiers.damage;
                hitDirection = modifiers.hitDirection;
                quiet = modifiers.quiet;
                crit = modifiers.crit;
                dodgeable = modifiers.dodgeable;
                
                const result = original(self, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable);
                
                if (damageSource._sourceNPCIndex > -1) {
                    const npc = Terraria.Main.npc[damageSource._sourceNPCIndex];
                    if (npc && npc.active) NPCLoader.OnHitPlayer(npc, self, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable);
                }
                PlayerLoader.OnHurt(self, damageSource, result, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable);
                
                if (!self.dead && self.statLife > 0) {
                    PlayerLoader.PostHurt(self, damageSource, result, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable);
                }
                
                return result;
            });
        }
        
        if (this.HookList.KillMe(info)) {
            Terraria.Player['void KillMe(PlayerDeathReason damageSource, double dmg, int hitDirection, bool pvp)'
            ].hook((original, self, damageSource, damage, hitDirection, pvp) => {
                let flag = !(self.creativeGodMode || self.dead);
                if (flag) PlayerLoader.PreKill(self, damageSource, damage, hitDirection, pvp);
                original(self, damageSource, damage, hitDirection, pvp);
                if (flag) PlayerLoader.Kill(self, damageSource, damage, hitDirection, pvp);
            });
        }
        
        if (this.HookList.GetDyeTraderReward(info)) {
            Terraria.Player['void GetDyeTraderReward(NPC dyeTrader)'
            ].hook((original, self, dyeTrader) => {
                let intList = [
                    3560,
                    3028,
                    3041,
                    3040,
                    3025,
                    3190,
                    3027,
                    3026,
                    3554,
                    3553,
                    3555,
                    2872,
                    3534,
                    2871
                ];
                if (Terraria.Main.hardMode) {
                    intList.push(3039);
                    intList.push(3038);
                    intList.push(3598);
                    intList.push(3597);
                    intList.push(3600);
                    intList.push(3042);
                    intList.push(3533);
                    intList.push(3561);
                    if (Terraria.NPC.downedMechBossAny) {
                        intList.push(2883);
                        intList.push(2869);
                        intList.push(2873);
                        intList.push(2870);
                    }
                    if (Terraria.NPC.downedPlantBoss) {
                        intList.push(2878);
                        intList.push(2879);
                        intList.push(2884);
                        intList.push(2885);
                    }
                    if (Terraria.NPC.downedMartians) {
                        intList.push(2864);
                        intList.push(3556);
                    }
                    if (Terraria.NPC.downedMoonlord) {
                        intList.push(3024);
                    }
                }
                PlayerLoader.GetDyeTraderReward(self, dyeTrader, intList);
                if (intList.length <= 0) return;
                intList = [...new Set(intList)];
                let Type = intList[Math.floor(Math.random()*intList.length)];
                let newItem = Terraria.Item.new();
                newItem['void SetDefaults(int Type, ItemVariant variant)'](Type, null);
                newItem.stack = 6;
                
                const source = Terraria.DataStructures.EntitySource_Gift.new();
                source['void .ctor(Entity entity)'](dyeTrader);
                self['void QuickSpawnItem(IEntitySource source, Item item, GetItemSettings settings)'](source, newItem, Terraria.GetItemSettings.GiftRecieved);
            });
        }
        
        if (this.HookList.GetAnglerQuestReward(info)) {
            Terraria.Player['void GetAnglerReward(NPC angler, int questItemType)'
            ].hook((original, self, angler, questItemType) => {
                if (PlayerLoader.AnglerQuestReward(self, angler, questItemType)) {
                    original(self, angler, questItemType);
                }
            });
        }
        
        if (this.HookList.SellItem(info)) {
            Terraria.Player['bool SellItem(Item item, int stack)'
            ].hook((original, self, item, stack) => {
                const vendor = Terraria.Main.npc[self.talkNPC];
                const shopInventory = Array.from(Terraria.Main.instance['InventoryStorage[] get_shop()']())[Terraria.Main.npcShop].item;
                if (!PlayerLoader.CanSellItem(self, vendor, shopInventory, item)) {
                    return false;
                }
                const result = original(self, item, stack);
                if (result) {
                    PlayerLoader.PostSellItem(self, vendor, shopInventory, item);
                }
                return result;
            });
        }
        
        if (this.HookList.SetupStartingItems(info)) {
            const GUIPlayerCreateMenu = new NativeClass('', 'GUIPlayerCreateMenu');
            GUIPlayerCreateMenu['void SetupStartingItems()'
            ].hook((original, self) => {
                original(self);
                PlayerLoader.SetupStartingItems(Terraria.Main.PendingPlayer);
            });
        }
        
        if (this.HookList.AddBuff_ActuallyTryToAddTheBuff(info)) {
            Terraria.Player['bool AddBuff_ActuallyTryToAddTheBuff(int type, int time)'
            ].hook((original, self, buffType, buffTime) => {
                const result = original(self, buffType, buffTime);
                if (result) {
                    BuffLoader.ApplyPlayer(self, buffType, buffTime);
                }
                return result;
            });
        }
        
        if (this.HookList.AddBuff_TryUpdatingExistingBuffTime(info)) {
            Terraria.Player['bool AddBuff_TryUpdatingExistingBuffTime(int type, int time)'
            ].hook((original, self, buffType, buffTime) => {
                let result = BuffLoader.ReApplyPlayer(self, buffTime, self['int FindBuffIndex(int type)'](buffType)) ?? true;
                if (result) {
                    result = original(self, buffType, buffTime);
                }
                return result;
            });
        }
        
        if (this.HookList.GUIBuffs(info)) {
            const GUIBuffs = new NativeClass('', 'GUIBuffs');
            
            let buffs = new Map();
            GUIBuffs['void Draw()'
            ].hook((original, self) => {
                const player = Terraria.Main.player[Terraria.Main.myPlayer];
                const buffType = player.buffType;
                buffs = new Map();
                if (BuffLoader.Count > 0) {
                    for (let i = 0; i < buffType.length; i++) {
                        if (buffType[i] === 0) continue;
                        const type = buffType[i];
                        if (BuffLoader.isModType(type) && player.buffTime[i] > 0) {
                            buffs.set(i, type);
                            buffType[i] = 1;
                        }
                    }
                }
                original(self);
                if (buffs.size > 0) {
                    for (const [buffIndex, _buffType] of buffs) {
                        buffType[buffIndex] = _buffType;
                    }
                    buffs = new Map();
                }
            });
            
            GUIBuffs['void ItemDraw(ItemGrid_Layout gridLayout, int index, Vector2 position, float scale)'
            ].hook((original, self, layout, index, position, scale) => {
                let slot = index;//self.activeBuffCount <= self.buffController.selectedIndex ? index : (self.activeBuffs !== null && self.activeBuffs.length > 1) ? self.activeBuffs[index] : index;//(self. || (self.activeBuffs !== null && self.activeBuffs.length > 1)) ? self.activeBuffs[index] : index;
                
                if (buffs.has(slot)) {
                    const player = Terraria.Main.player[Terraria.Main.myPlayer];
                    player.buffType[slot] = buffs.get(slot);
                    buffs.delete(slot);
                }
                original(self, layout, index, position, scale);
            });
            
            GUIBuffs['void RemoveBuff(int buff)'
            ].hook((original, self, buffIndex) => {
                const player = Terraria.Main.player[Terraria.Main.myPlayer];
                if (player === null || player.buffType === null) return;
                
                if (buffs.has(buffIndex)) {
                    player.buffType[buffIndex] = buffs.get(buffIndex);
                    buffs.delete(buffIndex);
                }
                
                const buffType = player.buffType[buffIndex];
                const buffTime = player.buffTime[buffIndex];
                
                if (buffType === 60 || buffType === 151) {
                    return;
                }
                
                if (!BuffLoader.CanRemove(player, buffType, buffTime, buffIndex)) {
                    return;
                }
                
                let isMount = false;
                if (player.mount !== null && player.mount.Active) {
                    if (player.mount.CheckBuff(buffType)) {
                        player.mount.Dismount(player, false);
                        BuffLoader.OnRemove(player, buffType, buffTime, buffIndex);
                        isMount = true;
                    }
                }
                
                if (player.miscEquips !== null) {
                    if (player.miscEquips[0]?.buffType === buffType) {
                        let v = player.hideMisc;
                        v.value ^= (1 << 0);
                        player.hideMisc = v;
                    }
                    if (player.miscEquips[1]?.buffType === buffType) {
                        let v = player.hideMisc;
                        v.value ^= (1 << 1);
                        player.hideMisc = v;
                    }
                }
                
                PlaySound(12, -1, -1, 1, 1, 0);
                if (isMount) return;
                player.DelBuff(buffIndex);
                BuffLoader.OnRemove(player, buffType, buffTime, buffIndex);
            });
        }
        
        if (this.HookList.DrawPlayerLayers(info)) {
            Terraria.DataStructures.PlayerDrawSet['void CreateCompositeData()'
            ].hook((original, self) => {
                const player = self.drawPlayer;
                
                let hideEntirePlayer = false;
                
                if (player) {
                    if (player.mount.Active) {
                        const type = player.mount.Type;
                        if (MountLoader.isModType(type)) {
                            if (MountLoader.getModMount(type)?.hideEntirePlayer) {
                                hideEntirePlayer = true;
                            }
                        }
                    }
                    
                    const parts = {
                        head: true,
                        body: true,
                        legs: true,
                        includeArmor: true,
                        hidesTopSkin: false,
                        hidesBottomSkin: false
                    };
                    PlayerLoader.ShouldDrawParts(player, parts);
                    
                    if (!parts.head && !parts.body && !parts.legs) {
                        hideEntirePlayer = true;
                    }
                    
                    if (hideEntirePlayer) {
                        self.stealth = 1;
                        const transparent = Color.Transparent;
                        if (parts.includeArmor) {
                            self.colorArmorHead = transparent;
                            self.colorArmorBody = transparent;
                            self.colorArmorLegs = transparent;
                        }
                        self.colorEyeWhites = transparent;
                        self.colorEyes = transparent;
                        self.colorHair = transparent;
                        self.colorHead = transparent;
                        self.colorBodySkin = transparent;
                        self.colorShirt = transparent;
                        self.colorUnderShirt = transparent;
                        self.colorPants = transparent;
                        self.colorShoes = transparent;
                        self.colorLegs = transparent;
                        self.headGlowColor = transparent;
                        self.bodyGlowColor = transparent;
                        self.armGlowColor = transparent;
                        self.legsGlowColor = transparent;
                        self.colorDisplayDollSkin = transparent;
                    } else if (!parts.head || !parts.body || !parts.legs) {
                        const transparent = Color.Transparent;
                        self.stealth = 1;
                        if (!parts.head) {
                            if (parts.includeArmor) self.colorArmorHead = transparent;
                            self.colorEyeWhites = transparent;
                            self.colorEyes = transparent;
                            self.colorHair = transparent;
                            self.colorHead = transparent;
                            self.headGlowColor = transparent;
                        }
                        if (!parts.body) {
                            if (parts.includeArmor) self.colorArmorBody = transparent;
                            self.colorBodySkin = transparent;
                            self.colorShirt = transparent;
                            self.colorUnderShirt = transparent;
                            self.bodyGlowColor = transparent;
                            self.armGlowColor = transparent;
                        }
                        if (!parts.legs) {
                            if (parts.includeArmor) self.colorArmorLegs = transparent;
                            self.colorPants = transparent;
                            self.colorShoes = transparent;
                            self.colorLegs = transparent;
                            self.legsGlowColor = transparent;
                        }
                    }
                    
                    if (parts.hidesTopSkin) {
                        self.hidesTopSkin = true;
                    }
                    if (parts.hidesBottomSkin) {
                        self.hidesBottomSkin = true;
                    }
                }
                
                original(self);

                // TLPro mobile does not expose ArmorIDs.Head.Sets.DrawFullHair.
                // Preserve the official Aerospec Rogue visual by overriding the
                // prepared draw data after Terraria has resolved the active head slot.
                try {
                    const rogueHead = ItemLoader.getByName('AerospecHeadRogue');
                    const rogueHeadSlot = Number(rogueHead?.Item?.headSlot ?? -1);
                    if (rogueHeadSlot >= 0 && Number(player?.head ?? -2) === rogueHeadSlot) {
                        self.fullHair = true;
                        self.hatHair = false;
                        self.hideHair = false;
                    }
                    const marniteHead = ItemLoader.getByName('MarniteArchitectHeadgear');
                    const marniteHeadSlot = Number(marniteHead?.Item?.headSlot ?? -1);
                    if (marniteHeadSlot >= 0 && Number(player?.head ?? -2) === marniteHeadSlot) {
                        self.fullHair = true;
                        self.hatHair = false;
                        self.hideHair = false;
                    }
                } catch (e) { }
            });
        }
        
        this.initialized = true;
    }
    
    static OnWorldUnload() {
        this.worldLoaded = false;
    }
}