import { CloudLoader } from './Loaders/CloudLoader.js';
import { ModTexturedType } from './ModTexturedType.js';

export class ModCloud extends ModTexturedType {
    Type = null;
    
    constructor() {
        super();
    }
    
    SpawnChance() {
        return 1.0;
    }
    
    RareCloud() {
        return false;
    }
    
    OnSpawn(cloud) {
        
    }
    
    static register(cloud) {
        CloudLoader.Clouds.push(new cloud());
    }
    static isModType(type) { return CloudLoader.isModType(type); }
    static isModCloud(cloud) { return CloudLoader.isModCloud(cloud); }
    static getByName(name) { return CloudLoader.getByName(name); }
    static getTypeByName(name) { return CloudLoader.getTypeByName(name); }
    static getModCloud(type) { return CloudLoader.getModCloud(type); }
}