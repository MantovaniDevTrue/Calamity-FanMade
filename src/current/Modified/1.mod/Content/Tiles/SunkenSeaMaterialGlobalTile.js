import { Terraria } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { SunkenSeaMaterialRuntime } from './../../Core/SunkenSeaMaterialRuntime.js';

const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function ItemNameForKind(kind) {
    if (kind === 'eutrophic')
        return 'EutrophicSand';
    if (kind === 'navystone')
        return 'Navystone';
    if (kind === 'seaprism')
        return 'SeaPrism';
    return '';
}

function ExpectedItemType(kind) {
    const name = ItemNameForKind(kind);
    return name ? Number(ModItem.getTypeByName(name) || 0) : 0;
}

export class SunkenSeaMaterialGlobalTile extends GlobalTile {
    OnPlace(player, i, j, type, style) {
        const kind = SunkenSeaMaterialRuntime.KindForTile(type);
        if (!kind)
            return;
        const customPlacement = SunkenSeaMaterialRuntime.ConsumePending(player, kind);
        SunkenSeaMaterialRuntime.RemoveTracked(i, j);
        if (customPlacement)
            SunkenSeaMaterialRuntime.Track(i, j, kind);
    }

    OnReplace(x, y, targetType, targetStyle) {
        const ecology = ModSystem.getByName('SunkenSeaEcologySystem');
        if (ecology && typeof ecology.OnAnchorBroken === 'function')
            ecology.OnAnchorBroken(x, y);
        SunkenSeaMaterialRuntime.RemoveTracked(x, y);
    }

    CanDropItems(i, j, tile) {
        const type = Number(tile?.type) || 0;
        const kind = SunkenSeaMaterialRuntime.GetKindAt(i, j, type);
        if (!kind)
            return true;
        const ecology = ModSystem.getByName('SunkenSeaEcologySystem');
        if (ecology && typeof ecology.OnAnchorBroken === 'function')
            ecology.OnAnchorBroken(i, j);
        const customType = ExpectedItemType(kind);
        if (!(customType > 0))
            return true;
        try {
            NewItem(i * 16, j * 16, 16, 16, customType, 1, false, -1, true);
            SunkenSeaMaterialRuntime.RemoveTracked(i, j);
            return false;
        } catch (e) {
            tl.log(`[CalamityPort] Sunken Sea material drop failed kind=${kind} at ${i},${j}: ${e}`);
            return true;
        }
    }

    KillTile(i, j, type, fail, effectOnly, noItem) {
        if (fail || effectOnly)
            return;
        if (noItem) {
            const ecology = ModSystem.getByName('SunkenSeaEcologySystem');
            if (ecology && typeof ecology.OnAnchorBroken === 'function')
                ecology.OnAnchorBroken(i, j);
            SunkenSeaMaterialRuntime.RemoveTracked(i, j);
        }
    }
}
