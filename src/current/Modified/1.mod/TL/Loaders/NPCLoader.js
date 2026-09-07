import { Terraria, Microsoft } from './../ModImports.js';
import { ModLoader } from './../Core/ModLoader.js';
import { TileLoader } from './../Loaders/TileLoader.js';
import { BiomeLoader } from './../Loaders/BiomeLoader.js';
import { ItemLoader } from './../Loaders/ItemLoader.js';
import { ModTexture } from './../ModTexture.js';
import { ModLocalization } from './../ModLocalization.js';
import { GlobalNPC } from './../GlobalNPC.js';
import { GlobalLoot } from './../GlobalLoot.js';
import { NPCLoot } from './../NPCLoot.js';
import { NPCShop } from './../NPCShop.js';
import { SubworldLoader } from './SubworldLoader.js';
import { FusionEntityData } from './../../Core/FusionEntityData.js';

const GUIInstance = new NativeClass('', 'GUIInstance');
const GUIPageIcons = new NativeClass('', 'GUIPageIcons');

function cloneResizedSetLastNPC(array, newSize, value) {
    const resized = array.cloneResized(newSize);
    if (value != null) resized[newSize - 1] = value;
    return resized;
}

function resizeArrayProperty(propertyHolder, propertyName, newSize, value) {
    propertyHolder[propertyName] = cloneResizedSetLastNPC(propertyHolder[propertyName], newSize, value);
}

function addToArray(propertyHolder, propertyName, value) {
    const array = propertyHolder[propertyName];
    const arrayLength = array.length;
    propertyHolder[propertyName] = cloneResizedSetLastNPC(array, arrayLength + 1, value);
}

export class NPCLoader {
    static NPCs = [];
    static SpawnCandidates = [];
    static TownNPCs = [];
    static MAX_VANILLA_ID = Terraria.ID.NPCID.Count;
    static Count = 0;
    static TypeOffset = 0;
    static ModTypes = new Set();
    static IndexByName = {};
    static TypeToIndex = {};
    static HandlerCounts = Object.create(null);
    static NPCCount = this.MAX_VANILLA_ID + this.Count;

    static _globalCallbackCache = {};
    static _globalCallbackCount = -1;

    static InvalidateGlobalCallbacks() {
        this._globalCallbackCache = {};
        this._globalCallbackCount = GlobalNPC.RegisteredNPCs.length;
    }

    static GetGlobalCallbacks(name) { return GlobalNPC.getHandlers(name); }
    static HasGlobalCallback(name) { return GlobalNPC.hasHandlers(name); }
    static MenuCategories = {};
    static TL_Categories = tl.cheatMenu.getNpcCategories();
    
    static isModNPC(npc) { return this.isModType(npc.type); }
    static isModType(type) { return this.ModTypes.has(type); }
    static getByName(name) { return this.NPCs[this.IndexByName[name]]; }
    static getTypeByName(name) { return this.getByName(name)?.Type; }
    static getModNPC(type) {
        const index = this.TypeToIndex[type];
        return index === undefined ? undefined : this.NPCs[index];
    }
    static register(npc) {
        const next = NPCLoader.NPCs.length;
        NPCLoader.NPCs.push(npc);
        if (npc.__dispatch?.SpawnChance) this.SpawnCandidates.push(npc);
        this.IndexByName[npc.constructor.name] = next;
        for (const method of Object.keys(npc.__dispatch ?? {})) {
            this.HandlerCounts[method] = (this.HandlerCounts[method] ?? 0) + 1;
        }
    }
    static hasHandlers(name) { return (this.HandlerCounts[name] ?? 0) > 0; }
    static hasAnyHandlers(name) { return this.hasHandlers(name) || this.HasGlobalCallback(name); }
    
    static TypeToNPCHead = {};
    static NPCHeadToType = {};
    static ShimmerHeads = {};
    
    static AnyBossActive = false;
    static ActiveBoss = -1;
    
    // Vanilla NPCs
    static KingStatueNPCs = new Set([
        17, 19, 22, 38, 54, 107, 108,
        142, 160, 207, 209, 227, 228,
        229, 368, 369, 550, 441, 588
    ]);
    static QueenStatueNPCs = new Set([
        18, 20, 124, 178, 208, 353, 633
    ]);
    
    static FindFreeTypeOffset() {
        let offset = Math.max(0, Number(ModLoader.ModData.NPCCount) || 0);
        const blockSize = this.NPCs.length;
        if (blockSize <= 0) return offset;

        const search = Terraria.ID.NPCID.Search;
        let blockStart = this.MAX_VANILLA_ID + offset;
        let attempts = 0;

        while (attempts++ < 4096) {
            let collision = -1;
            for (let i = 0; i < blockSize; i++) {
                const type = blockStart + i;
                if (search.ContainsId(type)) {
                    collision = type;
                    break;
                }
            }

            if (collision < 0) return blockStart - this.MAX_VANILLA_ID;
            blockStart = collision + 1;
        }

        throw new Error('Unable to reserve a collision-free NPC type block.');
    }

    static LoadNPCs() {
        // Cross-mod compatibility: Name-count offsets are not guaranteed to match
        // the highest occupied numeric NPC id when another ExMod-derived package
        // has aliases, gaps, or a custom allocator. Reserve one contiguous free
        // block before assigning any Calamity NPC types instead of letting the
        // first NPC collide inside NPCID.Search.Add().
        this.TypeOffset = this.FindFreeTypeOffset();
        for (const npc of this.NPCs) {
            this.LoadNPC(npc);
        }
    }
    
    static LoadNPC(npc) {
        npc.NPC = {};
        this.Count++;
        const nextNPC = this.MAX_VANILLA_ID + this.TypeOffset + this.Count;
        npc.Type = npc.NPC.type = npc.NPC.netID = nextNPC - 1;
        this.ModTypes.add(npc.Type);
        this.TypeToIndex[npc.Type] = this.NPCs.indexOf(npc);
        
        // Sets
        resizeArrayProperty(Terraria.ID.NPCID, 'NetIdMap', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCHeadID.Sets, 'CannotBeDrawnInHousingUI', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'SpawnOnPlayerCanSpawnInMidairOnSkyblock', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'DontDoHardmodeScaling', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'DontDropDungeonKeysOrSouls', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ReflectStarShotsInForTheWorthy', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'IsTownPet', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'IsTownSlime', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'CanConvertIntoCopperSlimeTownNPC', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ZappingJellyfish', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'CantTakeLunchMoney', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'TrailingMode', nextNPC, -1);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'TrailCacheLength', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'IsDragonfly', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'BelongsToInvasionOldOnesArmy', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'TeleportationImmune', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'IsGoldCritter', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'UsesNewTargeting', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'CritterThatCanTurnOnPlayers', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'CanBeHurtByBees', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ConveyorBeltCollision', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'SlimeCanContainItems', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'SearchSpawnSlotsInReverse', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'CannotSpawnInSlot0', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'SkipUpdateInUnsyncedTiles', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'HunterPotionFriendlyOverride', nextNPC, null);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'BirdThatCanPoop', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'TakesDamageFromHostilesWithoutBeingFriendly', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'AllNPCs', nextNPC, true);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'HurtingBees', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'FighterUsesDD2PortalAppearEffect', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'StatueSpawnedDropRarity', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'NoEarlymodeLootWhenSpawnedFromStatue', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'NeedsExpertScaling', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ProjectileNPC', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'SavesAndLoads', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'UsesMultiplayerProximitySyncing', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'NoMultiplayerSmoothingByType', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'NoMultiplayerSmoothingByAI', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'MPAllowedEnemies', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'TownCritter', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'CountsAsCritter', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'HasNoPartyText', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'HatOffsetY', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'FaceEmote', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ExtraFramesCount', nextNPC, 0);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'AttackFrameCount', nextNPC, 0);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'DangerDetectRange', nextNPC, -1);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ShimmerImmunity', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ShimmerTransformToItem', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ShimmerTownTransform', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ShimmerTransformToNPC', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'AttackTime', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'AttackAverageChance', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'AttackType', nextNPC, -1);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'PrettySafe', nextNPC, -1);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'MagicAuraColor', nextNPC, Microsoft.Xna.Framework.Graphics.Color.TransparentBlack);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'DemonEyes', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'Zombies', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'Skeletons', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'BossHeadTextures', nextNPC, -1);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'PositiveNPCTypesExcludedFromDeathTally', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ShouldBeCountedAsBossForBestiary', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ShouldBeCountedAsBossForRainbowBoulders', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'DangerThatPreventsOtherDangers', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'MustAlwaysDraw', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ExpandedCullDraw', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'ExtraTextureCount', nextNPC, 0);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'CanHitPastShimmer', nextNPC);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'NPCFramingGroup', nextNPC, 0);
        resizeArrayProperty(Terraria.ID.NPCID.Sets, 'TownNPCsFramingGroups', nextNPC);
        
        // Resize Arrays
        resizeArrayProperty(Terraria.Main, 'townNPCCanSpawn', nextNPC);
        resizeArrayProperty(Terraria.Main, 'slimeRainNPC', nextNPC);
        resizeArrayProperty(Terraria.Main, 'npcCatchable', nextNPC);
        resizeArrayProperty(Terraria.Main, 'npcFrameCount', nextNPC, 1);
        resizeArrayProperty(Terraria.Main.SceneMetrics, 'ClosestNPCPosition', nextNPC);
        resizeArrayProperty(Terraria.Main.SceneMetrics, 'NPCBannerBuff', nextNPC);
        resizeArrayProperty(Terraria.NPC, 'ShimmeredTownNPCs', nextNPC);
        resizeArrayProperty(Terraria.NPC, 'npcsFoundForCheckActive', nextNPC);
        resizeArrayProperty(Terraria.GameContent.UI.EmoteBubble, 'CountNPCs', nextNPC);
        resizeArrayProperty(Terraria.WorldGen.TownManager, '_hasRoom', nextNPC);
        resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Npc', nextNPC);
        
        addToArray(Terraria.Lang, '_npcNameCache', ModLocalization.empty());
        
        this.SetupTextures(npc);
        
        npc.SetDefaults();
        npc.SetStaticDefaults();
        
        if (npc.NPC.townNPC) {
            Terraria.ID.NPCID.Sets.TownNPCBestiaryPriority.Add(npc.Type);
            const profile = npc.GetTownNPCProfile(this.TypeToNPCHead[npc.Type] ?? -1, this.ShimmerHeads[npc.Type] ?? -1);
            if (profile) {
                const GetExtra = (idx) => Terraria.GameContent.TextureAssets.Extra[idx];
                
                profile._profiles[0]._defaultNoAlt = Terraria.GameContent.TextureAssets.Npc[npc.Type];
                profile._profiles[0]._defaultParty = npc.AltTextures.Party !== -1 ? GetExtra(npc.AltTextures.Party) : profile._profiles[0]._defaultNoAlt;
                
                profile._profiles[1]._defaultNoAlt = npc.AltTextures.Shimmer !== -1 ? GetExtra(npc.AltTextures.Shimmer) : profile._profiles[0]._defaultNoAlt;
                profile._profiles[1]._defaultParty = npc.AltTextures.ShimmerParty !== -1 ? GetExtra(npc.AltTextures.ShimmerParty) : profile._profiles[0]._defaultNoAlt;
                
                Terraria.GameContent.TownNPCProfiles.Instance._townNPCProfiles.Add(npc.Type, profile);
            }
        }
        
        if (npc.NPC.boss) {
            Terraria.ID.NPCID.Sets.BossBestiaryPriority.Add(npc.Type);
        }
        
        npc.MenuCategories.push('ModIcon');
        npc.MenuCategories.push('all');
        
        if ((npc.NPC.damage ?? 0) > 0 && !npc.NPC.friendly) npc.MenuCategories.push('enemy');
        if (npc.NPC.boss) npc.MenuCategories.push('boss');
        if (npc.NPC.townNPC) npc.MenuCategories.push('npc');
        if (npc.NPC.friendly && !npc.NPC.townNPC) npc.MenuCategories.push('friendly');
        
        const texture = Terraria.GameContent.TextureAssets.Npc[npc.Type]?.Value;
        if (texture && texture.Width && texture.Height) {
            if (npc.NPC.width === undefined) {
                npc.NPC.width = texture.Width;
            }
            if (npc.NPC.height === undefined) {
                npc.NPC.height = texture.Height / Terraria.Main.npcFrameCount[npc.Type];
            }
        }
        
        if (npc.NPC.townNPC && npc.NPC.housingCategory == null) {
            npc.NPC.housingCategory = 0;
        }
        
        npc.PostStaticDefaults();
    }
    
    static AddToMenu(npc) {
        if (npc.MenuCategories.length > 0) {
            npc.MenuCategories = [...new Set(npc.MenuCategories)];
            for (const category of npc.MenuCategories) {
                if (this.TL_Categories.includes(category)) tl.cheatMenu.addNpcToCategory(category, npc.Type);
                else {
                    if (!this.MenuCategories[category]) {
                        const texture = `Textures/Icons/${category}.png`;
                        if (tl.file.exists(texture)) {
                            this.MenuCategories[category] = tl.cheatMenu.addNpcCategory(category, texture);
                        }
                    }
                    if (this.MenuCategories[category]) tl.cheatMenu.addNpcToCategory(this.MenuCategories[category], npc.Type);
                }
            }
        }
    }
    
    static SetupContent() {
        this.LoadNPCs();
        ModLoader.ModData.NPCCount += this.Count;
        
        for (const npc of this.NPCs) {
            npc.SetupContent();
        }
    }
    
    static PostSetupContent() {
        let ownTypeEnd = this.MAX_VANILLA_ID;
        for (const npc of this.NPCs) {
            const type = Number(npc?.Type);
            if (Number.isFinite(type)) ownTypeEnd = Math.max(ownTypeEnd, type + 1);
        }
        this.NPCCount = Math.max(this.MAX_VANILLA_ID + ModLoader.ModData.NPCCount, ownTypeEnd);
        resizeArrayProperty(Terraria.NPC, 'killCount', Math.max(NPCLoader.NPCCount, TileLoader.TileCount));
        
        for (const npc of this.NPCs) {
            // NPCLoot
            npc.ModifyNPCLoot(new NPCLoot(npc.NPC.netID, Terraria.Main.ItemDropsDB));
            
            // SetBestiary
            if (!npc.hideFromBestiary) {
                let bestiaryEntry = null;
                if (npc.NPC.townNPC) {
                    bestiaryEntry = Terraria.GameContent.Bestiary.BestiaryEntry.TownNPC(npc.Type);
                }
                else if (Terraria.ID.NPCID.Sets.CountsAsCritter[npc.Type]) {
                    bestiaryEntry = Terraria.GameContent.Bestiary.BestiaryEntry.Critter(npc.Type);
                }
                else {
                    bestiaryEntry = Terraria.GameContent.Bestiary.BestiaryEntry.Enemy(npc.Type);
                }
                
                const customBestiaryIcon = new ModTexture(npc.Texture + '_BestiaryIcon');
                if (customBestiaryIcon?.exists) {
                    bestiaryEntry.Icon._customTexture = customBestiaryIcon.asset.asset;
                }
                
                npc.SetBestiary(Terraria.Main.BestiaryDB, bestiaryEntry);
                
                Terraria.Main.BestiaryDB['BestiaryEntry Register(BestiaryEntry entry)'](bestiaryEntry);
                Terraria.Main.BestiaryDB.ExtractDropsForNPC(Terraria.Main.ItemDropsDB, npc.Type);
                
                if (npc.NPC.townNPC) this.TownNPCs.push(npc);
            }
            
            npc.PostSetupContent();
        }
        
        for (const gLoot of GlobalLoot.Loots) {
            const gL = new gLoot(Terraria.Main.ItemDropsDB, Terraria.Main.BestiaryDB);
            gL.ModifyGlobalLoot();
        }
    }
    
    static SetupTextures(npc) {
        if (!npc.Texture?.startsWith('Textures/')) {
            npc.Texture = 'Textures/' + npc.Texture;
        }
        
        npc.AltTextures = {
            Party: -1,
            Shimmer: -1,
            ShimmerParty: -1
        };
        
        // NPC Texture
        const npcTexture = new ModTexture(npc.Texture);
        if (npcTexture?.exists) {
            Terraria.GameContent.TextureAssets.Npc[npc.Type] = npcTexture.asset.asset;
        }
        
        // NPC Party Texture
        const npcPartyTexture = new ModTexture(npc.Texture + '_Party');
        if (npcPartyTexture?.exists) {
            const nextSlot = Terraria.GameContent.TextureAssets.Extra.length;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Extra', nextSlot + 1, npcPartyTexture.asset.asset);
            npc.AltTextures.Party = nextSlot;
        }
        
        // NPC Shimmer Texture
        const npcShimmerTexture = new ModTexture(npc.Texture + '_Shimmer');
        if (npcShimmerTexture?.exists) {
            const nextSlot = Terraria.GameContent.TextureAssets.Extra.length;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Extra', nextSlot + 1, npcShimmerTexture.asset.asset);
            npc.AltTextures.Shimmer = nextSlot;
        }
        
        // NPC Shimmer Party Texture
        const npcShimmerPartyTexture = new ModTexture(npc.Texture + '_Shimmer_Party');
        if (npcShimmerPartyTexture?.exists) {
            const nextSlot = Terraria.GameContent.TextureAssets.Extra.length;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Extra', nextSlot + 1, npcShimmerPartyTexture.asset.asset);
            npc.AltTextures.ShimmerParty = nextSlot;
        }
        
        // Boss Heads
        const bossHeadTexture = new ModTexture(npc.Texture + '_Head_Boss');
        if (bossHeadTexture?.exists) {
            let nextBossHead = Terraria.GameContent.TextureAssets.NpcHeadBoss.length;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'NpcHeadBoss', nextBossHead + 1, bossHeadTexture.asset.asset);
            Terraria.ID.NPCID.Sets.BossHeadTextures[npc.Type] = nextBossHead;
            let i = 2;
            let otherBossHeadTexture = new ModTexture(npc.Texture + '_Head_Boss_' + i);
            while (otherBossHeadTexture?.exists) {
                i++;
                nextBossHead++;
                resizeArrayProperty(Terraria.GameContent.TextureAssets, 'NpcHeadBoss', nextBossHead + 1, otherBossHeadTexture.asset.asset);
                otherBossHeadTexture = new ModTexture(npc.Texture + '_Head_Boss_' + i);
            }
        }
        
        // NPC Heads
        const npcHeadTexture = new ModTexture(npc.Texture + '_Head');
        if (npcHeadTexture?.exists) {
            let nextHead = Terraria.GameContent.TextureAssets.NpcHead.length;
            resizeArrayProperty(Terraria.GameContent.TextureAssets, 'NpcHead', nextHead + 1, npcHeadTexture.asset.asset);
            resizeArrayProperty(Terraria.ID.NPCHeadID.Sets, 'CannotBeDrawnInHousingUI', nextHead + 1, false);
            resizeArrayProperty(Terraria.ID.NPCHeadID.Sets, 'HeadListOrder', nextHead + 1, nextHead);
            this.TypeToNPCHead[npc.Type] = nextHead;
            this.NPCHeadToType[nextHead] = npc.Type;
            if (npc.AltTextures.Shimmer != -1) {
                const npcShimmerHeadTexture = new ModTexture(npc.Texture + '_Shimmer_Head');
                if (npcShimmerHeadTexture?.exists) {
                    nextHead++;
                    resizeArrayProperty(Terraria.GameContent.TextureAssets, 'NpcHead', nextHead + 1, npcShimmerHeadTexture.asset.asset);
                    resizeArrayProperty(Terraria.ID.NPCHeadID.Sets, 'CannotBeDrawnInHousingUI', nextHead + 1, false);
                    resizeArrayProperty(Terraria.ID.NPCHeadID.Sets, 'HeadListOrder', nextHead + 1, nextHead);
                    this.ShimmerHeads[npc.Type] = nextHead;
                }
            }
        }
        
        // TownNPC Portraits
        const basicPortraitTexture = new ModTexture(npc.Texture + '_Portrait');
        if (basicPortraitTexture?.exists) {
            const basicPortrait = Terraria.ID.NPCID.Sets.BasicPortrait("Images/TownNPCs/Portraits/Portrait_Guide");
            basicPortrait._image = basicPortraitTexture.asset.asset;
            let npcPortraitProvider = Terraria.ID.NPCID.Sets.PrioritizedPortrait();
            const shimmerPortraitTexture = new ModTexture(npc.Texture + '_Shimmer_Portrait');
            if (shimmerPortraitTexture?.exists) {
                const shimmerPortrait = Terraria.ID.NPCID.Sets.BasicPortrait("Images/TownNPCs/Portraits/Portrait_Guide");
                shimmerPortrait._image = shimmerPortraitTexture.asset.asset;
                const condition = Terraria.ID.NPCID.Sets.NPCPortraits['NPCPortraitProvider get_Item(int key)'](22)._entries['Entry get_Item(int index)'](0).Condition;
                npcPortraitProvider = npcPortraitProvider.With(condition, shimmerPortrait);
            }
            Terraria.ID.NPCID.Sets.NPCPortraits.Add(npc.Type, npcPortraitProvider.Default(basicPortrait));
        }
    }
    
    static SetDefaults(npc) {
        for (const gNPC of this.GetGlobalCallbacks('SetDefaults')) {
            gNPC?.SetDefaults(npc);
        }
    }
    
    static ChooseSpawn(spawnInfo) {
        const pool = { 0: 1 };
        
        for (const npc of this.SpawnCandidates) {
            const w = npc.SpawnChance(spawnInfo);
            if (w > 0) pool[npc.Type] = w;
        }
        
        BiomeLoader.ModifySpawnPool(spawnInfo, pool);
        if (SubworldLoader.AnySubworldActive) {
            SubworldLoader.ActiveSubworld.ModifySpawnPool(spawnInfo, pool);
        }
        
        let r = Math.random() * Object.values(pool).reduce((a, b) => a + b, 0);
        for (const k in pool) {
            const w = pool[k];
            if (r < w) return +k;
            r -= w;
        }
        
        return -1;
    }
    
    static OnSpawn(npc) {
        FusionEntityData.ResetNPC(npc);
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.OnSpawn) modNPC.OnSpawn(npc);
        for (const gNpc of this.GetGlobalCallbacks('OnSpawn')) gNpc.OnSpawn(npc);
    }
    
    static PreAI(npc) {
        let value = true;
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.PreAI) value = (modNPC.PreAI(npc) ?? true) !== false;
        if (value && this.GetGlobalCallbacks('PreAI').some(g => (g.PreAI(npc) ?? true) === false)) value = false;
        return value;
    }
    
    static AI(npc) {
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.AI) modNPC.AI(npc);
        for (const gNpc of this.GetGlobalCallbacks('AI')) gNpc.AI(npc);
    }
    
    static PostAI(npc) {
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.PostAI) modNPC.PostAI(npc);
        for (const gNpc of this.GetGlobalCallbacks('PostAI')) gNpc.PostAI(npc);
    }
    
    static PreDraw(npc, spriteBatch, screenPos) {
        const modNPC = this.getModNPC(npc?.type);
        return modNPC?.__dispatch?.PreDraw ? (modNPC.PreDraw(npc, spriteBatch, screenPos) ?? true) : true;
    }
    
    static PostDraw(npc, spriteBatch, screenPos) {
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.PostDraw) modNPC.PostDraw(npc, spriteBatch, screenPos);
    }
    
    static FindFrame(npc, frameHeight) {
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.FindFrame) modNPC.FindFrame(npc, frameHeight);
    }
    
    static GetAltTextureIndex(npc) {
        if (!this.isModType(npc.type)) return -1;
        
        let variant = '';
        if (npc.IsShimmerVariant) variant += 'Shimmer';
        if (npc.altTexture === 1) variant += 'Party';
        
        return this.getModNPC(npc.type).AltTextures[variant] ?? -1;
    }
    
    static GetAlpha(npc, newColor) {
        let value = newColor;
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.GetAlpha) value = modNPC.GetAlpha(npc, value) ?? value;
        for (const gNpc of this.GetGlobalCallbacks('GetAlpha')) value = gNpc.GetAlpha(npc, value) ?? value;
        return value;
    }
    
    static BossHeadSlot(npc) {
        const modNPC = this.getModNPC(npc?.type);
        return modNPC?.__dispatch?.BossHeadSlot ? modNPC.BossHeadSlot(npc) : null;
    }
    
    static BossHeadRotation(npc, originalSlot) {
        const modNPC = this.getModNPC(npc?.type);
        return modNPC?.__dispatch?.BossHeadRotation ? modNPC.BossHeadRotation(npc, originalSlot) : null;
    }
    
    static NPCHeadSlot(type) {
        if (this.isModType(type)) {
            return this.getModNPC(type)?.NPCHeadSlot() ?? -1;
        }
        return undefined;
    }
    
    static CheckActive(npc) {
        let value = true;
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.CheckActive) value = (modNPC.CheckActive(npc) ?? true) !== false;
        if (value && this.GetGlobalCallbacks('CheckActive').some(g => (g.CheckActive(npc) ?? true) === false)) value = false;
        return value;
    }
    
    static CheckDead(npc) {
        let value = true;
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.CheckDead) value = (modNPC.CheckDead(npc) ?? true) !== false;
        if (value && this.GetGlobalCallbacks('CheckDead').some(g => (g.CheckDead(npc) ?? true) === false)) value = false;
        return value;
    }
    
    static PreKill(npc) {
        let value = true;
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.PreKill) value = (modNPC.PreKill(npc) ?? true) !== false;
        if (value && this.GetGlobalCallbacks('PreKill').some(g => (g.PreKill(npc) ?? true) === false)) value = false;
        return value;
    }
    
    static OnKill(npc) {
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.OnKill) modNPC.OnKill(npc);
        for (const gNpc of this.GetGlobalCallbacks('OnKill')) gNpc.OnKill(npc);
        FusionEntityData.ClearNPC(npc);
    }
    
    static BossLoot(npc, potionType) {
        let value = potionType;
        if (this.isModType(npc.type)) {
            value = this.getModNPC(npc.type)?.BossLoot(npc, potionType) ?? value;
        }
        return value;
    }
    
    static BeforeLoot(npc, player) {
        let value = true;
        if (this.isModType(npc.type)) {
            value = this.getModNPC(npc.type)?.BeforeLoot(npc, player) ?? true;
        }
        return value;
    }
    
    static DropHeals(npc, player) {
        let value = true;
        if (this.isModType(npc.type)) {
            value = this.getModNPC(npc.type)?.DropHeals(npc, player) ?? true;
        }
        return value;
    }
    
    static ModifyItemDropFromNPC(npc, itemIndex) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.ModifyItemDropFromNPC(npc, itemIndex);
        }
    }
    
    static HitEffect(npc, hitDirection, damage) {
        const modNPC = this.getModNPC(npc?.type);
        if (modNPC?.__dispatch?.HitEffect) modNPC.HitEffect(npc, hitDirection, damage);
        for (const gNpc of this.GetGlobalCallbacks('HitEffect')) gNpc.HitEffect(npc, hitDirection, damage);
    }
    
    static CanFallThroughPlatforms(npc) {
        const modNPC = this.getModNPC(npc?.type);
        return modNPC?.__dispatch?.CanFallThroughPlatforms ? modNPC.CanFallThroughPlatforms(npc) : null;
    }
    
    static CanBeCaughtBy(npc, player, item) {
        let value = true;
        if (this.isModType(npc.type)) {
            value = this.getModNPC(npc.type)?.CanBeCaughtBy(npc, player, item) ?? value;
        }
        if (this.GetGlobalCallbacks('CanBeCaughtBy').some(gN => (gN?.CanBeCaughtBy(npc, player, item) ?? true) === false)) {
            value = false;
        }
        return value;
    }
    
    static OnCaughtBy(npc, player, item, failed) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.OnCaughtBy(npc, player, item, failed);
        }
        for (const gNpc of this.GetGlobalCallbacks('OnCaughtBy')) {
            gNpc?.OnCaughtBy(npc, player, item, failed);
        }
    }
    
    static ModifyHitPlayer(npc, player, modifiers) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.ModifyHitPlayer(npc, player, modifiers);
        }
        for (const gNpc of this.GetGlobalCallbacks('ModifyHitPlayer')) {
            gNpc?.ModifyHitPlayer(npc, player, modifiers);
        }
    }
    
    static OnHitPlayer(npc, player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.OnHitPlayer(npc, player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable);
        }
        for (const gNpc of this.GetGlobalCallbacks('OnHitPlayer')) {
            gNpc?.OnHitPlayer(npc, player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable);
        }
    }
    
    static OnHitByPlayer(npc, player, item, damageDone, knockBack, crit) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.OnHitByPlayer(npc, player, item, damageDone, knockBack, crit);
        }
        for (const gNpc of this.GetGlobalCallbacks('OnHitByPlayer')) {
            gNpc?.OnHitByPlayer(npc, player, item, damageDone, knockBack, crit);
        }
    }
    
    static OnHitByProjectile(npc, projectile) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.OnHitByProjectile(npc, projectile);
        }
        for (const gNpc of this.GetGlobalCallbacks('OnHitByProjectile')) {
            gNpc?.OnHitByProjectile(npc, projectile);
        }
    }
    
    static UpdateLifeRegen(npc, damage) {
        let dmg = damage;
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.UpdateLifeRegen(npc, dmg);
        }
        for (const gNpc of this.GetGlobalCallbacks('UpdateLifeRegen')) {
            dmg = npc.lifeRegenExpectedLossPerSecond;
            gNpc?.UpdateLifeRegen(npc, dmg);
        }
    }
    
    static GetNewNPCName(type) {
        const list = [];
        if (this.isModType(type)) {
            list.push(...(this.getModNPC(type)?.SetNPCNameList() ?? []));
        }
        for (const gNpc of this.GetGlobalCallbacks('GetNewNPCName')) {
            const r = gNpc?.SetNPCNameList(type) ?? [];
            if (r.length > 0) list.push(...r);
        }
        if (list.length == 0) return null;
        return list[Math.floor(Math.random()*list.length)];
    }
    
    static CanChat(npc) {
        let value = npc.townNPC || npc.type === Terraria.ID.NPCID.SkeletonMerchant;
        if (this.isModType(npc.type)) {
            value = this.getModNPC(npc.type)?.CanChat(npc) ?? value;
        }
        if (this.GetGlobalCallbacks('CanChat').some(gN => (gN?.CanChat(npc) ?? value) === false)) {
            value = false;
        }
        return value;
    }
    
    static GetChat(npc) {
        let value = '';
        if (this.isModType(npc.type)) {
            value += this.getModNPC(npc.type)?.GetChat(npc) ?? '';
        }
        for (const gNpc of this.GetGlobalCallbacks('GetChat')) {
            value += gNpc?.GetChat(npc) ?? '';
        }
        if (value.length > 0) {
            Terraria.Recipe.FindRecipes(false);
            return value;
        }
        return null;
    }
    
    static CanGoToStatue(npc, toKingStatue) {
        let value = null;
        if (this.isModType(npc.type)) {
            value = this.getModNPC(npc.type)?.CanGoToStatue(npc, toKingStatue);
        }
        for (const gNpc of this.GetGlobalCallbacks('CanGoToStatue')) {
            let flag = gNpc?.CanGoToStatue(npc, toKingStatue);
            if (flag != null) {
                value = flag;
            }
        }
        return value;
    }
    
    static OnGoToStatue(npc, toKingStatue) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.OnGoToStatue(npc, toKingStatue);
        }
        for (const gNpc of this.GetGlobalCallbacks('OnGoToStatue')) {
            gNpc?.OnGoToStatue(npc, toKingStatue);
        }
    }
    
    static SetChatButtons(npc, player, button1, button2) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.SetChatButtons(npc, player, button1, button2);
            return;
        }
        for (const gNpc of this.GetGlobalCallbacks('SetChatButtons')) {
            gNpc?.SetChatButtons(npc, player, button1, button2);
        }
    }
    
    static Option1Clicked(npc, player, cost) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.Option1Clicked(npc, player, cost);
            return;
        }
        for (const gNpc of this.GetGlobalCallbacks('Option1Clicked')) {
            gNpc?.Option1Clicked(npc, player, cost);
        }
    }
    
    static Option2Clicked(npc, player) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.Option2Clicked(npc, player);
            return;
        }
        for (const gNpc of this.GetGlobalCallbacks('Option2Clicked')) {
            gNpc?.Option2Clicked(npc, player);
        }
    }
    
    static OpenShop(npc, player, shopIndexOrName) {
        let flag1 = this.isModType(npc.type);
        if (!flag1 && npc.type >= this.MAX_VANILLA_ID) return;
        
        let shopIndex = (typeof shopIndexOrName === 'string'
        ? NPCShop.GetShopByName(shopIndexOrName) : shopIndexOrName) ?? 99;
        
        Terraria.Main.playerInventory = true;
        Terraria.Main.npcChatText = "";
        Terraria.Main.npcShop = shopIndex;
        GUIInstance.Active.GUIPageIcons.OpenUI(GUIPageIcons.Category.Inventory, GUIPageIcons.Category.Shop);
        
        const shop = new NPCShop(shopIndex);
        if (flag1) {
            const modNpc = this.getModNPC(npc.type);
            modNpc.SetupShop(npc, player, shop);
        }
    }
    
    static SetupShop(npc, player, type) {
        const shop = new NPCShop(type);
        this.GetGlobalCallbacks('SetupShop').forEach(gP => gP.SetupShop(npc, player, shop));
    }
    
    static ModifyNPCHappiness(npc, player, primaryPlayerBiome, shopHelper, nearbyNPCsByType) {
        if (this.isModType(npc.type)) {
            this.getModNPC(npc.type)?.ModifyNPCHappiness(npc, player, primaryPlayerBiome, shopHelper, nearbyNPCsByType);
        }
        for (const gNpc of this.GetGlobalCallbacks('ModifyNPCHappiness')) {
            gNpc?.ModifyNPCHappiness(npc, player, primaryPlayerBiome, shopHelper, nearbyNPCsByType);
        }
    }
}