import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { LoadBrokenBiomeBladeStates, SaveBrokenBiomeBladeStates, ClearBrokenBiomeBladeRuntime } from './../../Core/BrokenBiomeBladeRuntime.js';

export class BrokenBiomeBladeSystem extends ModSystem {
    OnWorldLoad() { LoadBrokenBiomeBladeStates(); }
    PreSaveAndQuit() {
        try { SaveBrokenBiomeBladeStates(Terraria.Main.LocalPlayer); } catch (e) { }
    }
    OnWorldUnload() { ClearBrokenBiomeBladeRuntime(); }
}
