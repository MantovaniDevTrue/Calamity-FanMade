import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { SurfaceShrineRuntime } from './../../Core/SurfaceShrineRuntime.js';
import { OfficialStructureMap } from './../../Core/OfficialStructureMap.js';

const KEY = 'calamity:structure:surfaceShrine:';
function N(value, fallback) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function Log(message) { try { tl.log(`[CalamityPort SurfaceShrineDeferred] ${message}`); } catch (e) { } }
function Reserve(prefix, fallbackWidth, fallbackHeight) {
    if (WorldDB.get(prefix + 'generated') !== true)
        return;
    const left = N(WorldDB.get(prefix + 'left'), -1), top = N(WorldDB.get(prefix + 'top'), -1);
    const width = Math.max(1, N(WorldDB.get(prefix + 'width'), fallbackWidth));
    const height = Math.max(1, N(WorldDB.get(prefix + 'height'), fallbackHeight));
    if (left >= 0 && top >= 0)
        OfficialStructureMap.Reserve(prefix, { left, top, right: left + width, bottom: top + height }, 4);
}
function SunkenPlacement() {
    if (WorldDB.get('calamity:sunkensea:terrain:generated') !== true)
        return null;
    const centerX = N(WorldDB.get('calamity:sunkensea:preview:centerX'), -1);
    const centerY = N(WorldDB.get('calamity:sunkensea:preview:centerY'), -1);
    const width = Math.max(1, N(WorldDB.get('calamity:sunkensea:preview:width'), 520));
    const height = Math.max(1, N(WorldDB.get('calamity:sunkensea:preview:height'), 310));
    if (centerX < 0 || centerY < 0)
        return null;
    return { left: centerX - Math.floor(width * 0.5), top: centerY - Math.floor(height * 0.5), width, height };
}
function SaveResult(result) {
    WorldDB.set(KEY + 'generated', true);
    WorldDB.set(KEY + 'pending', false);
    WorldDB.set(KEY + 'left', N(result.left, N(result.anchorX, 0)));
    WorldDB.set(KEY + 'top', N(result.top, N(result.anchorY, 0)));
    WorldDB.set(KEY + 'width', N(result.width, 56));
    WorldDB.set(KEY + 'height', N(result.height, 36));
    WorldDB.set(KEY + 'anchorX', N(result.anchorX, 0));
    WorldDB.set(KEY + 'anchorY', N(result.anchorY, 0));
    WorldDB.set(KEY + 'chestX', N(result.chestX, -1));
    WorldDB.set(KEY + 'chestY', N(result.chestY, -1));
    WorldDB.set(KEY + 'tunnelX', N(result.tunnelX, -1));
    WorldDB.set(KEY + 'tunnelStartY', N(result.tunnelStartY, -1));
    WorldDB.set(KEY + 'tunnelEndY', N(result.tunnelEndY, -1));
    WorldDB.set(KEY + 'remixWorld', result.remixWorld === true);
    WorldDB.set(KEY + 'source', String(result.source || 'official-csch-delayed'));
    try { WorldDB.Instance.Save(); } catch (e) { Log(`metadata save deferred: ${e}`); }
}

export class SurfaceShrineGenerationSystem extends ModSystem {
    constructor() { super(); this.Delay = 7200; this.Attempts = 0; this.Done = false; }
    OnWorldLoad() { this.Delay = 7200; this.Attempts = 0; this.Done = false; }
    OnWorldUnload() { this.Delay = 7200; this.Attempts = 0; this.Done = false; }
    Update() {
        if (this.Done || !WorldDB.Instance || this.Delay-- > 0)
            return;
        if (WorldDB.get(KEY + 'generated') === true) { this.Done = true; return; }
        if (WorldDB.get(KEY + 'pending') !== true) { this.Done = true; return; }
        if (N(WorldDB.get(KEY + 'deferredVersion'), 0) !== 2) {
            WorldDB.set(KEY + 'pending', false);
            WorldDB.set(KEY + 'stalePendingSuppressed', true);
            try { WorldDB.Instance.Save(); } catch (e) { }
            this.Done = true;
            Log('suppressed stale legacy pending marker; no background recovery scan started.');
            return;
        }
        this.Attempts++;
        try {
            OfficialStructureMap.Reset();
            Reserve('calamity:structure:mechanicShed:', 30, 21);
            Reserve('calamity:structure:desertShrine:', 30, 27);
            Reserve('calamity:structure:graniteShrine:', 17, 18);
            const context = { maxX: N(Terraria.Main.maxTilesX, 4200), maxY: N(Terraria.Main.maxTilesY, 1200) };
            const result = SurfaceShrineRuntime.Generate(context, SunkenPlacement());
            if (result && result.generated === true) {
                SaveResult(result);
                this.Done = true;
                Log(`delayed placement complete; topLeft=${result.anchorX},${result.anchorY}, chest=${result.chestX},${result.chestY}, attempts=${result.attempts}.`);
                return;
            }
            Log(`delayed placement attempt ${this.Attempts} failed; reason=${result?.reason || 'unknown'}, searchAttempts=${result?.attempts || 0}.`);
        } catch (e) {
            Log(`delayed placement attempt ${this.Attempts} threw: ${e}`);
        }
        if (this.Attempts >= 4) {
            this.Done = true;
            Log('delayed placement stopped after four attempts; pending marker preserved for the next world load.');
        } else {
            this.Delay = 600;
        }
    }
}
