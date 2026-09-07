import { Terraria } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModSystem } from './../../TL/ModSystem.js';

const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function ResolveMasterTrophyBaseTileID() {
    try {
        const value = 617;
        if (Number.isFinite(value) && value > 0)
            return value;
    } catch (e) { }
    return 617;
}

export class CrabulonRelicGlobalTile extends GlobalTile {
    GetSystem() {
        return ModSystem.getByName('CrabulonRelicSystem');
    }

    GetCleanup() {
        return ModSystem.getByName('NativeRelicDropCleanup');
    }

    OnPlace(player, i, j, type, style) {
        const relicTile = ResolveMasterTrophyBaseTileID();
        if (Number(type) !== relicTile)
            return;
        const system = this.GetSystem();
        if (!system)
            return;
        const customType = Number(ModItem.getTypeByName('CrabulonRelic') || 0);
        let heldCustomRelic = false;
        try {
            heldCustomRelic = !!player && Number(player.HeldItem?.type) === customType;
        } catch (e) { }
        const pendingCustomRelic = system.ConsumePending(player);
        if (!heldCustomRelic && !pendingCustomRelic)
            return;
        system.AddFromPlacedTile(i, j);
    }

    OnReplace(x, y, targetType, targetStyle) {
        const system = this.GetSystem();
        const position = system?.FindContaining(x, y);
        if (position)
            system.RemovePosition(position, true);
    }

    DropCustomRelic(system, position, noItem) {
        const cleanup = this.GetCleanup();
        if (cleanup && typeof cleanup.Queue === 'function')
            cleanup.Queue(position.x, position.y);
        if (cleanup && typeof cleanup.MarkHandled === 'function')
            cleanup.MarkHandled(position.x, position.y);
        system.RemovePosition(position, true);
        if (noItem)
            return;
        const customType = Number(ModItem.getTypeByName('CrabulonRelic') || 0);
        if (customType > 0) {
            try {
                NewItem(position.x * 16, position.y * 16, 48, 64, customType, 1, false, -1, true);
            } catch (e) {
                tl.log(`[CalamityPort] Crabulon relic custom drop failed: ${e}`);
            }
        }
    }

    CanDropItems(i, j, tile) {
        if (Number(tile?.type) !== 617) return true;
        const cleanup = this.GetCleanup();
        if (cleanup && typeof cleanup.IsHandledTile === 'function' && cleanup.IsHandledTile(i, j))
            return false;
        const system = this.GetSystem();
        const position = system?.FindContaining(i, j);
        if (!system || !position)
            return true;
        this.DropCustomRelic(system, position, false);
        return false;
    }

    KillTile(i, j, type, fail, effectOnly, noItem) {
        if (Number(type) !== 617) return;
        if (fail || effectOnly)
            return;
        const cleanup = this.GetCleanup();
        const system = this.GetSystem();
        if (!system)
            return;
        if (cleanup && typeof cleanup.IsHandledTile === 'function' && cleanup.IsHandledTile(i, j)) {
            const lingering = system.FindContaining(i, j);
            if (lingering)
                system.RemovePosition(lingering, true);
            return;
        }
        const position = system.FindContaining(i, j);
        if (!position)
            return;
        this.DropCustomRelic(system, position, !!noItem);
    }
}
