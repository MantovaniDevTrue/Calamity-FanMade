import { NPCLoader } from './Loaders/NPCLoader.js';
import { CreateDispatchProfile } from './Core/DispatchProfile.js';

export class GlobalNPC {
    static RegisteredNPCs = [];
    static Handlers = Object.create(null);
    static EmptyHandlers = Object.freeze([]);
    constructor() {
        
    }
    
    SetDefaults(npc) {
        
    }
    
    OnSpawn(npc) {
        
    }
    
    PreAI(npc) {
        return true;
    }
    
    AI(npc) {
        
    }
    
    PostAI(npc) {
        
    }
    
    GetAlpha(npc, newColor) {
        return newColor;
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
    
    HitEffect(npc, hitDirection, damage) {
        
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
    
    OnHitByPlayer(npc, player, item, damageDone, knockBack) {
        
    }
    
    OnHitByProjectile(npc, projectile) {
        
    }
    
    UpdateLifeRegen(npc, damage) {
        
    }
    
    SetNPCNameList(type) {
        
    }
    
    CanChat(npc) {
        return null;
    }
    
    GetChat(npc) {
        return '';
    }
    
    SetChatButtons(npc, button1, button2) {
        
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
    
    PostSetupShop(npc, player, npcShop) {
        
    }
    
    ModifyNPCHappiness(npc, player, primaryPlayerBiome, shopHelper, nearbyNPCsByType) {
        
    }
    
    CanGoToStatue(npc, toKingStatue) {
        return null;
    }
    
    OnGoToStatue(npc, toKingStatue) {
        
    }
    
    static register(npc) {
        const instance = new npc();
        instance.__dispatch = CreateDispatchProfile(npc, GlobalNPC.prototype, instance);
        this.RegisteredNPCs.push(instance);
        for (const method of Object.keys(instance.__dispatch)) {
            let handlers = this.Handlers[method];
            if (!handlers) handlers = this.Handlers[method] = [];
            handlers.push(instance);
        }
        try { NPCLoader.InvalidateGlobalCallbacks(); } catch (_) { }
    }
    static getHandlers(name) { return this.Handlers[name] ?? this.EmptyHandlers; }
    static hasHandlers(name) { return (this.Handlers[name]?.length ?? 0) > 0; }
    static getByName(name) {
        return this.RegisteredNPCs.find(n => n.constructor.name === name);
    }
}