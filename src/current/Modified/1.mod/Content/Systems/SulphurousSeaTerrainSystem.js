import { ModSystem } from './../../TL/ModSystem.js';
import { SulphurousSeaTerrainRuntime } from './../../Core/SulphurousSeaTerrainRuntime.js';
import { SulphurousSeaPreviewRuntime } from './../../Core/SulphurousSeaPreviewRuntime.js';

export class SulphurousSeaTerrainSystem extends ModSystem {
    OnWorldLoad() {
        SulphurousSeaTerrainRuntime.Load();
        SulphurousSeaPreviewRuntime.SetGeneratedBiomeActive(SulphurousSeaTerrainRuntime.Generated === true);
    }

    Update() {
        SulphurousSeaTerrainRuntime.Update();
    }

    PreSaveAndQuit() {
        if (SulphurousSeaTerrainRuntime.Active)
            SulphurousSeaTerrainRuntime.Cancel();
        else
            SulphurousSeaTerrainRuntime.Save();
    }

    OnWorldUnload() {
        SulphurousSeaPreviewRuntime.SetGeneratedBiomeActive(false);
        SulphurousSeaTerrainRuntime.ResetRuntime();
    }
}
