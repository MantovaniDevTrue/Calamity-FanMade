import { HairLoader } from './Loaders/HairLoader.js';

export class ModHair {
    construtor() { }
    
    Type = -1;
    AvailableDuringCharacterCreation = true;
    
    _isUnlocked = false;
    _oldIsUnlocked = false;
    
    IsUnlocked(isAtCharacterCreation, isAtStylist) {
        if (isAtCharacterCreation && !this.AvailableDuringCharacterCreation)
            return false;
        return true;
    }
    
    static isModType(type) { return HairLoader.isModType(type); }
    static getByName(name) { return HairLoader.getByName(name); }
    static getTypeByName(name) { return HairLoader.getTypeByName(name); }
    
    static register(hair) {
        HairLoader.Hairs.push(new hair());
    }
}