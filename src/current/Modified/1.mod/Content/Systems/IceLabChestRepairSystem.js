import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';

const KEY = 'calamity:structure:iceLab:';

export class IceLabChestRepairSystem extends ModSystem {
    constructor() {
        super();
        this.Done = true;
    }

    OnWorldLoad() {
        // Since Phase 13.05.6 all large structures, including the Ice Lab and
        // its loot chests, are finalized during worldgen. Re-running chest
        // repair every ~10 seconds in gameplay only caused native tile/chest
        // traffic on old/migrated metadata and never repaired the affected world
        // (ready stayed 0/2 for all bounded retries in the latest log).
        this.Done = true;
        try {
            if (!WorldDB.Instance || WorldDB.get(KEY + 'generated') !== true) return;
            const source = String(WorldDB.get(KEY + 'source') || '');
            if (source.includes('fresh-world-direct') && Number(WorldDB.get(KEY + 'lootVersion') || 0) < 1)
                WorldDB.set(KEY + 'lootVersion', 1);
        } catch (_) { }
    }

    OnWorldUnload() {
        this.Done = true;
    }

    Update() { }
}
