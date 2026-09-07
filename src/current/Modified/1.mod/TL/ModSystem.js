import { SystemLoader } from './Loaders/SystemLoader.js';
import { CreateDispatchProfile } from './Core/DispatchProfile.js';

export class ModSystem {
    constructor() {}
    
    OnModLoad() {}
    
    SetupContent() {}
    
    PostSetupContent() {}
    
    OnLocalizationsLoaded() {}
    
    AddRecipeGroups() {}
    
    AddRecipes() {}
    
    OnWorldLoad() {}
    
    OnWorldUnload() {}
    
    PreSaveAndQuit() {}
    
    PreUpdateTime() {}
    
    PostUpdateTime() {}
    
    OnStartDay() {}
    
    OnStartNight() {}
    
    SendMessage(player, message) {
        return true;
    }
    
    static SetTimeout(cb, delay) {
        SystemLoader.SetTimeout(cb, delay);
    }
    
    static SetInterval(cb, interval, stopCondition = null) {
        SystemLoader.SetInterval(cb, interval, stopCondition);
    }
    
    static register(system) {
        const instance = new system();
        instance.__dispatch = CreateDispatchProfile(system, ModSystem.prototype, instance);
        SystemLoader.register(instance);
    }
    static getByName(name) { return SystemLoader.getByName(name); }
}