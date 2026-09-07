import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModBiome } from './../../TL/ModBiome.js';
import { ModNPC } from './../../TL/ModNPC.js';
import { ModSurfaceBackground } from './../../TL/ModBackgrounds.js';
import { SulphurousSeaPreviewRuntime } from './../../Core/SulphurousSeaPreviewRuntime.js';
import { AcidRainTier1Runtime } from './../../Core/AcidRainTier1Runtime.js';

const { Color } = Modules;
let SpawnPoolDiagnosticLogged = false;
let AcidRainLandPoolLogged = false;
let AcidRainWaterPoolLogged = false;
let AcidRainTypes = null;
function GetAcidRainTypes() {
    if (AcidRainTypes) return AcidRainTypes;
    AcidRainTypes = {
        toad: Number(ModNPC.getTypeByName('NuclearToad') || 0),
        eel: Number(ModNPC.getTypeByName('AcidEel') || 0),
        radiator: Number(ModNPC.getTypeByName('Radiator') || 0),
        skyfin: Number(ModNPC.getTypeByName('Skyfin') || 0)
    };
    return AcidRainTypes;
}
export class SulphurousSeaBiome extends ModBiome {
    constructor() {
        super();
        this.Priority = 3;
        this.Music = 66;
        this.WaterTexture = 'Waters/SulphuricWater';
        this.WaterfallTexture = 'Waters/SulphuricWaterflow';
        this.DropletTexture = 'Waters/SulphuricWaterDroplet';
        this.RainTexture = 'Waters/SulphuricRain';
        this.MapBackgroundTexture = 'Backgrounds/MapBackgrounds/SulphurBG';
        this.BiomeColor = Color.new(122, 142, 54, 255);
    }

    SetStaticDefaults() {
        this.SurfaceBackground = ModSurfaceBackground.getByName('SulphurousSeaSurfaceBackground');
    }

    IsBiomeActive(player, tileCounts) {
        return SulphurousSeaPreviewRuntime.ContainsPlayerVisual(player);
    }

    ModifySpawnPool(spawnInfo, pool) {
        if (!spawnInfo || !spawnInfo.Player)
            return;

        // Match Calamity's global spawn-pool rule: vanilla natural spawns are
        // disabled while the player is actually inside the Sulphurous Sea.
        // The visual biome intentionally has extra padding, so use the strict
        // gameplay bounds here instead of IsBiomeActive/ContainsPlayerVisual.
        if (!SulphurousSeaPreviewRuntime.IsCoastalArea() || !SulphurousSeaPreviewRuntime.ContainsPlayer(spawnInfo.Player))
            return;

        // During Acid Rain TLPro's normal SpawnNPC hook owns creation.
        // Keep only the four Tier 1 entries so ordinary Sulphurous Sea enemies
        // do not dilute the event pool.
        if (AcidRainTier1Runtime.Active === true) {
            const t = GetAcidRainTypes();
            const toad = Number(t.toad) || 0, eel = Number(t.eel) || 0;
            const radiator = Number(t.radiator) || 0, skyfin = Number(t.skyfin) || 0;
            let eventCount = 0, eventWeight = 0;
            for (const key in pool) {
                const id = Number(key), w = Number(pool[key]) || 0;
                if (w <= 0) continue;
                if (id === toad || id === eel || id === radiator || id === skyfin) {
                    eventCount++;
                    eventWeight += w;
                }
            }

            // Only take over the Sulphurous Sea pool after NPCLoader has actually
            // inserted an Acid Rain candidate. If a particular native spawn cycle
            // produced no valid event coordinate, leave the ordinary pool alone
            // instead of creating an empty spawn cycle.
            if (eventCount > 0) {
                for (const key in pool) {
                    const id = Number(key);
                    if (id !== toad && id !== eel && id !== radiator && id !== skyfin)
                        pool[key] = 0;
                }
            }

            if (!AcidRainLandPoolLogged) {
                AcidRainLandPoolLogged = true;
                try { tl.log(`[CalamityPort AcidRainNaturalPool] active; candidates=${eventCount}; weight=${eventWeight.toFixed(2)}; takeover=${eventCount > 0}.`); } catch (_) { }
            }
            return;
        }

        if (Object.prototype.hasOwnProperty.call(pool, 0))
            pool[0] = 0;
        if (Object.prototype.hasOwnProperty.call(pool, '0'))
            pool['0'] = 0;

        // One diagnostic per mod load. NPCLoader has already evaluated every
        // ModNPC SpawnChance before ModifySpawnPool is called, so this tells us
        // immediately whether the Sulphur NPC candidates are actually entering
        // the pool without producing per-spawn log spam.
        if (!SpawnPoolDiagnosticLogged) {
            SpawnPoolDiagnosticLogged = true;
            try {
                let candidates = 0;
                let weight = 0;
                for (const key in pool) {
                    if (String(key) === '0') continue;
                    const w = Number(pool[key]) || 0;
                    if (w > 0) { candidates++; weight += w; }
                }
                tl.log(`[CalamityPort SulphSpawnPool] active; vanilla=0; candidates=${candidates}; totalWeight=${weight.toFixed(3)}; water=${spawnInfo.Water === true}; exactSpawnTileBounds=disabled.`);
            } catch (_) { }
        }
    }
}
