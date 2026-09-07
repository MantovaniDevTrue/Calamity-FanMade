import { MenuLoader } from './Loaders/MenuLoader.js';

export class ModMenu {
    Weight = 1.0;
    
    Logo = '';
    SunTexture = '';
    MoonTexture = '';
    Music = 50;
    Background = null;
    
    constructor() {
        
    }
    
    SetStaticDefaults() {
        
    }
    
    IsAvailable() {
        return true;
    }
    
    OnSelected() {
        
    }
    
    OnDeselected() {
        
    }
    
    ModifySkyColor(skyColor) {
        
    }
    
    ModifySunAndMoonColor(sunColor, moonColor) {
        
    }
    
    Update(isOnTitleScreen) {
        
    }
    
    static register(menu) {
        MenuLoader.Menus.push(new menu());
    }
    static getByName(name) {
        return MenuLoader.Menus.find(m => m.constructor.name === name);
    }
}