import { Terraria, Modules } from './../TL/ModImports.js';
import { ModNPC } from './../TL/ModNPC.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ModSystem } from './../TL/ModSystem.js';
import { CalamityNPCState } from './CalamityNPCState.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const CanHit = Terraria.Collision['bool CanHit(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'];
let cachedWorld = null;
let cachedTypes = null;
let activeCore = -1;
const projectileCache = Object.create(null);
let familyCacheTick = -1;
let familyCacheCrim = [];
let familyCacheEbon = [];
export function GetSlimeWorld() {
    if (!cachedWorld)
        cachedWorld = ModSystem.getByName('CalamityWorldState');
    return cachedWorld;
}

export function IsExpert() {
    return Terraria.Main.expertMode === true || Terraria.Main.masterMode === true;
}

export function IsRevengeance() {
    const w = GetSlimeWorld();
    return !!(w && (w.RevengeanceMode === true || w.DeathMode === true));
}

export function IsDeath() {
    const w = GetSlimeWorld();
    return !!(w && w.DeathMode === true);
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

export function Normalize(x, y, fx = 0, fy = 1) {
    const len = Math.sqrt(Number(x) * Number(x) + Number(y) * Number(y));
    return len > 0.0001 ? { x: Number(x) / len, y: Number(y) / len, length: len } : { x: fx, y: fy, length: 0 };
}

export function Distance(a, b) {
    const dx = Number(a.X) - Number(b.X), dy = Number(a.Y) - Number(b.Y);
    return Math.sqrt(dx * dx + dy * dy);
}

export function RandInt(min, maxExclusive) {
    const a = Math.floor(Number(min)), b = Math.max(a + 1, Math.floor(Number(maxExclusive)));
    return a + Math.floor(Math.random() * (b - a));
}

export function Chance(d) {
    return Math.random() < 1 / Math.max(1, Number(d));
}

export function GetSlimeTypes() {
    if (!cachedTypes)
        cachedTypes = {
            core: Number(ModNPC.getTypeByName('SlimeGodCore') || -1),
            crim: Number(ModNPC.getTypeByName('CrimulanPaladin') || -1),
            ebon: Number(ModNPC.getTypeByName('EbonianPaladin') || -1),
            splitCrim: Number(ModNPC.getTypeByName('SplitCrimulanPaladin') || -1),
            splitEbon: Number(ModNPC.getTypeByName('SplitEbonianPaladin') || -1),
            crimsonSpawn: Number(ModNPC.getTypeByName('CrimsonSlimeSpawn') || -1),
            crimsonSpawn2: Number(ModNPC.getTypeByName('CrimsonSlimeSpawn2') || -1),
            corruptSpawn: Number(ModNPC.getTypeByName('CorruptSlimeSpawn') || -1),
            corruptSpawn2: Number(ModNPC.getTypeByName('CorruptSlimeSpawn2') || -1)
        };
    return cachedTypes;
}

export function GetProjectileType(name) {
    const key = String(name), cached = Number(projectileCache[key] || 0);
    if (cached > 0)
        return cached;
    const type = Number(ModProjectile.getTypeByName(key) || -1);
    if (type > 0)
        projectileCache[key] = type;
    return type;
}

export function SetActiveCore(npc) {
    if (npc && npc.active)
        activeCore = Number(npc.whoAmI);
}

export function ClearActiveCore(npc = null) {
    if (!npc || Number(npc.whoAmI) === activeCore)
        activeCore = -1;
}

export function FindCore() {
    const type = GetSlimeTypes().core;
    if (!(type > 0))
        return null;
    if (activeCore >= 0 && activeCore < 200) {
        const n = Terraria.Main.npc[activeCore];
        if (n && n.active && Number(n.type) === type)
            return n;
    }

    for (let i = 0; i < 200; i++) {
        const n = Terraria.Main.npc[i];
        if (n && n.active && Number(n.type) === type) {
            activeCore = i;
            return n;
        }
    }
    activeCore = -1;
    return null;
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
    if (Number(npc.target) < 0 || Number(npc.target) >= 255)
        npc.TargetClosest(true);
    let p = Terraria.Main.player[npc.target];
    if (!p || p.active !== true || p.dead === true) {
        npc.TargetClosest(true);
        p = Terraria.Main.player[npc.target];
    }
    return p && p.active === true && p.dead !== true ? p : null;
}

export function SpawnNPC(type, x, y, seed = null) {
    if (!(Number(type) > 0) || Terraria.Main.netMode === 1)
        return -1;
    try {
        const index = Terraria.NPC.NewNPC(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Math.floor(Number(x)), Math.floor(Number(y)), Math.floor(Number(type)), 0, 0, 0, 0, 0, 255);
        if (index >= 0 && index < 200) {
            const n = Terraria.Main.npc[index], s = CalamityNPCState.Reset(n);
            if (seed && typeof seed === 'object')
                Object.assign(s, seed);
            n.netUpdate = true;
        }
        return index;
    } catch (e) {
        return -1;
    }
}

export function SpawnProjectile(type, position, velocity, damage, ai0 = 0, ai1 = 0, ai2 = 0) {
    if (!(Number(type) > 0) || Terraria.Main.netMode === 1)
        return -1;
    try {
        return NewProjectile(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Vector2.new(Number(position.X), Number(position.Y)), Vector2.new(Number(velocity.X), Number(velocity.Y)), Math.floor(Number(type)), Math.max(0, Math.floor(Number(damage))), 0, Terraria.Main.myPlayer, Number(ai0), Number(ai1), Number(ai2), null);
    } catch (e) {
        return -1;
    }
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
        const n = Terraria.Main.npc[i];
        if (n && n.active && Number(n.type) === wanted)
            count++;
    }
    return count;
}

function RefreshFamilyCache() {
    const tick = Number(Terraria.Main.GameUpdateCount || 0);
    if (familyCacheTick === tick)
        return;
    const t = GetSlimeTypes(), crim = [], ebon = [];
    for (let i = 0; i < 200; i++) {
        const n = Terraria.Main.npc[i];
        if (!n || !n.active)
            continue;
        const type = Number(n.type);
        if (type === t.crim || type === t.splitCrim)
            crim.push(n);
        else if (type === t.ebon || type === t.splitEbon)
            ebon.push(n);
    }
    familyCacheCrim = crim;
    familyCacheEbon = ebon;
    familyCacheTick = tick;
}

export function FamilyMembers(family) {
    RefreshFamilyCache();
    return family === 'crim' ? familyCacheCrim : familyCacheEbon;
}

export function FamilyAlive(family) {
    return FamilyMembers(family).length > 0;
}

export function FamilyLife(family) {
    let total = 0;
    for (const n of FamilyMembers(family))
        total += Math.max(0, Number(n.life));
    return total;
}

export function FamilyLifeMax(family) {
    let total = 0;
    for (const n of FamilyMembers(family))
        total += Math.max(1, Number(n.lifeMax));
    return total;
}

export function AllFamilyMembers() {
    RefreshFamilyCache();
    return familyCacheCrim.concat(familyCacheEbon);
}

export function SlimeFlyDestination(core, player) {
    const members = AllFamilyMembers();
    if (!members.length)
        return Terraria.PlayerCenter(player);
    let sumX = 0, sumY = 0;
    let nearest = members[0], nearestDistance = Number.POSITIVE_INFINITY;
    for (const n of members) {
        const x = Number(n.Center.X), y = Number(n.Center.Y);
        sumX += x;
        sumY += y;
        const dx = x - Number(core.Center.X), dy = y - Number(core.Center.Y);
        const d = dx * dx + dy * dy;
        if (d < nearestDistance) {
            nearestDistance = d;
            nearest = n;
        }
    }
    const avgX = sumX / members.length, avgY = sumY / members.length;
    let spread = 0;
    for (const n of members) {
        const dx = Number(n.Center.X) - avgX, dy = Number(n.Center.Y) - avgY;
        spread += Math.sqrt(dx * dx + dy * dy);
    }
    spread /= members.length;
    if (spread > 750)
        return Vector2.new(Number(nearest.Center.X), Number(nearest.Center.Y));
    return Vector2.new(avgX, avgY);
}

export function MarkSingleHostPossessed(host, ticks) {
    if (!host || !host.active)
        return false;
    const state = CalamityNPCState.Get(host);
    state.possessedTicks = Math.max(Number(state.possessedTicks || 0), Number(ticks || 0));
    state.possessionHost = true;
    return true;
}

export function ClearSingleHostPossessed(host) {
    if (!host)
        return;
    const state = CalamityNPCState.Get(host);
    state.possessedTicks = 0;
    state.possessionHost = false;
}

export function NearestFamilyMember(family, point) {
    let best = null, bestDist = Number.POSITIVE_INFINITY;
    for (const n of FamilyMembers(family)) {
        const d = Distance(n.Center, point);
        if (d < bestDist) {
            bestDist = d;
            best = n;
        }
    }
    return best;
}

export function MarkFamilyPossessed(family, ticks) {
    for (const n of FamilyMembers(family)) {
        const s = CalamityNPCState.Get(n);
        s.possessedTicks = Math.max(Number(s.possessedTicks || 0), Number(ticks));
    }
}

export function CanSee(npc, player) {
    try {
        return !!CanHit(npc.position, npc.width, npc.height, Terraria.PlayerTopLeft(player), Terraria.PlayerWidth(player), Terraria.PlayerHeight(player));
    } catch (e) {
        return true;
    }
}

export function MoveToward(npc, x, y, speed, inertia = 25) {
    const n = Normalize(Number(x) - Number(npc.Center.X), Number(y) - Number(npc.Center.Y), 0, 1);
    const vx = (Number(npc.velocity.X) * Number(inertia) + n.x * Number(speed)) / (Number(inertia) + 1);
    const vy = (Number(npc.velocity.Y) * Number(inertia) + n.y * Number(speed)) / (Number(inertia) + 1);
    npc.velocity = Vector2.new(vx, vy);
}

export function PlayItemSlot(slot, position, fallback = null, volume = 1, pitch = 0) {
    // Phase 12.73.6: redirected Item_* slots are already the desired audio asset.
    // Play by numeric type/style to avoid LegacySoundStyle reflection/coercion in TLPro.
    try {
        const style = Math.max(0, Math.floor(Number(slot) || 0));
        if (style > 0 && position) {
            Terraria.Audio.SoundEngine['SoundEffectInstance PlaySound(int type, int x, int y, int Style, float volumeScale, float pitchOffset)'](
                2,
                Math.floor(Number(position.X) || 0),
                Math.floor(Number(position.Y) || 0),
                style,
                Number(volume),
                Number(pitch)
            );
            return true;
        }
    } catch (e) { }
    return false;
}

export function DeactivateNoLoot(npc) {
    if (!npc)
        return;
    try {
        npc.active = false;
        npc.timeLeft = 0;
        npc.netUpdate = true;
    } catch (e) { }
    CalamityNPCState.Remove(npc);
}

export function HasLivingPlayer() {
    if (Number(Terraria.Main.netMode) === 0) {
        const local = Terraria.Main.player[Number(Terraria.Main.myPlayer)];
        try {
            return !!(local && local.active === true && local.dead !== true && Number(local.statLife) > 0);
        } catch (e) {
            return false;
        }
    }

    for (let i = 0; i < 255; i++) {
        const player = Terraria.Main.player[i];
        if (!player)
            continue;
        try {
            if (player.active === true && player.dead !== true && Number(player.statLife) > 0)
                return true;
        } catch (e) { }
    }
    return false;
}

export function CleanupSlimeGodEncounter() {
    const t = GetSlimeTypes();
    const npcTypes = [
        t.core, t.crim, t.ebon, t.splitCrim, t.splitEbon,
        t.crimsonSpawn, t.crimsonSpawn2, t.corruptSpawn, t.corruptSpawn2
    ];
    let removed = 0;
    for (let i = 0; i < 200; i++) {
        const npc = Terraria.Main.npc[i];
        if (!npc || npc.active !== true || npcTypes.indexOf(Number(npc.type)) < 0)
            continue;
        DeactivateNoLoot(npc);
        removed++;
    }
    const projectileTypes = [
        GetProjectileType('UnstableCrimulanGlob'),
        GetProjectileType('UnstableEbonianGlob'),
        GetProjectileType('CrimsonSpike')
    ];
    for (let i = 0; i < 1000; i++) {
        const projectile = Terraria.Main.projectile[i];
        if (!projectile || projectile.active !== true || projectileTypes.indexOf(Number(projectile.type)) < 0)
            continue;
        try {
            projectile.active = false;
            projectile.timeLeft = 0;
            projectile.netUpdate = true;
        } catch (e) { }
    }
    ClearActiveCore();
    familyCacheTick = -1;
    familyCacheCrim = [];
    familyCacheEbon = [];
    return removed;
}

export function CleanupSlimeGodIfNoLivingPlayers() {
    if (HasLivingPlayer())
        return false;
    return CleanupSlimeGodEncounter() > 0;
}
