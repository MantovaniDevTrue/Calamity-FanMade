import { Terraria } from './../ModImports.js';

export class SystemLoader {
    static RegisteredSystems = [];
    static Handlers = Object.create(null);
    static EmptyHandlers = Object.freeze([]);
    static ByName = Object.create(null);
    static _activeUpdateSystems = [];
    static _dormantUpdateSystems = [];
    static _updateListsReady = false;
    static _nextDormantCheck = 0;

    static register(system) {
        this.RegisteredSystems.push(system);
        this.ByName[system.constructor.name] = system;
        for (const method of Object.keys(system.__dispatch ?? {})) {
            let handlers = this.Handlers[method];
            if (!handlers) handlers = this.Handlers[method] = [];
            handlers.push(system);
        }
        this._updateListsReady = false;
    }
    static getByName(name) { return this.ByName[name] ?? null; }
    static GetCallbacks(name) { return this.Handlers[name] ?? this.EmptyHandlers; }
    static InvalidateCallbacks() { this._updateListsReady = false; }
    static RebuildUpdateLists() {
        this._activeUpdateSystems = [];
        this._dormantUpdateSystems = [];
        for (const system of this.GetCallbacks('Update')) {
            if (system?.Done === true) this._dormantUpdateSystems.push(system);
            else this._activeUpdateSystems.push(system);
        }
        this._nextDormantCheck = this._tick + 30;
        this._updateListsReady = true;
    }

    static _tick = 0;
    static _tasks = [];
    
    static OnModLoad() {
        for (const system of this.GetCallbacks('OnModLoad')) {
            system.OnModLoad();
        }
    }
    
    static SetupContent() {
        for (const system of this.GetCallbacks('SetupContent')) {
            system.SetupContent();
        }
    }
    
    static PostSetupContent() {
        for (const system of this.GetCallbacks('PostSetupContent')) {
            system.PostSetupContent();
        }
    }
    
    static OnLocalizationsLoaded() {
        for (const system of this.GetCallbacks('OnLocalizationsLoaded')) {
            system.OnLocalizationsLoaded();
        }
    }
    
    static AddRecipeGroups() {
        for (const system of this.GetCallbacks('AddRecipeGroups')) {
            system.AddRecipeGroups();
        }
    }
    
    static AddRecipes() {
        for (const system of this.GetCallbacks('AddRecipes')) {
            system.AddRecipes();
        }
    }
    
    static OnWorldLoad() {
        this._tick = 0;
        this._tasks = [];
        for (const system of this.GetCallbacks('OnWorldLoad')) system.OnWorldLoad();
        this.RebuildUpdateLists();
    }
    
    static OnWorldUnload() {
        this._tick = 0;
        this._tasks = [];
        const callbacks = this.GetCallbacks('OnWorldUnload');
        const modLoader = this.RegisteredSystems[0];
        for (const system of callbacks) {
            if (system !== modLoader) system.OnWorldUnload();
        }
        if (callbacks.includes(modLoader)) modLoader.OnWorldUnload();
    }
    
    static PreSaveAndQuit() {
        const callbacks = this.GetCallbacks('PreSaveAndQuit');
        const modLoader = this.RegisteredSystems[0];
        for (const system of callbacks) {
            if (system !== modLoader) system.PreSaveAndQuit();
        }
        if (callbacks.includes(modLoader)) modLoader.PreSaveAndQuit();
    }
    
    static PreUpdateTime() {
        for (const system of this.GetCallbacks('PreUpdateTime')) {
            system.PreUpdateTime();
        }
    }
    
    static PostUpdateTime() {
        for (const system of this.GetCallbacks('PostUpdateTime')) {
            system.PostUpdateTime();
        }
    }
    
    static OnStartDay() {
        for (const system of this.GetCallbacks('OnStartDay')) {
            system.OnStartDay();
        }
    }
    
    static OnStartNight() {
        for (const system of this.GetCallbacks('OnStartNight')) {
            system.OnStartNight();
        }
    }
    
    static SendMessage(player, message) {
        if (this.GetCallbacks('SendMessage').some(s => (s.SendMessage(player, message) ?? true) === false)) {
            return false;
        }
        return true;
    }
    
    static Update(isActive) {
        if (!isActive) return;
        this._tick++;

        for (let i = 0; i < this._tasks.length; i++) {
            const t = this._tasks[i];
            if (this._tick >= t.next) {
                t.cb();
                if (t.repeat) {
                    if (t.stopCondition && t.stopCondition()) { this._tasks.splice(i--, 1); continue; }
                    t.next += t.interval;
                } else this._tasks.splice(i--, 1);
            }
        }

        if (!this._updateListsReady) this.RebuildUpdateLists();
        if (this._tick >= this._nextDormantCheck) {
            this._nextDormantCheck = this._tick + 30;
            for (let i = this._dormantUpdateSystems.length - 1; i >= 0; i--) {
                const system = this._dormantUpdateSystems[i];
                if (system && system.Done !== true) {
                    this._dormantUpdateSystems.splice(i, 1);
                    this._activeUpdateSystems.push(system);
                }
            }
        }

        for (let i = 0; i < this._activeUpdateSystems.length; i++) {
            const system = this._activeUpdateSystems[i];
            if (!system) { this._activeUpdateSystems.splice(i--, 1); continue; }
            if (system.Done === true) {
                this._activeUpdateSystems.splice(i--, 1);
                this._dormantUpdateSystems.push(system);
                continue;
            }
            system.Update();
            if (system.Done === true) {
                this._activeUpdateSystems.splice(i--, 1);
                this._dormantUpdateSystems.push(system);
            }
        }
    }
    
    static SetTimeout(cb, ticks) {
        this._tasks.push({ cb, next: this._tick + ticks, repeat: false });
    }

    static SetInterval(cb, ticks, stopCondition = null) {
        this._tasks.push({ cb, next: this._tick + ticks, interval: ticks, repeat: true, stopCondition });
    }
}