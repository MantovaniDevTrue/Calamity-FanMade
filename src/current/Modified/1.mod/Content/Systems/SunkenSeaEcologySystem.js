import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';
import { SunkenSeaEcologyRuntime } from './../../Core/SunkenSeaEcologyRuntime.js';
import { SunkenSeaPreviewRuntime } from './../../Core/SunkenSeaPreviewRuntime.js';

const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
export class SunkenSeaEcologySystem extends ModSystem {
    constructor() {
        super();
        this.LastSaveTick = 0;
        this.LastCleanupTick = 0;
    }

    OnWorldLoad() {
        this.LastSaveTick = 0;
        this.LastCleanupTick = 0;
        SunkenSeaEcologyRuntime.Load();
    }

    Update() {
        SunkenSeaEcologyRuntime.Update();
    }

    PostUpdateTime() {
        let tick = 0;
        try {
            tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
        } catch (e) { }
        // Ecology markers are static during ordinary gameplay and normal mining already
        // removes them through OnAnchorBroken. The old 5-second global cleanup walked every
        // marker with TileData even while the player was nowhere near the Sunken Sea. Keep a
        // conservative integrity sweep, but only every 15 seconds while the local player is
        // actually inside the biome.
        if (tick - this.LastCleanupTick >= 900 && !SunkenSeaEcologyRuntime.Populating) {
            this.LastCleanupTick = tick;
            let player = null;
            try { player = Terraria.Main.LocalPlayer; } catch (e) { }
            if (player && player.active === true && SunkenSeaPreviewRuntime.ContainsPlayer(player))
                SunkenSeaEcologyRuntime.Cleanup();
        }
        if (!SunkenSeaEcologyRuntime.Dirty || SunkenSeaEcologyRuntime.Populating)
            return;
        if (tick - this.LastSaveTick < 300)
            return;
        this.LastSaveTick = tick;
        SunkenSeaEcologyRuntime.Save();
    }

    PreSaveAndQuit() {
        SunkenSeaEcologyRuntime.Save();
    }

    OnWorldUnload() {
        this.LastSaveTick = 0;
        this.LastCleanupTick = 0;
        SunkenSeaEcologyRuntime.Reset();
    }

    BeginPopulate(clear = true) {
        return SunkenSeaEcologyRuntime.BeginPopulate(clear);
    }

    GetStatus() {
        return SunkenSeaEcologyRuntime.GetStatus();
    }

    GetMarkers() {
        return SunkenSeaEcologyRuntime.Markers;
    }

    OnAnchorBroken(i, j) {
        const marker = SunkenSeaEcologyRuntime.MarkerAt(i, j);
        if (!marker)
            return false;
        SunkenSeaEcologyRuntime.RemoveAt(i, j, false);
        if (marker.kind !== 'prism')
            return true;
        const shard = Number(ModItem.getTypeByName('PrismShard') || 0);
        if (shard > 0) {
            const amount = 1 + ((Math.abs(Math.floor(i * 31 + j * 17)) % 3) === 0 ? 1 : 0);
            try {
                NewItem(i * 16, j * 16, 16, 16, shard, amount, false, -1, true);
            } catch (e) {
                tl.log(`[CalamityPort] Prism Shard ecology drop failed at ${i},${j}: ${e}`);
            }
        }
        return true;
    }
}
