import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { SulphurousSeaMaterialRuntime } from './../../Core/SulphurousSeaMaterialRuntime.js';

export class SulphurousSeaMaterialSystem extends ModSystem {
    constructor() {
        super();
        this.LastSaveTick = 0;
    }

    OnWorldLoad() {
        this.LastSaveTick = 0;
        SulphurousSeaMaterialRuntime.Load();
    }

    PostUpdateTime() {
        if (!SulphurousSeaMaterialRuntime.Dirty)
            return;
        let tick = 0;
        try {
            tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
        } catch (e) { }
        if (tick - this.LastSaveTick < 300)
            return;
        this.LastSaveTick = tick;
        SulphurousSeaMaterialRuntime.Save();
    }

    PreSaveAndQuit() {
        SulphurousSeaMaterialRuntime.Save();
    }

    OnWorldUnload() {
        this.LastSaveTick = 0;
        SulphurousSeaMaterialRuntime.Reset();
    }
}
