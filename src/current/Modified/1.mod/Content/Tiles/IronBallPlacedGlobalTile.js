import { Terraria } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';

const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function IsGeneratingWorld() { try { return Terraria.WorldGen.isGeneratingOrLoadingWorld === true; } catch (e) { return false; } }

export class IronBallPlacedGlobalTile extends GlobalTile {
    S() { return ModSystem.getByName('IronBallWorldgenSystem'); }

    PickPowerCheck() { }

    GetMinPick(player, x, y, tile) {
        if (Number(tile?.type) !== 185 || IsGeneratingWorld()) return 0;
        return this.S()?.FindAt(x, y) ? 0 : 0;
    }

    GetMineResist(player, x, y, tile) {
        if (Number(tile?.type) !== 185 || IsGeneratingWorld()) return 1;
        return this.S()?.FindAt(x, y) ? 1 : 1;
    }

    MouseOver(player, i, j, type) {
        if (Number(type) !== 185 || IsGeneratingWorld() || !this.S()?.FindAt(i, j)) return;
        try {
            player.noThrow = 2;
            player.cursorItemIconEnabled = true;
            player.cursorItemIconID = Number(ModItem.getTypeByName('IronBall') || 0);
        } catch (e) { }
    }

    CanDropItems(i, j, tile) {
        if (Number(tile?.type) !== 185 || IsGeneratingWorld()) return true;
        const system = this.S();
        if (!system?.FindAt(i, j)) return true;
        const itemType = Number(ModItem.getTypeByName('IronBall') || 0);
        system.RemoveAt(i, j, true);
        if (itemType > 0) {
            try { NewItem(I(i) * 16, I(j) * 16, 16, 16, itemType, 1, false, -1, true); } catch (e) { }
        }
        try { tl.log(`[CalamityPort IronBall] mined at ${I(i)},${I(j)}; itemType=${itemType}.`); } catch (e) { }
        return false;
    }

    OnReplace(x, y, targetType, targetStyle) {
        if (IsGeneratingWorld()) return;
        const system = this.S();
        if (system?.FindAt(x, y)) system.RemoveAt(x, y, true);
    }
}
