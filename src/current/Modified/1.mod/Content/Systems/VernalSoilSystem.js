import { ModSystem } from './../../TL/ModSystem.js';
import { VernalSoilRuntime } from './../../Core/VernalSoilRuntime.js';

export class VernalSoilSystem extends ModSystem {
    OnWorldLoad() { VernalSoilRuntime.Load(); }
    Update() { if (VernalSoilRuntime.Dirty) VernalSoilRuntime.Save(); }
    OnWorldUnload() { if (VernalSoilRuntime.Dirty) VernalSoilRuntime.Save(); VernalSoilRuntime.Pending = new Array(255); VernalSoilRuntime.Bounds = null; }
}
