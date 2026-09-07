import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModSystem } from './../../../../TL/ModSystem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { FusionVFXSystem } from './../../../../Core/FusionVFXSystem.js';
import { UseDesertScourgeTraversal } from './../../../../Core/DesertScourgeTraversalRuntime.js';
import { InitVirtualWorm, UpdateVirtualWorm, GetVirtualWormGeometry, EnableVirtualWormDamage, DisableVirtualWormDamage } from './../../../../Core/SingleEntityWormRuntime.js';
import {

    GetNuisanceTypes,
    GetParentScourge,
    GetParentScourgeIndex,
    OtherNuisanceAlive,
    FollowNuisanceSegment,
    DeactivateNuisanceSegment,
    DeactivateNuisanceFamily
} from './DesertNuisanceShared.js';
import { PlayNPCDeathSound } from '../../../../Common/Snippets/LegacySoundCompat.js';
const { Color, Vector2, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SandDustType = Number.isFinite(Number(Terraria.ID.DustID.Sand)) ? Math.floor(Number(Terraria.ID.DustID.Sand)) : 32;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function Normalize(dx, dy, fallbackX = 0, fallbackY = 1) {
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!(length > 0.0001))
        return { x: fallbackX, y: fallbackY };
    return { x: dx / length, y: dy / length };
}

function MoveToward(npc, x, y, speed, inertia) {
    const direction = Normalize(Number(x) - Number(npc.Center.X), Number(y) - Number(npc.Center.Y));
    const velocity = npc.velocity;
    velocity.X = (Number(velocity.X) * (inertia - 1) + direction.x * speed) / inertia;
    velocity.Y = (Number(velocity.Y) * (inertia - 1) + direction.y * speed) / inertia;
    npc.velocity = velocity;
}

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function WrapAngle(angle) {
    let value = Number(angle) || 0;
    while (value > Math.PI)
        value -= Math.PI * 2;
    while (value < -Math.PI)
        value += Math.PI * 2;
    return value;
}

function MinimumPlayerCornerDistance(npc, player) {
    if (!npc || !player)
        return 999999;
    const cx = Number(npc.Center.X);
    const cy = Number(npc.Center.Y);
    const left = Number(Terraria.PlayerPositionX(player));
    const top = Number(Terraria.PlayerPositionY(player));
    const right = left + Number(Terraria.PlayerWidth(player));
    const bottom = top + Number(Terraria.PlayerHeight(player));
    let min = 999999;
    for (const point of [[left, top], [right, top], [left, bottom], [right, bottom]]) {
        const dx = cx - point[0];
        const dy = cy - point[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < min)
            min = distance;
    }
    return min;
}

function FilterNuisanceContact(npc, player, modifiers, radius) {
    if (!modifiers)
        return false;
    const allowed = MinimumPlayerCornerDistance(npc, player) <= Math.max(0, Number(radius));
    if (!allowed) {
        modifiers.damage = 0;
        modifiers.quiet = true;
    }
    return allowed;
}

function DistanceTo(npc, target) {
    if (!npc || !target)
        return 999999;
    const dx = Number(target.Center.X) - Number(npc.Center.X);
    const dy = Number(target.Center.Y) - Number(npc.Center.Y);
    return Math.sqrt(dx * dx + dy * dy);
}

function IsAlignedWithTarget(npc, target, maxAngle = Math.PI * 0.25) {
    if (!npc || !target)
        return false;
    const vx = Number(npc.velocity.X);
    const vy = Number(npc.velocity.Y);
    if (vx * vx + vy * vy < 0.04)
        return false;
    const targetAngle = Math.atan2(Number(target.Center.Y) - Number(npc.Center.Y), Number(target.Center.X) - Number(npc.Center.X));
    const velocityAngle = Math.atan2(vy, vx);
    return Math.abs(WrapAngle(targetAngle - velocityAngle)) <= maxAngle;
}

function RectanglesIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function TargetInsideDirectChaseBox(npc, player, distance) {
    if (!player || player.active !== true || player.dead === true)
        return false;
    return RectanglesIntersect(
        Number(npc.position.X), Number(npc.position.Y), Number(npc.width), Number(npc.height),
        Number(Terraria.PlayerPositionX(player)) - distance,
        Number(Terraria.PlayerPositionY(player)) - distance,
        distance * 2, distance * 2
    );
}

function ApplyCalamitySourceWormMovement(npc, player, young, revenge, enragedByPartner, biomeEnraged, lifeRatio, state) {
    const baseSpeed = young ? 0.07 : 0.085;
    const baseTurnSpeed = young ? 0.14 : 0.17;
    let enrageScale = enragedByPartner ? 0.5 : 0;
    if (biomeEnraged)
        enrageScale += 2;
    let speed = baseSpeed;
    let turnSpeed = baseTurnSpeed;
    speed += speed * 0.4 * (1 - lifeRatio);
    turnSpeed += turnSpeed * 0.4 * (1 - lifeRatio);
    speed += baseSpeed * enrageScale;
    turnSpeed += baseTurnSpeed * enrageScale;
    let maxChaseSpeed = young ? 10 : 11;
    maxChaseSpeed += maxChaseSpeed * 0.2 * (1 - lifeRatio);
    let directChase = false;
    const directChaseDistance = revenge ? 500 : 1000;
    if (Number(npc.position.Y) > Number(Terraria.PlayerPositionY(player)) && !TargetInsideDirectChaseBox(npc, player, directChaseDistance))
        directChase = true;
    const shouldFly = UseDesertScourgeTraversal(npc, state, directChase);
    const npcCenterX = Math.floor(Number(npc.Center.X) / 16) * 16;
    const npcCenterY = Math.floor(Number(npc.Center.Y) / 16) * 16;
    let playerX = Math.floor(Number(Terraria.PlayerCenterX(player)) / 16) * 16 - npcCenterX;
    let playerY = Math.floor(Number(Terraria.PlayerCenterY(player)) / 16) * 16 - npcCenterY;
    let targetDistance = Math.sqrt(playerX * playerX + playerY * playerY);
    if (!(targetDistance > 0.0001))
        targetDistance = 0.0001;
    const velocity = npc.velocity;
    const oldVX = Number(velocity.X);
    const oldVY = Number(velocity.Y);
    if (!shouldFly) {
        velocity.Y = Number(velocity.Y) + 0.1;
        if (!young && Number(velocity.Y) > 0 && Math.abs(Number(npc.Center.Y) - Number(Terraria.PlayerCenterY(player))) > 180) {
            velocity.Y = Number(velocity.Y) + 0.05;
        }
        if (Number(velocity.Y) > maxChaseSpeed)
            velocity.Y = maxChaseSpeed;
        const slowXVelocity = Math.abs(Number(velocity.X)) > speed;
        if (Math.abs(Number(velocity.X)) + Math.abs(Number(velocity.Y)) < maxChaseSpeed * 0.4) {
            velocity.X = Number(velocity.X) < 0
                ? Number(velocity.X) - speed * 1.1
                : Number(velocity.X) + speed * 1.1;
        } else if (Number(velocity.Y) >= maxChaseSpeed - 0.0001) {
            if (slowXVelocity) {
                if (Number(velocity.X) < playerX)
                    velocity.X = Number(velocity.X) + speed;
                else if (Number(velocity.X) > playerX)
                    velocity.X = Number(velocity.X) - speed;
            } else
                velocity.X = 0;
        } else if (Number(velocity.Y) > 4) {
            if (slowXVelocity) {
                velocity.X = Number(velocity.X) < 0
                    ? Number(velocity.X) + speed * 0.9
                    : Number(velocity.X) - speed * 0.9;
            } else
                velocity.X = 0;
        }
    } else {
        const absolutePlayerX = Math.abs(playerX);
        const absolutePlayerY = Math.abs(playerY);
        const timeToReachTarget = maxChaseSpeed / targetDistance;
        playerX *= timeToReachTarget;
        playerY *= timeToReachTarget;
        const sameXDirection = (Number(velocity.X) > 0 && playerX > 0) || (Number(velocity.X) < 0 && playerX < 0);
        const sameYDirection = (Number(velocity.Y) > 0 && playerY > 0) || (Number(velocity.Y) < 0 && playerY < 0);
        if (sameXDirection && sameYDirection) {
            if (Number(velocity.X) < playerX)
                velocity.X = Number(velocity.X) + turnSpeed;
            else if (Number(velocity.X) > playerX)
                velocity.X = Number(velocity.X) - turnSpeed;
            if (Number(velocity.Y) < playerY)
                velocity.Y = Number(velocity.Y) + turnSpeed;
            else if (Number(velocity.Y) > playerY)
                velocity.Y = Number(velocity.Y) - turnSpeed;
        }
        const anySameDirection = sameXDirection || sameYDirection;
        if (anySameDirection) {
            if (Number(velocity.X) < playerX)
                velocity.X = Number(velocity.X) + speed;
            else if (Number(velocity.X) > playerX)
                velocity.X = Number(velocity.X) - speed;
            if (Number(velocity.Y) < playerY)
                velocity.Y = Number(velocity.Y) + speed;
            else if (Number(velocity.Y) > playerY)
                velocity.Y = Number(velocity.Y) - speed;
            if (Math.abs(playerY) < maxChaseSpeed * 0.2 && ((Number(velocity.X) > 0 && playerX < 0) || (Number(velocity.X) < 0 && playerX > 0))) {
                velocity.Y = Number(velocity.Y) > 0
                    ? Number(velocity.Y) + speed * 2
                    : Number(velocity.Y) - speed * 2;
            }
            if (Math.abs(playerX) < maxChaseSpeed * 0.2 && ((Number(velocity.Y) > 0 && playerY < 0) || (Number(velocity.Y) < 0 && playerY > 0))) {
                velocity.X = Number(velocity.X) > 0
                    ? Number(velocity.X) + speed * 2
                    : Number(velocity.X) - speed * 2;
            }
        } else if (absolutePlayerX > absolutePlayerY) {
            if (Number(velocity.X) < playerX)
                velocity.X = Number(velocity.X) + speed * 1.1;
            else if (Number(velocity.X) > playerX)
                velocity.X = Number(velocity.X) - speed * 1.1;
            if (Math.abs(Number(velocity.X)) + Math.abs(Number(velocity.Y)) < maxChaseSpeed * 0.5) {
                velocity.Y = Number(velocity.Y) > 0
                    ? Number(velocity.Y) + speed
                    : Number(velocity.Y) - speed;
            }
        } else {
            if (Number(velocity.Y) < playerY)
                velocity.Y = Number(velocity.Y) + speed * 1.1;
            else if (Number(velocity.Y) > playerY)
                velocity.Y = Number(velocity.Y) - speed * 1.1;
            if (Math.abs(Number(velocity.X)) + Math.abs(Number(velocity.Y)) < maxChaseSpeed * 0.5) {
                velocity.X = Number(velocity.X) > 0
                    ? Number(velocity.X) + speed
                    : Number(velocity.X) - speed;
            }
        }
    }
    const destinationX = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
    const destinationY = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
    const destinationDistance = Math.sqrt(destinationX * destinationX + destinationY * destinationY);
    if (destinationDistance > (enragedByPartner ? 750 : 1000)) {
        const direction = Normalize(destinationX, destinationY, 0, 1);
        velocity.X = Number(velocity.X) + direction.x * turnSpeed;
        velocity.Y = Number(velocity.Y) + direction.y * turnSpeed;
        directChase = true;
    }
    npc.velocity = velocity;
    npc.rotation = Math.atan2(Number(velocity.Y), Number(velocity.X)) + Math.PI * 0.5;
    npc.spriteDirection = Number(velocity.X) < 0 ? 1 : -1;
    npc.direction = npc.spriteDirection;
    if (state.sourceShouldFly !== shouldFly ||
        (oldVX > 0 && Number(velocity.X) < 0) || (oldVX < 0 && Number(velocity.X) > 0) ||
        (oldVY > 0 && Number(velocity.Y) < 0) || (oldVY < 0 && Number(velocity.Y) > 0)) {
        npc.netUpdate = true;
    }
    state.sourceShouldFly = shouldFly;
    state.directChase = directChase;
    state.sourceMovement = state.traversalMode || (shouldFly ? 'burrow' : 'airfall');
    state.sourceAcceleration = speed;
    state.sourceTurnSpeed = turnSpeed;
    state.sourceMaxSpeed = maxChaseSpeed;
}

export class DesertNuisanceHeadBase extends ModNPC {
    constructor(young = false) {
        super();
        this.Young = young === true;
        this.Texture = this.Young
            ? 'NPCs/Bosses/DesertScourge/DesertNuisanceHeadYoung'
            : 'NPCs/Bosses/DesertScourge/DesertNuisanceHead';
        this.BestiaryRarityStars = 2;
        this.BodySegments = 8;
        this.VirtualAtlasTexture = null;
        this.VirtualBodyFrames = [];
        this.VirtualBodyVariants = [];
        this.VirtualPairVariants = [];
        this.VirtualTailSource = null;
        this.VirtualDrawPos = null;
        this.VirtualBodyOrigin = null;
        this.VirtualStaticOrigin = null;
        this.VirtualPairOrigin = null;
        this.VirtualColorCache = new Array(17);
    }

    PostSetupContent() {
        try {
            const suffix = this.Young ? 'Young' : 'Adult';
            this.VirtualAtlasTexture = tl.texture.load(`Textures/NPCs/Bosses/DesertScourge/DesertNuisance${suffix}VirtualAtlas.png`);
            this.VirtualDrawPos = Vector2.new();
            if (this.Young) {
                this.VirtualBodyOrigin = Vector2.new(61, 44);
                this.VirtualStaticOrigin = Vector2.new(61, 43);
                this.VirtualPairOrigin = Vector2.new(61, 68);
                this.VirtualBodyFrames = [
                    Rectangle.new(0, 0, 122, 88), Rectangle.new(124, 0, 122, 88), Rectangle.new(248, 0, 122, 88), Rectangle.new(372, 0, 122, 88),
                    Rectangle.new(0, 90, 122, 88), Rectangle.new(124, 90, 122, 88), Rectangle.new(248, 90, 122, 88)
                ];
                this.VirtualBodyVariants = [Rectangle.new(0, 180, 122, 86), Rectangle.new(124, 180, 122, 86), Rectangle.new(248, 180, 122, 86)];
                this.VirtualTailSource = Rectangle.new(372, 180, 122, 86);
                this.VirtualPairVariants = [Rectangle.new(0, 268, 122, 136), Rectangle.new(124, 268, 122, 136)];
            } else {
                this.VirtualBodyOrigin = Vector2.new(73, 50);
                this.VirtualStaticOrigin = Vector2.new(73, 49);
                this.VirtualPairOrigin = Vector2.new(73, 80);
                this.VirtualBodyFrames = [
                    Rectangle.new(0, 0, 146, 100), Rectangle.new(148, 0, 146, 100), Rectangle.new(296, 0, 146, 100), Rectangle.new(444, 0, 146, 100),
                    Rectangle.new(0, 102, 146, 100), Rectangle.new(148, 102, 146, 100), Rectangle.new(296, 102, 146, 100)
                ];
                this.VirtualBodyVariants = [Rectangle.new(0, 204, 146, 98), Rectangle.new(148, 204, 146, 98), Rectangle.new(296, 204, 146, 98)];
                this.VirtualTailSource = Rectangle.new(444, 204, 146, 98);
                this.VirtualPairVariants = [Rectangle.new(0, 304, 146, 160), Rectangle.new(148, 304, 146, 160)];
            }
        } catch (e) {
            this.VirtualAtlasTexture = null;
            this.VirtualBodyFrames = [];
            this.VirtualBodyVariants = [];
            this.VirtualPairVariants = [];
            this.VirtualTailSource = null;
            try { tl.log(`[CalamityPort SingleWorm] Desert Nuisance virtual atlas load failed: ${e}`); } catch (_) { }
        }
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 7;
        Terraria.ID.NPCID.Sets.MPAllowedEnemies[this.Type] = true;
        try {
            Terraria.ID.NPCID.Sets.CantTakeLunchMoney[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = this.Young ? 78 : 88;
        this.NPC.height = this.Young ? 78 : 88;
        const worldState = ModSystem.getByName('CalamityWorldState');
        const revenge = !!(worldState && worldState.RevengeanceMode === true);
        let goodWorld = false;
        let zenithWorld = false;
        try {
            goodWorld = Terraria.Main.getGoodWorld === true;
        } catch (e) { }
        try {
            zenithWorld = Terraria.Main.zenithWorld === true;
        } catch (e) { }
        this.NPC.damage = 25;
        this.NPC.defense = this.Young ? 2 : 3;
        if (goodWorld)
            this.NPC.defense += this.Young ? 18 : 19;
        this.NPC.lifeMax = revenge ? (this.Young ? 1560 : 1800) : (this.Young ? 1300 : 1500);
        if (goodWorld)
            this.NPC.lifeMax *= 2;
        this.NPC.scale = zenithWorld ? 2.0 : 1.0;
        this.NPC.knockBackResist = 0;
        this.NPC.value = 0;
        this.NPC.npcSlots = 0;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.behindTiles = true;
        this.NPC.netAlways = true;
        this.NPC.alpha = 255;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit1;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }

    SetBestiary(database, bestiaryEntry) {
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.Desert);
        const flavor = FlavorTextBestiaryInfoElement.new();
        flavor._key = ModLocalization.Translate('Bestiary.DesertNuisanceHead');
        bestiaryEntry.Info.Add(flavor);
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.segmentsSpawned = false;
        state.bossTimer = this.Young ? 105 : 0;
        state.lungeSide = this.Young ? -1 : 1;
        state.parentScourge = GetParentScourgeIndex(npc);
        state.despawnTimer = 0;
        state.biomeEnrageTimer = 300;
        state.entryTimer = 0;
        state.spitCharge = 0;
        state.spitFiredCount = 0;
        state.chompTimer = 0;
        state.directChase = false;
        state.biomeEnraged = false;
        state.enragedByPartner = false;
        state.sourceShouldFly = false;
        state.sourceMovement = 'entry';
        state.sourceAcceleration = 0;
        state.sourceTurnSpeed = 0;
        state.sourceMaxSpeed = 0;
        npc.TargetClosest(false);
        if (Terraria.Main.netMode !== 1)
            this.SpawnSegments(npc, state);
    }

    SpawnSegments(npc, state) {
        // Phase 13.09.6: both Desert Nuisances now use one real head NPC.
        // Body/tail registrations stay untouched for ID/save stability, but no
        // follower NPCs are created. The existing single-worm runtime owns the
        // trail geometry, full-body incoming damage proxy and adaptive drawing.
        if (state.segmentsSpawned)
            return;
        let bodySegments = this.BodySegments;
        try {
            if (Terraria.Main.getGoodWorld === true)
                bodySegments *= 2;
        } catch (e) { }
        const visualSegments = bodySegments + 1; // body chain + tail
        const spacing = this.Young ? 50 : 62;
        InitVirtualWorm(npc, state, visualSegments, spacing, 192);
        EnableVirtualWormDamage(npc, state, this.Young ? 78 : 88, this.Young ? 78 : 88);
        UpdateVirtualWorm(npc, state, visualSegments, spacing, 192);
        state.segmentsSpawned = true;
        state.singleEntityWorm = true;
        state.sourceSegmentCount = bodySegments;
        state.segmentCount = 0;
        state.virtualSegmentCount = visualSegments;
        state.virtualSpacing = spacing;
        state.virtualBodyFrame = 0;
        state.virtualBodyScale = 1.0;
        npc.netUpdate = true;
        try {
            tl.log(`[CalamityPort SingleWorm] ${this.Young ? 'Young ' : ''}Desert Nuisance 13.09.6: 1 real NPC + ${visualSegments} virtual hurtboxes; adaptive atlas draw=on; native Damage proxy=on.`);
        } catch (_) { }
    }

    DrawEntranceVFX(npc, state) {
        if (Terraria.Main.netMode === 2 || Number(npc.alpha) <= 0)
            return;
        if (Number(state.entryTimer || 0) % 4 !== 0)
            return;
        const x = Number(npc.Center.X);
        const y = Number(npc.Center.Y) + Number(npc.height) * 0.25;
        const alpha = Math.max(55, Math.min(150, Number(npc.alpha)));
        FusionVFXSystem.SpawnDot({ x: x + (Math.random() - 0.5) * Number(npc.width) * 0.6, y }, { x: (Math.random() - 0.5) * 0.8, y: -0.8 - Math.random() * 0.7 }, this.Young ? 2.7 : 3.2, { r: 235, g: 193, b: 118, a: alpha }, 16, { drag: 0.94, gravity: 0.04 });
    }

    ShootYoungSpit(npc, player, revenge, enragedByPartner, state) {
        if (!this.Young || !player)
            return false;
        const projectileType = ModProjectile.getTypeByName('DesertScourgeSpit');
        if (!(projectileType > 0))
            return false;
        const count = enragedByPartner ? 4 : 3;
        const speed = revenge ? 10 : 8;
        const halfSpread = (enragedByPartner ? 22 : 20) * Math.PI / 180;
        const direction = Normalize(Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X), Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y), 0, 1);
        const baseAngle = Math.atan2(direction.y, direction.x);
        const damage = revenge ? 13 : 10;
        if (Terraria.Main.netMode !== 2) {
            try {
                PlayNPCDeathSound(11, npc.Center, 0, 0.9);
            } catch (e) { }
            for (let i = 0; i < 6; i++) {
                const angle = baseAngle + (Math.random() - 0.5) * halfSpread * 0.55;
                const visualSpeed = 1.4 + Math.random() * 1.1;
                FusionVFXSystem.SpawnDot({
                    x: Number(npc.Center.X) + Math.cos(baseAngle) * 22, y: Number(npc.Center.Y) + Math.sin(baseAngle) * 22
                }, { x: Math.cos(angle) * visualSpeed, y: Math.sin(angle) * visualSpeed }, 2.6, { r: 246, g: 211, b: 143, a: 180 }, 18, { drag: 0.96, gravity: 0.02 });
            }
        }
        if (Terraria.Main.netMode !== 1) {
            for (let i = 0; i < count; i++) {
                const lerp = count <= 1 ? 0.5 : i / (count - 1);
                const angle = baseAngle + (-halfSpread + halfSpread * 2 * lerp);
                NewProjectile(null, Number(npc.Center.X) + Math.cos(angle) * 5, Number(npc.Center.Y) + Math.sin(angle) * 5, Math.cos(angle) * speed, Math.sin(angle) * speed, projectileType, damage, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
            }
        }
        state.spitCharge = 0;
        state.spitFiredCount = Number(state.spitFiredCount || 0) + 1;
        npc.netUpdate = true;
        return true;
    }

    UpdateYoungSpit(npc, player, revenge, enragedByPartner, state) {
        if (!this.Young || Number(npc.alpha) > 0) {
            state.spitCharge = 0;
            return;
        }
        const distance = DistanceTo(npc, player);
        const aligned = IsAlignedWithTarget(npc, player, Math.PI * 0.25);
        if (distance > 360 && aligned)
            state.spitCharge = Number(state.spitCharge || 0) + 1;
        if (Number(state.spitCharge) >= 180)
            this.ShootYoungSpit(npc, player, revenge, enragedByPartner, state);
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        if (!state.segmentsSpawned && Terraria.Main.netMode !== 1)
            this.SpawnSegments(npc, state);
        const parentIndex = GetParentScourgeIndex(npc);
        state.parentScourge = parentIndex;
        if (parentIndex >= 0 && !GetParentScourge(npc)) {
            DisableVirtualWormDamage(npc, state);
            DeactivateNuisanceFamily(npc, true);
            CalamityNPCState.Remove(npc);
            return false;
        }
        if (state.retargetTimer <= 0 || npc.target < 0 || npc.target >= 255) {
            npc.TargetClosest(false);
            state.retargetTimer = 30;
        }
        let player = Terraria.Main.player[npc.target];
        if (!player || !player.active || player.dead) {
            npc.TargetClosest(false);
            player = Terraria.Main.player[npc.target];
        }
        if (!player || !player.active || player.dead) {
            npc.damage = 0;
            npc.dontTakeDamage = true;
            state.despawnTimer = Number(state.despawnTimer || 0) + 1;
            const velocity = npc.velocity;
            velocity.X *= 0.98;
            velocity.Y = Math.min(18, Number(velocity.Y) + 0.45);
            npc.velocity = velocity;
            if (state.despawnTimer >= 180) {
                DisableVirtualWormDamage(npc, state);
                DeactivateNuisanceFamily(npc, true);
                CalamityNPCState.Remove(npc);
            }
            return false;
        }
        state.despawnTimer = 0;
        state.entryTimer = Number(state.entryTimer || 0) + 1;
        const entryDuration = 48;
        const entryFadeStart = 14;
        const entryActive = Number(state.entryTimer) <= entryDuration;
        const restoredDamage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 25;
        npc.damage = entryActive ? 0 : restoredDamage;
        if (Number(state.entryTimer) > entryFadeStart) {
            npc.alpha = Math.max(0, Number(npc.alpha) - 42);
        } else {
            npc.alpha = 255;
        }
        npc.dontTakeDamage = entryActive || npc.alpha > 0;
        this.DrawEntranceVFX(npc, state);
        if (entryActive) {
            const entrySide = this.Young ? 1 : -1;
            const entryTargetX = Number(Terraria.PlayerCenterX(player)) + entrySide * 300;
            const entryTargetY = Number(Terraria.PlayerCenterY(player)) + 560;
            MoveToward(npc, entryTargetX, entryTargetY, this.Young ? 5.5 : 6.0, 16);
            const entryVelocity = npc.velocity;
            const entrySpeed = Math.sqrt(Number(entryVelocity.X) ** 2 + Number(entryVelocity.Y) ** 2);
            const entryMaxSpeed = this.Young ? 6.2 : 6.7;
            if (entrySpeed > entryMaxSpeed) {
                entryVelocity.X = Number(entryVelocity.X) / entrySpeed * entryMaxSpeed;
                entryVelocity.Y = Number(entryVelocity.Y) / entrySpeed * entryMaxSpeed;
                npc.velocity = entryVelocity;
            }
            npc.rotation = Math.atan2(Number(npc.velocity.Y), Number(npc.velocity.X)) + Math.PI * 0.5;
            npc.spriteDirection = Number(npc.velocity.X) < 0 ? 1 : -1;
            npc.direction = npc.spriteDirection;
            state.phase = -1;
            state.directChase = false;
            state.biomeEnraged = false;
            state.enragedByPartner = false;
            state.playerDistance = Math.floor(DistanceTo(npc, player));
            return false;
        }
        const worldState = ModSystem.getByName('CalamityWorldState');
        const revenge = !!(worldState && worldState.RevengeanceMode === true);
        const enragedByPartner = revenge && !OtherNuisanceAlive(this.Young, parentIndex);
        if (player.ZoneDesert === true)
            state.biomeEnrageTimer = 300;
        else
            state.biomeEnrageTimer = Math.max(0, Number(state.biomeEnrageTimer || 0) - 1);
        const biomeEnraged = Number(state.biomeEnrageTimer) <= 0;
        const lifeRatio = Number(npc.life) / Math.max(1, Number(npc.lifeMax));
        const playerDistance = DistanceTo(npc, player);
        this.UpdateYoungSpit(npc, player, revenge, enragedByPartner, state);
        ApplyCalamitySourceWormMovement(npc, player, this.Young, revenge, enragedByPartner, biomeEnraged, lifeRatio, state);
        state.phase = state.sourceMovement === 'burrow' ? 0 : state.sourceMovement === 'airfall' ? 1 : 2;
        state.attackMode = state.sourceMovement;
        state.lungeActive = false;
        state.idlePressure = false;
        state.revenge = revenge;
        state.enragedByPartner = enragedByPartner;
        state.biomeEnraged = biomeEnraged;
        state.playerDistance = Math.floor(playerDistance);
        if (Terraria.Main.netMode !== 2 && state.age % 12 === 0) {
            const dust = NewDust(npc.position, npc.width, npc.height, SandDustType, -Number(npc.velocity.X) * 0.05, -Number(npc.velocity.Y) * 0.05, 100, Color.White, this.Young ? 0.9 : 1.05);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
        return false;
    }


    PostAI(npc) {
        const state = CalamityNPCState.Get(npc);
        if (state.singleEntityWorm !== true)
            return;
        const visualSegments = Math.max(1, Math.floor(Number(state.virtualSegmentCount || 1)));
        const spacing = Number(state.virtualSpacing || (this.Young ? 50 : 62));
        UpdateVirtualWorm(npc, state, visualSegments, spacing, 192);
        state.virtualBodyFrame = (Number(state.virtualBodyFrame || 0) + 0.14) % 7;
    }

    PreDraw(npc, spriteBatch, screenPos) {
        const state = CalamityNPCState.Get(npc);
        const geometry = GetVirtualWormGeometry(state);
        if (!geometry || !this.VirtualAtlasTexture || !this.VirtualDrawPos || this.VirtualBodyFrames.length < 7 || this.VirtualBodyVariants.length < 3)
            return true;
        if (globalThis.__TLProCurrentNPCBehindTilesPass === false)
            return true;
        const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
        if (Number(state.virtualBodyLastDrawTick) === tick)
            return true;
        state.virtualBodyLastDrawTick = tick;
        try {
            const draw = spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            const alpha = Math.max(0, 255 - Math.floor(Number(npc.alpha || 0)));
            const bucket = Math.max(0, Math.min(16, Math.round(alpha / 16)));
            let color = this.VirtualColorCache[bucket];
            if (!color) {
                color = Color.new(255, 255, 255, Math.min(255, bucket * 16));
                this.VirtualColorCache[bucket] = color;
            }
            const screenW = Math.max(1, Math.floor(Number(Terraria.Main.screenWidth || 1920)));
            const screenH = Math.max(1, Math.floor(Number(Terraria.Main.screenHeight || 1080)));
            const screenX = Number(screenPos.X), screenY = Number(screenPos.Y);
            const gfxOffY = Number(npc.gfxOffY || 0);
            const margin = 180;
            const frame = Math.max(0, Math.min(6, Math.floor(Number(state.virtualBodyFrame || 0))));
            const animatedSource = this.VirtualBodyFrames[frame];
            const pairReady = this.VirtualPairVariants.length >= 2 && !!this.VirtualPairOrigin;
            const maxMergedPairs = Math.min(3, Math.max(1, Math.floor(geometry.count * 0.28)));
            let mergedPairs = 0;
            let drawCalls = 0;
            for (let i = geometry.count - 1; i >= 0;) {
                const tail = i === geometry.count - 1;
                const narrowBody = i === geometry.count - 2;
                if (pairReady && !tail && !narrowBody && i >= 2 && mergedPairs < maxMergedPairs) {
                    const j = i - 1;
                    if (j > 0) {
                        const r0 = Number(geometry.rotation[j]);
                        const r1 = Number(geometry.rotation[i]);
                        let delta = r1 - r0;
                        while (delta > Math.PI) delta -= Math.PI * 2;
                        while (delta < -Math.PI) delta += Math.PI * 2;
                        if (Math.abs(delta) <= 0.16) {
                            const x0 = Number(geometry.x[j]), y0 = Number(geometry.y[j]);
                            const x1 = Number(geometry.x[i]), y1 = Number(geometry.y[i]);
                            const dx = (x0 + x1) * 0.5 - screenX;
                            const dy = (y0 + y1) * 0.5 - screenY + gfxOffY;
                            if (!(dx < -margin || dx > screenW + margin || dy < -margin || dy > screenH + margin)) {
                                this.VirtualDrawPos.X = dx;
                                this.VirtualDrawPos.Y = dy;
                                draw(this.VirtualAtlasTexture, this.VirtualDrawPos, this.VirtualPairVariants[(j - 1) % 2], color, r0 + delta * 0.5, this.VirtualPairOrigin, 1.0, SpriteEffects.None, 1.0);
                                mergedPairs++;
                                drawCalls++;
                                i -= 2;
                                continue;
                            }
                        }
                    }
                }
                const dx = Number(geometry.x[i]) - screenX;
                const dy = Number(geometry.y[i]) - screenY + gfxOffY;
                if (!(dx < -margin || dx > screenW + margin || dy < -margin || dy > screenH + margin)) {
                    this.VirtualDrawPos.X = dx;
                    this.VirtualDrawPos.Y = dy;
                    let source;
                    let origin;
                    if (tail) {
                        source = this.VirtualTailSource;
                        origin = this.VirtualStaticOrigin;
                    } else if (i === 0) {
                        source = animatedSource;
                        origin = this.VirtualBodyOrigin;
                    } else if (narrowBody) {
                        source = this.VirtualBodyVariants[2];
                        origin = this.VirtualStaticOrigin;
                    } else {
                        source = this.VirtualBodyVariants[(i - 1) % 2];
                        origin = this.VirtualStaticOrigin;
                    }
                    draw(this.VirtualAtlasTexture, this.VirtualDrawPos, source, color, Number(geometry.rotation[i]), origin, 1.0, SpriteEffects.None, 1.0);
                    drawCalls++;
                }
                i--;
            }
            state.virtualBodyLastMergedPairs = mergedPairs;
            state.virtualBodyLastDrawCalls = drawCalls;
        } catch (e) {
            try { tl.log(`[CalamityPort SingleWorm] Desert Nuisance virtual draw failed: ${e}`); } catch (_) { }
        }
        return true;
    }

    FindFrame(npc, frameHeight) {
        const state = CalamityNPCState.Get(npc);
        const player = npc.target >= 0 && npc.target < 255 ? Terraria.Main.player[npc.target] : null;
        const nearAligned = !!(player && player.active && !player.dead && DistanceTo(npc, player) < 220 && IsAlignedWithTarget(npc, player, Math.PI * 0.25));
        const aboutToSpit = this.Young && Number(state.spitCharge || 0) > 150;
        let frame = Math.max(0, Math.min(6, Math.floor(Number(npc.frame.Y) / Math.max(1, frameHeight))));
        if (Number(state.chompTimer || 0) > 0) {
            state.chompTimer = Math.max(0, Number(state.chompTimer) - 1);
            const elapsed = 24 - Number(state.chompTimer);
            if (elapsed < 12)
                frame = 4 + Math.min(2, Math.floor(elapsed / 4));
            else
                frame = Math.max(0, 6 - Math.floor((elapsed - 12) / 3));
            npc.frameCounter = 0;
        } else if (nearAligned || aboutToSpit) {
            npc.frameCounter = Number(npc.frameCounter) + 1;
            if (Number(npc.frameCounter) > 4) {
                npc.frameCounter = 0;
                frame = Math.min(4, frame + 1);
            }
        } else if (frame > 0) {
            npc.frameCounter = Number(npc.frameCounter) + 1;
            if (Number(npc.frameCounter) > 4) {
                npc.frameCounter = 0;
                frame = Math.max(0, frame - 1);
            }
        } else {
            npc.frameCounter = 0;
        }
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) <= 0)
            return;
        const state = CalamityNPCState.Get(npc);
        state.chompTimer = 24;
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        const playerBalance = Number.isFinite(Number(balance)) ? Number(balance) : 1;
        npc.lifeMax = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.7 * playerBalance));
        npc.damage = Math.max(1, Math.floor(Number(npc.damage) * 0.8));
    }

    ModifyHitPlayer(npc, player, modifiers) {
        const radius = this.Young ? 45 : 50 * Number(npc.scale || 1);
        FilterNuisanceContact(npc, player, modifiers, radius);
    }

    CheckActive() {
        return false;
    }

    OnKill(npc) {
        DisableVirtualWormDamage(npc, CalamityNPCState.Get(npc));
        DeactivateNuisanceFamily(npc, false);
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const dead = npc.life <= 0;
        const count = dead ? 18 : 2;
        for (let i = 0; i < count; i++) {
            NewDust(npc.position, npc.width, npc.height, SandDustType, (Math.random() - 0.5) * (dead ? 4 : 1.5), (Math.random() - 0.5) * (dead ? 4 : 1.5), 0, Color.White, dead ? 1.3 : 0.9);
        }
    }
}

export class DesertNuisanceSegmentBase extends ModNPC {
    constructor(young = false, tail = false) {
        super();
        this.Young = young === true;
        this.Tail = tail === true;
        const suffix = this.Young ? 'Young' : '';
        this.Texture = `NPCs/Bosses/DesertScourge/DesertNuisance${this.Tail ? 'Tail' : 'Body'}${suffix}`;
        this.hideFromBestiary = true;
    }

    SetStaticDefaults() {
        if (!this.Tail)
            Terraria.Main.npcFrameCount[this.Type] = 7;
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = this.Young ? 78 : 88;
        this.NPC.height = this.Young ? 78 : 88;
        const worldState = ModSystem.getByName('CalamityWorldState');
        const revenge = !!(worldState && worldState.RevengeanceMode === true);
        let goodWorld = false;
        try {
            goodWorld = Terraria.Main.getGoodWorld === true;
        } catch (e) { }
        this.NPC.damage = this.Tail ? 10 : 12;
        this.NPC.defense = this.Tail ? (this.Young ? 7 : 8) : (this.Young ? 4 : 5);
        if (goodWorld) {
            if (this.Tail)
                this.NPC.defense += this.Young ? 33 : 34;
            else
                this.NPC.defense += this.Young ? 26 : 27;
        }
        this.NPC.lifeMax = revenge ? (this.Young ? 1560 : 1800) : (this.Young ? 1300 : 1500);
        if (goodWorld)
            this.NPC.lifeMax *= 2;
        this.NPC.knockBackResist = 0;
        this.NPC.value = 0;
        this.NPC.npcSlots = 0;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.behindTiles = true;
        this.NPC.netAlways = false;
        this.NPC.dontCountMe = true;
        this.NPC.alpha = 255;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit1;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }

    PreAI(npc) {
        FollowNuisanceSegment(npc, this.Young ? 50 : 62);
        return false;
    }

    FindFrame(npc, frameHeight) {
        if (this.Tail)
            return;
        npc.frameCounter += 0.7;
        const frame = Math.floor(Number(npc.frameCounter) / 5) % 7;
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        const playerBalance = Number.isFinite(Number(balance)) ? Number(balance) : 1;
        npc.lifeMax = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.7 * playerBalance));
    }

    ModifyHitPlayer(npc, player, modifiers) {
        let radius;
        if (this.Tail)
            radius = 30 * Number(npc.scale || 1);
        else {
            const narrow = Math.floor(Number(npc.ai[3])) === 30;
            radius = this.Young ? (narrow ? 30 : 35) : (narrow ? 30 : 40) * Number(npc.scale || 1);
        }
        FilterNuisanceContact(npc, player, modifiers, radius);
    }

    CheckActive() {
        return false;
    }
}
