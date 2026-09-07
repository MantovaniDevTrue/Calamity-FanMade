import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { DrawPostSlimeGodVisuals, ClearPostSlimeGodVisuals } from './../../Core/PostSlimeGodProjectileVisualRegistry.js';

function IsTrue(value) {
    if (typeof value === 'boolean') return value;
    try { return Number(value) !== 0; } catch (e) { return !!value; }
}

export class PostSlimeGodProjectileVisualHooks extends GlobalHooks {
    constructor() {
        super();
        this.HookInstalled = false;
    }

    Initialize() {
        let drawNPCs = null;
        try { drawNPCs = Terraria.Main['void DrawNPCs(bool behindTiles)']; } catch (e) { }
        try { if (!drawNPCs) drawNPCs = Terraria.Main.DrawNPCs; } catch (e) { }
        if (!drawNPCs || !drawNPCs.hook) {
            try { tl.log('[CalamityPort 12.84.6] post-Slime-God world overlay hook unavailable.'); } catch (e) { }
            return;
        }
        drawNPCs.hook((original, self, behindTiles) => {
            const result = original(self, behindTiles);
            if (!IsTrue(behindTiles)) {
                try { DrawPostSlimeGodVisuals(); } catch (e) { }
            }
            return result;
        });
        this.HookInstalled = true;
        try { tl.log('[CalamityPort 12.84.6] post-Slime-God world overlay hook installed; no projectile-array scan.'); } catch (e) { }
    }

    OnWorldUnload() {
        ClearPostSlimeGodVisuals();
    }
}
