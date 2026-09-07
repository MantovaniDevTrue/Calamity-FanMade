import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldgenBiomeRuntime } from './../../Core/WorldgenBiomeRuntime.js';
import { SulphurousSeaPreviewRuntime } from './../../Core/SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './../../Core/SulphurousSeaTerrainRuntime.js';
import { AbyssTerrainRuntime } from './../../Core/AbyssTerrainRuntime.js';

const { WorldGen } = Terraria;

export class WorldInteraction extends GlobalHooks {
    Initialize() {
        // Precompute every mathematical Sunken Sea cell before Terraria starts
        // creating a world. The worldgen hook only performs bounded tile access.
        WorldgenBiomeRuntime.Prepare();

        // Same ordering used by Thorium FM: vanilla cleanup first, then generation.
        WorldGen.ShimmerCleanUp.hook((original, self) => {
            original(self);
            WorldgenBiomeRuntime.GenerateFreshWorld();
        });
    }

    OnWorldLoad() {
        if (!WorldgenBiomeRuntime.CommitPending())
            WorldgenBiomeRuntime.RecoverGeneratedWorldMetadata();
        WorldgenBiomeRuntime.RepairInterruptedFreshWorld();

        // Re-read the freshly committed Sulphurous Sea state in case ModSystem
        // OnWorldLoad callbacks ran before this GlobalHooks callback.
        SulphurousSeaPreviewRuntime.Load();
        SulphurousSeaTerrainRuntime.Load();
        SulphurousSeaPreviewRuntime.SetGeneratedBiomeActive(SulphurousSeaTerrainRuntime.Generated === true);
        // Re-load after pending metadata is committed so a fresh-world Abyss generated inside
        // ShimmerCleanUp is recognized immediately instead of being scheduled for post-load work.
        AbyssTerrainRuntime.Load();

        // These two visual systems cache their custom-cell metadata in OnWorldLoad.
        // Fresh-world metadata is committed by this GlobalHooks callback, which can run
        // after ModSystem.OnWorldLoad. Refresh them explicitly so the newly generated
        // world never needs a second reload before its shrine visuals are available.
        try { ModSystem.getByName('RoxShrineVisualSystem')?.Reload?.(); } catch (e) { }
        try { ModSystem.getByName('AbyssShrineVisualSystem')?.Reload?.(); } catch (e) { }
    }

    OnWorldUnload() {
        // Pending metadata is intentionally retained while a freshly created world
        // returns through the world list. World identity and tile anchors validate it.
    }
}
