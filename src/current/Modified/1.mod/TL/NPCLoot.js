import { Terraria } from './ModImports.js';
import { NPCLoader } from './Loaders/NPCLoader.js';

export class NPCLoot {
    npcNetId = null;
    itemDropDatabase = null;
    
    constructor(npcNetId, itemDropDatabase) {
        this.npcNetId = npcNetId;
        this.itemDropDatabase = itemDropDatabase;
    }
    
    Get(includeGlobalDrops = true) {
        return this.itemDropDatabase.GetRulesForNPCID(this.npcNetId, includeGlobalDrops);
    }
    
    Add(entry) {
        this.itemDropDatabase.RegisterToNPCNetId(this.npcNetId, entry);
        return entry;
    }
    
    Remove(entry) {
        this.itemDropDatabase.RemoveFromNPCNetId(this.npcNetId, entry);
        return entry;
    }
}