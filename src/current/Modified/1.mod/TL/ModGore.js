import { GoreLoader } from './Loaders/GoreLoader.js';
import { ModTexturedType } from './ModTexturedType.js';

export class ModGore extends ModTexturedType {
    constructor() {
        super();
    }
    
    static isModType(type) { return GoreLoader.isModType(type); }
    static isModGore(gore) { return GoreLoader.isModGore(gore); }
    static getByName(name) { return GoreLoader.getByName(name); }
    static getTypeByName(name) { return GoreLoader.getTypeByName(name); }
    static getModGore(type) { return GoreLoader.getModGore(type); }
}