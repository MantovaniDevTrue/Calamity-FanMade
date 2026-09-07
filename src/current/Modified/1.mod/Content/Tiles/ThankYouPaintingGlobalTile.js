import { Terraria } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModSystem } from './../../TL/ModSystem.js';

const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
export class ThankYouPaintingGlobalTile extends GlobalTile {
    GetSystem() {
        return ModSystem.getByName('ThankYouPaintingSystem');
    }

    OnPlace(player, i, j, type, style) {
        if (Number(type) !== 242)
            return;
        const system = this.GetSystem();
        if (!system)
            return;
        const customType = Number(ModItem.getTypeByName('ThankYouPainting') || 0);
        let held = false;
        try {
            held = Number(player?.HeldItem?.type) === customType;
        } catch (e) { }
        if (!held && !system.ConsumePending(player))
            return;
        system.AddFromPlacedTile(i, j);
    }

    OnReplace(x, y) {
        const system = this.GetSystem();
        const position = system?.FindContaining(x, y);
        if (position)
            system.RemovePosition(position, true);
    }

    CanDropItems(i, j, tile) {
        if (Number(tile?.type) !== 242) return true;
        const system = this.GetSystem();
        const position = system?.FindContaining(i, j);
        if (!system || !position)
            return true;
        const customType = Number(ModItem.getTypeByName('ThankYouPainting') || 0);
        system.RemovePosition(position, true);
        if (customType > 0) {
            try {
                NewItem(position.x * 16, position.y * 16, 96, 64, customType, 1, false, -1, true);
            } catch (e) {
                tl.log(`[CalamityPort] Thank You Painting custom drop failed: ${e}`);
            }
        }
        return false;
    }

    KillTile(i, j, type, fail, effectOnly, noItem) {
        if (Number(type) !== 242) return;
        if (fail || effectOnly)
            return;
        const system = this.GetSystem();
        const position = system?.FindContaining(i, j);
        if (position && noItem)
            system.RemovePosition(position, true);
    }
}
