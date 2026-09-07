import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { WorldgenBiomeRuntime } from './../../Core/WorldgenBiomeRuntime.js';
import { SulphurousSeaPreviewRuntime } from './../../Core/SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './../../Core/SulphurousSeaTerrainRuntime.js';

function Log(message) { try { tl.log(`[CalamityPort InterruptedWorldgenRepair] ${message}`); } catch (e) { } }

export class InterruptedWorldgenRepairSystem extends ModSystem {
    constructor() { super(); this.ResetRuntime(); }
    ResetRuntime() { this.Delay = 90; this.Attempted = false; }
    OnWorldLoad() { this.ResetRuntime(); }
    OnWorldUnload() { this.ResetRuntime(); }

    Update() {
        if (this.Attempted || !WorldDB.Instance)
            return;
        if (this.Delay-- > 0)
            return;
        this.Attempted = true;

        try {
            WorldgenBiomeRuntime.CommitPending();
            WorldgenBiomeRuntime.RecoverGeneratedWorldMetadata();
            const repaired = WorldgenBiomeRuntime.RepairInterruptedFreshWorld(true);
            Log(`delayed repair attempted; repaired=${repaired}, lastError=${WorldgenBiomeRuntime.LastError || '<none>'}.`);
            if (!repaired)
                return;

            SulphurousSeaPreviewRuntime.Load();
            SulphurousSeaTerrainRuntime.Load();
            SulphurousSeaPreviewRuntime.SetGeneratedBiomeActive(SulphurousSeaTerrainRuntime.Generated === true);

            const aerialite = ModSystem.getByName('AerialiteProgressionSystem');
            if (aerialite && typeof aerialite.ReloadMetadata === 'function')
                aerialite.ReloadMetadata();
        } catch (e) {
            Log(`delayed repair crashed: ${e}`);
        }
    }
}
