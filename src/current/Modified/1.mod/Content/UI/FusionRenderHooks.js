import { Terraria, GeneralDrawLayer } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { GeneralParticleHandler } from './../../TL/GeneralParticleHandler.js';
import { FusionVFXSystem } from './../../Core/FusionVFXSystem.js';
import { RipperFastVFX } from './../../Core/Graphics/RipperFastVFX.js';
import { BossIntroRuntime } from './../../Core/BossIntroRuntime.js';
import { AcidRainAtmosphere } from './../../Core/AcidRainAtmosphere.js';

function IsTrue(value) {
    if (typeof value === 'boolean')
        return value;
    try {
        return Number(value) !== 0;
    } catch (e) {
        return !!value;
    }
}

export class FusionRenderHooks extends GlobalHooks {
    constructor() {
        super();
        this.HookInstalled = false;
        this.LastError = '';
    }

    Initialize() {
        let drawNPCs = null;
        try {
            drawNPCs = Terraria.Main['void DrawNPCs(bool behindTiles)'];
        } catch (e) { }
        try {
            if (!drawNPCs)
                drawNPCs = Terraria.Main.DrawNPCs;
        } catch (e) { }
        if (!drawNPCs || !drawNPCs.hook) {
            this.LastError = 'DrawNPCs hook unavailable';
            tl.log('[CalamityFusion] DrawNPCs hook unavailable; lightweight VFX disabled.');
            return;
        }

        drawNPCs.hook((original, self, behindTiles) => {
            const result = original(self, behindTiles);
            if (IsTrue(behindTiles))
                return result;

            try {
                AcidRainAtmosphere.Draw();
            } catch (e) {
                this.LastError = String(e);
            }

            if (FusionVFXSystem.ActiveCount > 0) {
                try {
                    FusionVFXSystem.DrawWorld();
                } catch (e) {
                    this.LastError = String(e);
                }
            }

            if (GeneralParticleHandler.ActiveCount > 0) {
                try {
                    GeneralParticleHandler.Draw(Terraria.Main.spriteBatch, GeneralDrawLayer.AfterDusts);
                } catch (e) {
                    this.LastError = String(e);
                }
            }

            try {
                RipperFastVFX.DrawWorld();
            } catch (e) {
                this.LastError = String(e);
            }

            if (BossIntroRuntime.Active) {
                try {
                    BossIntroRuntime.Draw();
                } catch (e) {
                    this.LastError = String(e);
                }
            }
            return result;
        });
        this.HookInstalled = true;
        tl.log('[CalamityPort RipperFastVFX] polished renderer ready; soft official-circle halos=2 steady draws, 12-segment transient pulses, source-shaped Adrenaline sigil only during activation.');
    }

    OnWorldUnload() {
        this.LastError = '';
        FusionVFXSystem.ClearBenchmark();
        GeneralParticleHandler.Clear();
        RipperFastVFX.Clear();
        BossIntroRuntime.Clear(false);
        AcidRainAtmosphere.Clear();
    }
}
