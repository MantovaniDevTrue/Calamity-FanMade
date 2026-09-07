import { Terraria, Modules } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModItem } from './../../TL/ModItem.js';
import { SulphurousSeaMaterialRuntime } from './../../Core/SulphurousSeaMaterialRuntime.js';
import { AbyssTerrainProxyTiles, AbyssTerrainProxyWalls } from './../../Core/AbyssTerrainRuntime.js';
import { SulphurousSeaProxyRuntime } from './../../Core/SulphurousSeaProxyRuntime.js';
import { AbyssAmbientProxyRuntime } from './../../Core/AbyssAmbientProxyRuntime.js';

const { TileData } = Modules;
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];

const ABYSS_MATERIALS = Object.freeze({
    [Number(AbyssTerrainProxyTiles.Shale)]: { item: 'SulphurousShale', minPick: 65, resist: 3.0 },
    [Number(AbyssTerrainProxyTiles.Gravel)]: { item: 'AbyssGravel', minPick: 65, resist: 5.0 },
    [Number(AbyssTerrainProxyTiles.PyreMantle)]: { item: 'PyreMantle', minPick: 180, resist: 10.0 },
    [Number(AbyssTerrainProxyTiles.Voidstone)]: { item: 'Voidstone', minPick: 180, resist: 15.0 },
    [Number(AbyssTerrainProxyTiles.PlantyMush)]: { item: 'PlantyMush', minPick: 0, resist: 1.0 },
    [Number(AbyssTerrainProxyTiles.ScoriaOre)]: { item: 'ScoriaOre', minPick: 210, resist: 3.0 },
    [Number(AbyssTerrainProxyTiles.PyreMantleMolten)]: { item: 'PyreMantleMolten', minPick: 180, resist: 10.0 }
});
const ABYSS_WALLS = new Set([
    Number(AbyssTerrainProxyWalls.Shale),
    Number(AbyssTerrainProxyWalls.Gravel),
    Number(AbyssTerrainProxyWalls.PyreMantle),
    Number(AbyssTerrainProxyWalls.Voidstone)
]);
function AbyssMaterialType(type) { return ABYSS_MATERIALS[Number(type)] || null; }
function AbyssMaterialAt(tile) {
    if (!tile || !ABYSS_WALLS.has(Number(tile.wall) || 0)) return null;
    return AbyssMaterialType(tile.type);
}
function SpawnCustom(i, j, name) {
    const customType = Number(ModItem.getTypeByName(name) || 0);
    if (!(customType > 0)) return false;
    NewItem(i * 16, j * 16, 16, 16, customType, 1, false, -1, true);
    return true;
}
function FillAbyssWater(i, j) {
    try {
        const d = new TileData(Number(i), Number(j));
        if (!ABYSS_WALLS.has(Number(d.wall) || 0)) return;
        d.liquid = 255;
        const tile = d.tile;
        if (tile && typeof tile['void liquidType(int liquidType)'] === 'function')
            tile['void liquidType(int liquidType)'](0);
    } catch (e) { }
}


function InvalidateAbyssPotOverlay(i, j) {
    try {
        const registry = globalThis.CalamityAbyssPotCellRegistry;
        if (!registry || typeof registry.get !== 'function') return;
        const pot = registry.get(`${Number(i)}:${Number(j)}`);
        if (pot) pot.potValid = false;
    } catch (_) { }
}

function ItemNameForKind(kind) {
    if (kind === 'sand')
        return 'SulphurousSand';
    if (kind === 'sandstone')
        return 'SulphurousSandstone';
    if (kind === 'hardened')
        return 'HardenedSulphurousSandstone';
    if (kind === 'shale')
        return 'SulphurousShale';
    return '';
}

function ExpectedItemType(kind) {
    const name = ItemNameForKind(kind);
    return name ? Number(ModItem.getTypeByName(name) || 0) : 0;
}


export class SulphurousSeaMaterialGlobalTile extends GlobalTile {
    GetMinPick(player, x, y, tile) {
        const material = AbyssMaterialAt(tile);
        if (material) return material.minPick;
        const kind = SulphurousSeaMaterialRuntime.GetKindAt(x, y, tile?.type);
        return kind === 'shale' ? 65 : 0;
    }

    GetMineResist(player, x, y, tile) {
        const material = AbyssMaterialAt(tile);
        if (material) return material.resist;
        const kind = SulphurousSeaMaterialRuntime.GetKindAt(x, y, tile?.type);
        return kind === 'shale' ? 3.0 : 1.0;
    }

    OnPlace(player, i, j, type, style) {
        const kind = SulphurousSeaMaterialRuntime.KindForTile(type);
        if (!kind)
            return;
        const customPlacement = SulphurousSeaMaterialRuntime.ConsumePending(player, kind);
        SulphurousSeaMaterialRuntime.RemoveTracked(i, j);
        if (customPlacement)
            SulphurousSeaMaterialRuntime.Track(i, j, kind);
    }

    OnReplace(x, y, targetType, targetStyle) {
        InvalidateAbyssPotOverlay(x, y);
        SulphurousSeaMaterialRuntime.RemoveTracked(x, y);
    }

    CanKillTile(i, j, type, blockDamaged) {
        // Scope proxy protection to exact generated metadata cells. Vanilla Echo Blocks, Gray
        // Bricks and Platforms elsewhere in the biome keep their normal Terraria behavior.
        if (SulphurousSeaProxyRuntime.ProxyAt(i, j, type)) return false;
        if (AbyssAmbientProxyRuntime.ProxyAt(i, j, type)) return false;
        return null;
    }

    CanDropItems(i, j, tile) {
        const type = Number(tile?.type) || 0;
        if (SulphurousSeaProxyRuntime.ProxyAt(i, j, type) || AbyssAmbientProxyRuntime.ProxyAt(i, j, type))
            return false;
        const material = AbyssMaterialAt(tile);
        if (material) {
            try {
                if (SpawnCustom(i, j, material.item))
                    return false;
            } catch (e) {
                try { tl.log(`[CalamityPort] Abyss material drop failed item=${material.item} at ${i},${j}: ${e}`); } catch (_) { }
            }
        }
        const kind = SulphurousSeaMaterialRuntime.GetKindAt(i, j, type);
        if (!kind)
            return true;
        const customType = ExpectedItemType(kind);
        if (!(customType > 0))
            return true;
        try {
            NewItem(i * 16, j * 16, 16, 16, customType, 1, false, -1, true);
            SulphurousSeaMaterialRuntime.RemoveTracked(i, j);
            return false;
        } catch (e) {
            tl.log(`[CalamityPort] Sulphurous Sea material drop failed kind=${kind} at ${i},${j}: ${e}`);
            return true;
        }
    }

    KillTile(i, j, type, fail, effectOnly, noItem) {
        if (!fail && !effectOnly) {
            InvalidateAbyssPotOverlay(i, j);
            if (AbyssMaterialType(type)) FillAbyssWater(i, j);
        }
        if (!fail && !effectOnly && noItem)
            SulphurousSeaMaterialRuntime.RemoveTracked(i, j);
    }
}
