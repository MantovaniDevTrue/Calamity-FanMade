import { ModSystem } from './../../TL/ModSystem.js';
import { BiomeAnchorMigrationRuntime } from './../../Core/BiomeAnchorMigrationRuntime.js';

export class BiomeAnchorMigrationSystem extends ModSystem {
    OnWorldLoad() {
        BiomeAnchorMigrationRuntime.Load();
    }

    Update() {
        BiomeAnchorMigrationRuntime.Update();
    }

    PreSaveAndQuit() {
        BiomeAnchorMigrationRuntime.Save();
    }

    OnWorldUnload() {
        BiomeAnchorMigrationRuntime.Reset();
    }

    GetStatus() {
        return BiomeAnchorMigrationRuntime.GetStatus();
    }
}
