import { Terraria, Modules } from './ModImports.js';
import { NPCLoader } from './Loaders/NPCLoader.js';
import { CreateDispatchProfile } from './Core/DispatchProfile.js';
import { ModTexturedType } from './ModTexturedType.js';

export class ModNPC extends ModTexturedType {
    NPC = null;
    
    Type = null;
    AIType = 0;
    AnimationType = 0;
    Music = -1;
    
    // string
    DisplayName = '';
    // @returns string Message
    DeathMessage = (npc) => '';
    // @returns Color || Object { R, G, B }
    DeathMessageColor = (npc) => null;
    
    Banner = 0;
    BannerItem = 0;
    KillsToBanner = 25;
    
    hideFromBestiary = false;
    BestiaryRarityStars = 1;
    
    // string []
    MenuCategories = [];
    
    constructor() {
        super();
    }
    
    SetupContent() {
        let name = this.constructor.name;
        let originalName = name, i = 1;
        while (Terraria.ID.NPCID.Search.ContainsName(name)) name = originalName + i++;
        Terraria.ID.NPCID.Search.Add(name, this.Type);
        
        const npc = Terraria.NPC.new();
        npc['void .ctor()']();
        npc['void SetDefaults(int Type, NPCSpawnParams spawnparams)'](this.Type, null);
        
        Terraria.ID.ContentSamples.NpcsByNetId.Add(this.Type, npc);
        // ExMod 1.7.1 parity: sorting IDs are handled by the game/bestiary pipeline. Avoid duplicate native dictionary writes.
        Terraria.ID.ContentSamples.NpcBestiaryRarityStars.Add(this.Type, this.BestiaryRarityStars);
        Terraria.ID.ContentSamples.NpcBestiaryCreditIdsByNpcNetIds.Add(this.Type, name);
        Terraria.ID.ContentSamples.NpcNetIdsByPersistentIds.Add(name, this.Type);
        Terraria.ID.ContentSamples.NpcPersistentIdsByNetIds.Add(this.Type, name);
        
        NPCLoader.AddToMenu(this);
    }
    
    SetStaticDefaults() {
        
    }
    
    SetDefaults(npc) {
        
    }
    
    // Used to override settings after SetStaticDefaults();
    PostStaticDefaults() {
        
    }
    
    // Used to ensure that all npcs have been initialized
    PostSetupContent() {
        
    }
    
    // Allows you to modify the DisplayName after the translation is applied
    ModifyDisplayName() {
        
    }
    
    // npc.buffImmune[buffType] = true;
    ApplyBuffImmunity(npc) {
        
    }
    
    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        if ((npc.boss || npc.lifeMax >= 1000) && npc.difficulty >= Terraria.DataStructures.GameDifficultyLevel.Master) {
            npc.lifeMax *= bossAdjustment;
        }
    }
    
    ScaleStats(npc, activePlayersCount, strengthOverride) {
        if (!Terraria.ID.NPCID.Sets.NeedsExpertScaling[this.Type] && (npc.lifeMax <= 5 || npc.damage == 0 || npc.friendly || npc.townNPC)) return;
        
        npc.difficulty = Terraria.Main.Difficulty;//(strengthOverride != null && strengthOverride.HasValue) ? strengthOverride.Value
        
        if (npc.difficulty >= Terraria.DataStructures.GameDifficultyLevel.Expert && Terraria.Main.hardMode) {
            npc.ScaleStats_ForExpertHardmode();
        }
        
        npc.ScaleStats_ByDifficulty();
        
        const numPlayers = Terraria.NPC.GetActivePlayerCount();//*(activePlayersCount !== null && activePlayersCount?.HasValue) ? activePlayersCount.Value
        if (npc.difficulty >= Terraria.DataStructures.GameDifficultyLevel.Expert) {
            npc.ScaleStats_ByPlayerCount(numPlayers);
        }
        
        if ((Terraria.ID.NPCID.Sets.ProjectileNPC[this.Type] ? 1 : 0) === 0 && npc.lifeMax < 6) {
            npc.lifeMax = 6;
        }
        
        this.ApplyDifficultyAndPlayerScaling(npc, numPlayers, npc.GetMyBalance(), Terraria.NPC.CommonMasterBossLifeReduction);
        
        npc.life = npc.lifeMax;
        npc.defDamage = npc.damage;
        npc.defDefense = npc.defense;
        npc.defLifeMax = npc.lifeMax;
        
        return false;
    }
    
    SetBestiary(database, bestiaryEntry) {
        
    }
    
    /** @returns {(ITownNPCProfile) Profiles.StackedNPCProfile} */
    GetTownNPCProfile(headId = -1, shimmerHeadId = -1) {
        const TownNPCProfiles = Terraria.GameContent.TownNPCProfiles.Instance;
        return TownNPCProfiles.LegacyWithSimpleShimmer(this.constructor.name, headId, shimmerHeadId, true, true);
    }
    
    OnSpawn(npc) {
        
    }
    
    SpawnChance(spawnInfo) {
        return 0;
    }
    
    SpawnNPC(spawnX, spawnY) {
        return Terraria.NPC.NewNPC(
            Terraria.NPC.GetSpawnSourceForNaturalSpawn(),
            spawnX, spawnY, this.Type,
            0, 0, 0, 0, 0, 255
        );
    }
    
    PreAI(npc) {
        return true;
    }
    
    AI(npc) {
        
    }
    
    PostAI(npc) {
        
    }
    
    PreDraw(npc, spriteBatch, screenPos) {
        return true;
    }
    
    PostDraw(npc, spriteBatch, screenPos) {
        
    }
    
    FindFrame(npc, frameHeight) {
        
    }
    
    GetAlpha(npc, newColor) {
        return newColor;
    }
    
    BossHeadSlot(npc) {
        return null;
    }
    
    BossHeadRotation(npc) {
        return null;
    }
    
    NPCHeadSlot() {
        return NPCLoader.TypeToNPCHead[this.Type] ?? -1;
    }
    
    CheckActive(npc) {
        return true;
    }
    
    CheckDead(npc) {
        return true;
    }
    
    PreKill(npc) {
        return true;
    }
    
    OnKill(npc) {
        
    }
    
    BeforeLoot(npc, player) {
        return true;
    }
    
    DropHeals(npc, player) {
        return true;
    }
    
    ModifyNPCLoot(npcLoot) {
        
    }
    
    ModifyItemDropFromNPC(npc, itemIndex) {
        
    }
    
    BossLoot(npc, potionType) {
        return potionType;
    }
    
    HitEffect(npc, hitDirection, damage) {
        
    }
    
    CanFallThroughPlatforms(npc) {
        return null;
    }
    
    CanBeCaughtBy(npc, player, item) {
        return true;
    }
    
    OnCaughtBy(npc, player, item, failed) {
        
    }
    
    // modifiers = { damageSource, damage, hitDirection, quiet, crit, dodgeable };
    ModifyHitPlayer(npc, player, modifiers) {
        
    }
    
    OnHitPlayer(npc, player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        
    }
    
    OnHitByPlayer(npc, player, item, damageDone, knockBack, crit) {
        
    }
    
    OnHitByProjectile(npc, projectile) {
        
    }
    
    UpdateLifeRegen(npc, damage) {
        
    }
    
    SetNPCNameList() {
        return [];
    }
    
    CanTownNPCSpawn() {
        return false;
    }
    
    CheckConditions(left, right, top, bottom) {
        return true;
    }
    
    UsesPartyHat(npc) {
        return true;
    }
    
    CanChat(npc) {
        return npc.townNPC;
    }
    
    GetChat(npc) {
        return '';
    }
    
    SetChatButtons(npc, player, button1, button2) {
        button1.text = '';
        button1.texture = null;
        button1.cost = 0;
        button2.text = '';
        button2.texture = null;
    }
    
    Option1Clicked(npc, player, cost) {
        
    }
    
    Option2Clicked(npc, player) {
        
    }
    
    OpenShop(npc, player, shopIndexOrName = null) {
        NPCLoader.OpenShop(npc, player, shopIndexOrName);
    }
    
    SetupShop(npc, player, npcShop) {
        
    }
    
    ModifyNPCHappiness(npc, player, primaryPlayerBiome, shopHelper, nearbyNPCsByType) {
        
    }
    
    CanGoToStatue(npc, toKingStatue) {
        return false;
    }
    
    OnGoToStatue(npc, toKingStatue) {
        
    }
    
    /**
     * Terraria.ID.NPCID.Sets.AttackType[this.Type];
     *   0 - Throwing
     *   1 - Shooting
     *   2 - Magic
     *   3 - Swinging
     */
    TownNPCAttack(npc, justStarted, attackTime) {
        
    }
    
    static NPCValue(p = 0, g = 0, s = 0, c = 0) {
        return p * 1000000 + g * 10000 + s * 100 + c;
    }
    
    static register(npc) {
        const instance = new npc();
        instance.__dispatch = CreateDispatchProfile(npc, ModNPC.prototype, instance);
        NPCLoader.register(instance);
    }
    static isModType(type) { return NPCLoader.isModType(type); }
    static isModNPC(npc) { return NPCLoader.isModNPC(npc); }
    static getByName(name) { return NPCLoader.getByName(name); }
    static getTypeByName(name) { return NPCLoader.getTypeByName(name); }
    static getModNPC(type) { return NPCLoader.getModNPC(type); }
}