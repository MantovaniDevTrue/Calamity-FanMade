import { Terraria, Modules } from './../TL/ModImports.js';
import { ModNPC } from './../TL/ModNPC.js';
import { ModProjectile } from './../TL/ModProjectile.js';
import { ModBuff } from './../TL/ModBuff.js';
import { ModSystem } from './../TL/ModSystem.js';
import { CalamityNPCState } from './CalamityNPCState.js';
import { UseDesertScourgeTraversal } from './DesertScourgeTraversalRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const CanHit = Terraria.Collision['bool CanHit(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'];
let cachedWorld = null;
let cachedTypes = null;
let activeHive = -1;
let hiveCacheTick = -1;
let hiveCacheValue = null;
const npcCountCache = new Map();
const projectileTypeCache = Object.create(null);
let burningBloodType = 0;
export function GetPerfWorld() {
    if (!cachedWorld)
        cachedWorld = ModSystem.getByName('CalamityWorldState');
    return cachedWorld;
}

export function IsExpert() {
    return Terraria.Main.expertMode === true || Terraria.Main.masterMode === true;
}

export function IsRevengeance() {
    const w = GetPerfWorld();
    return !!(w && (w.RevengeanceMode === true || w.DeathMode === true));
}

export function IsDeath() {
    const w = GetPerfWorld();
    return !!(w && w.DeathMode === true);
}

export function IsGoodWorld() {
    try {
        return Terraria.Main.getGoodWorld === true;
    } catch (e) {
        return false;
    }
}

export function IsCrimsonPlayer(player) {
    return !!(player && player.ZoneCrimson === true);
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

export function Chance(denominator) {
    return Math.random() < 1 / Math.max(1, Number(denominator));
}

export function GetPerfTypes() {
    if (!cachedTypes)
        cachedTypes = {
            hive: Number(ModNPC.getTypeByName('PerforatorHive') || -1),
            cyst: Number(ModNPC.getTypeByName('PerforatorCyst') || -1),
            smallHead: Number(ModNPC.getTypeByName('PerforatorHeadSmall') || -1),
            smallBody: Number(ModNPC.getTypeByName('PerforatorBodySmall') || -1),
            smallTail: Number(ModNPC.getTypeByName('PerforatorTailSmall') || -1),
            mediumHead: Number(ModNPC.getTypeByName('PerforatorHeadMedium') || -1),
            mediumBody: Number(ModNPC.getTypeByName('PerforatorBodyMedium') || -1),
            mediumTail: Number(ModNPC.getTypeByName('PerforatorTailMedium') || -1),
            largeHead: Number(ModNPC.getTypeByName('PerforatorHeadLarge') || -1),
            largeBody: Number(ModNPC.getTypeByName('PerforatorBodyLarge') || -1),
            largeTail: Number(ModNPC.getTypeByName('PerforatorTailLarge') || -1)
        };
    return cachedTypes;
}

export function GetProjectileType(name) {
    const key = String(name);
    const cached = Number(projectileTypeCache[key] || 0);
    if (cached > 0)
        return cached;
    const resolved = Number(ModProjectile.getTypeByName(key) || -1);
    if (resolved > 0)
        projectileTypeCache[key] = resolved;
    return resolved;
}

export function SetActiveHive(npc) {
    if (npc && npc.active) {
        activeHive = Number(npc.whoAmI);
        hiveCacheTick = -1;
        hiveCacheValue = npc;
    }
}

export function ClearActiveHive(npc = null) {
    if (!npc || Number(npc.whoAmI) === activeHive) {
        activeHive = -1;
        hiveCacheTick = -1;
        hiveCacheValue = null;
    }
}

export function FindHive() {
    const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
    if (hiveCacheTick === tick)
        return hiveCacheValue;
    const type = GetPerfTypes().hive;
    if (!(type > 0)) {
        hiveCacheTick = tick;
        hiveCacheValue = null;
        return null;
    }
    if (activeHive >= 0 && activeHive < 200) {
        const n = Terraria.Main.npc[activeHive];
        if (n && n.active && Number(n.type) === type) {
            hiveCacheTick = tick;
            hiveCacheValue = n;
            return n;
        }
    }
    for (let i = 0; i < 200; i++) {
        const n = Terraria.Main.npc[i];
        if (n && n.active && Number(n.type) === type) {
            activeHive = i;
            hiveCacheTick = tick;
            hiveCacheValue = n;
            return n;
        }
    }
    activeHive = -1;
    hiveCacheTick = tick;
    hiveCacheValue = null;
    return null;
}

export function CountNPC(type) {
    const wanted = Math.floor(Number(type));
    if (!(wanted > 0))
        return 0;
    const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
    const cached = npcCountCache.get(wanted);
    if (cached && tick - cached.tick < 10)
        return cached.value;
    let count = 0;
    try {
        count = Math.max(0, Math.floor(Number(Terraria.NPC.CountNPCS(wanted))));
    } catch (e) {
        for (let i = 0; i < 200; i++) {
            const n = Terraria.Main.npc[i];
            if (n && n.active && Number(n.type) === wanted)
                count++;
        }
    }
    npcCountCache.set(wanted, { tick, value: count });
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
    if (!p || !p.active || p.dead) {
        npc.TargetClosest(true);
        p = Terraria.Main.player[npc.target];
    }
    return p && p.active && !p.dead ? p : null;
}

export function SpawnNPC(type, x, y, seed = null) {
    if (!(Number(type) > 0) || Terraria.Main.netMode === 1)
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
        if (seed && typeof seed === 'object')
            Object.assign(state, seed);
        npc.netUpdate = true;
    }
    return index;
}

const perforatorProjectileQueue = [];
let perforatorProjectileQueueLastTick = -1;
let perforatorProjectileQueueLogged = false;
const PERFORATOR_PROJECTILE_QUEUE_LIMIT = 24;

export function SpawnProjectile(type, position, velocity, damage, ai0 = 0, ai1 = 0, ai2 = 0) {
    const projectileType = Math.floor(Number(type));
    if (!(projectileType > 0) || Terraria.Main.netMode === 1 || !position || !velocity)
        return -1;
    // Mobile spike smoothing: preserve the requested projectile, but queue its native
    // allocation so a Perforator volley cannot create many NativeObjects in one frame.
    if (perforatorProjectileQueue.length >= PERFORATOR_PROJECTILE_QUEUE_LIMIT)
        return -1;
    perforatorProjectileQueue.push({
        x: Number(position.X), y: Number(position.Y),
        vx: Number(velocity.X), vy: Number(velocity.Y),
        type: projectileType,
        damage: Math.max(0, Math.floor(Number(damage))),
        ai0: Number(ai0), ai1: Number(ai1), ai2: Number(ai2)
    });
    return -1;
}

export function ProcessPerforatorProjectileQueue(maxPerTick = 2) {
    if (Terraria.Main.netMode === 1 || perforatorProjectileQueue.length === 0)
        return 0;
    const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
    if (tick === perforatorProjectileQueueLastTick)
        return 0;
    perforatorProjectileQueueLastTick = tick;
    const budget = Math.max(1, Math.min(4, Math.floor(Number(maxPerTick) || 2)));
    let spawned = 0;
    while (spawned < budget && perforatorProjectileQueue.length > 0) {
        const q = perforatorProjectileQueue.shift();
        try {
            NewProjectile(Terraria.NPC.GetSpawnSourceForNaturalSpawn(), Vector2.new(q.x, q.y), Vector2.new(q.vx, q.vy), q.type, q.damage, 0, Terraria.Main.myPlayer, q.ai0, q.ai1, q.ai2, null);
        } catch (e) { }
        spawned++;
    }
    if (!perforatorProjectileQueueLogged) {
        perforatorProjectileQueueLogged = true;
        try { tl.log('[CalamityPort PerforatorSpawnBudget] projectile queue active; nativeSpawns<=2/tick; queue<=24.'); } catch (e) { }
    }
    return spawned;
}

export function ClearPerforatorProjectileQueue() {
    perforatorProjectileQueue.length = 0;
    perforatorProjectileQueueLastTick = -1;
}

export function CanSee(npc, player) {
    try {
        return !!CanHit(npc.position, npc.width, npc.height, Terraria.PlayerTopLeft(player), Terraria.PlayerWidth(player), Terraria.PlayerHeight(player));
    } catch (e) {
        return true;
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
    CalamityNPCState.Remove(npc);
}

export function MoveToward(npc, x, y, speed, acceleration) {
    const dx = Number(x) - Number(npc.Center.X), dy = Number(y) - Number(npc.Center.Y);
    const n = Normalize(dx, dy, 0, 1);
    let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
    const targetX = n.x * Number(speed), targetY = n.y * Number(speed);
    vx += Math.max(-Number(acceleration), Math.min(Number(acceleration), targetX - vx));
    vy += Math.max(-Number(acceleration), Math.min(Number(acceleration), targetY - vy));
    npc.velocity = Vector2.new(vx, vy);
}

export function MoveWormHead(npc, player, speed, turnSpeed) {
    const n = Normalize(Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X), Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y), 0, 1);
    const inertia = Math.max(4, 1 / Math.max(0.01, Number(turnSpeed)));
    const vx = (Number(npc.velocity.X) * inertia + n.x * Number(speed)) / (inertia + 1);
    const vy = (Number(npc.velocity.Y) * inertia + n.y * Number(speed)) / (inertia + 1);
    npc.velocity = Vector2.new(vx, vy);
    npc.rotation = Math.atan2(vy, vx) + Math.PI * 0.5;
    npc.direction = vx < 0 ? -1 : 1;
    npc.spriteDirection = npc.direction;
    if (Number(npc.alpha) > 0)
        npc.alpha = Math.max(0, Number(npc.alpha) - 15);
}

function RectanglesIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function TargetPlayerInsideBox(npc, player, radius) {
    if (!player || player.active !== true || player.dead === true)
        return false;
    return RectanglesIntersect(
        Number(npc.position.X), Number(npc.position.Y), Number(npc.width), Number(npc.height),
        Number(Terraria.PlayerPositionX(player)) - radius,
        Number(Terraria.PlayerPositionY(player)) - radius,
        radius * 2, radius * 2
    );
}

export function WrapAngle(angle) {
    let a = Number(angle) || 0;
    while (a > Math.PI)
        a -= Math.PI * 2;
    while (a < -Math.PI)
        a += Math.PI * 2;
    return a;
}

export function HeadFacesTarget(npc, player, maxAngle = Math.PI * 0.25) {
    if (!npc || !player)
        return false;
    const vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
    if (vx * vx + vy * vy < 0.04)
        return false;
    const targetAngle = Math.atan2(Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y), Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X));
    return Math.abs(WrapAngle(targetAngle - Math.atan2(vy, vx))) <= Number(maxAngle);
}

export function ApplyPerforatorWormMovement(npc, player, kind, lifeRatio = 1, state = null) {
    const expert = IsExpert() || IsRevengeance();
    const revenge = IsRevengeance();
    const death = IsDeath();
    const ratio = Math.max(0, Math.min(1, Number(lifeRatio)));
    let speed = 0.1, turnSpeed = 0.07;
    if (kind === 'small') {
        speed = revenge ? 0.2 : 0.15;
        turnSpeed = revenge ? 0.15 : 0.1;
        if (expert) {
            speed += (death ? 0.2 : 0.14) * (1 - ratio);
            turnSpeed += (death ? 0.15 : 0.1) * (1 - ratio);
        }
    } else if (kind === 'medium') {
        speed = 0.125;
        turnSpeed = 0.085;
        if (expert) {
            speed += (death ? 0.125 : 0.085) * (1 - ratio);
            turnSpeed += (death ? 0.085 : 0.06) * (1 - ratio);
        }
    } else {
        speed = 0.1;
        turnSpeed = 0.07;
        if (expert) {
            speed += (death ? 0.1 : 0.07) * (1 - ratio);
            turnSpeed += (death ? 0.07 : 0.05) * (1 - ratio);
        }
    }
    const maxChargeSpeed = 16;
    const stopFlyingRadius = death ? 320 : (revenge ? 400 : (expert ? 480 : 600));
    const outsideRadius = !TargetPlayerInsideBox(npc, player, stopFlyingRadius);
    const directChase = (kind === 'medium' && outsideRadius) ||
        (kind !== 'medium' && Number(npc.position.Y) > Number(Terraria.PlayerPositionY(player)) && outsideRadius);
    const shouldFly = UseDesertScourgeTraversal(npc, state, directChase);
    const centerX = Math.floor(Number(npc.Center.X) / 16) * 16;
    const centerY = Math.floor(Number(npc.Center.Y) / 16) * 16;
    let targetX = Math.floor(Number(Terraria.PlayerCenterX(player)) / 16) * 16 - centerX;
    let targetY = Math.floor(Number(Terraria.PlayerCenterY(player)) / 16) * 16 - centerY;
    let targetDistance = Math.sqrt(targetX * targetX + targetY * targetY);
    if (!(targetDistance > 0.0001))
        targetDistance = 0.0001;
    let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
    const oldVX = vx, oldVY = vy;
    if (!shouldFly) {
        const airAccel = kind === 'medium' ? turnSpeed : speed;
        vy += 0.15;
        if (vy > maxChargeSpeed)
            vy = maxChargeSpeed;
        const slowXVelocity = Math.abs(vx) > airAccel;
        if (Math.abs(vx) + Math.abs(vy) < maxChargeSpeed * 0.4)
            vx += vx < 0 ? -airAccel * 1.1 : airAccel * 1.1;
        else if (vy >= maxChargeSpeed - 0.0001) {
            if (slowXVelocity) {
                if (vx < targetX)
                    vx += airAccel;
                else if (vx > targetX)
                    vx -= airAccel;
            } else
                vx = 0;
        } else if (vy > 4) {
            if (slowXVelocity)
                vx += vx < 0 ? airAccel * 0.9 : -airAccel * 0.9;
            else
                vx = 0;
        }
    } else {
        const absoluteX = Math.abs(targetX), absoluteY = Math.abs(targetY);
        const scale = maxChargeSpeed / targetDistance;
        targetX *= scale;
        targetY *= scale;
        const sameX = (vx > 0 && targetX > 0) || (vx < 0 && targetX < 0);
        const sameY = (vy > 0 && targetY > 0) || (vy < 0 && targetY < 0);
        if (sameX && sameY) {
            if (vx < targetX)
                vx += turnSpeed;
            else if (vx > targetX)
                vx -= turnSpeed;
            if (vy < targetY)
                vy += turnSpeed;
            else if (vy > targetY)
                vy -= turnSpeed;
        }
        if (sameX || sameY) {
            if (vx < targetX)
                vx += speed;
            else if (vx > targetX)
                vx -= speed;
            if (vy < targetY)
                vy += speed;
            else if (vy > targetY)
                vy -= speed;
            if (Math.abs(targetY) < maxChargeSpeed * 0.2 && ((vx > 0 && targetX < 0) || (vx < 0 && targetX > 0)))
                vy += vy > 0 ? speed * 2 : -speed * 2;
            if (Math.abs(targetX) < maxChargeSpeed * 0.2 && ((vy > 0 && targetY < 0) || (vy < 0 && targetY > 0)))
                vx += vx > 0 ? speed * 2 : -speed * 2;
        } else if (absoluteX > absoluteY) {
            if (vx < targetX)
                vx += speed * 1.1;
            else if (vx > targetX)
                vx -= speed * 1.1;
            if (Math.abs(vx) + Math.abs(vy) < maxChargeSpeed * 0.5)
                vy += vy > 0 ? speed : -speed;
        } else {
            if (vy < targetY)
                vy += speed * 1.1;
            else if (vy > targetY)
                vy -= speed * 1.1;
            if (Math.abs(vx) + Math.abs(vy) < maxChargeSpeed * 0.5)
                vx += vx > 0 ? speed : -speed;
        }
    }
    const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X), dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 1120) {
        const n = Normalize(dx, dy, 0, 1);
        vx += n.x * turnSpeed;
        vy += n.y * turnSpeed;
    }
    npc.velocity = Vector2.new(vx, vy);
    npc.rotation = Math.atan2(vy, vx) + Math.PI * 0.5;
    npc.spriteDirection = vx < 0 ? 1 : -1;
    npc.direction = npc.spriteDirection;
    if (Number(npc.alpha) > 0 && Math.sqrt(vx * vx + vy * vy) > 2)
        npc.alpha = Math.max(0, Number(npc.alpha) - 42);
    if (state) {
        if (state.shouldFly !== shouldFly || (oldVX > 0 && vx < 0) || (oldVX < 0 && vx > 0) || (oldVY > 0 && vy < 0) || (oldVY < 0 && vy > 0))
            npc.netUpdate = true;
        state.shouldFly = shouldFly;
        state.movementMode = state.traversalMode || (shouldFly ? 'burrow' : 'airfall');
        state.sourceSpeed = speed;
        state.sourceTurnSpeed = turnSpeed;
    }
    return shouldFly;
}

function SpawnSegmentBodyBatch(head, state, bodyType, tailType, bodyCount, spacing, splitting) {
    if (!head || Terraria.Main.netMode === 1 || !(bodyType > 0) || !(tailType > 0))
        return;
    if (state.segmentsSpawned === true)
        return;

    // Mobile optimization: do not construct a whole worm in the same frame as its head.
    // All original segment counts and spacing are preserved; construction is merely spread
    // across a few frames to avoid dozens of NativeObject/NewNPC allocations at once.
    if (state.segmentBuildPrimed !== true) {
        state.segmentBuildPrimed = true;
        state.segmentBuildPrevious = Number(head.whoAmI);
        state.segmentBuildFirst = -1;
        state.segmentBuildSpawned = 0;
        state.segmentBuildCount = Math.max(0, Math.floor(Number(bodyCount)));
        state.segmentBuildBodyType = Number(bodyType);
        state.segmentBuildTailType = Number(tailType);
        state.segmentBuildSpacing = Number(spacing);
        state.segmentBuildSplitting = splitting === true;
        state.segmentBuildFrames = 0;
        return;
    }

    state.segmentBuildFrames = Number(state.segmentBuildFrames || 0) + 1;
    const count = Math.max(0, Math.floor(Number(state.segmentBuildCount)));
    let spawned = Math.max(0, Math.floor(Number(state.segmentBuildSpawned || 0)));
    let previous = Math.floor(Number(state.segmentBuildPrevious));
    let first = Math.floor(Number(state.segmentBuildFirst));
    const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
    // Three bodies per frame smooths the remaining short NativeObject allocation spikes.
    // Total mobile body budgets are unchanged from Phase 12.74.11.
    const end = Math.min(count, spawned + 3);
    for (; spawned < end; spawned++) {
        const headLink = splitting ? 0 : Number(head.whoAmI);
        const index = Terraria.NPC.NewNPC(source, Math.floor(Number(head.Center.X)), Math.floor(Number(head.Center.Y)), Number(bodyType), 0, 0, previous, headLink, spacing, head.target);
        if (!(index >= 0 && index < 200))
            break;
        const segment = Terraria.Main.npc[index];
        segment.ai[1] = previous;
        segment.ai[2] = headLink;
        segment.ai[3] = spacing;
        segment.realLife = splitting ? -1 : Number(head.whoAmI);
        segment.netUpdate = true;
        if (first < 0)
            first = index;
        const prev = Terraria.Main.npc[previous];
        if (prev)
            prev.ai[0] = index;
        previous = index;
    }
    state.segmentBuildSpawned = spawned;
    state.segmentBuildPrevious = previous;
    state.segmentBuildFirst = first;

    if (spawned < count)
        return;

    const headLink = splitting ? 0 : Number(head.whoAmI);
    const tailIndex = Terraria.NPC.NewNPC(source, Math.floor(Number(head.Center.X)), Math.floor(Number(head.Center.Y)), Number(tailType), 0, 0, previous, headLink, spacing, head.target);
    if (tailIndex >= 0 && tailIndex < 200) {
        const tail = Terraria.Main.npc[tailIndex];
        tail.ai[1] = previous;
        tail.ai[2] = headLink;
        tail.ai[3] = spacing;
        tail.realLife = splitting ? -1 : Number(head.whoAmI);
        tail.netUpdate = true;
        const prev = Terraria.Main.npc[previous];
        if (prev)
            prev.ai[0] = tailIndex;
    }

    if (first >= 0)
        head.ai[0] = first;
    if (splitting) {
        head.ai[1] = -1;
        head.ai[2] = 0;
        head.realLife = -1;
    }
    state.segmentsSpawned = true;
    state.segmentBuildPrimed = false;
    head.netUpdate = true;
    try { tl.log(`[CalamityPort PerforatorPerf] worm chain complete; head=${Number(head.whoAmI)}, bodies=${count}, buildFrames=${Number(state.segmentBuildFrames || 0)}, splitting=${splitting === true}.`); } catch (e) { }
}

export function SpawnSplittingMediumSegments(head, bodyType, tailType, bodyCount, spacing = 40) {
    if (!head)
        return;
    SpawnSegmentBodyBatch(head, CalamityNPCState.Get(head), bodyType, tailType, bodyCount, spacing, true);
}

export function SpawnWormSegments(head, bodyType, tailType, bodyCount, spacing = 44) {
    if (!head)
        return;
    SpawnSegmentBodyBatch(head, CalamityNPCState.Get(head), bodyType, tailType, bodyCount, spacing, false);
}

function ResolveCachedNPC(state, prefix, index) {
    const i = Math.floor(Number(index));
    if (!(i >= 0 && i < 200))
        return null;
    const indexKey = `${prefix}Index`;
    const refKey = `${prefix}Ref`;
    let ref = state ? state[refKey] : null;
    if (!state || Number(state[indexKey]) !== i || !ref) {
        ref = Terraria.Main.npc[i];
        if (state) {
            state[indexKey] = i;
            state[refKey] = ref;
        }
    }
    // Main.npc slots are stable NativeObject instances. Avoid the inherited whoAmI
    // validation read on every follower update; active is sufficient for this short-lived chain cache.
    return ref && ref.active ? ref : null;
}

function PlaceFollowingSegment(npc, previous, spacing, state = null, tick = -1) {
    let previousCenterX, previousCenterY;
    const previousState = CalamityNPCState.Get(previous);
    if (Number(previousState.perfFollowTick) === Number(tick)) {
        previousCenterX = Number(previousState.perfFollowCenterX);
        previousCenterY = Number(previousState.perfFollowCenterY);
    } else {
        const previousPosition = previous.position;
        const previousHalfW = Number(previous.width) * 0.5;
        const previousHalfH = Number(previous.height) * 0.5;
        previousCenterX = Number(previousPosition.X) + previousHalfW;
        previousCenterY = Number(previousPosition.Y) + previousHalfH;
    }

    const position = npc.position;
    const halfW = state && Number(state.perfHalfW) > 0 ? Number(state.perfHalfW) : Number(npc.width) * 0.5;
    const halfH = state && Number(state.perfHalfH) > 0 ? Number(state.perfHalfH) : Number(npc.height) * 0.5;
    if (state) {
        state.perfHalfW = halfW;
        state.perfHalfH = halfH;
    }
    const centerX = Number(position.X) + halfW;
    const centerY = Number(position.Y) + halfH;
    const dx = previousCenterX - centerX;
    const dy = previousCenterY - centerY;
    const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
    const nextX = previousCenterX - dx / dist * spacing - halfW;
    const nextY = previousCenterY - dy / dist * spacing - halfH;
    if (Math.abs(Number(position.X) - nextX) > 0.001 || Math.abs(Number(position.Y) - nextY) > 0.001) {
        position.X = nextX;
        position.Y = nextY;
        npc.position = position;
    }
    if (!state || state.perfVelocityZeroed !== true) {
        npc.velocity = Vector2.new(0, 0);
        if (state)
            state.perfVelocityZeroed = true;
    }
    const rotation = Math.atan2(dy, dx) + Math.PI * 0.5;
    if (Math.abs(Number(npc.rotation) - rotation) > 0.0005)
        npc.rotation = rotation;
    const direction = dx > 0 ? 1 : -1;
    if (Number(npc.direction) !== direction)
        npc.direction = direction;
    if (Number(npc.spriteDirection) !== direction)
        npc.spriteDirection = direction;
    if (state) {
        state.perfFollowTick = tick;
        state.perfFollowCenterX = nextX + halfW;
        state.perfFollowCenterY = nextY + halfH;
    }
}

export function FollowPreviousSegment(npc, defaultSpacing, state = null) {
    state = state || CalamityNPCState.Get(npc);
    const headIndex = Math.floor(Number(npc.ai[2]));
    const previousIndex = Math.floor(Number(npc.ai[1]));
    const head = ResolveCachedNPC(state, 'perfHead', headIndex);
    const previous = ResolveCachedNPC(state, 'perfPrevious', previousIndex);
    if (!head || !previous) {
        DeactivateNoLoot(npc);
        return false;
    }
    if (Number(npc.realLife) !== headIndex)
        npc.realLife = headIndex;
    const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
    const syncPhase = Math.floor(Number(state.perfCadencePhase || 0));
    if ((tick + syncPhase) % 8 === 0) {
        if (Number(npc.lifeMax) !== Number(head.lifeMax))
            npc.lifeMax = head.lifeMax;
        if (Number(npc.life) !== Number(head.life))
            npc.life = head.life;
        if (Number(npc.target) !== Number(head.target))
            npc.target = head.target;
        if (Number(npc.alpha) !== Number(head.alpha))
            npc.alpha = head.alpha;
        if (npc.dontTakeDamage !== head.dontTakeDamage)
            npc.dontTakeDamage = head.dontTakeDamage;
    }
    let spacing = Number(state.perfSpacing);
    if (!(spacing > 0)) {
        spacing = Math.max(8, Number(npc.ai[3]) || Number(defaultSpacing)) * (Number(npc.scale) || 1);
        state.perfSpacing = spacing;
    }
    PlaceFollowingSegment(npc, previous, spacing, state, tick);
    return true;
}

export function FollowSplittingMediumSegment(npc, defaultSpacing, state = null) {
    state = state || CalamityNPCState.Get(npc);
    const previousIndex = Math.floor(Number(npc.ai[1]));
    const previous = ResolveCachedNPC(state, 'perfPrevious', previousIndex);
    if (!previous)
        return false;
    // The previous index can change when a medium worm splits; validate only the two
    // legitimate chain types, but avoid resolving the whole type table repeatedly.
    const types = GetPerfTypes();
    const previousType = Number(previous.type);
    if (previousType !== types.mediumHead && previousType !== types.mediumBody)
        return false;
    if (Number(npc.realLife) !== -1)
        npc.realLife = -1;
    if (Number(npc.target) !== Number(previous.target))
        npc.target = previous.target;
    let spacing = Number(state.perfSpacing);
    if (!(spacing > 0)) {
        spacing = Math.max(8, Number(npc.ai[3]) || Number(defaultSpacing)) * (Number(npc.scale) || 1);
        state.perfSpacing = spacing;
    }
    const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
    PlaceFollowingSegment(npc, previous, spacing, state, tick);
    if (Number(npc.alpha) > 0)
        npc.alpha = Math.max(0, Number(npc.alpha) - 42);
    return true;
}

function ActiveNPC(index) {
    const i = Math.floor(Number(index));
    if (!(i >= 0 && i < 200))
        return null;
    const npc = Terraria.Main.npc[i];
    return npc && npc.active ? npc : null;
}

export function PromoteMediumRearChain(firstIndex, target = 255, lifeRatio = 1) {
    if (Terraria.Main.netMode === 1)
        return -1;
    const first = ActiveNPC(firstIndex), types = GetPerfTypes();
    if (!first || Number(first.type) !== types.mediumBody) {
        if (first && Number(first.type) === types.mediumTail)
            DeactivateNoLoot(first);
        return -1;
    }
    const nextIndex = Math.floor(Number(first.ai[0]));
    const velocityX = Number(first.velocity.X), velocityY = Number(first.velocity.Y);
    const index = SpawnNPC(types.mediumHead, Number(first.Center.X), Number(first.Center.Y), { segmentsSpawned: true, splitHead: true, spitTimer: 0 });
    if (!(index >= 0 && index < 200))
        return -1;
    const head = Terraria.Main.npc[index];
    head.ai[0] = nextIndex;
    head.ai[1] = -1;
    head.ai[2] = 0;
    head.realLife = -1;
    head.target = Number(target) >= 0 ? Number(target) : Number(first.target);
    head.velocity = Vector2.new(velocityX, velocityY);
    head.life = Math.max(1, Math.floor(Number(head.lifeMax) * Math.max(0.05, Math.min(1, Number(lifeRatio)))));
    const next = ActiveNPC(nextIndex);
    if (next) {
        next.ai[1] = index;
        next.netUpdate = true;
    }
    DeactivateNoLoot(first);
    head.netUpdate = true;
    return index;
}

export function SplitMediumChainAt(npc) {
    if (!npc || Terraria.Main.netMode === 1)
        return;
    const previous = ActiveNPC(npc.ai[1]);
    const nextIndex = Math.floor(Number(npc.ai[0]));
    if (previous) {
        previous.ai[0] = -1;
        previous.netUpdate = true;
    }
    const ratio = Number(npc.lifeMax) > 0 ? Math.max(0.05, Number(npc.life) / Number(npc.lifeMax)) : 1;
    PromoteMediumRearChain(nextIndex, npc.target, ratio);
}

export function ApplyBurningBlood(player, duration) {
    if (!player || Number(duration) <= 0)
        return;
    if (!(burningBloodType > 0))
        burningBloodType = Number(ModBuff.getTypeByName('BurningBlood') || 0);
    if (!(burningBloodType > 0))
        return;
    try {
        player.AddBuff(burningBloodType, Math.floor(Number(duration)), false);
    } catch (e) {
        try {
            player.AddBuff(burningBloodType, Math.floor(Number(duration)));
        } catch (ignored) { }
    }
}

export function ApplyIchor(player, duration) {
    if (!player || Number(duration) <= 0)
        return;
    try {
        player.AddBuff(Number(Terraria.ID.BuffID.Ichor || 69), Math.floor(Number(duration)), false);
    } catch (e) { }
}

export function PlayItemSlot(slot, position, fallback = null, pitch = 0, volume = 1) {
    // Phase 12.73.6: Item_150+ is redirected by TLPro to the official Calamity .ogg.
    // Use the legacy numeric API directly (2 = Item sound) so no LegacySoundStyle NativeObject
    // is ever created/coerced on the gameplay thread.
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
