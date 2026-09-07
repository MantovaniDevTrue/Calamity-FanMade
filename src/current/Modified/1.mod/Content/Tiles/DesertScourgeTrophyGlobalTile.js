import { Terraria } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModSystem } from './../../TL/ModSystem.js';

const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
export class DesertScourgeTrophyGlobalTile extends GlobalTile {
    GetSystem() {
        return ModSystem.getByName('DesertScourgeTrophySystem');
    }

    OnPlace(player, i, j, type, style) {
        const trophyTile = 240;
        if (Number(type) !== trophyTile)
            return;
        const system = this.GetSystem();
        if (!system)
            return;
        const customType = Number(ModItem.getTypeByName('DesertScourgeTrophy') || 0);
        let heldCustomTrophy = false;
        try {
            heldCustomTrophy = !!player && Number(player.HeldItem?.type) === customType;
        } catch (e) { }
        const pendingCustomTrophy = system.ConsumePending(player);
        if (!heldCustomTrophy && !pendingCustomTrophy)
            return;
        system.AddFromPlacedTile(i, j);
    }

    OnReplace(x, y, targetType, targetStyle) {
        const system = this.GetSystem();
        const position = system?.FindContaining(x, y);
        if (position)
            system.RemovePosition(position, true);
    }

    CanDropItems(i, j, tile) {
        if (Number(tile?.type) !== 240) return true;
        const system = this.GetSystem();
        const position = system?.FindContaining(i, j);
        if (!system || !position)
            return true;
        const customType = Number(ModItem.getTypeByName('DesertScourgeTrophy') || 0);
        system.RemovePosition(position, true);
        if (customType > 0) {
            try {
                NewItem(position.x * 16, position.y * 16, 48, 48, customType, 1, false, -1, true);
            } catch (e) {
                tl.log(`[CalamityPort] Desert Scourge trophy custom drop failed: ${e}`);
            }
        }
        return false;
    }

    KillTile(i, j, type, fail, effectOnly, noItem) {
        if (Number(type) !== 240) return;
        if (fail || effectOnly)
            return;
        const system = this.GetSystem();
        const position = system?.FindContaining(i, j);
        if (!position)
            return;
        if (noItem)
            system.RemovePosition(position, true);
    }
}
