export class GlobalProjectile {
    static RegisteredProjectiles = [];
    constructor() { }
    
    SetDefaults(proj) {
        
    }
    
    OnSpawn(proj) {
        
    }
    
    PreAI(proj) {
        return null;
    }
    
    AI(proj) {
        
    }
    
    PreKill(proj, timeLeft) {
        return null;
    }
    
    OnKill(proj, timeLeft) {
        
    }
    
    CanCutTiles(proj) {
        return null;
    }
    
    CutTiles(proj) {
        
    }
    
    OnHitNPC(proj, npc) {
        
    }
    
    OnHitPlayer(proj, player) {
        
    }
    
    GetAlpha(proj, color) {
        return color;
    }
    
    PreDraw(proj, lightColor) {
        return null;
    }
    
    PostDraw(proj, lightColor) {
        
    }
    
    CanDamage(proj) {
        return null;
    }
    
    ModifyDamageHitbox(proj, hitbox) {
        
    }
    
    static register(gProj) {
        this.RegisteredProjectiles.push(new gProj());
    }
    static getByName(name) {
        return this.RegisteredProjectiles.find(p => p.constructor.name === name);
    }
}