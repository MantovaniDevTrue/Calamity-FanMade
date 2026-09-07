import { Terraria } from './../ModImports.js';
import { GlobalTile } from './../GlobalTile.js';
import { TileData } from './../Modules/TileData.js';

export class TileLoader {
    static MAX_VANILLA_ID = Terraria.ID.TileID.Count;
    static TileCount = this.MAX_VANILLA_ID;

    static _globalCallbackCache = {};
    static _globalCallbackCount = -1;

    static InvalidateGlobalCallbacks() {
        this._globalCallbackCache = {};
        this._globalCallbackCount = GlobalTile.RegisteredTiles.length;
    }

    static GetGlobalCallbacks(name) {
        const registeredCount = GlobalTile.RegisteredTiles.length;
        if (this._globalCallbackCount !== registeredCount) this.InvalidateGlobalCallbacks();
        let callbacks = this._globalCallbackCache[name];
        if (callbacks) return callbacks;

        callbacks = [];
        for (const globalTile of GlobalTile.RegisteredTiles) {
            if (!globalTile || typeof globalTile[name] !== 'function') continue;
            let proto = Object.getPrototypeOf(globalTile);
            let baseMethod = null;
            while (proto) {
                if (proto.constructor?.name === 'GlobalTile') {
                    baseMethod = proto[name];
                    break;
                }
                proto = Object.getPrototypeOf(proto);
            }
            if (typeof baseMethod !== 'function' || globalTile[name] !== baseMethod) callbacks.push(globalTile);
        }
        this._globalCallbackCache[name] = callbacks;
        return callbacks;
    }
    
    static SetupContent() {
        for (const gTile of this.GetGlobalCallbacks('SetStaticDefaults')) {
            gTile.SetStaticDefaults();
        }
    }
    
    static PostSetupContent() {
        for (const gTile of this.GetGlobalCallbacks('PostSetupContent')) {
            gTile.PostSetupContent();
        }
    }
    
    static CanPlace(i, j, type, mute, forced, plr, style) {
        if (this.GetGlobalCallbacks('CanPlace').some(gT => gT.CanPlace(i, j, type, mute, forced, plr, style) === false)) {
            return false;
        }
        return true;
    }
    
    static OnPlace(i, j, type, plr, style) {
        const player = (plr >= 0 && plr < 255) ? Terraria.Main.player[plr] : null;
        for (const gTile of this.GetGlobalCallbacks('OnPlace')) {
            gTile.OnPlace(player, i, j, type, style);
        }
    }
    
    static IsReplaceable(type, x, y) {
        if (this.GetGlobalCallbacks('IsReplaceable').some(gT => gT.IsReplaceable(type, x, y) === false)) {
            return false;
        }
        return true;
    }
    
    static OnReplace(x, y, targetType, targetStyle) {
        for (const gTile of this.GetGlobalCallbacks('OnReplace')) {
            gTile.OnReplace(x, y, targetType, targetStyle);
        }
    }
    
    static CanKillTile(i, j) {
        const type = new TileData(i, j).type;
        
        if (this.GetGlobalCallbacks('CanKillTile').some(gT => gT.CanKillTile(i, j, type) === false)) {
            return false;
        }
        
        return true;
    }
    
    static KillTile(i, j, fail, effectOnly, noItem) {
        const type = new TileData(i, j).type;
        
        for (const gTile of this.GetGlobalCallbacks('KillTile')) {
            gTile.KillTile(i, j, type, fail, effectOnly, noItem);
        }
    }
    
    static KillSound(i, j, type, fail) {
        if (this.GetGlobalCallbacks('KillSound').some(gT => gT.KillSound(i, j, type, fail) === false)) {
            return false;
        }
        return true;
    }
    
    static GetTileDustAmount(fail, tile, amount) {
        for (const gTile of this.GetGlobalCallbacks('GetTileDustAmount')) {
            amount = gTile?.GetTileDustAmount(tile, fail, amount) ?? amount;
        }
        return amount;
    }
    
    static MakeTileDust(i, j, tile) {
        if (this.GetGlobalCallbacks('MakeTileDust').some(gT => gT.MakeTileDust(i, j, tile) === false)) {
            return false;
        }
        return true;
    }
    
    static CanDropItems(i, j, tile) {
        let flag = true;
        
        for (const gTile of this.GetGlobalCallbacks('CanDropItems')) {
            if (gTile.CanDropItems(i, j, tile) === false) {
                flag = false;
                break;
            }
        }
        
        return flag;
    }
    
    static DropItems(i, j, tile) {
        for (const gTile of this.GetGlobalCallbacks('DropItems')) {
            gTile.DropItems(i, j, tile);
        }
    }
    
    static PickPowerCheck(player, pickPower, x, y, tile, damage) {
        let mineResist = 1;
        for (const gTile of this.GetGlobalCallbacks('PickPowerCheck')) {
            if (pickPower < gTile.GetMinPick(player, x, y, tile)) {
                damage = 0;
                break;
            }
            const _mineResist = gTile.GetMineResist(player, x, y, tile);
            if (mineResist < _mineResist) mineResist = _mineResist;
        }
        return damage / mineResist;
    }
    
    static RightClick(player, i, j, type) {
        let flag1 = null;
        
        for (const gTile of this.GetGlobalCallbacks('RightClick')) {
            const result = gTile.RightClick(player, i, j, type);
            if (result === true) {
                flag1 = true;
            } else if (result === false) {
                flag1 = false;
                break;
            }
        }
        
        return flag1;
    }
    
    static MouseOver(player, i, j, type) {
        for (const gTile of this.GetGlobalCallbacks('MouseOver')) {
            gTile.MouseOver(player, i, j, type);
        }
    }
    
    static MouseOverFar(player, i, j, type) {
        for (const gTile of this.GetGlobalCallbacks('MouseOverFar')) {
            gTile.MouseOverFar(player, i, j, type);
        }
    }
    
    static PreHitWire(i, j, type) {
        if (this.GetGlobalCallbacks('PreHitWire').some(gT => gT.PreHitWire(i, j, type) === false)) {
            return false;
        }
        return true;
    }
    
    static HitWire(i, j, type) {
        for (const gTile of this.GetGlobalCallbacks('HitWire')) {
            gTile.HitWire(i, j, type);
        }
    }
    
    static Slope(i, j, type, slope) {
        if (this.GetGlobalCallbacks('Slope').some(gT => gT.Slope(i, j, type, slope) === false)) {
            return false;
        }
        return true;
    }
    
    static PreShakeTree(i, j, treeType) {
        if (this.GetGlobalCallbacks('PreShakeTree').some(gT => gT.PreShakeTree(i, j, treeType) === false)) {
            return false;
        }
        return true;
    }
    
    static ShakeTree(i, j, treeType) {
        for (const gTile of this.GetGlobalCallbacks('ShakeTree')) {
            gTile.ShakeTree(i, j, treeType);
        }
    }
}