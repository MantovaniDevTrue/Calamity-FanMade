import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';

const STONE_TILE = Number(Terraria.ID.TileID?.Stone || 1);
const IRON_BALL_PROXY = Number(Terraria.ID.TileID?.SmallPiles || 185);
const MAX_ATTEMPTS = 100000;
const SlopeTile = Terraria.WorldGen['bool SlopeTile(int i, int j, int slope, bool noEffects, bool quiet)'];

function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function InWorld(x, y, margin = 2) {
    return x >= margin && y >= margin && x < I(Terraria.Main.maxTilesX) - margin && y < I(Terraria.Main.maxTilesY) - margin;
}
function TileAt(x, y) {
    try { return InWorld(x, y, 1) ? Terraria.Main.tile.get_Item(I(x), I(y)) : null; } catch (e) { return null; }
}
function Active(tile) {
    try { return !!tile && tile['bool active()']() === true; } catch (e) { return false; }
}
function SetActive(tile, value) {
    try { tile['void active(bool active)'](value === true); } catch (e) { }
}
function TryCall(tile, signature, value) {
    try {
        if (tile && typeof tile[signature] === 'function') {
            tile[signature](value);
            return true;
        }
    } catch (e) { }
    return false;
}
function Log(text) { try { tl.log(`[CalamityPort IronBall] ${text}`); } catch (e) { } }

function OfficialTargetCount(maxX) {
    // WorldGen.GetWorldSize(): 0=small, 1=medium, 2=large.
    if (I(maxX) === 6400) return 9;
    if (I(maxX) === 8400) return 12;
    return 6;
}

function PlaceProxy(x, y) {
    const tile = TileAt(x, y);
    if (!tile || Active(tile)) return false;
    const liquid = I(tile.liquid, 0);
    let liquidType = 0;
    try { liquidType = I(tile['byte liquidType()'](), 0); } catch (e) { }

    SetActive(tile, true);
    tile.type = IRON_BALL_PROXY;
    tile.frameX = 0;
    tile.frameY = 0;
    tile.liquid = liquid;
    TryCall(tile, 'void liquidType(int liquidType)', liquidType);
    TryCall(tile, 'void halfBrick(bool halfBrick)', false);
    TryCall(tile, 'void slope(byte slope)', 0);
    // SmallPiles gives us a non-solid, normally mineable 1x1 native proxy. Echo coating hides
    // the vanilla pebble so the official 16x16 IronBallPlaced sprite can own the visuals.
    TryCall(tile, 'void invisibleBlock(bool invisibleBlock)', true);
    TryCall(tile, 'void actuator(bool actuator)', false);
    TryCall(tile, 'void inActive(bool inActive)', false);
    return true;
}

function IsValidSupport(x, y) {
    const support = TileAt(x, y);
    const above = TileAt(x, y - 1);
    return !!support && !!above && Active(support) && I(support.type, -1) === STONE_TILE && !Active(above);
}

function PlaceAt(x, supportY) {
    x = I(x); supportY = I(supportY);
    if (!IsValidSupport(x, supportY)) return null;
    try { if (typeof SlopeTile === 'function') SlopeTile(x, supportY, 0, true, true); } catch (e) { }
    if (!PlaceProxy(x, supportY - 1)) return null;
    return { x, y: supportY - 1 };
}

function FallbackFill(positions, target, minX, maxX, minY, maxY) {
    // Mobile safety only. The official method keeps randomly searching until the target is
    // reached (its attempts counter is never incremented). This bounded scan preserves the
    // exact Stone + empty-above placement rule if random retries ever become pathological.
    if (positions.length >= target) return 0;
    let added = 0;
    const phase = WorldGenRand.NextInt(0, 13);
    for (let y = minY + phase; y < maxY && positions.length < target; y += 13) {
        for (let x = minX + ((y + phase) % 17); x < maxX && positions.length < target; x += 17) {
            const placed = PlaceAt(x, y);
            if (placed) { positions.push(placed); added++; }
        }
    }
    return added;
}

export const IronBallRuntime = {
    TargetCount(maxX = Terraria.Main.maxTilesX) { return OfficialTargetCount(maxX); },

    Generate(context = null) {
        const maxX = I(context?.maxX, I(Terraria.Main.maxTilesX));
        const maxY = I(context?.maxY, I(Terraria.Main.maxTilesY));
        if (maxX < 400 || maxY < 300)
            return { generated: false, positions: [], target: 0, attempts: 0, fallback: 0, reason: 'invalid-world-size' };

        const minX = 100;
        const maxPlaceX = Math.max(minX + 1, maxX - 100);
        const minY = Math.max(10, I(Terraria.Main.rockLayer, Math.floor(maxY * 0.35)));
        const maxPlaceY = Math.max(minY + 1, Math.min(maxY - 10, I(Terraria.Main.UnderworldLayer, Math.floor(maxY * 0.82))));
        const target = OfficialTargetCount(maxX);
        const positions = [];
        let attempts = 0;

        while (positions.length < target && attempts < MAX_ATTEMPTS) {
            attempts++;
            const x = WorldGenRand.NextInt(minX, maxPlaceX);
            const y = WorldGenRand.NextInt(minY, maxPlaceY);
            const placed = PlaceAt(x, y);
            if (placed) positions.push(placed);
        }

        const fallback = FallbackFill(positions, target, minX, maxPlaceX, minY, maxPlaceY);
        Log(`GenerateIronBall placed=${positions.length}/${target}, attempts=${attempts}, fallback=${fallback}, rock=${minY}, underworld=${maxPlaceY}.`);
        return {
            generated: positions.length > 0,
            positions,
            target,
            attempts,
            fallback,
            source: 'official-MiscWorldgenRoutines.GenerateIronBall'
        };
    }
};
