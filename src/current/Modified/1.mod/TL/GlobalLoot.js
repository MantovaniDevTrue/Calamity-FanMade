import { BestiaryHelper } from './Core/BestiaryHelper.js';

export class GlobalLoot {
    static Loots = [];
    
    itemDropDatabase = null;
    
    constructor(itemDropDatabase) {
        this.itemDropDatabase = itemDropDatabase;
    }
    
    // Here you can edit all the loot in your mod
    ModifyGlobalLoot() {
        
    }
    
    // Helper methods for global loot
    Get = () => this.itemDropDatabase._globalEntries;
    Add = (entry) => this.itemDropDatabase.RegisterToGlobal(entry);
    Remove(entry) {
        this.itemDropDatabase._globalEntries.Remove(entry);
        return entry;
    }
    
    // Helper methods for npc loot
    GetRulesForNPCID(id) {
        return this.itemDropDatabase.GetRulesForNPCID(id, false);
    }
    RegisterToNPC(id, itemDropRule) {
        this.itemDropDatabase.RegisterToNPC(id, itemDropRule);
        BestiaryHelper.AddDropToNPC(id, itemDropRule);
    }
    RemoveFromNPC(id, itemDropRule) {
        const entry = this.itemDropDatabase.RemoveFromNPC(id, itemDropRule);
        let type = -1;
        try { type = entry.itemId; } catch {}
        if (type !== -1) BestiaryHelper.RemoveDropFromNPC(id, type);
    }
    
    static register(loot) { this.Loots.push(loot); }
}