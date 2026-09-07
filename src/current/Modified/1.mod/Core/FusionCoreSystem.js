import { ModSystem } from './../TL/ModSystem.js';
import { GeneralParticleHandler } from './../TL/GeneralParticleHandler.js';
import { FusionEntityData } from './FusionEntityData.js';
import { FusionVFXSystem } from './FusionVFXSystem.js';
import { FusionCamera } from './FusionCamera.js';
import { WhipRuntime } from './WhipRuntime.js';
import { BossIntroRuntime } from './BossIntroRuntime.js';

export class FusionCoreSystem extends ModSystem {
    constructor() {
        super();
        this.Version = '2.1';
        this.Enabled = true;
        this.Ticks = 0;
    }

    OnModLoad() {
        globalThis.CalamityFusion = {
            EntityData: FusionEntityData,
            VFX: FusionVFXSystem,
            Particles: GeneralParticleHandler,
            Camera: FusionCamera,
            Whips: WhipRuntime,
            BossIntro: BossIntroRuntime
        };
    }

    PostSetupContent() {
        // Load all FusionVFX 2 sprite assets once, outside gameplay/draw hot paths.
        FusionVFXSystem.LoadTextureCache();
    }

    OnWorldLoad() {
        this.Ticks = 0;
        FusionEntityData.ClearAll();
        FusionVFXSystem.ClearBenchmark();
        GeneralParticleHandler.Clear();
        FusionCamera.Clear();
        WhipRuntime.Clear();
        BossIntroRuntime.Clear(false);
    }

    OnWorldUnload() {
        FusionEntityData.ClearAll();
        FusionVFXSystem.ClearBenchmark();
        GeneralParticleHandler.Clear();
        FusionCamera.Clear();
        WhipRuntime.Clear();
        BossIntroRuntime.Clear(false);
    }

    Update() {
        if (!this.Enabled)
            return;
        this.Ticks++;
        if (FusionVFXSystem.ActiveCount > 0)
            FusionVFXSystem.Update();
        if (GeneralParticleHandler.ActiveCount > 0)
            GeneralParticleHandler.Update();
        if (BossIntroRuntime.Active)
            BossIntroRuntime.Update();
    }

    GetSummary() {
        const entities = FusionEntityData.GetStats();
        const vfx = FusionVFXSystem.GetStats();
        return `v${this.Version}, ticks=${this.Ticks}, npcData=${entities.npcSlots}, projectileData=${entities.projectileSlots}, vfx=${vfx.active}/${vfx.budget}, particles=${GeneralParticleHandler.ActiveCount}/${GeneralParticleHandler.MaxParticles}`;
    }
}
