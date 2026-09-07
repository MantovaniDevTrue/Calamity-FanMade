export class GlobalHooks {
    static RegisteredHooks = [];
    constructor() {
        this.initialized = false;
    }
    
    Initialize() {
        
    }
    
    OnWorldLoad() {
        
    }
    
    OnWorldUnload() {
        
    }
    
    static register(hook) {
        GlobalHooks.RegisteredHooks.push(new hook());
    }
    static getByName(name) {
        return this.RegisteredHooks.find(h => h.constructor.name === name);
    }
}