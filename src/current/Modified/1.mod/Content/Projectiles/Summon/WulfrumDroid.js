import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { Rand } from '../../../TL/Modules/Rand.js';
import { Vector2 } from '../../../TL/Modules/Vector2.js';
import { AndroidSound } from './../../../Common/Snippets/AndroidSound.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Rectangle, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const PlayIntegerSound = Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'];
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
const DrawScaledTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const CanHitLine = Terraria.Collision['bool CanHitLine(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'];
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];

const AGGRO_RANGE = 450;
const SHOOT_DELAY = 110;
const MAX_PROJECTILES = 1000;
const MAX_PLAYERS = 256;
const TARGET_SCAN_INTERVAL = 45;
const TARGET_LOS_INTERVAL = 30;
const OWNER_LOS_INTERVAL = 12;
const ANTI_CLUMP_INTERVAL = 12;
const ATTACK_MODE = 0;
const SUPPORT_MODE = 1;
const BEHAVIOR_AGGRESSIVE = 0;
const BEHAVIOR_IDLE = 1;

let EmoteTexture = null;
let SweatTexture = null;
let PixelTexture = null;
let BurstTexture = null;
let CachedControllerPlayer = null;
let CachedRoverDrivePlayer = null;
let EmoteSources = null;
let EmoteOrigin = null;
let SweatOrigin = null;
let BeamPosition = null;
let BeamOrigin = null;
let BeamScale = null;
let MuzzlePosition = null;
let MuzzleOrigin = null;
let MuzzleScale = null;
let BeamColors = null;
let MuzzleColors = null;
let EmoteColors = null;
let EmoteLightPosition = null;

const DroidStates = new Array(MAX_PROJECTILES);
const VelocityBuffers = new Array(MAX_PROJECTILES);
const ActiveDroidsByOwner = new Array(MAX_PLAYERS);

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function Lerp(a, b, amount) {
    return Number(a) + (Number(b) - Number(a)) * Clamp(amount, 0, 1);
}

function Remap(value, fromMin, fromMax, toMin, toMax, clamped = true) {
    const denominator = Number(fromMax) - Number(fromMin);
    let amount = denominator === 0 ? 0 : (Number(value) - Number(fromMin)) / denominator;
    if (clamped)
        amount = Clamp(amount, 0, 1);
    return Lerp(toMin, toMax, amount);
}

function DistanceSquared(ax, ay, bx, by) {
    const dx = Number(bx) - Number(ax);
    const dy = Number(by) - Number(ay);
    return dx * dx + dy * dy;
}

function SafeNormalize(dx, dy, fallbackX = 0, fallbackY = 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!(length > 0.0001))
        return { x: fallbackX, y: fallbackY, length: 0 };
    return { x: dx / length, y: dy / length, length };
}

function SetVelocity(projectile, x, y) {
    const slot = ProjectileSlot(projectile);
    if (slot < 0) {
        projectile.velocity = Vector2.new(Number(x), Number(y));
        return;
    }

    let value = VelocityBuffers[slot];
    if (!value) {
        value = Vector2.new(0, 0);
        VelocityBuffers[slot] = value;
    }
    value.X = Number(x);
    value.Y = Number(y);
    projectile.velocity = value;
}

function SetVector(vector, x, y) {
    vector.X = Number(x);
    vector.Y = Number(y);
    return vector;
}

function ProjectileSlot(projectile) {
    const slot = Math.floor(Number(projectile.whoAmI));
    return slot >= 0 && slot < MAX_PROJECTILES ? slot : -1;
}

function ProjectileIdentity(projectile) {
    const identity = Number(projectile.identity);
    return Number.isFinite(identity) ? Math.floor(identity) : ProjectileSlot(projectile);
}

function OwnerDroidSlots(ownerIndex, create = false) {
    const index = Math.floor(Number(ownerIndex));
    if (index < 0 || index >= MAX_PLAYERS)
        return null;
    let slots = ActiveDroidsByOwner[index];
    if (!slots && create) {
        slots = new Set();
        ActiveDroidsByOwner[index] = slots;
    }
    return slots;
}

function RegisterActiveDroid(projectile) {
    const slot = ProjectileSlot(projectile);
    const owner = Math.floor(Number(projectile.owner));
    if (slot < 0)
        return;
    OwnerDroidSlots(owner, true)?.add(slot);
}

function RemoveActiveDroid(projectile) {
    const slot = ProjectileSlot(projectile);
    const owner = Math.floor(Number(projectile.owner));
    if (slot >= 0) {
        DroidStates[slot] = null;
        VelocityBuffers[slot] = null;
    }
    const slots = OwnerDroidSlots(owner, false);
    if (slots)
        slots.delete(slot);
}

function CreateDroidState(projectile) {
    return {
        identity: ProjectileIdentity(projectile),
        owner: Math.floor(Number(projectile.owner)),
        type: Math.floor(Number(projectile.type)),
        initialized: false,
        behavior: BEHAVIOR_AGGRESSIVE,
        shootTimer: SHOOT_DELAY,
        buffModeBuffer: 15,
        target: -1,
        targetVisible: false,
        targetScanTimer: 0,
        targetLosTimer: 0,
        ownerVisible: true,
        ownerLosTimer: 0,
        soundDelay: 0,
        supportSoundPlayed: false,
        muzzleFlashTime: 0,
        hurryActive: false,
        timer: 0,
        emotes: [],
        normalEmotes: 0,
        sweatEmotes: 0,
        shots: 0,
        teleports: 0,
        supportTicks: 0,
        supportRechargeTimer: SHOOT_DELAY,
        idleMovementTicks: 0,
        shotVelocity: Vector2.new(0, 0),
        targetScans: 0,
        losChecks: 0,
        antiClumpPasses: 0,
        lastMode: ATTACK_MODE
    };
}

function GetDroidState(projectile) {
    const slot = ProjectileSlot(projectile);
    if (slot < 0)
        return CreateDroidState(projectile);

    const identity = ProjectileIdentity(projectile);
    const owner = Math.floor(Number(projectile.owner));
    const type = Math.floor(Number(projectile.type));
    let state = DroidStates[slot];
    if (!state || state.identity !== identity || state.owner !== owner || state.type !== type) {
        state = CreateDroidState(projectile);
        DroidStates[slot] = state;
    }
    return state;
}

function ControllerPlayer() {
    if (!CachedControllerPlayer)
        CachedControllerPlayer = ModPlayer.getByName('WulfrumControllerPlayer');
    return CachedControllerPlayer;
}

function RoverDrivePlayer() {
    if (!CachedRoverDrivePlayer)
        CachedRoverDrivePlayer = ModPlayer.getByName('RoverDrivePlayer');
    return CachedRoverDrivePlayer;
}

function CountOwnedDroids(owner, type) {
    try {
        const nativeCount = Number(owner.ownedProjectileCounts[Number(type)]);
        if (Number.isFinite(nativeCount) && nativeCount > 0)
            return Math.floor(nativeCount);
    } catch (e) { }

    const ownerIndex = Math.floor(Number(Terraria.PlayerIndex(owner)));
    const slots = OwnerDroidSlots(ownerIndex, false);
    if (!slots)
        return 1;

    let count = 0;
    for (const slot of slots) {
        const projectile = Terraria.Main.projectile[slot];
        if (!projectile || !projectile.active || Number(projectile.type) !== Number(type) || Number(projectile.owner) !== ownerIndex) {
            slots.delete(slot);
            continue;
        }
        count++;
    }
    return Math.max(1, count);
}

function NewSoundDelay(owner, type) {
    return Rand.Next(340, 1460) * CountOwnedDroids(owner, type);
}

function TryOfficialSound(kind, projectile) {
    const x = Number(projectile.Center.X);
    const y = Number(projectile.Center.Y);
    const owner = Number(projectile.owner);
    let file = '';
    let volume = 0.75;
    let releaseTicks = 90;
    let cooldown = 0;

    if (kind === 'spawn') {
        file = 'Sounds/WulfrumDroid/WulfrumDroidSpawnBeep.ogg';
        volume = 0.8;
    } else if (kind === 'chirp') {
        file = `Sounds/WulfrumDroid/WulfrumDroidChirp${Rand.Next(1, 5)}.ogg`;
        volume = Rand.NextFloat(0.45, 0.8);
    } else if (kind === 'hurry') {
        file = `Sounds/WulfrumDroid/WulfrumDroidHurry${Rand.Next(1, 3)}.ogg`;
        volume = 0.75;
        releaseTicks = 120;
        cooldown = 120;
    } else if (kind === 'repair') {
        file = 'Sounds/WulfrumDroid/WulfrumDroidRepair.ogg';
        volume = 0.65;
        releaseTicks = 80;
        cooldown = 90;
    }

    if (file) {
        try {
            const result = AndroidSound.PlayExclusive(
                `wulfrum-${kind}-${owner}`,
                file,
                volume,
                x,
                y,
                1400,
                releaseTicks,
                cooldown,
                false
            );
            if (result && (result.ok || result.skipped))
                return;
        } catch (e) { }
    }

    try {
        const fallbackStyle = kind === 'hurry' ? 7 : (kind === 'repair' ? 4 : 15);
        PlayIntegerSound(2, projectile.Center, fallbackStyle, kind === 'chirp' ? 0.25 : 0);
    } catch (e) { }
}

function PlayFireSound(projectile) {
    try {
        PlayIntegerSound(2, projectile.Center, 12, 0.12);
    } catch (e) { }
}

function SpawnArrivalDust(projectile) {
    const count = Rand.Next(10, 16);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const edgeX = Math.cos(angle);
        const edgeY = Math.sin(angle);
        try {
            const index = NewDust(
                Vector2.new(Number(projectile.Center.X) + edgeX * Rand.NextFloat(1, 8), Number(projectile.Center.Y) + edgeY * Rand.NextFloat(1, 8)),
                1,
                1,
                229,
                edgeX * Rand.NextFloat(2, 4),
                edgeY * Rand.NextFloat(2, 4),
                100,
                Color.White,
                Rand.NextFloat(1, 1.4)
            );
            if (index >= 0) {
                const dust = Terraria.Main.dust[index];
                if (dust) {
                    dust.noGravity = true;
                    dust.noLight = true;
                }
            }
        } catch (e) { }
    }
}

function TargetQuickValid(projectile, npc) {
    if (!npc || !npc.active || npc.friendly || npc.dontTakeDamage || Number(npc.life) <= 0)
        return false;
    return DistanceSquared(projectile.Center.X, projectile.Center.Y, npc.Center.X, npc.Center.Y) < AGGRO_RANGE * AGGRO_RANGE;
}

function TargetHasLine(projectile, npc, state) {
    if (!TargetQuickValid(projectile, npc))
        return false;
    state.losChecks++;
    try {
        return !!CanHitLine(projectile.position, Number(projectile.width), Number(projectile.height), npc.position, Number(npc.width), Number(npc.height));
    } catch (e) {
        return true;
    }
}

function FindTarget(projectile, owner, state) {
    state.targetScans++;
    try {
        if (owner.HasMinionAttackTargetNPC) {
            const preferredIndex = Math.floor(Number(owner.MinionAttackTargetNPC));
            if (preferredIndex >= 0 && preferredIndex < 200) {
                const preferred = Terraria.Main.npc[preferredIndex];
                if (TargetHasLine(projectile, preferred, state))
                    return preferredIndex;
            }
        }
    } catch (e) { }

    if (state.target >= 0 && state.target < 200) {
        const cached = Terraria.Main.npc[state.target];
        if (TargetHasLine(projectile, cached, state))
            return state.target;
    }

    ScanFrozenCubeNPCs(2);
    for (const i of FrozenCubeTrackedIndices()) {
        const npc = FrozenCubeNPC(i);
        if (TargetHasLine(projectile, npc, state))
            return i;
    }
    return -1;
}

function BeginDroidEmote(projectile, state, sweat = false) {
    const angle = (Math.random() * 2 - 1) * Math.PI * 0.35;
    let directionX = Math.sin(angle);
    const directionY = -Math.cos(angle);
    if (sweat)
        directionX -= Math.sign(Number(projectile.velocity.X));

    const speed = Rand.NextFloat(3, 5);
    const emote = {
        kind: sweat ? 2 : 1,
        time: 0,
        lifetime: sweat ? Rand.Next(20, 35) : Rand.Next(30, 65),
        variant: sweat ? 0 : Rand.Next(15),
        x: Number(projectile.Center.X) + directionX * 10,
        y: Number(projectile.Center.Y) + directionY * 10,
        vx: directionX * speed,
        vy: directionY * speed,
        scale: Rand.NextFloat(1.4, 2),
        rotation: Math.atan2(directionY, directionX) + Math.PI / 2
    };

    state.emotes.push(emote);
    while (state.emotes.length > 4)
        state.emotes.shift();

    if (sweat)
        state.sweatEmotes++;
    else
        state.normalEmotes++;
}

function UpdateDroidEmotes(state) {
    for (let i = state.emotes.length - 1; i >= 0; i--) {
        const emote = state.emotes[i];
        emote.x += emote.vx;
        emote.y += emote.vy;
        emote.vx *= 0.96;
        emote.vy *= 0.96;
        if (emote.kind === 2)
            emote.vy += 0.06;
        emote.scale *= 0.97;
        emote.time++;


        if (emote.time >= emote.lifetime)
            state.emotes.splice(i, 1);
    }
}

function LoadTextures() {
    if (!EmoteTexture) {
        try { EmoteTexture = tl.texture.load('Textures/Particles/WulfrumDroidEmotes.png'); } catch (e) { }
    }
    if (!SweatTexture) {
        try { SweatTexture = tl.texture.load('Textures/Particles/WulfrumDroidSweatEmote.png'); } catch (e) { }
    }
    if (!PixelTexture) {
        try { PixelTexture = tl.texture.load('Textures/Menus/BlankPixel.png'); } catch (e) { }
    }
    if (!BurstTexture) {
        try { BurstTexture = tl.texture.load('Textures/Particles/HalfStar.png'); } catch (e) { }
    }
    if (!EmoteSources) {
        EmoteSources = new Array(15);
        for (let i = 0; i < 15; i++)
            EmoteSources[i] = Rectangle.new(16 * (i % 8), 16 * Math.floor(i / 8), 16, 16);
        EmoteOrigin = Vector2.new(8, 16);
    }
    if (!SweatOrigin && SweatTexture)
        SweatOrigin = Vector2.new(Number(SweatTexture.Width) * 0.5, Number(SweatTexture.Height) * 0.5);
    if (!BeamPosition) {
        BeamPosition = Vector2.new(0, 0);
        BeamOrigin = Vector2.new(0, 0.5);
        BeamScale = Vector2.new(1, 1);
        MuzzlePosition = Vector2.new(0, 0);
        MuzzleScale = Vector2.new(1, 1);
        EmoteLightPosition = Vector2.new(0, 0);
    }
    if (!MuzzleOrigin && BurstTexture)
        MuzzleOrigin = Vector2.new(Number(BurstTexture.Width) * 0.5, Number(BurstTexture.Height) * 0.5);
    if (!BeamColors) {
        BeamColors = new Array(16);
        MuzzleColors = new Array(16);
        EmoteColors = new Array(16);
        for (let i = 0; i < 16; i++) {
            BeamColors[i] = Color.new(100, 220, 255, Math.floor(105 * i / 15));
            MuzzleColors[i] = Color.new(210, 255, 120, Math.floor(230 * i / 15));
            EmoteColors[i] = Color.new(255, 255, 255, Math.floor(255 * i / 15));
        }
    }
}

function DrawDroidEmotes(spriteBatch, state) {
    if (!state.emotes.length)
        return;
    LoadTextures();
    const draw = spriteBatch[DrawTexture];
    if (!draw)
        return;

    for (const emote of state.emotes) {
        const texture = emote.kind === 2 ? SweatTexture : EmoteTexture;
        if (!texture)
            continue;
        const position = SetVector(
            BeamPosition,
            Number(emote.x) - Number(Terraria.Main.screenPosition.X),
            Number(emote.y) - Number(Terraria.Main.screenPosition.Y)
        );
        let source = null;
        let origin;
        let effects = SpriteEffects.None;
        if (emote.kind === 2) {
            origin = SweatOrigin;
            effects = emote.vx > 0 ? SpriteEffects.None : SpriteEffects.FlipHorizontally;
        } else {
            const variant = Clamp(Math.floor(Number(emote.variant) || 0), 0, 14);
            source = EmoteSources[variant];
            origin = EmoteOrigin;
        }
        const completion = emote.lifetime > 0 ? Clamp(emote.time / emote.lifetime, 0, 1) : 1;
        const opacity = 1 - Math.pow(completion, 4);
        draw(
            texture,
            position,
            source,
            EmoteColors[Math.max(0, Math.min(15, Math.round(opacity * 15)))],
            Number(emote.rotation),
            origin,
            Number(emote.scale),
            effects,
            0
        );
    }
}

function ApplyAntiClump(projectile, state) {
    const slot = ProjectileSlot(projectile);
    if ((state.timer + Math.max(0, slot)) % ANTI_CLUMP_INTERVAL !== 0)
        return;

    const slots = OwnerDroidSlots(projectile.owner, false);
    if (!slots || slots.size <= 1)
        return;

    state.antiClumpPasses++;
    const range = Math.max(20, Number(projectile.width));
    const rangeSquared = range * range;
    const centerX = Number(projectile.Center.X);
    const centerY = Number(projectile.Center.Y);
    for (const otherSlot of slots) {
        if (otherSlot === slot)
            continue;
        const other = Terraria.Main.projectile[otherSlot];
        if (!other || !other.active || Number(other.type) !== Number(projectile.type) || Number(other.owner) !== Number(projectile.owner)) {
            slots.delete(otherSlot);
            continue;
        }
        const dx = centerX - Number(other.Center.X);
        const dy = centerY - Number(other.Center.Y);
        if (dx * dx + dy * dy >= rangeSquared)
            continue;
        SetVelocity(
            projectile,
            Number(projectile.velocity.X) + (dx >= 0 ? 0.05 : -0.05),
            Number(projectile.velocity.Y) + (dy >= 0 ? 0.05 : -0.05)
        );
    }
}

function UpdateModeBuffer(state, supportRequested) {
    if (supportRequested) {
        if (state.buffModeBuffer > 0) {
            state.buffModeBuffer--;
            if (state.buffModeBuffer === 0)
                state.buffModeBuffer = -15;
        } else if (state.buffModeBuffer > -15) {
            state.buffModeBuffer--;
        }
    } else if (state.buffModeBuffer < 0) {
        state.buffModeBuffer++;
        if (state.buffModeBuffer === 0)
            state.buffModeBuffer = 15;
    } else if (state.buffModeBuffer < 15) {
        state.buffModeBuffer++;
    }

    state.buffModeBuffer = Clamp(state.buffModeBuffer, -15, 15);
    const nextMode = state.buffModeBuffer <= 0 ? SUPPORT_MODE : ATTACK_MODE;
    if (nextMode === ATTACK_MODE)
        state.supportSoundPlayed = false;
    state.lastMode = nextMode;
    return nextMode === SUPPORT_MODE;
}

function UpdateBaseAnimation(projectile, buffMode) {
    projectile.frameCounter++;
    const minFrame = buffMode ? 8 : 0;
    const maxFrame = buffMode ? 15 : 7;
    projectile.frame = Clamp(Number(projectile.frame), minFrame, maxFrame);
    if (projectile.frameCounter >= 6) {
        projectile.frame++;
        projectile.frameCounter = 0;
    }
    if (projectile.frame > maxFrame)
        projectile.frame = minFrame;
}

function FollowOwnerOrSupport(projectile, owner, state, buffMode, controller) {
    if (state.ownerLosTimer > 0) {
        state.ownerLosTimer--;
    } else {
        state.ownerLosTimer = OWNER_LOS_INTERVAL;
        state.losChecks++;
        try {
            state.ownerVisible = !!CanHitLine(projectile.Center, 1, 1, Terraria.PlayerCenter(owner), 1, 1);
        } catch (e) {
            state.ownerVisible = true;
        }
    }
    if (!state.ownerVisible)
        state.behavior = BEHAVIOR_IDLE;

    const ownerCenterX = Number(Terraria.PlayerCenterX(owner));
    const ownerCenterY = Number(Terraria.PlayerCenterY(owner));
    const playerVectorX = ownerCenterX - Number(projectile.Center.X);
    const playerVectorY = ownerCenterY - 60 - Number(projectile.Center.Y);
    const playerDistance = Math.sqrt(playerVectorX * playerVectorX + playerVectorY * playerVectorY);

    if (playerDistance < 100 && state.behavior === BEHAVIOR_IDLE) {
        let solid = false;
        try { solid = !!SolidCollision(projectile.position, Number(projectile.width), Number(projectile.height)); } catch (e) { }
        if (!solid)
            state.behavior = BEHAVIOR_AGGRESSIVE;
    }

    if (playerDistance > 2000) {
        const ownerCenter = Terraria.PlayerCenter(owner);
        projectile.position = Vector2.new(
            Number(ownerCenter.X) - Number(projectile.width) * 0.5,
            Number(ownerCenter.Y) - Number(projectile.height) * 0.5
        );
        SetVelocity(projectile, 0, 0);
        projectile.netUpdate = true;
        state.teleports++;
        return;
    }

    if (buffMode) {
        state.supportTicks++;
        if (!state.supportSoundPlayed) {
            TryOfficialSound('repair', projectile);
            state.supportSoundPlayed = true;
        }

        const phase = Math.sin(Number(Terraria.Main.GlobalTimeWrappedHourly || 0) + Number(projectile.whoAmI)) * Math.PI * 0.5 * 0.9;
        const orbitX = Math.sin(phase) * 60;
        const orbitY = Math.cos(phase) * 60;
        const aimX = ownerCenterX - orbitX;
        const aimY = ownerCenterY - orbitY - 20;
        const dx = aimX - Number(projectile.Center.X);
        const dy = aimY - Number(projectile.Center.Y);
        const aimDistance = Math.sqrt(dx * dx + dy * dy);

        if (aimDistance > 50) {
            const speed = Lerp(10, 30, Clamp((aimDistance - 110) / 400, 0, 1));
            const direction = SafeNormalize(dx, dy);
            SetVelocity(
                projectile,
                Lerp(Number(projectile.velocity.X), direction.x * speed, 0.05),
                Lerp(Number(projectile.velocity.Y), direction.y * speed, 0.05)
            );
        } else {
            SetVelocity(projectile, Number(projectile.velocity.X) * 0.98, Number(projectile.velocity.Y) * 0.98);
            if (Math.abs(Number(projectile.velocity.X)) + Math.abs(Number(projectile.velocity.Y)) < 0.02) {
                const direction = SafeNormalize(dx, dy, 0, -1);
                SetVelocity(projectile, direction.x * 5, direction.y * 5);
            }
        }

        const distanceToOwner = Math.sqrt(DistanceSquared(projectile.Center.X, projectile.Center.Y, ownerCenterX, ownerCenterY));
        if (distanceToOwner < 200) {
            if (controller)
                controller.MarkSupport(owner);
            state.supportRechargeTimer--;
            if (state.supportRechargeTimer <= 0) {
                state.supportRechargeTimer = SHOOT_DELAY;
                const roverDrive = RoverDrivePlayer();
                if (roverDrive)
                    roverDrive.AddShieldPoint(owner, 1, 'droid');
            }
        }
        return;
    }

    let returnSpeed = state.behavior === BEHAVIOR_IDLE ? 15 : 6;
    if (playerDistance > 200 && returnSpeed < 9)
        returnSpeed = 9;

    if (playerDistance > 70) {
        const direction = SafeNormalize(playerVectorX, playerVectorY);
        SetVelocity(
            projectile,
            Lerp(Number(projectile.velocity.X), direction.x * returnSpeed, 1 / 21),
            Lerp(Number(projectile.velocity.Y), direction.y * returnSpeed, 1 / 21)
        );
    } else {
        state.idleMovementTicks++;
        if (state.idleMovementTicks === 1 && Math.abs(Number(projectile.velocity.X)) + Math.abs(Number(projectile.velocity.Y)) < 0.01)
            SetVelocity(projectile, Number(projectile.direction || 1) * 1.25, -0.45);
        const slot = Math.max(0, ProjectileSlot(projectile));
        const time = Number(Terraria.Main.GlobalTimeWrappedHourly || 0);
        const phase = time * 1.35 + slot * 2.17;
        const idleX = ownerCenterX + Math.sin(phase) * (58 + slot % 3 * 9);
        const idleY = ownerCenterY - 72 + Math.cos(phase * 1.21) * 18;
        const dx = idleX - Number(projectile.Center.X);
        const dy = idleY - Number(projectile.Center.Y);
        const direction = SafeNormalize(dx, dy);
        const speed = Math.min(4.5, 1.8 + direction.length * 0.035);
        SetVelocity(
            projectile,
            Lerp(Number(projectile.velocity.X), direction.x * speed, 0.075),
            Lerp(Number(projectile.velocity.Y), direction.y * speed, 0.075)
        );
    }
}

function MoveAggressively(projectile, target, state) {
    const slot = Math.max(0, ProjectileSlot(projectile));
    const time = Number(Terraria.Main.GlobalTimeWrappedHourly || 0);
    const phase = time * 1.15 + slot * 2.35;
    const desiredX = Number(target.Center.X) + Math.cos(phase) * (135 + slot % 3 * 18);
    const desiredY = Number(target.Center.Y) - 42 + Math.sin(phase * 1.17) * 58;
    const dx = desiredX - Number(projectile.Center.X);
    const dy = desiredY - Number(projectile.Center.Y);
    const direction = SafeNormalize(dx, dy);
    const speed = direction.length > 260 ? 8 : 5.8;
    SetVelocity(
        projectile,
        Lerp(Number(projectile.velocity.X), direction.x * speed, direction.length > 260 ? 0.055 : 0.035),
        Lerp(Number(projectile.velocity.Y), direction.y * speed, direction.length > 260 ? 0.055 : 0.035)
    );

    const targetDx = Number(projectile.Center.X) - Number(target.Center.X);
    const targetDy = Number(projectile.Center.Y) - Number(target.Center.Y);
    const targetDistanceSq = targetDx * targetDx + targetDy * targetDy;
    if (targetDistanceSq < 70 * 70) {
        const repel = SafeNormalize(targetDx, targetDy, Number(projectile.direction) || 1, -0.2);
        SetVelocity(
            projectile,
            Number(projectile.velocity.X) + repel.x * 0.35,
            Number(projectile.velocity.Y) + repel.y * 0.35
        );
    }
}

function ChargeUpAndFire(projectile, target, state, buffMode) {
    if (!target || !target.active || buffMode || state.buffModeBuffer < 15) {
        state.shootTimer = SHOOT_DELAY;
        if (Number(projectile.frame) >= 16)
            projectile.frame = 0;
        return;
    }

    if (state.shootTimer <= 20) {
        projectile.frame = Math.floor(Remap(state.shootTimer, 20, 4, 20, 23, true));
        state.shootTimer -= 2;
        if (state.shootTimer <= 0) {
            state.shootTimer = SHOOT_DELAY;
            projectile.frame = 0;
            projectile.netUpdate = true;
            return;
        }

        const dx = Number(target.Center.X) - Number(projectile.Center.X);
        const dy = Number(target.Center.Y) - Number(projectile.Center.Y);
        const aimRotation = Math.atan2(dy, dx) + (Number(projectile.direction) === 1 ? 0 : (Number(projectile.Center.Y) < Number(target.Center.Y) ? -Math.PI : Math.PI));
        projectile.rotation = Remap(state.shootTimer, 18, 4, aimRotation, Number(projectile.rotation), true);

        if (state.shootTimer !== 18)
            return;

        state.muzzleFlashTime = 20;
        PlayFireSound(projectile);
        const direction = SafeNormalize(dx, dy);
        const velocity = SetVector(state.shotVelocity, direction.x * 10, direction.y * 10);
        SetVelocity(
            projectile,
            Number(projectile.velocity.X) - direction.x * 3,
            Number(projectile.velocity.Y) - direction.y * 3
        );

        if (Number(projectile.owner) === Number(Terraria.Main.myPlayer)) {
            const burstType = Number(ModProjectile.getTypeByName('WulfrumEnergyBurst') || 0);
            if (burstType > 0) {
                let source = null;
                try { source = projectile.GetProjectileSource_FromThis(); } catch (e) { }
                if (source) {
                    const index = NewProjectile(
                        source,
                        projectile.Center,
                        velocity,
                        burstType,
                        Math.max(1, Number(projectile.damage)),
                        Number(projectile.knockBack),
                        Number(projectile.owner),
                        0,
                        0,
                        0,
                        null
                    );
                    if (index >= 0) {
                        const bolt = Terraria.Main.projectile[index];
                        if (bolt) {
                            bolt.originalDamage = Number(projectile.originalDamage || projectile.damage);
                            bolt.netUpdate = true;
                        }
                    }
                }
            }
        }
        state.shots++;
        projectile.netUpdate = true;
        return;
    }

    if (state.shootTimer <= 36) {
        projectile.frame = Math.floor(Remap(state.shootTimer, 36, 20, 16, 20, true));
        state.shootTimer -= 2;
        const dx = Number(target.Center.X) - Number(projectile.Center.X);
        const dy = Number(target.Center.Y) - Number(projectile.Center.Y);
        const aimRotation = Math.atan2(dy, dx) + (Number(projectile.direction) === 1 ? 0 : (Number(projectile.Center.Y) < Number(target.Center.Y) ? -Math.PI : Math.PI));
        projectile.rotation = Remap(state.shootTimer, 34, 20, Number(projectile.rotation), aimRotation, true);
        if (state.shootTimer < 20)
            state.shootTimer = 20;
        return;
    }

    state.shootTimer -= 2;
    if (state.shootTimer < 36)
        state.shootTimer = 36;
}

function DrawSupportBeam(spriteBatch, projectile, owner, state) {
    if (!(state.buffModeBuffer <= 0) || !PixelTexture || !owner)
        return;
    const dx = Number(Terraria.PlayerCenterX(owner)) - Number(projectile.Center.X);
    const dy = Number(Terraria.PlayerCenterY(owner)) - Number(projectile.Center.Y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (!(distance < 240 && distance > 2))
        return;
    const draw = spriteBatch[DrawScaledTexture];
    if (!draw)
        return;
    const pulse = 0.65 + Math.sin(Number(Terraria.Main.GlobalTimeWrappedHourly || 0) * 6 + Number(projectile.whoAmI)) * 0.2;
    const position = SetVector(
        BeamPosition,
        Number(projectile.Center.X) - Number(Terraria.Main.screenPosition.X),
        Number(projectile.Center.Y) - Number(Terraria.Main.screenPosition.Y)
    );
    draw(
        PixelTexture,
        position,
        null,
        BeamColors[Math.max(0, Math.min(15, Math.round(pulse * 15)))],
        Math.atan2(dy, dx),
        BeamOrigin,
        SetVector(BeamScale, distance, 3.5 + pulse * 2),
        SpriteEffects.None,
        0
    );
}

function DrawMuzzleFlash(spriteBatch, projectile, state) {
    if (!(state.muzzleFlashTime > 0) || !BurstTexture)
        return;
    const draw = spriteBatch[DrawScaledTexture];
    if (!draw)
        return;
    const opacity = Math.pow(Clamp(state.muzzleFlashTime / 20, 0, 1), 1.7);
    const position = SetVector(
        MuzzlePosition,
        Number(projectile.Center.X) - Number(Terraria.Main.screenPosition.X),
        Number(projectile.Center.Y) - Number(Terraria.Main.screenPosition.Y) + 2
    );
    draw(
        BurstTexture,
        position,
        null,
        MuzzleColors[Math.max(0, Math.min(15, Math.round(opacity * 15)))],
        Math.PI / 2,
        MuzzleOrigin,
        SetVector(MuzzleScale, 1.2, 2 - opacity * 1.33),
        SpriteEffects.None,
        0
    );
}

export function ForceWulfrumDroidEmote(sweat = false) {
    const droidType = Number(ModProjectile.getTypeByName('WulfrumDroid') || 0);
    if (!(droidType > 0))
        return { ok: false, reason: 'Wulfrum Droid não registrado.' };
    for (let i = 0; i < 1000; i++) {
        const projectile = Terraria.Main.projectile[i];
        if (!projectile || !projectile.active || Number(projectile.type) !== droidType)
            continue;
        const state = GetDroidState(projectile);
        BeginDroidEmote(projectile, state, sweat);
        return { ok: true, index: i, kind: sweat ? 'sweat' : 'normal' };
    }
    return { ok: false, reason: 'Nenhum Wulfrum Droid ativo.' };
}

export function GetWulfrumDroidEmoteStatus() {
    const droidType = Number(ModProjectile.getTypeByName('WulfrumDroid') || 0);
    if (!(droidType > 0))
        return 'type=missing';
    for (let i = 0; i < 1000; i++) {
        const projectile = Terraria.Main.projectile[i];
        if (!projectile || !projectile.active || Number(projectile.type) !== droidType)
            continue;
        const state = GetDroidState(projectile);
        const mode = state.buffModeBuffer <= 0 ? 'support' : 'attack';
        const behavior = state.behavior === BEHAVIOR_IDLE ? 'idle' : 'aggressive';
        return `slot=${i} mode=${mode} buffer=${state.buffModeBuffer} behavior=${behavior} target=${state.target} shoot=${state.shootTimer} frame=${projectile.frame} emotes=${state.emotes.length} spawned=${state.normalEmotes}/${state.sweatEmotes} shots=${state.shots} speed=${Math.sqrt(Number(projectile.velocity.X) ** 2 + Number(projectile.velocity.Y) ** 2).toFixed(2)} pos=${Number(projectile.position.X).toFixed(0)},${Number(projectile.position.Y).toFixed(0)} idleMoves=${state.idleMovementTicks} roverTimer=${state.supportRechargeTimer} scans=${state.targetScans} los=${state.losChecks} clump=${state.antiClumpPasses}`;
    }
    return 'droid=inactive';
}

export class WulfrumDroid extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/WulfrumDroid';
        this.BuffType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 24;
        Terraria.Main.projPet[this.Type] = true;
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
            Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 86;
        projectile.height = 44;
        projectile.netImportant = true;
        projectile.friendly = true;
        projectile.hostile = false;
        projectile.ignoreWater = true;
        projectile.minionSlots = 1;
        projectile.timeLeft = 90000;
        projectile.penetrate = -1;
        projectile.tileCollide = false;
        projectile.minion = true;
    }

    PostSetupContent() {
        this.BuffType = Number(ModBuff.getTypeByName('WulfrumDroidBuff') || 0);
        LoadTextures();
    }

    AI(projectile) {
        const owner = Terraria.Main.player[projectile.owner];
        if (!owner || !owner.active || owner.dead) {
            projectile.Kill();
            return;
        }

        if (!(this.BuffType > 0))
            this.BuffType = Number(ModBuff.getTypeByName('WulfrumDroidBuff') || 0);
        let hasBuff = false;
        try { hasBuff = this.BuffType > 0 && owner.FindBuffIndex(this.BuffType) >= 0; } catch (e) { }
        if (!hasBuff) {
            projectile.Kill();
            return;
        }

        try { owner.AddBuff(this.BuffType, 3600, true); } catch (e) { }
        projectile.timeLeft = 2;

        const state = GetDroidState(projectile);
        RegisterActiveDroid(projectile);
        const controller = ControllerPlayer();
        state.timer++;

        if (!state.initialized) {
            state.initialized = true;
            state.shootTimer = SHOOT_DELAY;
            state.buffModeBuffer = controller && controller.GetMode(owner) ? -15 : 15;
            state.soundDelay = NewSoundDelay(owner, this.Type);
            state.targetScanTimer = 1 + (Math.max(0, ProjectileSlot(projectile)) % 4);
            state.targetLosTimer = 0;
            state.ownerLosTimer = Math.max(0, ProjectileSlot(projectile)) % OWNER_LOS_INTERVAL;
            SpawnArrivalDust(projectile);
            TryOfficialSound('spawn', projectile);
        }

        const supportRequested = controller ? controller.GetMode(owner) : false;
        const previousMode = state.lastMode;
        const buffMode = UpdateModeBuffer(state, supportRequested);
        if (state.lastMode !== previousMode)
            projectile.netUpdate = true;
        UpdateBaseAnimation(projectile, buffMode);
        ApplyAntiClump(projectile, state);

        let chirped = false;
        if (state.soundDelay > 0)
            state.soundDelay--;
        else {
            TryOfficialSound('chirp', projectile);
            state.soundDelay = NewSoundDelay(owner, this.Type);
            chirped = true;
        }

        if (state.targetScanTimer > 0)
            state.targetScanTimer--;
        if (state.targetLosTimer > 0)
            state.targetLosTimer--;

        if (buffMode) {
            state.target = -1;
            state.targetVisible = false;
        } else {
            const cachedTarget = state.target >= 0 && state.target < 200 ? Terraria.Main.npc[state.target] : null;
            if (!TargetQuickValid(projectile, cachedTarget)) {
                state.target = -1;
                state.targetVisible = false;
            } else if (state.targetLosTimer <= 0) {
                state.targetVisible = TargetHasLine(projectile, cachedTarget, state);
                state.targetLosTimer = TARGET_LOS_INTERVAL;
                if (!state.targetVisible)
                    state.target = -1;
            }

            if (state.targetScanTimer <= 0) {
                state.targetScanTimer = TARGET_SCAN_INTERVAL;
                state.target = FindTarget(projectile, owner, state);
                state.targetVisible = state.target >= 0;
                state.targetLosTimer = TARGET_LOS_INTERVAL;
            }
        }

        const target = state.target >= 0 && state.target < 200 ? Terraria.Main.npc[state.target] : null;
        const hasTarget = !buffMode && state.targetVisible && TargetQuickValid(projectile, target);
        if (!hasTarget) {
            state.target = -1;
            state.targetVisible = false;
        }

        if (chirped && !hasTarget)
            BeginDroidEmote(projectile, state, false);

        const ownerDistance = Math.sqrt(DistanceSquared(projectile.Center.X, projectile.Center.Y, Terraria.PlayerCenterX(owner), Terraria.PlayerCenterY(owner)));
        const separationDistance = hasTarget ? 1000 : 500;
        if (hasTarget && ownerDistance <= separationDistance && state.behavior === BEHAVIOR_IDLE && state.ownerVisible)
            state.behavior = BEHAVIOR_AGGRESSIVE;
        if (ownerDistance > separationDistance) {
            state.behavior = BEHAVIOR_IDLE;
            projectile.netUpdate = true;
            if (!state.hurryActive) {
                TryOfficialSound('hurry', projectile);
                state.hurryActive = true;
                state.soundDelay = 10010;
            }
            if (state.emotes.length < 4 && Rand.Next(7) === 0)
                BeginDroidEmote(projectile, state, true);
        } else if (state.hurryActive) {
            state.hurryActive = false;
            state.soundDelay = NewSoundDelay(owner, this.Type);
        }

        if (hasTarget && state.behavior === BEHAVIOR_AGGRESSIVE)
            MoveAggressively(projectile, target, state);
        else
            FollowOwnerOrSupport(projectile, owner, state, buffMode, controller);

        projectile.rotation = Number(projectile.velocity.X) * 0.05;
        const horizontalDirection = Math.sign(Number(projectile.velocity.X));
        if (horizontalDirection !== 0)
            projectile.spriteDirection = projectile.direction = horizontalDirection;

        if (!buffMode && hasTarget)
            ChargeUpAndFire(projectile, target, state, false);
        else if (state.shootTimer !== SHOOT_DELAY)
            state.shootTimer = SHOOT_DELAY;

        if (state.muzzleFlashTime > 0)
            state.muzzleFlashTime--;
        UpdateDroidEmotes(state);
    }

    PreDraw(projectile, lightColor) {
        try {
            LoadTextures();
            const state = GetDroidState(projectile);
            const owner = Terraria.Main.player[projectile.owner];
            DrawSupportBeam(Terraria.Main.spriteBatch, projectile, owner, state);
        } catch (e) { }
        return true;
    }

    PostDraw(projectile, lightColor) {
        try {
            LoadTextures();
            const state = GetDroidState(projectile);
            DrawMuzzleFlash(Terraria.Main.spriteBatch, projectile, state);
            DrawDroidEmotes(Terraria.Main.spriteBatch, state);
        } catch (e) { }
    }

    OnKill(projectile, timeLeft) {
        RemoveActiveDroid(projectile);
    }
}
