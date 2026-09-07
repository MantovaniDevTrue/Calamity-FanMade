import { ModSystem } from './../../TL/ModSystem.js';
import { AcidRainTier1Runtime } from './../../Core/AcidRainTier1Runtime.js';

export class AcidRainTier1System extends ModSystem {
    OnWorldLoad() {
        AcidRainTier1Runtime.Load();
    }

    PostUpdateTime() {
        AcidRainTier1Runtime.Update();
    }

    PreSaveAndQuit() {
        AcidRainTier1Runtime.Save();
    }

    OnWorldUnload() {
        AcidRainTier1Runtime.Reset();
    }

    GetStatus(player = null) {
        return AcidRainTier1Runtime.GetStatus(player);
    }
}
