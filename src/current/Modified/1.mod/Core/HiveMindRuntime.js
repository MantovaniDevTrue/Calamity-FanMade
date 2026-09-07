import { Terraria, Modules } from './../TL/ModImports.js';
import { ModNPC } from './../TL/ModNPC.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ModBuff } from './../TL/ModBuff.js';
import { ModSystem } from './../TL/ModSystem.js';
import { CalamityNPCState } from './CalamityNPCState.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './FrozenCubeTargetRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
const CanHit = Terraria.Collision['bool CanHit(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'];
let CachedWorld = null;
let CachedHiveType = -1;
let ActiveHiveIndex = -1;
const CachedNPCTypeMap = new Map();
const CachedProjectileTypeMap = new Map();
export function GetHiveWorld() {
    if (!CachedWorld)
        CachedWorld = ModSystem.getByName('CalamityWorldState');
    return CachedWorld;
}

export function IsRevengeance() {
    const world = GetHiveWorld();
    return !!(world && (world.RevengeanceMode === true || world.DeathMode === true));
}

export function IsDeath() {
    const world = GetHiveWorld();
    return !!(world && world.DeathMode === true);
}

export function IsExpert() {
    return Terraria.Main.expertMode === true || Terraria.Main.masterMode === true;
}

export function IsGoodWorld() {
    try {
        return Terraria.Main.getGoodWorld === true;
    } catch (e) {
        return false;
    }
}

export function IsZenithWorld() {
    try {
        return Terraria.Main.zenithWorld === true;
    } catch (e) {
        return false;
    }
}

export function Normalize(x, y, fallbackX = 0, fallbackY = 1) {
    const length = Math.sqrt(x * x + y * y);
    if (!(length > 0.0001))
        return { x: fallbackX, y: fallbackY, length: 0 };
    return { x: x / length, y: y / length, length };
}

export function Distance(a, b) {
    const dx = Number(a.X) - Number(b.X);
    const dy = Number(a.Y) - Number(b.Y);
    return Math.sqrt(dx * dx + dy * dy);
}

export function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

export function RandInt(min, maxExclusive) {
    const lo = Math.floor(Number(min));
    const hi = Math.max(lo + 1, Math.floor(Number(maxExclusive)));
    return lo + Math.floor(Math.random() * (hi - lo));
}

export function Chance(denominator) {
    return Math.random() < 1 / Math.max(1, Number(denominator));
}

export function GetHiveMindType() {
    if (!(CachedHiveType > 0))
        CachedHiveType = Number(ModNPC.getTypeByName('HiveMind') || -1);
    return CachedHiveType;
}

export function SetActiveHiveMind(npc) {
    if (npc && npc.active)
        ActiveHiveIndex = Number(npc.whoAmI);
}

export function ClearActiveHiveMind(npc = null) {
    if (!npc || Number(npc.whoAmI) === ActiveHiveIndex)
        ActiveHiveIndex = -1;
}

export function FindHiveMind() {
    const type = GetHiveMindType();
    if (!(type > 0))
        return null;
    if (ActiveHiveIndex >= 0 && ActiveHiveIndex < 200) {
        const cached = Terraria.Main.npc[ActiveHiveIndex];
        if (cached && cached.active && cached.type === type)
            return cached;
    }

    ScanFrozenCubeNPCs(4);
    for (const i of FrozenCubeTrackedIndices()) {
        const npc = FrozenCubeNPC(i);
        if (npc && npc.active && Number(npc.type) === type) {
            ActiveHiveIndex = Number(i);
            return npc;
        }
    }
    ActiveHiveIndex = -1;
    return null;
}

export function AnyAlivePlayer() {
    try {
        if (Number(Terraria.Main.netMode) === 0) {
            const player = Terraria.Main.LocalPlayer;
            return !!(player && player.active && !player.dead);
        }
    } catch (e) { }
    for (let i = 0; i < 255; i++) {
        const player = Terraria.Main.player[i];
        if (player && player.active && !player.dead)
            return true;
    }
    return false;
}

export function TargetPlayer(npc) {
    if (!npc) return null;
    try {
        if (Number(Terraria.Main.netMode) === 0) {
            const player = Terraria.Main.LocalPlayer;
            if (player && player.active && !player.dead) {
                const my = Math.floor(Number(Terraria.Main.myPlayer));
                if (Number(npc.target) !== my) npc.target = my;
                return player;
            }
        }
    } catch (e) { }
    if (npc.target < 0 || npc.target >= 255)
        npc.TargetClosest(true);
    let player = Terraria.Main.player[npc.target];
    if (!player || !player.active || player.dead) {
        npc.TargetClosest(true);
        player = Terraria.Main.player[npc.target];
    }
    return player && player.active && !player.dead ? player : null;
}

function ZoneFlag(value) {
    try {
        if (value === true || value === 1) return true;
        if (value === false || value === 0 || value == null) return false;
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric !== 0;
        const text = String(value).trim().toLowerCase();
        if (text === 'true' || text === '1') return true;
        if (text === 'false' || text === '0' || text === '') return false;
        return !!value;
    } catch (e) { return false; }
}

export function IsCorruptionPlayer(player) {
    if (!player) return false;
    try { return ZoneFlag(player.ZoneCorrupt); }
    catch (e) { return false; }
}

export function CountNPC(type) {
    const wanted = Math.floor(Number(type));
    if (!(wanted > 0))
        return 0;
    try {
        return Math.max(0, Math.floor(Number(Terraria.NPC.CountNPCS(wanted))));
    } catch (e) { }
    let count = 0;
    for (let i = 0; i < 200; i++) {
        const npc = Terraria.Main.npc[i];
        if (npc && npc.active && Number(npc.type) === wanted)
            count++;
    }
    return count;
}

export function AnyNPC(type) {
    const wanted = Math.floor(Number(type));
    if (!(wanted > 0))
        return false;
    try {
        return Terraria.NPC.AnyNPCs(wanted) === true;
    } catch (e) {
        return CountNPC(wanted) > 0;
    }
}

export function SpawnNPC(type, x, y, ownerBoss = -1, seed = null) {
    if (!(type > 0) || Terraria.Main.netMode === 1)
        return -1;
    let index = -1;
    try {
        index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Number(x)), Math.floor(Number(y)), Math.floor(Number(type)), 0, 0, 0, 0, 0, 255);
    } catch (e) {
        return -1;
    }

    if (index >= 0 && index < 200) {
        const npc = Terraria.Main.npc[index];
        const state = CalamityNPCState.Reset(npc);
        state.ownerBoss = Number(ownerBoss);
        if (seed && typeof seed === 'object')
            Object.assign(state, seed);
        // TLPro does not always assign a usable target to NPCs spawned through the
        // reflected NewNPC overload. Vanilla Hive Mind adds (Eater/Devourer) and the
        // JS Dank Creeper can otherwise remain motionless until something retargets them.
        try { npc.TargetClosest(true); } catch (e) { }
        npc.netUpdate = true;
    }
    return index;
}

export function SpawnProjectile(type, position, velocity, damage, ai0 = 0, ai1 = 0, ai2 = 0) {
    if (!(type > 0) || Terraria.Main.netMode === 1)
        return -1;
    try {
        return NewProjectile(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Vector2.new(Number(position.X), Number(position.Y)), Vector2.new(Number(velocity.X), Number(velocity.Y)), Math.floor(Number(type)), Math.max(0, Math.floor(Number(damage))), 0, Terraria.Main.myPlayer, Number(ai0), Number(ai1), Number(ai2), null);
    } catch (e) {
        return -1;
    }
}

export function CanSee(npc, player) {
    try {
        return !!CanHit(npc.position, npc.width, npc.height, Terraria.PlayerTopLeft(player), Terraria.PlayerWidth(player), Terraria.PlayerHeight(player));
    } catch (e) {
        return true;
    }
}

export function IsSolidAt(x, y, width = 16, height = 16) {
    try {
        return !!SolidCollision(Vector2.new(Number(x), Number(y)), Math.max(1, width), Math.max(1, height));
    } catch (e) {
        return false;
    }
}

export function FindGroundBelow(player, npcHeight, maxPixels = 2400) {
    const x = Number(Terraria.PlayerCenterX(player));
    const start = Number(Terraria.PlayerPositionY(player)) - Number(npcHeight);
    // Coarse search reduces native SolidCollision bridge calls on mobile.
    for (let offset = 0; offset <= maxPixels; offset += 32) {
        const y = start + offset;
        if (!IsSolidAt(x - 8, y + npcHeight, 16, 16))
            continue;
        const refinedY = y - 16;
        if (offset >= 16 && IsSolidAt(x - 8, refinedY + npcHeight, 16, 16))
            return refinedY;
        return y;
    }
    return Number(Terraria.PlayerPositionY(player)) + 320;
}

export function PlaySound(id, position, style = 1, pitch = 0) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](id, position, style, pitch);
    } catch (e) { }
}

export function ApplyBrainRot(player, duration) {
    if (!player || Number(duration) <= 0)
        return;
    const type = Number(ModBuff.getTypeByName('BrainRot') || 0);
    if (!(type > 0))
        return;
    try {
        player.AddBuff(type, Math.floor(Number(duration)), false);
    } catch (e) {
        try {
            player.AddBuff(type, Math.floor(Number(duration)));
        } catch (ignored) { }
    }
}

export function DeactivateNoLoot(npc) {
    if (!npc)
        return;
    try {
        npc.active = false;
        npc.timeLeft = 0;
        npc.netUpdate = true;
    } catch (e) { }
    try {
        CalamityNPCState.Remove(npc);
    } catch (e) { }
}

export function GetHiveState(npc) {
    const state = CalamityNPCState.Get(npc);
    if (state.hiveInitialized !== true) {
        const expert = IsExpert();
        const revenge = IsRevengeance();
        const death = IsDeath();
        state.hiveInitialized = true;
        state.phaseTwo = false;
        state.phaseTransition = false;
        state.burrowTimer = 120;
        state.minimumDriftTime = death ? 60 : (revenge ? 90 : (expert ? 120 : 300));
        state.teleportRadius = 300;
        state.decelerationTime = 30;
        state.reelbackFade = death ? 6 : (revenge ? 5 : (expert ? 4 : 2));
        state.arcTime = 45;
        state.driftSpeed = death ? 3.5 : (revenge ? 2 : 1);
        state.driftBoost = death ? 1.5 : (revenge ? 2 : 1);
        state.lungeDelay = 90;
        state.lungeTime = death ? 23 : (revenge ? 28 : 33);
        state.lungeFade = 15;
        state.lungeAmount = death ? 3 : 1;
        state.rainDashAmount = death ? 2 : 1;
        state.lungeRots = death ? 0.4 : (revenge ? 0.3 : 0.2);
        if (IsGoodWorld()) {
            state.reelbackFade *= 10;
            state.arcTime *= 0.5;
        }
        state.rotationIncrement = 0.0246399424 * state.lungeRots * state.lungeFade;
        state.phase2Timer = state.minimumDriftTime;
        state.hiveState = 0;
        state.nextState = 0;
        state.previousState = 0;
        state.reelCount = 0;
        state.dashStarted = false;
        state.rotationDirection = 1;
        state.orbitRotation = 0;
        state.decelX = 0;
        state.decelY = 0;
        state.lungesPerformed = 0;
        state.performingLungeCombo = false;
        state.rainDashesPerformed = 0;
        state.performingRainDashCombo = false;
        state.arcSegments = 0;
        state.rainClouds = 0;
        state.rainCloudTimer = 0;
        state.healthGate = Number(npc.lifeMax);
        state.darkHeartGate = Number(npc.lifeMax) * 0.6;
        state.initialBlobsSpawned = false;
        state.despawnTicks = 0;
        state.teleportX = 0;
        state.teleportY = 0;
        state.frameX = 0;
        state.frameY = 0;
    }
    return state;
}

export function GetProjectileType(name) {
    const key = String(name);
    if (CachedProjectileTypeMap.has(key))
        return CachedProjectileTypeMap.get(key);
    const type = Number(ModProjectile.getTypeByName(key) || -1);
    CachedProjectileTypeMap.set(key, type);
    return type;
}

export function GetNPCType(name) {
    const key = String(name);
    if (CachedNPCTypeMap.has(key))
        return CachedNPCTypeMap.get(key);
    const type = Number(ModNPC.getTypeByName(key) || -1);
    CachedNPCTypeMap.set(key, type);
    return type;
}
