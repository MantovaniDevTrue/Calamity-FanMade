import { Terraria } from './../TL/ModImports.js';
import { AerialiteAnchorTiles, AerialiteCloudTiles } from './AerialiteAnchorIDs.js';

function IsActive(tile) {
    try { return tile != null && tile['bool active()']() === true; } catch (e) { return false; }
}

function Hash(x, y, seed) {
    let n = (Math.imul((x | 0) ^ 0x45d9f3b, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x9e3779b9, 0x165667b1) ^ (seed | 0)) | 0;
    n ^= n >>> 15;
    n = Math.imul(n, 0x85ebca6b);
    n ^= n >>> 13;
    n = Math.imul(n, 0xc2b2ae35);
    return (n ^ (n >>> 16)) >>> 0;
}

function IsCloud(tile) {
    return IsActive(tile) && AerialiteCloudTiles.has(Number(tile.type) || 0);
}

function SetDormant(tile) {
    if (!tile)
        return false;
    tile.type = AerialiteAnchorTiles.Dormant;
    tile.frameX = -1;
    tile.frameY = -1;
    return true;
}

function DistanceSquared(a, b) {
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);
    return dx * dx + dy * dy;
}

function Encode(coords) {
    if (!Array.isArray(coords) || coords.length <= 0)
        return '';
    return coords.map(point => `${Math.floor(point.x)},${Math.floor(point.y)}`).join(';');
}

function PlaceCluster(centerX, centerY, seed, coords) {
    const radiusX = 3 + (Hash(centerX, centerY, seed) % 3);
    const radiusY = 2 + (Hash(centerY, centerX, seed ^ 0x41c64e6d) % 3);
    let modified = 0;
    for (let dy = -radiusY - 1; dy <= radiusY + 1; dy++) {
        for (let dx = -radiusX - 1; dx <= radiusX + 1; dx++) {
            const nx = dx / Math.max(1, radiusX);
            const ny = dy / Math.max(1, radiusY);
            const edgeNoise = ((Hash(centerX + dx, centerY + dy, seed) & 255) / 255 - 0.5) * 0.34;
            if (nx * nx + ny * ny > 1 + edgeNoise)
                continue;
            const x = centerX + dx;
            const y = centerY + dy;
            if (x < 5 || y < 5 || x >= Number(Terraria.Main.maxTilesX) - 5 || y >= Number(Terraria.Main.maxTilesY) - 5)
                continue;
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!IsCloud(tile))
                continue;
            if (SetDormant(tile)) {
                coords.push({ x, y });
                modified++;
            }
        }
    }
    return modified;
}

export const AerialiteWorldgenRuntime = {
    Generate(context) {
        const started = Date.now();
        const maxX = Math.max(400, Math.floor(Number(context?.maxX) || Number(Terraria.Main.maxTilesX) || 4200));
        const surface = Math.max(80, Math.floor(Number(context?.worldSurface) || Number(Terraria.Main.worldSurface) || 250));
        const seed = Math.floor(Number(context?.worldId) || Number(Terraria.Main.worldID) || 1);
        const scanBottom = Math.max(40, Math.min(surface - 8, 340));
        const maxClusters = Math.max(14, Math.min(42, Math.floor(maxX / 215)));
        const candidates = [];
        let scanned = 0;

        // Sparse, deterministic scan: approximately 70k native tile accesses in a
        // small world instead of the million-plus accesses of the desktop loop.
        for (let x = 18; x < maxX - 18; x += 7) {
            for (let y = 18; y < scanBottom; y += 4) {
                scanned++;
                const tile = Terraria.Main.tile.get_Item(x, y);
                if (!IsCloud(tile))
                    continue;
                const score = Hash(x, y, seed);
                if ((score % 19) > 2)
                    continue;
                candidates.push({ x, y, score });
            }
        }

        candidates.sort((a, b) => a.score - b.score);
        const centers = [];
        const coords = [];
        let modified = 0;
        for (const candidate of candidates) {
            if (centers.length >= maxClusters)
                break;
            if (centers.some(center => DistanceSquared(center, candidate) < 24 * 24))
                continue;
            const placed = PlaceCluster(candidate.x, candidate.y, seed, coords);
            if (placed < 3)
                continue;
            centers.push(candidate);
            modified += placed;
        }

        return {
            generated: true,
            enchanted: false,
            modified,
            clusters: centers.length,
            scanned,
            coords: Encode(coords),
            elapsedMs: Date.now() - started,
            source: 'sparse-cloud-anchor-worldgen-v1'
        };
    },

    Encode
};
