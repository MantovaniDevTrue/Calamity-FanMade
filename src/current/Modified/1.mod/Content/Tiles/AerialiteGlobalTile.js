import { Terraria } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModItem } from './../../TL/ModItem.js';
import { AerialiteAnchorTiles } from './../../Core/AerialiteAnchorIDs.js';
import { AerialiteMaterialRuntime } from './../../Core/AerialiteMaterialRuntime.js';

const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];

export class AerialiteGlobalTile extends GlobalTile {
    OnPlace(player, i, j, type, style) {
        const kind = AerialiteMaterialRuntime.KindForType(type);
        if (!kind) return;
        if (AerialiteMaterialRuntime.ConsumePending(player, kind))
            AerialiteMaterialRuntime.TrackPlaced(i, j);
    }

    CanKillTile(i, j, type, blockDamaged) {
        if (Number(type) === Number(AerialiteAnchorTiles.Dormant)
            && AerialiteMaterialRuntime.IsAerialiteAt(i, j, type))
            return false;
        return null;
    }

    CanDropItems(i, j, tile) {
        const type = Number(tile?.type) || 0;
        if (!AerialiteMaterialRuntime.IsAerialiteAt(i, j, type))
            return true; // vanilla Team Blocks outside tracked Aerialite remain vanilla.
        if (type === Number(AerialiteAnchorTiles.Dormant))
            return false;
        if (type !== Number(AerialiteAnchorTiles.Enchanted))
            return true;
        const oreType = Number(ModItem.getTypeByName('AerialiteOre') || 0);
        if (!(oreType > 0)) return true;
        try {
            NewItem(i * 16, j * 16, 16, 16, oreType, 1, false, -1, true);
            AerialiteMaterialRuntime.Retire(i, j);
            return false;
        } catch (e) {
            try { tl.log(`[CalamityPort] Aerialite custom drop failed at ${i},${j}: ${e}`); } catch (_) { }
            return true;
        }
    }

    OnReplace(x, y, targetType, targetStyle) {
        // Retire only coordinates that are known Aerialite cells. This prevents a later vanilla
        // Team Block placed at the same world position from inheriting Aerialite behavior.
        const k = `${Math.floor(Number(x) || 0)},${Math.floor(Number(y) || 0)}`;
        if (AerialiteMaterialRuntime.Generated.has(k) || AerialiteMaterialRuntime.Placed.has(k))
            AerialiteMaterialRuntime.Retire(x, y);
    }
}
