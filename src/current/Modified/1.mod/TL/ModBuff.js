import { Terraria } from './ModImports.js';
import { BuffLoader } from './Loaders/BuffLoader.js';
import { ModTexturedType } from './ModTexturedType.js';

export class ModBuff extends ModTexturedType {
    Buff = undefined;
    Type = undefined;
    
    // string
    DisplayName = '';
    // string
    Description = '';
    
    // string []
    MenuCategories = [];
    
    constructor() {
        super();
    }
    
    SetupContent() {
        let name = this.constructor.name;
        let originalName = name, i = 1;
        while (Terraria.ID.BuffID.Search.ContainsName(name)) name = originalName + i++;
        Terraria.ID.BuffID.Search.Add(name, this.Type);
        
        BuffLoader.AddToMenu(this);
    }
    
    SetDefaults() {
        
    }
    
    SetStaticDefaults() {
        
    }
    
    PostStaticDefaults() {
        
    }
    
    PostSetupContent() {
        
    }
    
    ModifyDisplayName() {
        
    }
    
    ModifyDescription() {
        
    }
    
    UpdatePlayer(player, buffIndex) {
        
    }
    
    UpdateNPC(npc, buffIndex) {
        
    }
    
    ApplyPlayer(player, buffTime) {
        
    }
    
    ApplyNPC(npc, buffTime) {
        
    }
    
    ReApplyPlayer(player, buffTime, buffIndex) {
        return true;
    }
    
    ReApplyNPC(npc, buffTime, buffIndex) {
        return true;
    }
    
    CanRemove(player, buffTime, buffIndex, debuff) {
        return null;
    }
    
    OnRemove(player, buffTime, buffIndex) {
        
    }
    
    static register(buff) {
        BuffLoader.Buffs.push(new buff());
    }
    static isModType(type) { return BuffLoader.isModType(type); }
    static isModBuff(buff) { return BuffLoader.isModBuff(buff); }
    static getByName(name) { return BuffLoader.getByName(name); }
    static getTypeByName(name) { return BuffLoader.getTypeByName(name); }
    static getModBuff(type) { return BuffLoader.getModBuff(type); }
}