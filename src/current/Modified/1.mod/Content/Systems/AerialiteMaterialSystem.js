import { ModSystem } from './../../TL/ModSystem.js';
import { AerialiteMaterialRuntime } from './../../Core/AerialiteMaterialRuntime.js';

export class AerialiteMaterialSystem extends ModSystem {
    OnWorldLoad() { AerialiteMaterialRuntime.Load(); }
    Update() { if (AerialiteMaterialRuntime.Dirty) AerialiteMaterialRuntime.Save(); }
    OnWorldUnload() {
        if (AerialiteMaterialRuntime.Dirty) AerialiteMaterialRuntime.Save();
        AerialiteMaterialRuntime.Pending = new Array(255);
        AerialiteMaterialRuntime.Generated = new Set();
        AerialiteMaterialRuntime.Placed = new Set();
        AerialiteMaterialRuntime.Removed = new Set();
        AerialiteMaterialRuntime.Points = []; AerialiteMaterialRuntime.PointsDirty = true;
    }
}
