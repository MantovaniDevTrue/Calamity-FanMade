import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { AerialiteAnchorTiles, AerialiteCloudTiles } from './../../Core/AerialiteAnchorIDs.js';
import { AerialiteMaterialRuntime } from './../../Core/AerialiteMaterialRuntime.js';

const KEY_PREFIX = 'calamity:aerialite:';
const INITIAL_DELAY = 180;
const SCAN_SAMPLES_PER_TICK = 96;
const ENCHANT_TILES_PER_TICK = 36;

function Key(name) { return `${KEY_PREFIX}${name}`; }
function IsActive(tile) { try { return tile != null && tile['bool active()']() === true; } catch (e) { return false; } }
function IsCloud(tile) { return IsActive(tile) && AerialiteCloudTiles.has(Number(tile.type) || 0); }
function Hash(x, y, seed) {
    let n = (Math.imul((x | 0) ^ 0x45d9f3b, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x9e3779b9, 0x165667b1) ^ (seed | 0)) | 0;
    n ^= n >>> 15; n = Math.imul(n, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35);
    return (n ^ (n >>> 16)) >>> 0;
}
function Encode(coords) { return coords.map(point => `${Math.floor(point.x)},${Math.floor(point.y)}`).join(';'); }
function Decode(text) {
    const result = [];
    const source = String(text || '');
    if (!source)
        return result;
    for (const entry of source.split(';')) {
        const pair = entry.split(',');
        if (pair.length !== 2)
            continue;
        const x = Math.floor(Number(pair[0]));
        const y = Math.floor(Number(pair[1]));
        if (Number.isFinite(x) && Number.isFinite(y))
            result.push({ x, y });
    }
    return result;
}
function DistanceSquared(a, b) {
    const dx = Number(a.x) - Number(b.x);
    const dy = Number(a.y) - Number(b.y);
    return dx * dx + dy * dy;
}
function Tell(text, r = 145, g = 240, b = 255) {
    if (Terraria.Main.netMode === 2)
        return;
    try { Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'](String(text), r, g, b); } catch (e) { }
}

export class AerialiteProgressionSystem extends ModSystem {
    constructor() {
        super();
        this.ResetRuntime();
    }

    ResetRuntime() {
        this.Delay = INITIAL_DELAY;
        this.Generated = false;
        this.Enchanted = false;
        this.Coords = [];
        this.EnchantCursor = 0;
        this.EnchantRequested = false;
        this.ScanActive = false;
        this.ScanX = 18;
        this.ScanY = 18;
        this.ScanBottom = 0;
        this.ScanMaxX = 0;
        this.ScanSeed = 1;
        this.ScanCenters = [];
        this.ScanModified = 0;
        this.ScanSamples = 0;
        this.ScanMaxClusters = 0;
        this.AnnouncedGeneration = false;
    }

    OnWorldLoad() {
        this.ResetRuntime();
        this.ReloadMetadata();
    }

    OnWorldUnload() {
        this.ResetRuntime();
    }

    ReloadMetadata() {
        const metadataGenerated = WorldDB.get(Key('generated')) === true;
        this.Enchanted = WorldDB.get(Key('enchanted')) === true;
        this.Coords = Decode(WorldDB.get(Key('coords')));
        // The generated flag is authoritative. Fresh-world worldgen and the legacy
        // migration both set it only after their one-time Aerialite pass finishes.
        // Requiring coords.length > 0 made worlds with an empty/unavailable coordinate
        // list restart the sky scan on every world entry, repeatedly announcing that
        // Aerialite was forming and doing needless native tile reads.
        this.Generated = metadataGenerated;
        this.EnchantCursor = Math.max(0, Math.floor(Number(WorldDB.get(Key('enchantCursor'))) || 0));
        if (this.Enchanted)
            this.EnchantCursor = this.Coords.length;
    }

    ShouldEnchant() {
        const world = ModSystem.getByName('CalamityWorldState');
        return !!(world && (world.DownedHiveMind === true || world.DownedPerforators === true));
    }

    RequestEnchant() {
        this.EnchantRequested = true;
        if (this.Generated && !this.Enchanted)
            this.EnchantCursor = Math.max(0, Math.min(this.EnchantCursor, this.Coords.length));
    }

    StartExistingWorldScan() {
        this.ScanActive = true;
        this.ScanMaxX = Math.max(400, Math.floor(Number(Terraria.Main.maxTilesX) || 4200));
        const surface = Math.max(80, Math.floor(Number(Terraria.Main.worldSurface) || 250));
        this.ScanBottom = Math.max(40, Math.min(surface - 8, 340));
        this.ScanSeed = Math.floor(Number(Terraria.Main.worldID) || 1);
        this.ScanMaxClusters = Math.max(14, Math.min(42, Math.floor(this.ScanMaxX / 215)));
        this.ScanX = 18;
        this.ScanY = 18;
        this.ScanCenters = [];
        this.ScanModified = 0;
        this.ScanSamples = 0;
        this.Coords = [];
        if (!this.AnnouncedGeneration) {
            this.AnnouncedGeneration = true;
            Tell('Aerialite adormecida está se formando nas ilhas flutuantes...', 190, 205, 125);
        }
    }

    PlaceCluster(centerX, centerY) {
        const radiusX = 3 + (Hash(centerX, centerY, this.ScanSeed) % 3);
        const radiusY = 2 + (Hash(centerY, centerX, this.ScanSeed ^ 0x41c64e6d) % 3);
        let modified = 0;
        for (let dy = -radiusY - 1; dy <= radiusY + 1; dy++) {
            for (let dx = -radiusX - 1; dx <= radiusX + 1; dx++) {
                const nx = dx / Math.max(1, radiusX);
                const ny = dy / Math.max(1, radiusY);
                const edgeNoise = ((Hash(centerX + dx, centerY + dy, this.ScanSeed) & 255) / 255 - 0.5) * 0.34;
                if (nx * nx + ny * ny > 1 + edgeNoise)
                    continue;
                const x = centerX + dx;
                const y = centerY + dy;
                if (x < 5 || y < 5 || x >= this.ScanMaxX - 5 || y >= Number(Terraria.Main.maxTilesY) - 5)
                    continue;
                const tile = Terraria.Main.tile.get_Item(x, y);
                if (!IsCloud(tile))
                    continue;
                tile.type = AerialiteAnchorTiles.Dormant;
                tile.frameX = -1;
                tile.frameY = -1;
                this.Coords.push({ x, y });
                AerialiteMaterialRuntime.AddGenerated(x, y);
                modified++;
            }
        }
        return modified;
    }

    AdvanceExistingWorldScan() {
        if (!this.ScanActive)
            return;
        let samples = 0;
        while (samples < SCAN_SAMPLES_PER_TICK && this.ScanX < this.ScanMaxX - 18 && this.ScanCenters.length < this.ScanMaxClusters) {
            const x = this.ScanX;
            const y = this.ScanY;
            this.ScanY += 4;
            if (this.ScanY >= this.ScanBottom) {
                this.ScanY = 18;
                this.ScanX += 7;
            }
            samples++;
            this.ScanSamples++;
            const tile = Terraria.Main.tile.get_Item(x, y);
            if (!IsCloud(tile))
                continue;
            const score = Hash(x, y, this.ScanSeed);
            if ((score % 19) > 2)
                continue;
            const candidate = { x, y };
            if (this.ScanCenters.some(center => DistanceSquared(center, candidate) < 24 * 24))
                continue;
            const placed = this.PlaceCluster(x, y);
            if (placed < 3)
                continue;
            this.ScanCenters.push(candidate);
            this.ScanModified += placed;
        }
        if (this.ScanX < this.ScanMaxX - 18 && this.ScanCenters.length < this.ScanMaxClusters)
            return;
        this.ScanActive = false;
        this.Generated = true;
        WorldDB.set(Key('generated'), true);
        WorldDB.set(Key('enchanted'), false);
        WorldDB.set(Key('coords'), Encode(this.Coords));
        WorldDB.set(Key('clusters'), this.ScanCenters.length);
        WorldDB.set(Key('modified'), this.ScanModified);
        WorldDB.set(Key('source'), 'existing-world-incremental-sky-migration-v1');
        WorldDB.set(Key('enchantCursor'), 0);
        this.EnchantCursor = 0;
        try { WorldDB.Instance?.Save(); } catch (e) { }
        Tell(`Aerialite adormecida formada: ${this.ScanModified} blocos em ${this.ScanCenters.length} depósitos.`, 190, 205, 125);
        if (this.ShouldEnchant() || this.EnchantRequested)
            this.RequestEnchant();
    }

    AdvanceEnchant() {
        if (!this.Generated || this.Enchanted || !(this.ShouldEnchant() || this.EnchantRequested))
            return;
        let processed = 0;
        let converted = 0;
        while (this.EnchantCursor < this.Coords.length && processed < ENCHANT_TILES_PER_TICK) {
            const point = this.Coords[this.EnchantCursor++];
            processed++;
            if (!point || AerialiteMaterialRuntime.IsRetired(point.x, point.y))
                continue;
            const tile = Terraria.Main.tile.get_Item(point.x, point.y);
            if (!tile || !IsActive(tile) || Number(tile.type) !== AerialiteAnchorTiles.Dormant)
                continue;
            tile.type = AerialiteAnchorTiles.Enchanted;
            tile.frameX = -1;
            tile.frameY = -1;
            converted++;
        }
        if (this.EnchantCursor % 180 === 0)
            WorldDB.set(Key('enchantCursor'), this.EnchantCursor);
        if (this.EnchantCursor < this.Coords.length)
            return;
        this.Enchanted = true;
        WorldDB.set(Key('enchanted'), true);
        WorldDB.set(Key('enchantCursor'), this.Coords.length);
        WorldDB.set(Key('enchantSource'), 'hive-mind-or-perforators-progression');
        try { WorldDB.Instance?.Save(); } catch (e) { }
        Tell('A energia dos céus despertou a Aerialite nas ilhas flutuantes!', 105, 235, 255);
    }

    PostUpdateTime() {
        if (!WorldDB.Instance || Terraria.Main.gameMenu === true)
            return;
        if (this.Delay > 0) {
            this.Delay--;
            if (this.Delay === 0)
                this.ReloadMetadata();
            return;
        }
        if (!this.Generated && !this.ScanActive)
            this.StartExistingWorldScan();
        if (this.ScanActive)
            this.AdvanceExistingWorldScan();
        else
            this.AdvanceEnchant();
    }

    PreSaveAndQuit() {
        if (!WorldDB.Instance)
            return;
        if (this.Generated) {
            WorldDB.set(Key('coords'), Encode(this.Coords));
            WorldDB.set(Key('enchantCursor'), this.EnchantCursor);
            WorldDB.set(Key('enchanted'), this.Enchanted === true);
        }
    }

    GetStatus() {
        return `generated=${this.Generated} enchanted=${this.Enchanted} coords=${this.Coords.length} cursor=${this.EnchantCursor} scan=${this.ScanActive} clusters=${this.ScanCenters.length}/${this.ScanMaxClusters} modified=${this.ScanModified}`;
    }
}
