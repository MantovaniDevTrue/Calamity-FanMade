import { Terraria, Modules } from './../TL/ModImports.js';
import { ModBuff } from './../TL/ModBuff.js';
import { ModSystem } from './../TL/ModSystem.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './SulphurousSeaTerrainRuntime.js';
import { AbyssLayer1Runtime } from './AbyssLayer1Runtime.js';

const { Vector2 } = Modules;
const SolidOrSlopedTile = Terraria.WorldGen['bool SolidOrSlopedTile(int x, int y)'];
let AquaticSpawnDiagnosticLogged = false;
let CachedModeTick = -999999;
let CachedModeMultiplier = 1;
export function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
export function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
export function Clamp(v, a, b) { return Math.max(a, Math.min(b, N(v))); }

// Reuse one native Vector2 per NPC state instead of allocating a new managed/native
// bridge object every AI frame. On a busy Sulphurous Sea this removes well over a
// thousand Vector2.new calls per second on mobile.
export function SetNPCVelocity(npc, state, x, y) {
    const vx = N(x), vy = N(y);
    if (!npc) return;
    try {
        let v = state && state.velocityScratch;
        if (!v) {
            v = Vector2.new();
            if (state) state.velocityScratch = v;
        }
        v.X = vx; v.Y = vy;
        npc.velocity = v;
        return;
    } catch (_) { }
    try { npc.velocity = Vector2.new(vx, vy); } catch (_) { }
}

export function PlayerAt(index) {
    const i = I(index, -1);
    if (i < 0 || i >= 255) return null;
    try { return Terraria.Main.player.get_Item(i); } catch (_) { }
    try { return Terraria.Main.player[i]; } catch (_) { return null; }
}

export function TargetPlayer(npc, faceTarget = true) {
    if (!npc) return null;
    try {
        if (I(Terraria.Main.netMode, 0) === 0) {
            const p = Terraria.Main.LocalPlayer;
            if (p && p.active && !p.dead) {
                const my = I(Terraria.Main.myPlayer, 0);
                if (I(npc.target, -1) !== my) npc.target = my;
                return p;
            }
        }
        let i = I(npc.target, -1);
        if (i < 0 || i >= 255) { npc.TargetClosest(faceTarget); i = I(npc.target, -1); }
        let p = PlayerAt(i);
        if (!p || !p.active || p.dead) { npc.TargetClosest(faceTarget); p = PlayerAt(npc.target); }
        return p;
    } catch (_) { return null; }
}

export function PlayerCenter(player) {
    try { return { x: N(Terraria.PlayerCenterX(player)), y: N(Terraria.PlayerCenterY(player)) }; }
    catch (_) { return { x: N(player?.position?.X) + N(player?.width) * .5, y: N(player?.position?.Y) + N(player?.height) * .5 }; }
}

export function NPCCenter(npc) {
    return { x: N(npc?.position?.X) + N(npc?.width) * .5, y: N(npc?.position?.Y) + N(npc?.height) * .5 };
}

export function WaterAtSpawn(info) {
    if (info?.Water === true || info?.Player?.wet === true) return true;
    // TLPro's natural spawn hook reports the bottom of the vanilla NPC that
    // was just created. For aquatic spawns that point can be one or two tiles
    // below the actual water body, so accept a very small nearby-water probe.
    // Use Main.tile directly here: TileData wrapper allocation in every
    // SpawnChance was measurable when several Sulphur NPCs were registered.
    try {
        const x = I(info.SpawnTileX), y = I(info.SpawnTileY);
        for (let o = -4; o <= 2; o++) {
            const tile = Terraria.Main.tile.get_Item(x, y + o);
            if (!tile || N(tile.liquid) < 180) continue;
            try { if (tile['byte liquidType()']() !== 0) continue; } catch (_) { }
            return true;
        }
    } catch (_) { }
    return false;
}

function WaterTile(x, y) {
    try {
        if (x < 4 || y < 4 || x >= I(Terraria.Main.maxTilesX) - 4 || y >= I(Terraria.Main.maxTilesY) - 4) return false;
        const tile = Terraria.Main.tile.get_Item(x, y);
        if (!tile || N(tile.liquid) < 180) return false;
        try { if (tile['byte liquidType()']() !== 0) return false; } catch (_) { }
        try { if (SolidOrSlopedTile(x, y) === true) return false; } catch (_) { }
        return true;
    } catch (_) { return false; }
}

function WaterBoxFits(cx, cy, halfWidth = 1, halfHeight = 1) {
    for (let y = cy - halfHeight; y <= cy + halfHeight; y++) {
        for (let x = cx - halfWidth; x <= cx + halfWidth; x++) {
            if (!WaterTile(x, y)) return false;
        }
    }
    return true;
}

/**
 * TLPro replaces an already-created vanilla natural NPC with the selected
 * ModNPC. The inherited spawn coordinate is therefore usually the floor/ledge
 * that the vanilla spawn resolver picked, even when the selected Calamity NPC
 * is a swimmer. Resolve the same X column into the body of water before the
 * ModNPC is created. This is done once per spawn, never per frame.
 */
export function ResolveAquaticSpawn(spawnX, spawnY, widthPx = 32, heightPx = 24) {
    const baseX = I(N(spawnX) / 16), baseY = I(N(spawnY) / 16);
    const maxHalfW = Math.max(1, Math.min(3, Math.ceil(Math.max(16, N(widthPx, 32)) / 32)));
    const halfH = Math.max(1, Math.min(2, Math.ceil(Math.max(16, N(heightPx, 24)) / 32)));
    // Keep the vanilla horizontal spawn distance from the player. Small X
    // offsets only help when the exact column intersects an island/ledge.
    const offsets = [0, -3, 3, -6, 6, -10, 10];
    const rotate = Math.floor(Math.random() * offsets.length);
    for (let k = 0; k < offsets.length; k++) {
        const x = baseX + offsets[(k + rotate) % offsets.length];
        let bottom = -1;
        // The vanilla hook gives us npc.Bottom; find the first water cell above
        // that anchor, then determine the contiguous water column.
        for (let up = 1; up <= 48; up++) {
            const y = baseY - up;
            if (WaterTile(x, y)) { bottom = y; break; }
        }
        if (bottom < 0) continue;
        let top = bottom;
        for (let up = 1; up <= 160; up++) {
            const y = bottom - up;
            if (!WaterTile(x, y)) break;
            top = y;
        }
        const depth = bottom - top + 1;
        if (depth < halfH * 2 + 3) continue;
        // Prefer the middle 50% of the water column so fish don't materialize
        // glued to the floor or just beneath the surface.
        const minY = top + halfH + Math.max(1, Math.floor(depth * .22));
        const maxY = bottom - halfH - Math.max(1, Math.floor(depth * .16));
        if (maxY < minY) continue;
        const centerY = minY + Math.floor(Math.random() * (maxY - minY + 1));
        // Large sprites don't need their full visual width to be liquid; a
        // 3-7 tile collision-safe core is enough and avoids rejecting open sea
        // beside decorative terrain.
        for (let hw = maxHalfW; hw >= 1; hw--) {
            if (!WaterBoxFits(x, centerY, hw, halfH)) continue;
            const wx = x * 16 + 8;
            const wy = centerY * 16 + 8;
            if (!AquaticSpawnDiagnosticLogged) {
                AquaticSpawnDiagnosticLogged = true;
                try { tl.log(`[CalamityPort SulphAquaticSpawn] full-water-column corrected; native=${baseX},${baseY}, water=${x},${centerY}, top=${top}, bottom=${bottom}, depth=${depth}, dy=${centerY - baseY}.`); } catch (_) { }
            }
            return { x: wx, y: wy, moved: true };
        }
    }
    return { x: N(spawnX), y: N(spawnY), moved: false };
}

export function SpawnAquaticNPC(type, spawnX, spawnY, widthPx = 32, heightPx = 24) {
    const p = ResolveAquaticSpawn(spawnX, spawnY, widthPx, heightPx);
    return Terraria.NPC.NewNPC(
        Terraria.NPC.GetSpawnSourceForNaturalSpawn(),
        Math.floor(p.x), Math.floor(p.y), I(type),
        0, 0, 0, 0, 0, 255
    );
}

export function InSulphurSpawn(info, padding = 8) {
    // Calamity's natural Sulphurous Sea enemies key off the PLAYER biome,
    // not whether the exact vanilla candidate tile lies inside our saved
    // terrain rectangle.  Terraria may choose an aquatic candidate several
    // dozen tiles away from the player, so the old ContainsTile gate could
    // make every modded SpawnChance return 0 while the player was visibly in
    // the Sulphurous Sea.
    if (!info || !info.Player || !info.CommonEnemy) return false;
    try {
        if (!SulphurousSeaPreviewRuntime.IsCoastalArea()) return false;
        return SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player);
    } catch (_) { return false; }
}

export function InAbyssLayer1Spawn(info, padding = 8) {
    // Same tModLoader semantics as the official NPC SpawnChance methods:
    // player zone + water (checked by the NPC), without a second spawn-tile
    // bounds test.
    if (!info || !info.Player || !info.CommonEnemy) return false;
    try { return AbyssLayer1Runtime.ContainsPlayer(info.Player); }
    catch (_) { return false; }
}

export function CountNPC(type) {
    const wanted = I(type, 0);
    if (wanted <= 0) return 0;
    // Native counter avoids a 200-slot JS -> IL2CPP scan for every SpawnChance.
    try { return Math.max(0, I(Terraria.NPC.CountNPCS(wanted), 0)); } catch (_) { }
    let count = 0;
    for (let i = 0; i < 200; i++) {
        let npc = null;
        try { npc = Terraria.Main.npc.get_Item(i); } catch (_) { }
        if (npc && npc.active && I(npc.type) === wanted) count++;
    }
    return count;
}

export function ModeMultiplier() {
    let now = 0;
    try { now = I(Terraria.Main.GameUpdateCount, 0); } catch (_) { }
    if (now >= CachedModeTick && now - CachedModeTick < 30)
        return CachedModeMultiplier;
    CachedModeTick = now;
    CachedModeMultiplier = 1;
    try {
        const world = ModSystem.getByName('CalamityWorldState');
        if (world && world.DeathMode === true) CachedModeMultiplier = 2;
        else if (world && world.RevengeanceMode === true) CachedModeMultiplier = 1.5;
    } catch (_) { }
    return CachedModeMultiplier;
}

export function ApplyIrradiated(player, ticks = 180) {
    if (!player) return;
    const buff = I(ModBuff.getTypeByName('Irradiated'), 0);
    if (buff <= 0) return;
    try { player.AddBuff(buff, I(ticks, 180), true); }
    catch (_) { try { player.AddBuff(buff, I(ticks, 180), false); } catch (_) { } }
}
