import { SubworldLoader } from './Loaders/SubworldLoader.js';

export class Subworld {
    MainWorld = null;
    MainPlayer = null;
    
    WorldFilePath = '';
    
    constructor() {
        
    }
    
    IsActive() {
        if (SubworldLoader.AnySubworldActive) {
            return SubworldLoader.ActiveSubworld === this;
        }
        return false;
    }
    
    OnEnter(player) {
        
    }
    
    OnLeave(player) {
        
    }
    
    ModifySpawnPool(spawnInfo, pool) {
        
    }
    
    static Join(name) {
        return SubworldLoader.Join(name);
    }
    static Leave() {
        SubworldLoader.LeaveSubworld();
    }
    
    static getByName(name) {
        return SubworldLoader.getByName(name);
    }
    static register(subworld) {
        SubworldLoader.Subworlds.push(new subworld());
    }
}