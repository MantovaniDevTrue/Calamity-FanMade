import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { SunkenSeaMaterialRuntime } from './../../Core/SunkenSeaMaterialRuntime.js';

export class SunkenSeaMaterialSystem extends ModSystem {
    constructor() {
        super();
        this.LastSaveTick = 0;
    }

    OnWorldLoad() {
        this.LastSaveTick = 0;
        SunkenSeaMaterialRuntime.Load();
    }

    PostUpdateTime() {
        if (!SunkenSeaMaterialRuntime.Dirty)
            return;
        let tick = 0;
        try {
            tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
        } catch (e) { }
        if (tick - this.LastSaveTick < 300)
            return;
        this.LastSaveTick = tick;
        SunkenSeaMaterialRuntime.Save();
    }

    PreSaveAndQuit() {
        SunkenSeaMaterialRuntime.Save();
    }

    OnWorldUnload() {
        this.LastSaveTick = 0;
        SunkenSeaMaterialRuntime.Reset();
    }
}
