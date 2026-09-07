import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { AndroidSound } from './../../../Common/Snippets/AndroidSound.js';
import { IsRogueItem, GetRogueState, MarkRogueProjectile } from './../../../Core/RogueRuntime.js';
import {
    LuxorClass,
    Clamp,
    GetLerpValue,
    DirectionVector,
    RotateVector,
    SetVelocity,
    AddClassLight,
    SpawnClassDust,
    DrawGlow
} from './../LuxorProjectileUtils.js';

const { Vector2 } = Modules;
const MAX_PROJECTILES = 1000;
const CrystalStates = new Array(MAX_PROJECTILES);
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
// TLPro mobile compatibility:
 // The vanilla DD2_WitherBeastCrystalImpact is a LegacySoundStyle NativeObject.
 // Accessing or playing it through the TLPro bridge causes a full reflection/member
 // enumeration on this runtime, producing a large frame hitch per Luxor attack.
 // Keep the Calamity custom GunShotSmall layer, which is the dominant audible cue,
 // and omit only the problematic secondary vanilla DD2 layer on TLPro.
let CachedLuxorPlayer = null;
function GetLuxorPlayer() {
    if (CachedLuxorPlayer)
        return CachedLuxorPlayer;
    try { CachedLuxorPlayer = ModPlayer.getByName('LuxorPlayer'); } catch (e) { CachedLuxorPlayer = null; }
    return CachedLuxorPlayer;
}
const AttackData = [
    { speed: 50, damage: 9, name: 'LuxorsGiftClassless' },
    { speed: 100, damage: 10, name: 'LuxorsGiftMelee' },
    { speed: 25, damage: 5, name: 'LuxorsGiftRanged' },
    { speed: 75, damage: 13, name: 'LuxorsGiftMagic' },
    { speed: 140, damage: 22, name: 'LuxorsGiftSummon' },
    { speed: 36, damage: 8, name: 'LuxorsGiftRogue' }
];

function ProjectileSlot(projectile) {
    const slot = Math.floor(Number(projectile && projectile.whoAmI));
    return slot >= 0 && slot < MAX_PROJECTILES ? slot : -1;
}

function Identity(projectile) {
    const identity = Number(projectile && projectile.identity);
    return Number.isFinite(identity) ? Math.floor(identity) : ProjectileSlot(projectile);
}

function GetState(projectile) {
    const slot = ProjectileSlot(projectile);
    const create = () => ({
        identity: Identity(projectile),
        owner: Math.floor(Number(projectile.owner)),
        type: Math.floor(Number(projectile.type)),
        initialized: false,
        lastClass: LuxorClass.Classless,
        rogueChain: true,
        postFireBoost: 0,
        shots: 0,
        lastHeldType: -1,
        timersInitialized: false,
        time: 0,
        attackTimer: 60,
        idleTimer: 0,
        syncTimer: 0
    });
    if (slot < 0)
        return create();
    let state = CrystalStates[slot];
    const identity = Identity(projectile);
    const owner = Math.floor(Number(projectile.owner));
    const type = Math.floor(Number(projectile.type));
    if (!state || state.identity !== identity || state.owner !== owner || state.type !== type) {
        state = create();
        CrystalStates[slot] = state;
    }
    return state;
}

function PlayerCenter(player) {
    try { return Terraria.PlayerCenter(player); } catch (e) { }
    return Vector2.new(Number(player.position.X) + Number(player.width) * 0.5, Number(player.position.Y) + Number(player.height) * 0.5);
}

function MouseWorld(player) {
    try {
        const mouse = Terraria.Main.MouseWorld;
        if (mouse)
            return mouse;
    } catch (e) { }
    const center = PlayerCenter(player);
    const direction = Number(player.direction) < 0 ? -1 : 1;
    return Vector2.new(Number(center.X) + direction * 400, Number(center.Y));
}

function IsTool(item) {
    if (!item)
        return false;
    return Number(item.axe) > 0 || Number(item.hammer) > 0 || Number(item.pick) > 0;
}

function ClassifyHeldItem(player, previousClass) {
    const item = player && player.HeldItem;
    if (!item)
        return LuxorClass.Classless;
    if (IsTool(item) && Number(previousClass) >= 0)
        return Number(previousClass);
    try {
        if (IsRogueItem(item))
            return LuxorClass.Rogue;
    } catch (e) { }
    if (item.melee === true)
        return LuxorClass.Melee;
    if (item.ranged === true)
        return LuxorClass.Ranged;
    if (item.magic === true)
        return LuxorClass.Magic;
    if (item.summon === true)
        return LuxorClass.Summon;
    return LuxorClass.Classless;
}

function ClassDamageMultiplier(player, classType) {
    let multiplier = 1;
    try {
        if (classType === LuxorClass.Melee)
            multiplier = Number(player.meleeDamage);
        else if (classType === LuxorClass.Ranged)
            multiplier = Number(player.rangedDamage);
        else if (classType === LuxorClass.Magic)
            multiplier = Number(player.magicDamage);
        else if (classType === LuxorClass.Summon)
            multiplier = Number(player.minionDamage);
        else if (classType === LuxorClass.Rogue) {
            const rogue = GetRogueState(player);
            multiplier = 1 + Math.max(0, Number(rogue && rogue.RogueDamageBonus) || 0);
        }
    } catch (e) { }
    if (!Number.isFinite(multiplier) || multiplier <= 0)
        multiplier = 1;
    return multiplier;
}

function SpawnProjectile(player, source, position, velocity, type, damage, ai0 = 0, timeLeft = null) {
    if (!(Number(type) > 0))
        return null;
    let slot = -1;
    try {
        slot = NewProjectile(
            source,
            position,
            velocity,
            Number(type),
            Math.max(1, Math.floor(Number(damage) || 1)),
            0,
            Number(Terraria.PlayerIndex(player)),
            Number(ai0) || 0,
            0,
            0,
            null
        );
    } catch (e) {
        return null;
    }
    if (!(slot >= 0 && slot < MAX_PROJECTILES))
        return null;
    const projectile = Terraria.Main.projectile[slot];
    if (!projectile)
        return null;
    projectile.originalDamage = Math.max(1, Math.floor(Number(damage) || 1));
    projectile.armorPenetration = 35;
    if (timeLeft != null)
        projectile.timeLeft = Math.max(1, Math.floor(Number(timeLeft) || 1));
    return projectile;
}

function FireSound(projectile) {
    const center = projectile.Center;
    // Calamity PC layers GunShotSmall with DD2_WitherBeastCrystalImpact.
    // TLPro cannot touch that LegacySoundStyle without a reflection hitch, so
    // the mobile port keeps the official GunShotSmall layer and omits only the
    // secondary vanilla DD2 layer for performance.
    try {
        AndroidSound.PlayCachedExclusive(
            `luxor-shot-${Number(projectile.owner)}`,
            'Sounds/Luxor/GunShotSmall.ogg',
            0.35,
            Number(center.X),
            Number(center.Y),
            1100,
            100,
            4,
            false
        );
    } catch (e) { }
}

function FireLuxor(projectile, player, classType, state) {
    const data = AttackData[classType] || AttackData[LuxorClass.Classless];
    const type = Number(ModProjectile.getTypeByName(data.name) || 0);
    if (!(type > 0))
        return false;
    const mouse = MouseWorld(player);
    const direction = DirectionVector(projectile.Center, mouse, 12, Number(player.direction) < 0 ? -1 : 1, 0);
    const tip = Vector2.new(
        Number(projectile.Center.X) + Math.cos(Number(projectile.rotation) - Math.PI / 2) * 15,
        Number(projectile.Center.Y) + Math.sin(Number(projectile.rotation) - Math.PI / 2) * 15
    );
    let source = null;
    try { source = player.GetProjectileSource_Item(player.HeldItem); } catch (e) { }
    const damage = Math.max(1, Math.floor(Number(data.damage) * ClassDamageMultiplier(player, classType)));

    const power = GetLerpValue(-120, 140, data.speed, true);
    SpawnClassDust(projectile, classType, Math.max(3, Math.floor(10 * power)), 0.9 + power * 0.5, 0.55);

    if (classType === LuxorClass.Melee) {
        for (let j = -1; j <= 1; j++) {
            const randomAngle = -0.12 * j * (0.7 + Math.random() * 0.3);
            const velocity = RotateVector(direction, randomAngle, (12 - Math.random() * 0.6 - Math.abs(j)) / 12);
            SpawnProjectile(player, source, tip, velocity, type, damage, 0, null);
        }
        for (let i = 0; i < 5; i++) {
            const velocity = RotateVector(direction, (Math.random() * 2 - 1) * 0.4, (7 + Math.random() * 3) / 12);
            SpawnProjectile(player, source, tip, velocity, type, damage, 5, 95);
        }
    } else {
        const shot = SpawnProjectile(player, source, tip, direction, type, damage, 0, null);
        if (shot && classType === LuxorClass.Rogue) {
            SetVelocity(shot, Number(shot.velocity.X), Number(shot.velocity.Y) - 1.5);
            MarkRogueProjectile(shot, 'LuxorsGift', true);
        }
    }

    FireSound(projectile);
    state.shots++;
    state.postFireBoost = 1.7;
    return true;
}

export class Luxor extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/Luxor';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 114;
        projectile.height = 38;
        projectile.ignoreWater = true;
        projectile.timeLeft = 300;
        projectile.tileCollide = false;
        projectile.friendly = false;
        projectile.hostile = false;
        projectile.penetrate = -1;
        projectile.netImportant = true;
    }

    AI(projectile) {
        const owner = Terraria.Main.player[projectile.owner];
        const playerState = GetLuxorPlayer();
        if (!owner || !owner.active || owner.dead || !playerState) {
            projectile.Kill();
            return;
        }

        const state = GetState(projectile);
        const ownerIndex = Math.floor(Number(projectile.owner));
        const functional = ownerIndex >= 0 && playerState.Functional[ownerIndex] === true;
        const vanity = ownerIndex >= 0 && playerState.Vanity[ownerIndex] === true;
        if (!functional && !vanity) {
            projectile.Kill();
            return;
        }
        const vanityOnly = vanity && !functional;

        if (!state.timersInitialized) {
            try {
                const ai = new ProjAI(projectile, false);
                const localAI = new ProjAI(projectile, true);
                state.time = Number(ai[0]) || 0;
                state.attackTimer = Math.max(0, Number(ai[1]) || 0);
                state.idleTimer = Math.max(0, Number(localAI[0]) || 0);
            } catch (e) { }
            state.timersInitialized = true;
        }
        let time = Number(state.time) || 0;
        let attackTimer = Math.max(0, Number(state.attackTimer) || 0);
        let idleTimer = Math.max(0, Number(state.idleTimer) || 0);
        let pendingHit = ownerIndex >= 0 && playerState.HitPending[ownerIndex] === true;
        let heldType = -1;
        try { heldType = Math.floor(Number(owner.HeldItem && owner.HeldItem.type) || 0); } catch (e) { }
        let classType = state.lastClass;
        if (!state.initialized || heldType !== state.lastHeldType) {
            classType = ClassifyHeldItem(owner, state.lastClass);
            state.lastHeldType = heldType;
        }

        if (!state.initialized || classType !== state.lastClass) {
            state.initialized = true;
            state.lastClass = classType;
            attackTimer = 60;
            try { projectile.netUpdate = true; } catch (e) { }
        }
        if (ownerIndex >= 0)
            playerState.LastClass[ownerIndex] = Math.max(0, Math.floor(Number(classType) || 0));

        const mouse = MouseWorld(owner);
        const ownerCenter = PlayerCenter(owner);
        const aimDirection = DirectionVector(projectile.Center, mouse, 1, Number(owner.direction) < 0 ? -1 : 1, 0);
        const idleFade = GetLerpValue(280, 300, idleTimer, true);
        const activeDistance = 70 + 100 * GetLerpValue(0, 110, attackTimer, true);
        const activeX = Number(ownerCenter.X) - Number(aimDirection.X) * activeDistance;
        const activeY = Number(ownerCenter.Y) - Number(aimDirection.Y) * activeDistance;
        const idleX = Number(ownerCenter.X);
        const idleY = Number(ownerCenter.Y) - 40;
        const destinationX = activeX + (idleX - activeX) * idleFade;
        const destinationY = activeY + (idleY - activeY) * idleFade;
        SetVelocity(projectile, (destinationX - Number(projectile.Center.X)) / 6, (destinationY - Number(projectile.Center.Y)) / 6);
        projectile.rotation = Math.atan2(Number(mouse.Y) - Number(projectile.Center.Y), Number(mouse.X) - Number(projectile.Center.X)) + Math.PI / 2;

        if (idleTimer >= 280) {
            if (pendingHit) {
                idleTimer = Math.max(280, idleTimer - 1);
            } else {
                attackTimer = 40;
            }
        }

        if (functional) {
            if (attackTimer <= 0 && pendingHit) {
                const fired = FireLuxor(projectile, owner, classType, state);
                if (fired) {
                    if (classType === LuxorClass.Rogue && state.rogueChain) {
                        state.rogueChain = false;
                        attackTimer = Math.max(1, Math.floor(AttackData[classType].speed / 3));
                    } else {
                        state.rogueChain = true;
                        attackTimer = AttackData[classType].speed;
                        if (ownerIndex >= 0 && playerState.HitPending[ownerIndex] === true) {
                            playerState.HitPending[ownerIndex] = false;
                            playerState.Shots[ownerIndex]++;
                            playerState.LastShotClass[ownerIndex] = Math.max(0, Math.floor(Number(classType) || 0));
                            pendingHit = false;
                        }
                        idleTimer = 0;
                    }
                } else {
                    attackTimer = 20;
                }
            }
            if (attackTimer > 0)
                attackTimer--;
            if (state.postFireBoost > 0)
                state.postFireBoost = Math.max(0, state.postFireBoost - 0.2);
        } else {
            attackTimer = Math.max(attackTimer, 40);
            idleTimer = 0;
        }

        const condense = vanityOnly ? 0 : Math.pow(GetLerpValue(280, 300, idleTimer, true), 5);
        projectile.scale = Clamp(1 - condense * 0.82, 0.18, 1);
        projectile.alpha = Math.floor(condense * 130);
        const pulse = 0.8 + Math.sin(time * 0.12) * 0.2;
        AddClassLight(projectile, classType, (0.75 + state.postFireBoost * 0.15) * pulse);

        projectile.timeLeft = 2;
        time++;
        if (!pendingHit && !vanityOnly)
            idleTimer++;
        if (vanityOnly)
            idleTimer = 0;
        idleTimer = Math.min(320, idleTimer);

        state.time = time;
        state.attackTimer = attackTimer;
        state.idleTimer = idleTimer;

        // Preserve network-visible AI without crossing NativeObject ai/localAI
        // four times every frame. Twelve ticks is enough for passive companion
        // state while local behavior remains frame-accurate in JS state.
        state.syncTimer = (Math.floor(Number(state.syncTimer) || 0) + 1) % 12;
        if (state.syncTimer === 0 || projectile.netUpdate === true) {
            try {
                const ai = new ProjAI(projectile, false);
                const localAI = new ProjAI(projectile, true);
                ai[0] = time;
                ai[1] = attackTimer;
                localAI[0] = idleTimer;
                localAI[1] = classType;
            } catch (e) { }
        }
    }

    CanDamage(projectile) {
        return false;
    }

    PreDraw(projectile, lightColor) {
        const state = GetState(projectile);
        const classType = Math.max(0, Math.floor(Number(state.lastClass) || 0));
        const scale = Number(projectile.scale);
        // Once the crystal is fully condensed the four halo copies overlap
        // almost completely. Keep the same center sprite and light, but skip
        // redundant halo draws that are visually indistinguishable on mobile.
        const copies = scale <= 0.24 ? 0 : 4;
        return DrawGlow(projectile, lightColor, classType, 3, copies, scale, scale, 0);
    }

    OnKill(projectile, timeLeft) {
        const slot = ProjectileSlot(projectile);
        if (slot >= 0)
            CrystalStates[slot] = null;
    }
}
