import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModSystem } from './../../../../TL/ModSystem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { FusionVFXSystem } from './../../../../Core/FusionVFXSystem.js';
import { FusionCamera } from './../../../../Core/FusionCamera.js';
import { BossIntroRuntime } from './../../../../Core/BossIntroRuntime.js';
import { BossPhaseVFX } from './../../../../Core/BossPhaseVFX.js';

const { Color, Vector2 } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const { ItemDropRule, Conditions } = Terraria.GameContent.ItemDropRules;
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const CrabulonDustType = 56;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
const CanHit = Terraria.Collision['bool CanHit(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'];
function Tell(text, r = 90, g = 220, b = 255) {
    try {
        NewText(String(text), r, g, b);
    } catch (e) { }
}

function SpawnDrop(npc, type, stack = 1) {
    if (!(Number(type) > 0) || Terraria.Main.netMode === 1)
        return;
    try {
        NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), Math.max(1, npc.width), Math.max(1, npc.height), Math.floor(Number(type)), Math.max(1, Math.floor(Number(stack))), false, -1, true);
    } catch (e) { }
}

function DeactivateNoLoot(npc) {
    if (!npc)
        return;
    try {
        npc.active = false;
        npc.netUpdate = true;
        npc.timeLeft = 0;
    } catch (e) { }
    try {
        CalamityNPCState.Remove(npc);
    } catch (e) { }
}

function CleanupAbandonedCrabulon(npc) {
    const shroomType = ModNPC.getTypeByName('CrabShroom');
    if (shroomType > 0) {
        for (let i = 0; i < 200; i++) {
            const shroom = Terraria.Main.npc[i];
            if (!shroom || !shroom.active || shroom.type !== shroomType)
                continue;
            DeactivateNoLoot(shroom);
        }
    }
    DeactivateNoLoot(npc);
}

function GetCrabulonWeapons() {
    return [
        Number(ModItem.getTypeByName('MycelialClaws') || 0),
        Number(ModItem.getTypeByName('Fungicide') || 0),
        Number(ModItem.getTypeByName('HyphaeRod') || 0),
        Number(ModItem.getTypeByName('Mycoroot') || 0),
        Number(ModItem.getTypeByName('InfestedClawmerang') || 0),
        Number(ModItem.getTypeByName('PuffShroom') || 0)
    ].filter(type => type > 0);
}

function DropClassicWeaponsWithPity(npc) {
    if (Terraria.Main.expertMode === true || Terraria.Main.masterMode === true)
        return;
    const weapons = GetCrabulonWeapons();
    let weaponDropped = false;
    for (const weapon of weapons) {
        if (Math.random() >= 0.25)
            continue;
        SpawnDrop(npc, weapon, 1);
        weaponDropped = true;
    }

    if (!weaponDropped && weapons.length === 6) {
        SpawnDrop(npc, weapons[Math.floor(Math.random() * weapons.length)], 1);
    }
}

function PlaySound(id, position, style = 1, pitch = 0) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](id, position, style, pitch);
    } catch (e) { }
}

function ResolveCrabulonSound(name, fallback) {
    try {
        const sound = Terraria.ID.SoundID[name];
        if (sound)
            return sound;
    } catch (e) { }
    return fallback;
}

function ResolveCrabulonHitVariant(preferredIndex = 0) {
    const normalized = Math.max(0, Math.min(2, Math.floor(Number(preferredIndex) || 0)));
    const order = normalized === 0
        ? ['Item178', 'Item179', 'Item180']
        : (normalized === 1 ? ['Item179', 'Item180', 'Item178'] : ['Item180', 'Item178', 'Item179']);
    for (const name of order) {
        const sound = ResolveCrabulonSound(name, null);
        if (sound)
            return sound;
    }
    return Terraria.ID.SoundID.NPCHit1;
}

function GetCurrentCrabulonHitSound() {
    return ResolveCrabulonHitVariant(Math.floor(Math.random() * 3));
}

function QueueNextCrabulonHitSound(npc) {
    if (!npc || Number(npc.life) <= 0)
        return;
    try {
        npc.HitSound = GetCurrentCrabulonHitSound();
    } catch (e) { }
}

function GetCurrentCrabulonDeathSound() {
    return ResolveCrabulonSound('Item181', Terraria.ID.SoundID.NPCDeath1);
}

function PlayCurrentCrabulonJump(position) {
    // Item_141 is the already validated native CrabJump replacement.
    PlaySound(2, position, 141, 0);
}

function PlayCurrentCrabulonSlam(position) {
    // Item_142 / Item_143 are the already validated native CrabSlam variants.
    PlaySound(2, position, Math.random() < 0.5 ? 142 : 143, 0);
}

let CachedWorldState = null;
function GetWorldState() {
    if (!CachedWorldState)
        CachedWorldState = ModSystem.getByName('CalamityWorldState');
    return CachedWorldState;
}

function Normalize(x, y, fallbackX = 0, fallbackY = 1) {
    const length = Math.sqrt(x * x + y * y);
    if (!(length > 0.0001))
        return { x: fallbackX, y: fallbackY };
    return { x: x / length, y: y / length };
}

function IsInsideSolid(npc) {
    try {
        return !!SolidCollision(npc.position, npc.width, npc.height);
    } catch (e) {
        return false;
    }
}

function CanHitPlayer(npc, player) {
    try {
        return !!CanHit(npc.position, npc.width, npc.height, Terraria.PlayerCenter(player), 1, 1);
    } catch (e) {
        return false;
    }
}

function IsSourceGrounded(npc, spawnGrace = 0) {
    if (Number(spawnGrace) > 0)
        return false;
    if (npc.collideY === true)
        return true;
    if (npc.noTileCollide === true)
        return false;
    const velocityY = Number(npc.velocity.Y);
    if (velocityY !== 0)
        return false;
    try {
        return !!SolidCollision(Vector2.new(Number(npc.position.X) + 8, Number(npc.position.Y) + Number(npc.height)), Math.max(1, Number(npc.width) - 16), 4);
    } catch (e) {
        return true;
    }
}

function UpdateSourceJumpTileCollision(npc, player) {
    if (!player || player.dead)
        return;
    const velocityY = Number(npc.velocity.Y);
    const playerY = Number(Terraria.PlayerPositionY(player));
    const bottomY = Number(npc.Bottom.Y);
    if ((playerY > bottomY && velocityY > 0) ||
        (playerY < bottomY && velocityY < 0)) {
        npc.noTileCollide = true;
        return;
    }
    if ((velocityY > 0 && bottomY > playerY) ||
        (CanHitPlayer(npc, player) && !IsInsideSolid(npc))) {
        npc.noTileCollide = false;
    }
}

export class Crabulon extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/Crabulon/Crabulon';
        this.Music = Number(Terraria.ID.MusicID.OtherworldlyBoss1 || 81);
        this.ContactDamage = 40;
        this.WalkTexture = null;
        this.WalkGlowTexture = null;
        this.AttackTexture = null;
        this.AttackGlowTexture = null;
        this.IdleGlowTexture = null;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 6;
        try {
            Terraria.ID.NPCID.Sets.BossBestiaryPriority.Add(this.Type);
        } catch (e) { }
        try {
            Terraria.ID.NPCID.Sets.MPAllowedEnemies[this.Type] = true;
        } catch (e) { }
    }

    PostSetupContent() {
        try {
            this.WalkTexture = tl.texture.load('Textures/NPCs/Bosses/Crabulon/CrabulonAlt.png');
            this.WalkGlowTexture = tl.texture.load('Textures/NPCs/Bosses/Crabulon/CrabulonAltGlow.png');
            this.AttackTexture = tl.texture.load('Textures/NPCs/Bosses/Crabulon/CrabulonAttack.png');
            this.AttackGlowTexture = tl.texture.load('Textures/NPCs/Bosses/Crabulon/CrabulonAttackGlow.png');
            this.IdleGlowTexture = tl.texture.load('Textures/NPCs/Bosses/Crabulon/CrabulonGlow.png');
        } catch (e) {
            this.WalkTexture = null;
            this.WalkGlowTexture = null;
            this.AttackTexture = null;
            this.AttackGlowTexture = null;
            this.IdleGlowTexture = null;
        }
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = 196;
        this.NPC.height = 196;
        this.NPC.damage = this.ContactDamage;
        this.NPC.defense = 8;
        const world = GetWorldState();
        this.NPC.lifeMax = world && world.RevengeanceMode === true ? 4400 : 3500;
        this.NPC.knockBackResist = 0;
        this.NPC.value = ModNPC.NPCValue(0, 5, 0, 0);
        this.NPC.npcSlots = 14;
        this.NPC.noGravity = false;
        this.NPC.noTileCollide = false;
        this.NPC.boss = true;
        this.NPC.netAlways = true;
        this.NPC.HitSound = GetCurrentCrabulonHitSound();
        this.NPC.DeathSound = GetCurrentCrabulonDeathSound();
        try {
            if (Terraria.Main.getGoodWorld === true) {
                this.NPC.scale = Number(this.NPC.scale) * 1.5;
                this.NPC.defense += 12;
            }
        } catch (e) { }
    }

    SetBestiary(database, bestiaryEntry) {
        try {
            bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.UndergroundMushroom);
        } catch (e) { }
        try {
            const flavor = FlavorTextBestiaryInfoElement.new();
            flavor._key = ModLocalization.Translate('Bestiary.Crabulon');
            bestiaryEntry.Info.Add(flavor);
        } catch (e) { }
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.phase = 0;
        state.phaseTimer = 0;
        state.shotTimer = 0;
        state.spawnGrace = 50;
        state.wasAirborne = false;
        state.wasDescending = false;
        state.landedOnce = false;
        state.stompCount = 0;
        state.stompSeries = 0;
        state.jumpVariant = 0;
        state.specialLeapLaunched = false;
        state.specialLeapGroundY = 0;
        state.specialLeapTelegraphed = false;
        state.specialLeapShots = 0;
        state.specialLeapCount = 0;
        state.sourceAI3 = 0;
        state.tripleStompCount = 0;
        state.tripleStompCycles = 0;
        state.phase4Entered = false;
        state.phase2VfxShown = false;
        state.phase3VfxShown = false;
        state.phase4VfxShown = false;
        state.stompingAnimation = false;
        state.lastCrabShroomLife = Math.max(1, Number(npc.lifeMax));
        state.crabShroomWaves = 0;
        state.despawnTimer = 0;
        state.lastDirection = 1;
        state.volleyTelegraphed = false;
        state.jumpTelegraphed = false;
        npc.TargetClosest(false);
        BossIntroRuntime.Trigger(npc, 'crabulon');
    }

    GetDifficulty() {
        const world = GetWorldState();
        let goodWorld = false;
        try {
            goodWorld = Terraria.Main.getGoodWorld === true;
        } catch (e) { }
        const death = !!(world && world.DeathMode === true);
        return {
            expert: Terraria.Main.expertMode === true || Terraria.Main.masterMode === true,
            master: Terraria.Main.masterMode === true,
            revenge: death || !!(world && world.RevengeanceMode === true),
            death,
            goodWorld
        };
    }

    TelegraphMushVolley(npc, player, count) {
        if (Terraria.Main.netMode === 2 || !FusionVFXSystem.Enabled)
            return;
        const cx = Number(npc.Center.X);
        const cy = Number(npc.Center.Y) - 18;
        const dx = Number(Terraria.PlayerCenterX(player)) - cx;
        const dy = Number(Terraria.PlayerCenterY(player)) - cy;
        const direction = Normalize(dx, dy, Number(npc.direction) || 1, 0);
        const baseAngle = Math.atan2(direction.y, direction.x);
        const lineColor = { r: 100, g: 230, b: 255, a: 145 };
        const sparkColor = { r: 155, g: 245, b: 255, a: 175 };
        for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) * 0.5) * 0.14;
            const angle = baseAngle + spread;
            FusionVFXSystem.SpawnLine({ x: cx, y: cy }, { x: cx + Math.cos(angle) * 84, y: cy + Math.sin(angle) * 84 }, 1.5, lineColor, 12, { fadeIn: 3 });
        }
        for (let i = 0; i < 4; i++) {
            const angle = Math.PI * 2 * i / 4;
            FusionVFXSystem.SpawnDot({ x: cx + Math.cos(angle) * 18, y: cy + Math.sin(angle) * 18 }, { x: Math.cos(angle) * 0.22, y: Math.sin(angle) * 0.22 }, 2.5, sparkColor, 14, { drag: 0.94, fadeIn: 2 });
        }
    }

    TelegraphJump(npc, direction) {
        if (Terraria.Main.netMode === 2 || !FusionVFXSystem.Enabled)
            return;
        const x = Number(npc.Bottom.X);
        const y = Number(npc.Bottom.Y) - 7;
        const lineColor = { r: 105, g: 235, b: 255, a: 140 };
        const sparkColor = { r: 180, g: 255, b: 255, a: 180 };
        FusionVFXSystem.SpawnLine({ x, y }, { x: x + direction * 100, y: y - 24 }, 2, lineColor, 18, { fadeIn: 4 });
        for (let i = 0; i < 6; i++) {
            const offset = (i - 2.5) * 12;
            FusionVFXSystem.SpawnDot({ x: x + offset, y }, { x: direction * (0.12 + Math.abs(offset) * 0.002), y: -0.18 - Math.abs(offset) * 0.002 }, 2.5 + (i % 2), sparkColor, 18, { drag: 0.95, gravity: 0.01, fadeIn: 3 });
        }
    }

    TelegraphSpecialLeap(npc, player) {
        if (Terraria.Main.netMode === 2 || !FusionVFXSystem.Enabled)
            return;
        const startX = Number(npc.Bottom.X);
        const startY = Number(npc.Bottom.Y) - 7;
        const side = Number(Terraria.PlayerCenterX(player)) >= Number(npc.Center.X) ? 1 : -1;
        const targetX = Number(Terraria.PlayerCenterX(player)) + side * Math.min(220, Math.max(90, Math.abs(Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X))));
        const targetY = Number(Terraria.PlayerCenterY(player)) - 220;
        const lineColor = { r: 95, g: 225, b: 255, a: 150 };
        const sparkColor = { r: 170, g: 250, b: 255, a: 190 };
        const midX = (startX + targetX) * 0.5;
        const apexY = Math.min(startY - 150, targetY);
        FusionVFXSystem.SpawnLine({ x: startX, y: startY }, { x: midX, y: apexY }, 2, lineColor, 20, { fadeIn: 4 });
        FusionVFXSystem.SpawnLine({ x: midX, y: apexY }, { x: targetX, y: startY - 20 }, 2, lineColor, 20, { fadeIn: 4 });
        for (let i = 0; i < 7; i++) {
            const t = i / 6;
            const x = startX + (targetX - startX) * t;
            const y = startY - Math.sin(Math.PI * t) * 115;
            FusionVFXSystem.SpawnDot({ x, y }, { x: side * 0.08, y: -0.12 }, 2.5 + (i % 2), sparkColor, 20, { drag: 0.95, gravity: 0.01, fadeIn: 3 });
        }
    }

    SpawnSlamVFX(npc) {
        if (Terraria.Main.netMode !== 2 && FusionVFXSystem.Enabled) {
            const x = Number(npc.Bottom.X);
            const y = Number(npc.Bottom.Y) - 6;
            const waveColor = { r: 80, g: 220, b: 255, a: 155 };
            const burstColor = { r: 165, g: 250, b: 255, a: 205 };
            FusionVFXSystem.SpawnLine({ x, y }, { x: x - 125, y }, 2.5, waveColor, 18, { fadeIn: 2 });
            FusionVFXSystem.SpawnLine({ x, y }, { x: x + 125, y }, 2.5, waveColor, 18, { fadeIn: 2 });
            for (let i = 0; i < 8; i++) {
                const angle = Math.PI + Math.PI * i / 7;
                const speed = 1.1 + (i % 3) * 0.35;
                FusionVFXSystem.SpawnDot({ x, y }, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, 3 + (i % 2), burstColor, 24, { drag: 0.96, gravity: 0.035 });
            }
        }
        FusionCamera.ShakeAt(npc.Center, 14, 3, 1200);
    }

    ShootMushBomb(npc, player, speed, yLift, spread = 0) {
        if (Terraria.Main.netMode === 1)
            return;
        const type = ModProjectile.getTypeByName('MushBomb');
        if (!(type > 0))
            return;
        const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
        const dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
        const direction = Normalize(dx, dy, Number(npc.direction) || 1, 0);
        const baseAngle = Math.atan2(direction.y, direction.x) + spread;
        const velocity = Vector2.new(Math.cos(baseAngle) * speed, Math.sin(baseAngle) * speed - yLift);
        NewProjectile(null, npc.Center, velocity, type, 9, 0, Terraria.Main.myPlayer, 0, Number(Terraria.PlayerCenterY(player)), 0, null);
    }

    SpawnSpecialLeapMushBomb(npc, player, death = false) {
        if (Terraria.Main.netMode === 1)
            return;
        const type = ModProjectile.getTypeByName('MushBomb');
        if (!(type > 0))
            return;
        const source = null;
        const targetY = Number(Terraria.PlayerCenterY(player));
        if (death) {
            const amount = 3;
            const arc = 8 * Math.PI / 180;
            for (let i = 0; i < amount; i++) {
                const t = i / (amount - 1);
                const angle = -arc + arc * 2 * t;
                const velocity = Vector2.new(-Math.sin(angle), Math.cos(angle));
                NewProjectile(source, npc.Center, velocity, type, 9, 0, Terraria.Main.myPlayer, 0, targetY, 0, null);
            }
        } else {
            NewProjectile(source, npc.Center, Vector2.new(0, 2), type, 9, 0, Terraria.Main.myPlayer, 0, targetY, 0, null);
        }
    }

    SpawnGroundMushrooms(npc, perSide = 3, speed = 1, horizontalRange = 80, verticalRange = 20) {
        if (Terraria.Main.netMode === 1)
            return;
        const type = ModProjectile.getTypeByName('MushBombGround');
        if (!(type > 0))
            return;
        const amount = Math.max(1, Math.floor(Number(perSide) || 3));
        const xSpeed = Math.max(0.1, Number(speed) || 1);
        const range = Math.max(0, Math.floor(Number(horizontalRange) || 0));
        const yRange = Math.max(0, Math.floor(Number(verticalRange) || 0));
        const source = null;
        const originX = Number(npc.Bottom.X);
        const originY = Number(npc.Bottom.Y) - 8;
        for (let i = 0; i < amount; i++) {
            const velocity = xSpeed - i / amount * xSpeed;
            const rightX = originX + Math.floor(Math.random() * (range + 1));
            const leftX = originX - Math.floor(Math.random() * (range + 1));
            const rightY = originY - Math.floor(Math.random() * (yRange + 1));
            const leftY = originY - Math.floor(Math.random() * (yRange + 1));
            NewProjectile(source, Vector2.new(rightX, rightY), Vector2.new(velocity, 0), type, 9, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
            NewProjectile(source, Vector2.new(leftX, leftY), Vector2.new(-velocity, 0), type, 9, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
        }
    }

    SpawnTripleStompCurtain(npc) {
        if (Terraria.Main.netMode === 1)
            return;
        const type = ModProjectile.getTypeByName('MushBombFall');
        if (!(type > 0))
            return;
        const source = null;
        const columns = 5;
        const perColumn = 8;
        const originX = Number(npc.Bottom.X) - 210;
        const originY = Number(npc.Bottom.Y) - 8;
        const floorY = Number(npc.Bottom.Y) - 16;
        for (let column = 0; column < columns; column++) {
            let vx = 0;
            let vy = column === 0 ? 24 : 16;
            vy -= 8 * Math.abs(0.5 - column / (columns - 1));
            const spawn = Vector2.new(originX + 70 * (column + 1), originY);
            for (let row = 0; row < perColumn; row++) {
                vx += Math.random() - 0.5;
                const factor = 1 - row / perColumn;
                const velocity = Vector2.new(-vx * factor, -vy * factor);
                NewProjectile(source, spawn, velocity, type, 9, 0, Terraria.Main.myPlayer, 1, floorY, 0, null);
            }
        }
    }

    SpawnMushBombFallFan(npc, player, count, arcDegrees = 90, speed = 10, mode = 0) {
        if (Terraria.Main.netMode === 1)
            return;
        const type = ModProjectile.getTypeByName('MushBombFall');
        if (!(type > 0))
            return;
        const amount = Math.max(2, Math.min(16, Math.floor(Number(count) || 0)));
        const arc = Math.max(0, Number(arcDegrees)) * Math.PI / 180;
        const source = null;
        const targetY = Number(Terraria.PlayerCenterY(player));
        for (let i = 0; i < amount; i++) {
            const t = amount <= 1 ? 0 : i / (amount - 1);
            const angle = -arc + arc * 2 * t;
            const randomX = (Math.random() - 0.5) * 4;
            const randomY = (Math.random() - 0.5) * 4;
            const velocity = Vector2.new(Math.sin(angle) * speed + randomX, -speed + randomY);
            NewProjectile(source, npc.Center, velocity, type, 9, 0, Terraria.Main.myPlayer, Number(mode) || 0, targetY, 0, null);
        }
    }

    SpawnCrabShrooms(npc, player, amount, goodWorld = false) {
        if (Terraria.Main.netMode === 1)
            return;
        const type = ModNPC.getTypeByName('CrabShroom');
        if (!(type > 0))
            return;
        const spawnAmount = Math.max(0, Math.floor(Number(amount) || 0));
        const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
        const velocityScale = goodWorld ? 0.2 : 0.1;
        for (let i = 0; i < spawnAmount; i++) {
            const x = Math.floor(Number(npc.position.X) + Math.random() * Math.max(1, Number(npc.width) - 32));
            const y = Math.floor(Number(npc.position.Y) + Math.random() * Math.max(1, Number(npc.height) - 32));
            const index = Terraria.NPC.NewNPC(source, x, y, type, 0, 0, 0, 0, 0, 255);
            if (index >= 0 && index < 200) {
                const shroom = Terraria.Main.npc[index];
                shroom.velocity = Vector2.new((Math.floor(Math.random() * 101) - 50) * velocityScale, (Math.floor(Math.random() * 20) - 50) * velocityScale);
                shroom.netUpdate = true;
            }
        }
    }

    Slam(npc, state) {
        PlayCurrentCrabulonSlam(npc.Center);
        state.stompCount++;
        const sourceDust = 56;
        for (let x = Math.floor(Number(npc.position.X)) - 20; x < Math.floor(Number(npc.position.X)) + Number(npc.width) + 40; x += 20) {
            for (let i = 0; i < 4; i++) {
                const dust = NewDust(Vector2.new(Number(npc.position.X) - 20, Number(npc.position.Y) + Number(npc.height)), Number(npc.width) + 20, 4, sourceDust, 0, 0, 100, Color.White, 1.5);
                if (dust >= 0) {
                    const d = Terraria.Main.dust[dust];
                    d.velocity = Vector2.new(Number(d.velocity.X) * 0.2, Number(d.velocity.Y) * 0.2);
                }
            }
        }
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        const difficulty = this.GetDifficulty();
        if (BossIntroRuntime.ShouldHoldNPC(npc))
            return false;
        const lifeRatio = Math.max(0, Number(npc.life) / Math.max(1, Number(npc.lifeMax)));
        const phase2 = lifeRatio < 0.66 && difficulty.expert;
        const phase3 = lifeRatio < 0.33 && difficulty.expert;
        const phase4 = lifeRatio < 0.15 && difficulty.death;
        if (phase4 && state.phase4VfxShown !== true) {
            state.phase2VfxShown = true;
            state.phase3VfxShown = true;
            state.phase4VfxShown = true;
            BossPhaseVFX.Trigger(npc, 'crabulon', 3);
        } else if (phase3 && state.phase3VfxShown !== true) {
            state.phase2VfxShown = true;
            state.phase3VfxShown = true;
            BossPhaseVFX.Trigger(npc, 'crabulon', 2);
        } else if (phase2 && state.phase2VfxShown !== true) {
            state.phase2VfxShown = true;
            BossPhaseVFX.Trigger(npc, 'crabulon', 1);
        }
        if (phase4 && state.phase4Entered !== true) {
            state.phase4Entered = true;
            state.phaseTimer = 0;
        }
        if (state.retargetTimer <= 0 || npc.target < 0 || npc.target >= 255) {
            npc.TargetClosest(true);
            state.retargetTimer = 30;
        }
        let player = Terraria.Main.player[npc.target];
        if (!player || !player.active || player.dead) {
            npc.TargetClosest(false);
            player = Terraria.Main.player[npc.target];
        }
        const invalidTarget = !player || !player.active || player.dead ||
            Math.abs(Number(npc.Center.X) - Number(Terraria.PlayerCenterX(player))) > 8000;
        if (invalidTarget) {
            npc.TargetClosest(false);
            player = Terraria.Main.player[npc.target];
            const stillInvalid = !player || !player.active || player.dead ||
                Math.abs(Number(npc.Center.X) - Number(Terraria.PlayerCenterX(player))) > 8000;
            if (stillInvalid) {
                npc.damage = 0;
                npc.dontTakeDamage = true;
                npc.noTileCollide = true;
                const velocity = npc.velocity;
                if (Number(velocity.Y) < -3)
                    velocity.Y = -3;
                velocity.Y = Math.min(12, Number(velocity.Y) + 0.1);
                npc.velocity = velocity;
                npc.timeLeft = Math.min(Number(npc.timeLeft), 60);
                state.despawnTimer = Number(state.despawnTimer || 0) + 1;
                state.phase = 0;
                state.phaseTimer = 0;
                state.stompSeries = 0;
                state.sourceAI3 = 0;
                if (state.despawnTimer >= 60)
                    CleanupAbandonedCrabulon(npc);
                return false;
            }
        }
        state.despawnTimer = 0;
        npc.dontTakeDamage = false;
        if (Number(npc.timeLeft) < 1800)
            npc.timeLeft = 1800;
        npc.spriteDirection = Number(npc.direction) || 1;
        const grounded = IsSourceGrounded(npc, state.spawnGrace);
        if (state.spawnGrace > 0) {
            state.spawnGrace--;
            npc.damage = 0;
            npc.noTileCollide = true;
            npc.noGravity = false;
            if (Number(npc.Center.Y) > Number(Terraria.PlayerCenterY(player)) - 180 || state.spawnGrace <= 0) {
                state.spawnGrace = 0;
                npc.noTileCollide = false;
            }
        }
        if (state.spawnGrace <= 0 && state.phase < 2) {
            const mushBombAmount = phase4 ? 6 : (phase3 ? 3 : (phase2 ? 2 : 1));
            const fireRate = phase4 ? 6 : (phase3 ? 3 : (phase2 ? 2 : 1));
            state.shotTimer = Number(state.shotTimer || 0) + fireRate;
            if (Number(state.sourceAI3 || 0) === 0) {
                const gate = difficulty.revenge ? 120 : (difficulty.expert ? 200 : 300);
                if (state.shotTimer > gate) {
                    state.sourceAI3 = 1;
                    state.shotTimer = 0;
                }
            } else if (state.shotTimer > 30) {
                state.shotTimer = 0;
                state.sourceAI3 = Number(state.sourceAI3) + 1;
                if (state.sourceAI3 >= mushBombAmount)
                    state.sourceAI3 = 0;
                const speed = phase4 ? 16 : (phase3 ? 14 : (phase2 ? 12 : 10));
                const yLift = difficulty.death ? 1 : (difficulty.expert ? 2.5 : 4);
                PlaySound(2, npc.Center, 42, 0);
                this.ShootMushBomb(npc, player, speed, yLift, 0);
            }
        }
        if (state.spawnGrace <= 0 && Number(npc.life) > 0 && Terraria.Main.netMode !== 1) {
            if (!(Number(state.lastCrabShroomLife) > 0))
                state.lastCrabShroomLife = Number(npc.lifeMax);
            const threshold = Math.max(1, Math.floor(Number(npc.lifeMax) * (difficulty.goodWorld ? 0.02 : 0.05)));
            if (Number(npc.life) + threshold < Number(state.lastCrabShroomLife)) {
                state.lastCrabShroomLife = Number(npc.life);
                state.crabShroomWaves = Number(state.crabShroomWaves || 0) + 1;
                this.SpawnCrabShrooms(npc, player, difficulty.death ? 4 : (difficulty.expert ? 3 : 2), difficulty.goodWorld);
            }
        }
        const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
        const direction = dx >= 0 ? 1 : -1;
        npc.direction = direction;
        npc.spriteDirection = direction;
        if (state.phase === 0) {
            npc.damage = 0;
            npc.noGravity = false;
            npc.noTileCollide = false;
            const velocity = npc.velocity;
            velocity.X *= 0.98;
            velocity.Y *= 0.98;
            npc.velocity = velocity;
            state.phaseTimer = Number(state.phaseTimer || 0) + 1;
            if (phase2)
                state.phaseTimer++;
            if (phase3)
                state.phaseTimer++;
            const distX = Number(npc.Center.X) - Number(Terraria.PlayerCenterX(player));
            const distY = Number(npc.Center.Y) - Number(Terraria.PlayerCenterY(player));
            if (Math.sqrt(distX * distX + distY * distY) < 160) {
                state.phaseTimer += difficulty.death ? 4 : (difficulty.expert ? 2 : 1);
            }
            const idleTime = phase4 ? 480 : (difficulty.death ? 60 : (difficulty.expert ? 90 : 120));
            if (state.phaseTimer >= idleTime) {
                const triple = difficulty.death && phase2 && Math.random() < 0.5;
                npc.TargetClosest(true);
                npc.noGravity = !triple;
                npc.noTileCollide = !triple;
                state.phase = triple ? 5 : 1;
                state.phaseTimer = 0;
                if (triple) {
                    state.tripleStompCount = 0;
                    state.sourceAI3 = 0;
                }
                npc.netUpdate = true;
            }
        } else if (state.phase === 1) {
            npc.damage = 0;
            let walkingVelocity = difficulty.death ? (5 + 1 * (1 - lifeRatio)) : (difficulty.expert ? 5 : 3.5);
            if (phase2)
                walkingVelocity += 0.5;
            if (phase3)
                walkingVelocity += 0.75;
            if (phase4)
                walkingVelocity += 1;
            if (difficulty.goodWorld)
                walkingVelocity *= 2;
            const velocity = npc.velocity;
            if (Math.abs(Number(npc.Center.X) - Number(Terraria.PlayerCenterX(player))) < 50) {
                velocity.X *= 0.9;
                if (Math.abs(Number(velocity.X)) < 0.1)
                    velocity.X = 0;
            } else {
                const inertia = difficulty.revenge ? 10 : 20;
                velocity.X = (Number(velocity.X) * inertia + walkingVelocity * direction) / (inertia + 1);
            }
            const solid = IsInsideSolid(npc);
            const canHitPlayer = CanHitPlayer(npc, player);
            if (canHitPlayer && !solid && Number(Terraria.PlayerPositionY(player)) <= Number(npc.position.Y) + Number(npc.height) && npc.collideX !== true) {
                npc.noGravity = false;
                npc.noTileCollide = false;
            } else {
                npc.noGravity = true;
                npc.noTileCollide = true;
                let solidBelow = false;
                try {
                    solidBelow = !!SolidCollision(Vector2.new(Number(npc.Center.X) - 40, Number(npc.position.Y) + Number(npc.height) - 20), 80, 20);
                } catch (e) { }
                const directlyAbove = Number(npc.position.X) < Number(Terraria.PlayerPositionX(player)) &&
                    Number(npc.position.X) + Number(npc.width) > Number(Terraria.PlayerPositionX(player)) + Number(Terraria.PlayerWidth(player)) &&
                    Number(npc.position.Y) + Number(npc.height) < Number(Terraria.PlayerPositionY(player)) + Number(Terraria.PlayerHeight(player)) - 16;
                const accel = difficulty.death ? 0.075 : (difficulty.expert ? 0.05 : 0.03);
                const accelFast = difficulty.death ? 0.6 : (difficulty.expert ? 0.4 : 0.25);
                if (directlyAbove) {
                    velocity.Y = Number(velocity.Y) + (difficulty.death ? 1.5 : (difficulty.expert ? 1 : 0.5));
                } else if (solidBelow) {
                    if (Number(velocity.Y) > 0)
                        velocity.Y = 0;
                    velocity.Y = Number(velocity.Y) - (Number(velocity.Y) > -0.2 ? accel : accelFast);
                    const cap = difficulty.death ? 9 : (difficulty.expert ? 6 : 4);
                    if (Number(velocity.Y) < -cap)
                        velocity.Y = -cap;
                } else {
                    if (Number(velocity.Y) < 0)
                        velocity.Y = 0;
                    velocity.Y = Number(velocity.Y) + (Number(velocity.Y) < 0.1 ? accel : 0.5);
                }
            }
            if (Number(velocity.Y) > 10)
                velocity.Y = 10;
            npc.velocity = velocity;
            state.phaseTimer = Number(state.phaseTimer || 0) + 1;
            const distX = Number(npc.Center.X) - Number(Terraria.PlayerCenterX(player));
            const distY = Number(npc.Center.Y) - Number(Terraria.PlayerCenterY(player));
            if (Math.sqrt(distX * distX + distY * distY) < 160) {
                state.phaseTimer += difficulty.death ? 4 : (difficulty.expert ? 2 : 1);
            }
            const walkGate = (difficulty.revenge ? 150 : (difficulty.expert ? 240 : 360)) -
                (difficulty.death ? 60 * (1 - lifeRatio) : 0);
            if (state.phaseTimer >= walkGate) {
                if (IsInsideSolid(npc)) {
                    state.phaseTimer = Math.max(0, walkGate - 1);
                    npc.noGravity = true;
                    npc.noTileCollide = true;
                } else {
                    npc.noGravity = false;
                    npc.noTileCollide = false;
                    const special = difficulty.revenge && phase2 && Math.random() < 0.5;
                    state.phase = special ? 4 : 2;
                    state.phaseTimer = 0;
                    state.jumpVariant = Math.max(0, Math.floor(Number(state.sourceAI3 || 0)));
                    state.specialLeapLaunched = false;
                    state.specialLeapGroundY = 0;
                    state.specialLeapShots = 0;
                    state.wasAirborne = false;
                    state.wasDescending = false;
                    npc.netUpdate = true;
                }
            }
        } else if (state.phase === 2) {
            npc.damage = 0;
            npc.noGravity = false;
            npc.noTileCollide = false;
            if (grounded) {
                const velocity = npc.velocity;
                velocity.X *= 0.8;
                npc.velocity = velocity;
                state.phaseTimer = Number(state.phaseTimer || 0) + 1;
                if (state.phaseTimer > 0) {
                    const variant = Math.max(0, Math.floor(Number(state.jumpVariant || 0)));
                    if (difficulty.revenge) {
                        if (variant === 1 || variant === 2)
                            state.phaseTimer += 2;
                        else if (variant === 3)
                            state.phaseTimer += 4;
                    }
                    if (phase2)
                        state.phaseTimer += difficulty.revenge ? 1 : 2;
                    if (phase3)
                        state.phaseTimer += difficulty.revenge ? 1 : 2;
                    if (phase4)
                        state.phaseTimer += 1;
                }
                const jumpGate = difficulty.expert ? 60 : 120;
                if (state.phaseTimer >= jumpGate)
                    state.phaseTimer = -20;
                else if (state.phaseTimer === -1) {
                    const maxXIncrease = difficulty.death ? 4 : 3;
                    const maxYIncrease = difficulty.death ? 3 : 2;
                    let jumpX = 6 + (difficulty.expert ? maxXIncrease * (1 - lifeRatio) : 0);
                    let jumpY = 12 + (difficulty.expert ? maxYIncrease * (1 - lifeRatio) : 0);
                    const variant = Math.max(0, Math.floor(Number(state.jumpVariant || 0)));
                    let speedMult = 1;
                    if (difficulty.revenge) {
                        const xAdjust = jumpX;
                        const yAdjust = jumpY / 3;
                        if (lifeRatio < 0.5 && difficulty.death) {
                            if (variant === 0) {
                                jumpX += xAdjust * 0.5;
                                jumpY -= yAdjust;
                            } else if (variant === 1)
                                jumpX += xAdjust * 0.5;
                            else if (variant === 2) {
                                jumpX += xAdjust * 0.5;
                                jumpY -= yAdjust * 2;
                            } else if (variant === 3) {
                                jumpX += xAdjust * 1.5;
                                jumpY -= yAdjust * 2;
                            }
                        } else {
                            if (variant === 1)
                                jumpY += yAdjust;
                            else if (variant === 2)
                                jumpY -= yAdjust;
                            else if (variant === 3) {
                                jumpX += xAdjust;
                                jumpY -= yAdjust;
                            }
                        }
                        const below = Number(npc.position.Y) - (Number(Terraria.PlayerPositionY(player)) + 80);
                        if (below > 0)
                            speedMult += below * 0.001;
                        speedMult = Math.min(2, speedMult);
                        jumpY *= speedMult;
                    }
                    const vertical = difficulty.expert
                        ? (Number(Terraria.PlayerPositionY(player)) < Number(npc.Bottom.Y) ? -jumpY : 1)
                        : -jumpY;
                    npc.velocity = Vector2.new(jumpX * direction, vertical);
                    npc.noTileCollide = difficulty.expert;
                    state.phase = 3;
                    state.phaseTimer = 0;
                    state.wasAirborne = false;
                    state.wasDescending = false;
                    PlayCurrentCrabulonJump(npc.Center);
                    npc.netUpdate = true;
                }
            }
        } else if (state.phase === 3) {
            if (grounded && state.wasAirborne === true) {
                npc.damage = 0;
                npc.noGravity = false;
                npc.noTileCollide = false;
                this.Slam(npc, state);
                const landingIndex = Math.max(0, Math.floor(Number(state.stompSeries || 0)));
                const fan = (landingIndex % 2 === 0 || difficulty.death) &&
                    ((phase2 && difficulty.revenge) || (phase3 && difficulty.expert));
                if (fan) {
                    PlaySound(2, npc.Center, 42, 0);
                    const speed = difficulty.death ? 15 : 10;
                    const count = phase4 ? 14 : (difficulty.death ? (phase3 ? 10 : 16) : 12);
                    this.SpawnMushBombFallFan(npc, player, count, 90, speed, 0);
                }
                state.stompSeries = landingIndex + 1;
                const maxStomps = phase2 ? 4 : 3;
                if (state.stompSeries >= maxStomps) {
                    if (difficulty.revenge && (!phase2 || (phase3 && difficulty.death))) {
                        PlaySound(2, npc.Center, 42, 0);
                        const speed = difficulty.death ? 15 : 10;
                        const count = phase4 ? 8 : ((phase3 && difficulty.death) ? 6 : 8);
                        this.SpawnMushBombFallFan(npc, player, count, 60, speed, 0);
                    }
                    state.phase = 0;
                    state.phaseTimer = 0;
                    state.stompSeries = 0;
                    state.jumpVariant = 0;
                    state.sourceAI3 = 0;
                } else {
                    state.phase = 2;
                    state.phaseTimer = 0;
                    if (difficulty.revenge)
                        state.jumpVariant = Number(state.jumpVariant || 0) + 1;
                }
                state.wasAirborne = false;
                state.wasDescending = false;
                npc.netUpdate = true;
            } else {
                npc.damage = this.ContactDamage;
                if (Math.abs(Number(npc.velocity.Y)) > 0.01 || !grounded)
                    state.wasAirborne = true;
                if (Number(npc.velocity.Y) > 0)
                    state.wasDescending = true;
                if (difficulty.expert && !player.dead) {
                    UpdateSourceJumpTileCollision(npc, player);
                }
                const velocity = npc.velocity;
                if (Number(npc.position.X) < Number(Terraria.PlayerPositionX(player)) &&
                    Number(npc.position.X) + Number(npc.width) > Number(Terraria.PlayerPositionX(player)) + Number(Terraria.PlayerWidth(player))) {
                    velocity.X *= difficulty.death ? 0.9 : (difficulty.expert ? 0.93 : 0.96);
                    velocity.Y = Number(velocity.Y) + (phase4 ? 0.2 : (difficulty.death ? 0.15 : (difficulty.expert ? 0.12 : 0.09)));
                } else {
                    const accelX = difficulty.death ? 0.15 : (difficulty.expert ? 0.125 : 0.1);
                    velocity.X = Number(velocity.X) + accelX * direction;
                    const maxIncrease = difficulty.death ? 4 : 3;
                    let cap = 6 + (difficulty.expert ? maxIncrease * (1 - lifeRatio) : 0);
                    if (difficulty.revenge) {
                        const adjust = cap;
                        const variant = Math.max(0, Math.floor(Number(state.jumpVariant || 0)));
                        if (lifeRatio < 0.5 && difficulty.death) {
                            if (variant <= 2)
                                cap += adjust * 0.5;
                            else if (variant === 3)
                                cap += adjust * 1.5;
                        } else if (variant === 3)
                            cap += adjust;
                    }
                    if (Math.abs(Number(velocity.X)) > cap)
                        velocity.X = Number(velocity.X) < 0 ? -cap : cap;
                }
                npc.velocity = velocity;
            }
        } else if (state.phase === 4) {
            npc.damage = 0;
            npc.noGravity = false;
            if (grounded || state.specialLeapLaunched === true)
                state.phaseTimer = Number(state.phaseTimer || 0) + 1;
            if (state.phaseTimer >= 50) {
                if (state.phaseTimer === 50 && state.specialLeapLaunched !== true) {
                    let targetX = Number(Terraria.PlayerCenterX(player));
                    let targetY = Number(Terraria.PlayerCenterY(player));
                    targetY -= 320 + Math.abs(Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y));
                    targetX += Math.abs(Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X)) * (Number(Terraria.PlayerCenterX(player)) > Number(npc.Center.X) ? 1 : -1);
                    const directionToTarget = Normalize(targetX - Number(npc.Center.X), targetY - Number(npc.Center.Y), direction, -1);
                    const speed = difficulty.death ? 18 : 16;
                    let leapX = directionToTarget.x * speed * 0.6;
                    let leapY = directionToTarget.y * speed;
                    if (leapY > -speed)
                        leapY = -speed;
                    state.specialLeapLaunched = true;
                    state.specialLeapGroundY = Number(npc.Bottom.Y);
                    state.specialLeapShots = 0;
                    npc.noTileCollide = true;
                    npc.velocity = Vector2.new(leapX, leapY);
                    PlayCurrentCrabulonJump(npc.Center);
                    npc.netUpdate = true;
                } else if (state.specialLeapLaunched === true) {
                    if (state.phaseTimer % 15 === 0) {
                        PlaySound(2, npc.Center, 42, 0);
                        this.SpawnSpecialLeapMushBomb(npc, player, difficulty.death);
                        state.specialLeapShots = Number(state.specialLeapShots || 0) + (difficulty.death ? 3 : 1);
                    }
                    const storedGround = Number(state.specialLeapGroundY || npc.Bottom.Y);
                    if (Number(npc.velocity.Y) >= 0 && Number(npc.Bottom.Y) >= storedGround - Number(npc.height))
                        npc.noTileCollide = false;
                    if (Number(npc.Bottom.Y) >= storedGround || grounded) {
                        this.Slam(npc, state);
                        this.SpawnGroundMushrooms(npc, difficulty.death ? 5 : 3, difficulty.death ? 2 : 1, 80, 20);
                        state.specialLeapCount = Number(state.specialLeapCount || 0) + 1;
                        state.phase = 0;
                        state.phaseTimer = 0;
                        state.specialLeapLaunched = false;
                        state.specialLeapGroundY = 0;
                        state.specialLeapShots = 0;
                        state.sourceAI3 = 0;
                        npc.noTileCollide = false;
                        npc.netUpdate = true;
                    }
                }
            } else {
                const velocity = npc.velocity;
                velocity.X *= 0.8;
                npc.velocity = velocity;
            }
        } else if (state.phase === 5) {
            npc.damage = 0;
            npc.noGravity = false;
            npc.noTileCollide = false;
            if (grounded) {
                const velocity = npc.velocity;
                velocity.X *= 0.8;
                npc.velocity = velocity;
                state.phaseTimer = Number(state.phaseTimer || 0) + 1;
                if (state.phaseTimer >= 10)
                    state.phaseTimer = -20;
                else if (state.phaseTimer === -1) {
                    npc.velocity = Vector2.new(Number(npc.velocity.X), -(2 + Number(state.tripleStompCount || 0)));
                    state.phase = 6;
                    state.phaseTimer = 0;
                    state.wasAirborne = false;
                    state.wasDescending = false;
                    PlayCurrentCrabulonJump(npc.Center);
                    npc.netUpdate = true;
                }
            }
        } else if (state.phase === 6) {
            if (grounded && state.wasAirborne === true) {
                npc.damage = 0;
                npc.noGravity = false;
                npc.noTileCollide = false;
                this.Slam(npc, state);
                state.tripleStompCount = Number(state.tripleStompCount || 0) + 1;
                if (state.tripleStompCount >= 3) {
                    this.SpawnTripleStompCurtain(npc);
                    state.tripleStompCycles = Number(state.tripleStompCycles || 0) + 1;
                    state.phase = 1;
                    state.phaseTimer = 0;
                    state.tripleStompCount = 0;
                    state.sourceAI3 = 0;
                } else {
                    this.SpawnGroundMushrooms(npc, 3, difficulty.death ? 3 : 1.5, 40, 0);
                    state.phase = 5;
                    state.phaseTimer = 0;
                }
                state.wasAirborne = false;
                npc.netUpdate = true;
            } else {
                npc.damage = this.ContactDamage;
                if (Number(npc.velocity.Y) !== 0 || !grounded)
                    state.wasAirborne = true;
                if (Number(npc.velocity.Y) > 0)
                    state.wasDescending = true;
                if (!player.dead)
                    UpdateSourceJumpTileCollision(npc, player);
            }
        }
        try {
            Terraria.Lighting.AddLight(npc.Center, 0, 0.3, 0.7);
        } catch (e) { }
        state.phase2 = phase2;
        state.phase3 = phase3;
        state.phase4 = phase4;
        state.revenge = difficulty.revenge;
        state.death = difficulty.death;
        return false;
    }

    FindFrame(npc, frameHeight) {
        const state = CalamityNPCState.Get(npc);
        const phase = Number(state.phase || 0);
        const grounded = IsSourceGrounded(npc, 0);
        if (phase > 1) {
            const idlePrep = grounded &&
                ((Number(state.phaseTimer || 0) >= 0 && (phase === 2 || phase === 5)) ||
                    (Number(state.phaseTimer || 0) < 30 && phase === 4 && state.specialLeapLaunched !== true));
            if (idlePrep) {
                state.stompingAnimation = false;
                npc.frameCounter += 0.15;
                npc.frameCounter %= 6;
                const rect = npc.frame;
                rect.Y = Math.floor(Number(npc.frameCounter)) * frameHeight;
                npc.frame = rect;
                return;
            }
            if (Number(npc.velocity.Y) <= 0 ||
                (Number(state.phaseTimer || 0) < 50 && phase === 4 && state.specialLeapLaunched !== true) ||
                Number(state.phaseTimer || 0) < 0) {
                npc.frameCounter += 1;
                const rect = npc.frame;
                if (npc.frameCounter > 12) {
                    rect.Y += frameHeight;
                    npc.frameCounter = 0;
                }
                if (rect.Y >= frameHeight)
                    rect.Y = frameHeight;
                npc.frame = rect;
            } else {
                if (state.stompingAnimation !== true) {
                    state.stompingAnimation = true;
                    npc.frameCounter = 0;
                }
                npc.frameCounter += 1;
                const rect = npc.frame;
                if (npc.frameCounter > 8) {
                    rect.Y += frameHeight;
                    npc.frameCounter = 0;
                }
                if (rect.Y >= frameHeight * 5)
                    rect.Y = frameHeight * 5;
                npc.frame = rect;
            }
        } else {
            state.stompingAnimation = false;
            npc.frameCounter += 0.15;
            npc.frameCounter %= 6;
            const rect = npc.frame;
            rect.Y = Math.floor(Number(npc.frameCounter)) * frameHeight;
            npc.frame = rect;
        }
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        npc.lifeMax = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.8 * Number(balance) * Number(bossAdjustment)));
        npc.damage = Math.max(0, Math.floor(Number(npc.damage) * 0.8));
    }

    CanFallThroughPlatforms(npc) {
        const target = Math.floor(Number(npc.target));
        const player = target >= 0 && target < 255 ? Terraria.Main.player[target] : null;
        return !!(player && player.active && Number(Terraria.PlayerPositionY(player)) > Number(npc.position.Y) + Number(npc.height));
    }

    ModifyHitPlayer(npc, player, modifiers) {
        if (!player || !player.active || Number(npc.damage) <= 0)
            return;
        const scale = Math.max(0.01, Number(npc.scale) || 1);
        const centerX = Number(npc.Center.X);
        const centerY = Number(npc.Center.Y);
        const width = Number(npc.width);
        const leftX = centerX - width * 0.5 + 6 * scale + width * 0.125;
        const bodyX = centerX;
        const rightX = centerX + width * 0.25 - 6 * scale + width * 0.125;
        const x = Number(Terraria.PlayerPositionX(player));
        const y = Number(Terraria.PlayerPositionY(player));
        const right = x + Number(Terraria.PlayerWidth(player));
        const bottom = y + Number(Terraria.PlayerHeight(player));
        const corners = [[x, y], [right, y], [x, bottom], [right, bottom]];
        const minDistance = (cx, cy) => {
            let min = Number.POSITIVE_INFINITY;
            for (const point of corners) {
                const dx = cx - point[0];
                const dy = cy - point[1];
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < min)
                    min = distance;
            }
            return min;
        };
        const hit = minDistance(leftX, centerY) <= 45 * scale ||
            minDistance(bodyX, centerY) <= 90 * scale ||
            minDistance(rightX, centerY) <= 45 * scale;
        if (!hit) {
            modifiers.damage = 0;
            modifiers.quiet = true;
            modifiers.hitDirection = 0;
        }
    }

    PreDraw(npc, spriteBatch, screenPos) {
        try {
            const state = CalamityNPCState.Get(npc);
            const phase = Number(state.phase || 0);
            let texture = Terraria.GameContent.TextureAssets.Npc[this.Type]?.Value;
            let glow = this.IdleGlowTexture;
            if (phase > 2 && phase !== 5 && Math.abs(Number(npc.velocity.Y)) > 0.01 && this.AttackTexture) {
                texture = this.AttackTexture;
                glow = this.AttackGlowTexture;
            } else if (phase === 1 && this.WalkTexture) {
                texture = this.WalkTexture;
                glow = this.WalkGlowTexture;
            }
            if (!texture)
                return true;
            const draw = spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            const source = npc.frame;
            const origin = Vector2.new(Number(source.Width) * 0.5, Number(source.Height) * 0.5);
            const position = Vector2.new(Number(npc.Center.X) - Number(screenPos.X), Number(npc.Center.Y) - Number(screenPos.Y) + Number(npc.gfxOffY || 0));
            const alpha = Math.max(0, 255 - Number(npc.alpha));
            const effects = Number(npc.spriteDirection) === 1 ? SpriteEffects.FlipHorizontally : SpriteEffects.None;
            draw(texture, position, source, Color.new(255, 255, 255, alpha), Number(npc.rotation), origin, Number(npc.scale), effects, 0);
            if (glow)
                draw(glow, position, source, Color.new(180, 245, 255, alpha), Number(npc.rotation), origin, Number(npc.scale), effects, 0);
            return false;
        } catch (e) {
            return true;
        }
    }

    ModifyNPCLoot(npcLoot) {
        const bag = Number(ModItem.getTypeByName('CrabulonBag') || 0);
        const mask = Number(ModItem.getTypeByName('CrabulonMask') || 0);
        const trophy = Number(ModItem.getTypeByName('CrabulonTrophy') || 0);
        if (trophy > 0)
            npcLoot.Add(ItemDropRule.Common(trophy, 10, 1, 1));
        const notExpert = Conditions.NotExpert.new();
        if (mask > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, mask, 7, 1, 1, 1));
        const painting = Number(ModItem.getTypeByName('ThankYouPainting') || 0);
        if (painting > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, painting, 100, 1, 1, 1));
        if (bag > 0)
            npcLoot.Add(ItemDropRule.BossBag(bag));
    }

    BossLoot(npc, potionType) {
        return Terraria.ID.ItemID.LesserHealingPotion;
    }

    OnKill(npc) {
        DropClassicWeaponsWithPity(npc);
        const world = GetWorldState();
        const firstKill = world ? world.DownedCrabulon !== true : false;
        const revenge = !!(world && world.RevengeanceMode === true);
        if (world && world.RecordCrabulonKill)
            world.RecordCrabulonKill();
        if (firstKill) {
            SpawnDrop(npc, ModItem.getTypeByName('LoreCrabulon'), 1);
            Tell('Crabulon foi derrotado pela primeira vez! O fungo colossal não domina mais esta caverna.', 100, 255, 180);
        }
        if (Terraria.Main.masterMode === true && revenge) {
            SpawnDrop(npc, ModItem.getTypeByName('CrabulonRelic'), 1);
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const dead = npc.life <= 0;
        if (!dead)
            QueueNextCrabulonHitSound(npc);
        const amount = dead ? 18 : 2;
        for (let i = 0; i < amount; i++) {
            const dust = NewDust(npc.position, npc.width, npc.height, CrabulonDustType, (Math.random() - 0.5) * (dead ? 5 : 2) + hitDirection * 0.25, (Math.random() - 0.5) * (dead ? 5 : 2), 60, Color.White, dead ? 1.4 : 0.9);
            if (dust >= 0 && Math.random() < 0.7)
                Terraria.Main.dust[dust].noGravity = true;
        }
    }
}
