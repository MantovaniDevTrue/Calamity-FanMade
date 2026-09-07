import { PlayerLoader } from './Loaders/PlayerLoader.js';
import { CreateDispatchProfile } from './Core/DispatchProfile.js';

export class ModPlayer {
    
    CumulativeHealth = 0;
    CumulativeMana = 0;
    Luck = 0;
    ManaCost = 0;
    WeaponDamage = 0;
    WeaponKnockback = 0;
    WeaponCrit = 0;
    
    constructor() {}
    
    OnEnterWorld(player) {
        
    }
    
    OnRespawn(player) {
        
    }
    
    SetupStartingItems(player, mediumCoreDeath) {
        
    }
    
    ResetEffects(player) {
        
    }
    
    UpdateDead(player) {
        
    }
    
    ModifyMaxStats(player) {
        this.CumulativeHealth = 0;
        this.CumulativeMana = 0;
    }
    
    UpdateBadLifeRegen(player) {
        
    }
    
    UpdateLifeRegen(player) {
        
    }
    
    UpdateManaRegen(player) {
        
    }
    
    PreUpdate(player) {
        
    }
    
    PostUpdate(player) {
        
    }
    
    PreUpdateBuffs(player) {
        
    }
    
    PostUpdateBuffs(player) {
        
    }
    
    PreItemCheck(player) {
        return true;
    }
    
    PostItemCheck(player) {
        
    }
    
    CanUseItem(player, item) {
        return true;
    }
    
    CanAutoReuseItem(player, item) {
        return true;
    }
    
    ConsumeItem(player, item) {
        return true;
    }
    
    OnConsumeItem(player, item) {
        
    }
    
    UseTimeMultiplier(player, item) {
        return 1.0;
    }
    
    UseAnimationMultiplier(player, item) {
        return 1.0;
    }
    
    UseSpeedMultiplier(player, item) {
        return 1.0;
    }
    
    UseItem(player, item) {
        return true;
    }
    
    UseAnimation(player, item) {
        
    }
    
    GetHealLife(player, item, healValue) {
        return healValue;
    }
    
    GetHealMana(player, item, healValue) {
        return healValue;
    }
    
    OnMissingMana(player, item, neededMana) {
        
    }
    
    OnConsumeMana(player, item, manaConsumed) {
        
    }
    
    ModifyManaCost(player, item, mana) {
        this.ManaCost = mana;
    }
    
    ModifyWeaponDamage(player, item, damage) {
        this.WeaponDamage = damage;
    }
    
    ModifyWeaponCrit(player, item, crit) {
        this.WeaponCrit = crit;
    }
    
    // Called only if the item can shoot
    ModifyWeaponKnockback(player, item, knockBack) {
        this.WeaponKnockback = knockBack;
    }
    
    PreModifyLuck(player, luck) {
        return true;
    }
    
    ModifyLuck(player, luck) {
        this.Luck = luck;
    }
    
    CanShoot(player, item) {
        return true;
    }
    
    // stats = { position, velocity, type, damage, knockBack };
    ModifyShootStats(player, stats) {
        
    }
    
    Shoot(player, item, position, velocity, type, damage, knockBack) {
        return true;
    }
    
    OnHitNPC(player, item, npc, damageDone, knockBack, crit) {
        
    }
    
    OnHitNPCWithProj(player, npc, projectile) {
        
    }
    
    UpdateInventory(player) {
        
    }
    
    UpdateEquips(player) {
        
    }
    
    UpdateAccessory(player, item, vanity, hideVisual) {
        
    }
    
    UpdateDyes(player) {
        
    }
    
    IsArmorSet(player, head, body, legs) {
        return false;
    }
    
    UpdateArmorSet(player) {
        
    }
    
    IsVanitySet(player, head, body, legs) {
        return this.IsArmorSet(player, head, body, legs);
    }
    
    UpdateVanitySet(player) {
        
    }
    
    UpdateCamera(player) {
        
    }
    
    UpdateMovement(player) {
        
    }
    
    WingMovement(player, item) {
        
    }
    
    CanPickup(player, item) {
        return true;
    }
    
    OnPickup(player, item) {
        
    }
    
    OnCraft(player, recipe) {
        
    }
    
    ExtractinatorUse(player, item, extractType, extractinatorBlockType) {
        return true;
    }
    
    ImmuneTo(player, damageSource, cooldownCounter, dodgeable) {
        return false;
    }
    
    FreeDodge(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        return false;
    }
    
    // modifiers = { damageSource, damage, hitDirection, quiet, crit, dodgeable };
    ModifyHurt(player, modifiers) {
        
    }
    
    OnHurt(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        
    }
    
    PostHurt(player, damageSource, damage, hitDirection, pvp, quiet, crit, cooldownCounter, dodgeable) {
        
    }
    
    PreKill(player, damageSource, damage, hitDirection, pvp) {
        
    }
    
    Kill(player, damageSource, damage, hitDirection, pvp) {
        
    }
    
    GetDyeTraderReward(player, dyeTrader, rewardItems) {
        
    }
    
    AnglerQuestReward(player, angler, questItemType) {
        return true;
    }
    
    CanSellItem(player, npc, shopInventory, item) {
        return true;
    }
    
    PostSellItem(player, npc, shopInventory, item) {
        
    }
    
    CanCatchNPC(player, npc, item) {
        return true;
    }
    
    OnCatchNPC(player, npc, item, failed) {
        
    }
    
    CanReleaseNPC(player, npcType, item, x, y) {
        return true;
    }
    
    OnReleaseNPC(player, npc) {
        
    }
    
    ModifyCaughtFish(player, itemType) {
        return itemType;
    }
    
    /**
     * @param {object} parts - {head, body, legs, includeArmor, hidesTopSkin, hidesBottomSkin}
     * ex: parts.legs = false; // hide legs
     */
    ShouldDrawParts(player, parts) {
        
    }
    
    SendMessage(player, message) {
        return true;
    }
    
    static register(player) {
        const instance = new player();
        instance.__dispatch = CreateDispatchProfile(player, ModPlayer.prototype, instance);
        PlayerLoader.register(instance);
    }
    static getAll() {
        return PlayerLoader?.RegisteredPlayers ?? [];
    }
    static getByName(name) {
        return PlayerLoader.getByName(name);
    }
}