import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { PostLoadWorkCoordinator } from './../../Core/PostLoadWorkCoordinator.js';
import { PlanetoidRuntime } from './../../Core/PlanetoidRuntime.js';

const KEY = 'calamity:structure:planetoids:';
const TILE_BUDGET = 16;
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Log(s) { try { tl.log(`[CalamityPort PlanetoidsDeferred] ${s}`); } catch (e) {} }
function Save(result) {
    const planets = Array.isArray(result?.planets) ? result.planets : [];
    WorldDB.set(KEY + 'generated', result?.generated === true);
    WorldDB.set(KEY + 'count', planets.length);
    WorldDB.set(KEY + 'mainX', I(result?.mainX, -1));
    WorldDB.set(KEY + 'mainY', I(result?.mainY, -1));
    WorldDB.set(KEY + 'mainRadius', I(result?.mainRadius, 54));
    WorldDB.set(KEY + 'mainLabReserved', result?.mainLabReserved === true);
    WorldDB.set(KEY + 'mainCount', I(result?.counts?.main, 0));
    WorldDB.set(KEY + 'heartCount', I(result?.counts?.heart, 0));
    WorldDB.set(KEY + 'grassCount', I(result?.counts?.grass, 0));
    WorldDB.set(KEY + 'mudCount', I(result?.counts?.mud, 0));
    WorldDB.set(KEY + 'source', String(result?.source || 'post-load-incremental-v1'));
    for (let i = 0; i < planets.length; i++) {
        const p = planets[i], q = KEY + `planet:${i}:`;
        WorldDB.set(q + 'kind', String(p.kind || 'unknown'));
        WorldDB.set(q + 'x', I(p.x, 0));
        WorldDB.set(q + 'y', I(p.y, 0));
        WorldDB.set(q + 'radius', Math.max(1, I(p.radius, 1)));
        WorldDB.set(q + 'variant', String(p.variant || ''));
        WorldDB.set(q + 'lifeCrystal', p.lifeCrystal === true);
        if (p.chest) {
            WorldDB.set(q + 'chestX', I(p.chest.x, -1));
            WorldDB.set(q + 'chestY', I(p.chest.y, -1));
            WorldDB.set(q + 'chestIndex', I(p.chest.index, -1));
        }
    }
    try { WorldDB.Instance?.Save(); } catch (e) { Log(`metadata save deferred: ${e}`); }
}

export class PlanetoidGenerationSystem extends ModSystem {
    constructor() { super(); this.Reset(); }
    Reset() { this.Done = false; this.Logged = false; }
    OnWorldLoad() { this.Reset(); }
    OnWorldUnload() { this.Reset(); }
    Update() {
        if (this.Done || !WorldDB.Instance || Terraria.Main.gameMenu === true) return;
        if (WorldDB.get(KEY + 'generated') === true) { this.Done = true; return; }
        if (!this.Logged) { Log('live-world generation suppressed for TLPro safety; Planetoids are fresh-world worldgen only.'); this.Logged = true; }
        this.Done = true;
    }
}
