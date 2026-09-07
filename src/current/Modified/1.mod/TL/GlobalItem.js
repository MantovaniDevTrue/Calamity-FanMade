import { ModRecipe } from './ModRecipe.js';
import { CreateDispatchProfile } from './Core/DispatchProfile.js';

export class GlobalItem {
    static RegisteredItems = [];
    static Handlers = Object.create(null);
    static EmptyHandlers = Object.freeze([]);
    constructor() {}
    
    SetDefaults(item) {
        
    }
    
    AllowPrefix(item, pre) {
        return true;
    }
    
    /** @deprecated */
    ChoosePrefix(item, rolledPrefix, rollablePrefixes) {
        return -1;
    }
    
    CanUseItem(item, player) {
        return true;
    }
    
    CanAutoReuseItem(item, player) {
        return true;
    }
    
    UseStyle(item, player, mountOffset, heldItemFrame) {
        
    }
    
    HoldStyle(item, player, mountOffset, heldItemFrame) {
        
    }
    
    HoldItem(item, player) {
        
    }
    
    UseTimeMultiplier(item, player) {
        return 1.0;
    }
    
    UseAnimationMultiplier(item, player) {
        return 1.0;
    }
    
    UseSpeedMultiplier(item, player) {
        return 1.0;
    }
    
    UseItem(item, player) {
        return true;
    }
    
    UseAnimation(item, player) {
        
    }
    
    GetHealLife(item, player, healValue) {
        return healValue;
    }
    
    GetHealMana(item, player, healValue) {
        return healValue;
    }
    
    OnMissingMana(item, player, neededMana) {
        
    }
    
    OnConsumeMana(item, player, manaConsumed) {
        
    }
    
    ModifyManaCost(item, player, mana) {
        return mana;
    }
    
    ModifyWeaponDamage(item, player, damage) {
        return damage;
    }
    
    ModifyWeaponCrit(item, player, crit) {
        return crit;
    }
    
    // Called only if the item can shoot
    ModifyWeaponKnockback(item, player, knockBack) {
        return knockBack;
    }
    
    CanShoot(item, player) {
        return true;
    }
    
    // stats = { position, velocity, type, damage, knockBack };
    ModifyShootStats(item, player, stats) {
        
    }
    
    Shoot(item, player, position, velocity, type, damage, knockBack) {
        return true;
    }
    
    OnHitNPC(item, player, npc, damageDone, knockBack) {
        
    }
    
    CanAccessoryBeEquippedWith(incomingItem, equippedItem, player) {
        return null;
    }
    
    UpdateInventory(item, player) {
        
    }
    
    UpdateEquip(item, player) {
        
    }
    
    UpdateAccessory(item, player, vanity, hideVisual) {
        
    }
    
    UpdateVanityAccessory(item, player) {
        
    }
    
    UpdateArmorSet(item, player) {
        
    }
    
    UpdateVanitySet(item, player) {
        
    }
    
    WingMovement(item, player) {
        
    }
    
    CanPickup(item, player) {
        return true;
    }
    
    OnPickup(item, player) {
        
    }
    
    OnCraft(item, player, recipe) {
        
    }
    
    GetAlpha(item, color) {
        return color;
    }
    
    // only if Terraria.ID.ItemID.Sets.ExtractinatorMode[item.type] > 0
    // Return false to prevent vanilla behavior
    ExtractinatorUse(item, player, extractType, extractinatorBlockType) {
        return true;
    }
    
    IsAnglerQuestAvailable() {
        return true;
    }
    
    PreDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip) {
        return true;
    }
    
    PostDrawInInventory(item, context, sb, position, scale, maxScale, color, itemFade, flip) {
        
    }
    
    AddRecipeGroups() {
        
    }
    
    AddRecipes() {
        
    }
    
    CreateRecipe(itemId, stack = 1) {
        return new ModRecipe().SetResult(itemId, stack);
    }
    
    static register(gItem) {
        const instance = new gItem();
        instance.__dispatch = CreateDispatchProfile(gItem, GlobalItem.prototype, instance);
        this.RegisteredItems.push(instance);
        for (const method of Object.keys(instance.__dispatch)) {
            let handlers = this.Handlers[method];
            if (!handlers) handlers = this.Handlers[method] = [];
            handlers.push(instance);
        }
    }
    static getHandlers(name) { return this.Handlers[name] ?? this.EmptyHandlers; }
    static hasHandlers(name) { return (this.Handlers[name]?.length ?? 0) > 0; }
    static getByName(name) {
        return this.RegisteredItems.find(i => i.constructor.name === name);
    }
}