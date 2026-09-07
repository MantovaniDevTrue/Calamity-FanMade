export class GlobalTile {
    static RegisteredTiles = [];
    
    constructor() {}
    
    SetStaticDefaults() {
        
    }
    
    PostSetupContent() {
        
    }
    
    CanPlace(i, j, type, mute, forced, plr, style) {
        return true;
    }
    
    OnPlace(player, i, j, type, style) {
        
    }
    
    IsReplaceable(type, x, y) {
        return true;
    }
    
    OnReplace(x, y, targetType, targetStyle) {
        
    }
    
    GetMinPick(player, x, y, tile) {
        return 0;
    }
    
    GetMineResist(player, x, y, tile) {
        return 1.0;
    }
    
    CanKillTile(i, j, type, blockDamaged) {
        return null;
    }
    
    KillTile(i, j, type, fail, effectOnly, noItem) {
        
    }
    
    KillSound(i, j, type, fail) {
        return true;
    }
    
    GetTileDustAmount(tile, fail, amount) {
        return amount;
    }
    
    MakeTileDust(i, j, tile) {
        return true;
    }
    
    CanDropItems(i, j, tile) {
        return true;
    }
    
    DropItems(i, j, tile) {
        
    }
    
    RightClick(player, i, j, type) {
        return null;
    }
    
    MouseOver(player, i, j, type) {
        
    }
    
    MouseOverFar(player, i, j, type) {
        
    }
    
    PreHitWire(i, j, type) {
        return true;
    }
    
    HitWire(i, j, type) {
        
    }
    
    Slope(i, j, type, slope) {
        return true;
    }
    
    PreShakeTree(i, j, treeType) {
        return true;
    }
    
    ShakeTree(i, j, treeType) {
        
    }
    
    static register(gTile) {
        GlobalTile.RegisteredTiles.push(new gTile());
    }
    static getByName(name) {
        return GlobalTile.RegisteredTiles.find(t => t.constructor.name === name);
    }
}