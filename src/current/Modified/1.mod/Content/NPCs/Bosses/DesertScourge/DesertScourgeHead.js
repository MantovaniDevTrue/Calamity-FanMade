import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModProjectile } from './../../../../TL/ModProjectile.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModSystem } from './../../../../TL/ModSystem.js';
import { ModLocalization } from './../../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import {

    GetScourgeTypes,
    GetCurrentDesertScourgeHitSound,
    QueueNextDesertScourgeHitSound,
    GetDesertScourgeDifficultyFlags,
    ApplyCircularContactFilter
} from './DesertScourgeShared.js';
import { AnyNuisanceAlive, GetNuisanceTypes, IsLinkedToScourge } from './DesertNuisanceShared.js';
import { AndroidSound } from './../../../../Common/Snippets/AndroidSound.js';
import { FusionVFXSystem } from './../../../../Core/FusionVFXSystem.js';
import { BossIntroRuntime } from './../../../../Core/BossIntroRuntime.js';
import { BossPhaseVFX } from './../../../../Core/BossPhaseVFX.js';
import { UseDesertScourgeTraversal } from './../../../../Core/DesertScourgeTraversalRuntime.js';
import { InitVirtualWorm, UpdateVirtualWorm, GetVirtualWormGeometry, EnableVirtualWormDamage, DisableVirtualWormDamage } from './../../../../Core/SingleEntityWormRuntime.js';
import { PlayItemSound } from '../../../../Common/Snippets/LegacySoundCompat.js';
const { Color, Vector2, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const { ItemDropRule, Conditions } = Terraria.GameContent.ItemDropRules;
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SandDustType = Number.isFinite(Number(Terraria.ID.DustID.Sand)) ? Math.floor(Number(Terraria.ID.DustID.Sand)) : 32;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function Tell(text, r = 120, g = 220, b = 255) {
    try {
        NewText(String(text), r, g, b);
    } catch (e) { }
}

function PlayCurrentDesertScourgeSandBlast(position) {
    // Item_144 is replaced byte-for-byte with the current PC DesertScourgeSandBlast.ogg.
    // Numeric playback avoids LegacySoundStyle reflection on TLPro.
    try {
        return PlayItemSound(144, position, 0, 1.0);
    } catch (e) {
        return false;
    }
}

function SpawnDrop(npc, type, stack = 1) {
    if (!(type > 0) || Terraria.Main.netMode === 1)
        return;
    try {
        NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), Math.max(1, npc.width), Math.max(1, npc.height), type, Math.max(1, stack), false, -1, true);
    } catch (e) { }
}

function Roll(denominator) {
    const d = Math.max(1, Math.floor(Number(denominator) || 1));
    return Math.random() < 1 / d;
}

function SpawnCalamityStyleWeapons(npc, weaponTypes, denominator) {
    const valid = weaponTypes.filter(type => Number(type) > 0);
    if (valid.length === 0 || Terraria.Main.netMode === 1)
        return 0;
    let dropped = 0;
    for (const type of valid) {
        if (!Roll(denominator))
            continue;
        SpawnDrop(npc, type, 1);
        dropped++;
    }

    if (dropped === 0) {
        const forced = valid[Math.floor(Math.random() * valid.length)];
        SpawnDrop(npc, forced, 1);
        dropped = 1;
    }
    return dropped;
}

function DeactivateNoLoot(npc) {
    if (!npc)
        return;
    try {
        npc.active = false;
        npc.netUpdate = true;
        npc.timeLeft = 0;
    } catch (e) { }
}

export class DesertScourgeHead extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/DesertScourge/DesertScourgeHead';
        this.BestiaryRarityStars = 3;
        this.Music = Number(Terraria.ID.MusicID.OtherworldlyBoss2 || 80);
        this.BodySegments = 15;
        this.VirtualAtlasTexture = null;
        this.VirtualBodyVariants = [];
        this.VirtualBodyPairVariants = [];
        this.VirtualPairOrigin = null;
        this.VirtualTailSource = null;
        this.VirtualDrawPos = null;
        this.VirtualBodyOrigin = null;
        this.VirtualStaticOrigin = null;
        this.VirtualDrawScale = null;
        this.VirtualBodyFrames = [];
        this.VirtualColorCache = new Array(17);
    }

    PostSetupContent() {
        try {
            this.VirtualAtlasTexture = tl.texture.load('Textures/NPCs/Bosses/DesertScourge/DesertScourgeVirtualAtlas.png');
            this.VirtualDrawPos = Vector2.new();
            this.VirtualBodyOrigin = Vector2.new(79, 58.5);
            this.VirtualStaticOrigin = Vector2.new(79, 58);
            this.VirtualPairOrigin = Vector2.new(79, 101.5);
            this.VirtualDrawScale = Vector2.new();
            this.VirtualBodyFrames = [
                Rectangle.new(0, 0, 158, 117), Rectangle.new(160, 0, 158, 117), Rectangle.new(320, 0, 158, 117),
                Rectangle.new(0, 120, 158, 117), Rectangle.new(160, 120, 158, 117), Rectangle.new(320, 120, 158, 117),
                Rectangle.new(0, 240, 158, 116)
            ];
            this.VirtualBodyVariants = [
                Rectangle.new(160, 240, 158, 116), Rectangle.new(320, 240, 158, 116), Rectangle.new(0, 360, 158, 116)
            ];
            // 13.09.5: two natural-size body pieces precomposed at the same
            // ~87 px center spacing used by the virtual chain. Straight runs can
            // therefore replace two SpriteBatch calls with one without stretching.
            this.VirtualBodyPairVariants = [
                Rectangle.new(512, 0, 158, 204), Rectangle.new(672, 0, 158, 204)
            ];
            this.VirtualTailSource = Rectangle.new(160, 360, 158, 116);
        } catch (e) {
            this.VirtualAtlasTexture = null;
            this.VirtualBodyVariants = [];
            this.VirtualBodyPairVariants = [];
            this.VirtualPairOrigin = null;
            this.VirtualTailSource = null;
            this.VirtualDrawPos = null;
            this.VirtualDrawScale = null;
            this.VirtualBodyFrames = [];
            try { tl.log(`[CalamityPort SingleWorm] Desert Scourge virtual atlas load failed: ${e}`); } catch (_) { }
        }
    }
    DeathMessage = () => {
        try {
            return Terraria.Localization.Language.GetText('Announcement.HasBeenDefeated_Single').Value
                .replace('{0}', ModLocalization.Translate('NPCName.DesertScourgeHead'));
        } catch (e) {
            return 'The Desert Scourge has been defeated!';
        }
    };
    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 7;
        Terraria.ID.NPCID.Sets.MPAllowedEnemies[this.Type] = true;
        Terraria.ID.NPCID.Sets.BossBestiaryPriority.Add(this.Type);
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = 104;
        this.NPC.height = 104;
        const difficulty = GetDesertScourgeDifficultyFlags();
        this.NPC.damage = 40;
        this.NPC.defense = 4;
        this.NPC.lifeMax = difficulty.revenge ? 5000 : 4000;
        if (difficulty.goodWorld)
            this.NPC.lifeMax *= 2;
        this.NPC.scale = (difficulty.goodWorld ? 0.4 : 1.0) * (difficulty.zenithWorld ? 4.0 : 1.0);
        this.NPC.knockBackResist = 0;
        this.NPC.value = ModNPC.NPCValue(0, 1, 0, 0);
        this.NPC.npcSlots = 12;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.behindTiles = true;
        this.NPC.boss = true;
        this.NPC.netAlways = true;
        this.NPC.alpha = 255;
        this.NPC.HitSound = GetCurrentDesertScourgeHitSound();
        // PC Calamity uses DesertScourgeDeath; it is played explicitly in OnKill to avoid a vanilla double-sound.
    }

    SetBestiary(database, bestiaryEntry) {
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.Desert);
        const flavor = FlavorTextBestiaryInfoElement.new();
        flavor._key = ModLocalization.Translate('Bestiary.DesertScourgeHead');
        bestiaryEntry.Info.Add(flavor);
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.bossTimer = 0;
        state.lungeSide = Math.random() < 0.5 ? -1 : 1;
        state.lastCycle = -1;
        state.spitCycle = -1;
        state.segmentsSpawned = false;
        state.nuisancesSpawned = false;
        state.nuisanceIntroShown = false;
        state.nuisanceDefeatedShown = false;
        state.biomeEnrageTimer = 300;
        state.despawnTimer = 0;
        state.divePlanned = false;
        state.diveStage = 0;
        state.diveCycle = -1;
        state.diveX = 0;
        state.diveGroundY = 0;
        state.diveImpacted = false;
        state.sandBlastPlanned = false;
        state.sandBlastFired = false;
        state.chompTimer = 0;
        state.sourceSegmentCount = 0;
        state.combatBand = -1;
        state.combatBandName = 'opening';
        state.phaseCycleIndex = 0;
        state.attackKind = 0;
        state.attackName = 'source-burrow';
        state.sourceAI0 = 0;
        state.sourceAI1 = 0;
        state.sourceAI3 = 0;
        state.sourceRoarPlayed = false;
        state.sourceShouldFly = false;
        state.sourceInsideTerrain = false;
        state.sourceSplashCooldown = 0;
        state.sourceSpitCount = 0;
        state.sourceCycleName = 'normal-chase';
        state.terrainProbeCooldown = 0;
        state.terrainProbeResult = false;
        state.terrainWasWet = false;
        state.phase2VfxShown = false;
        npc.TargetClosest(false);
        BossIntroRuntime.Trigger(npc, 'desert');
        if (Terraria.Main.netMode !== 2) {
            try {
                const target = npc.target >= 0 && npc.target < 255 ? Terraria.Main.player[npc.target] : null;
                const soundX = target && target.active ? Number(target.Center.X) : Number(npc.Center.X);
                const soundY = target && target.active ? Number(target.Center.Y) : Number(npc.Center.Y);
                const gameVolume = Number(Terraria.Main.soundVolume);
                const volume = Number.isFinite(gameVolume) ? Math.max(0, Math.min(1, gameVolume)) : 1.0;
                AndroidSound.PlayExclusive('desert-scourge-voice', 'Common/Sounds/DesertScourgeRoar.ogg', volume, soundX, soundY, 1800, 180, 0, true);
            } catch (e) { }
        }
        if (Terraria.Main.netMode === 1)
            return;
        this.SpawnSegments(npc, state);
    }

    CleanupEncounter(npc, includeHead = false) {
        const types = GetScourgeTypes();
        const nuisanceTypes = GetNuisanceTypes();
        const headIndex = Math.floor(Number(npc.whoAmI));
        const nuisanceHeadIndexes = [];
        for (let i = 0; i < 200; i++) {
            const other = Terraria.Main.npc[i];
            if (!other || !other.active)
                continue;
            const isNuisanceHead = other.type === nuisanceTypes.adultHead || other.type === nuisanceTypes.youngHead;
            if (isNuisanceHead && IsLinkedToScourge(other, headIndex))
                nuisanceHeadIndexes.push(Math.floor(Number(other.whoAmI)));
        }
        for (let i = 0; i < 200; i++) {
            const other = Terraria.Main.npc[i];
            if (!other || !other.active)
                continue;
            const isMainSegment = (other.type === types.body || other.type === types.tail) && Math.floor(Number(other.ai[2])) === headIndex;
            const isNuisanceHead = (other.type === nuisanceTypes.adultHead || other.type === nuisanceTypes.youngHead) && IsLinkedToScourge(other, headIndex);
            const isNuisanceSegment = (other.type === nuisanceTypes.adultBody || other.type === nuisanceTypes.adultTail ||
                other.type === nuisanceTypes.youngBody || other.type === nuisanceTypes.youngTail) && nuisanceHeadIndexes.includes(Math.floor(Number(other.ai[2])));
            if (isMainSegment || isNuisanceHead || isNuisanceSegment) {
                DeactivateNoLoot(other);
                CalamityNPCState.Remove(other);
            }
        }
        if (includeHead) {
            DisableVirtualWormDamage(npc, CalamityNPCState.Get(npc));
            DeactivateNoLoot(npc);
            CalamityNPCState.Remove(npc);
        }
        const spitType = ModProjectile.getTypeByName('DesertScourgeSpit');
        const diveSplashType = ModProjectile.getTypeByName('DesertScourgeDiveSplash');
        const sandBlastType = ModProjectile.getTypeByName('SandBlast');
        const greatSandBlastType = ModProjectile.getTypeByName('GreatSandBlast');
        if (spitType > 0 || diveSplashType > 0 || sandBlastType > 0 || greatSandBlastType > 0) {
            for (let i = 0; i < 1000; i++) {
                const projectile = Terraria.Main.projectile[i];
                if (!projectile || !projectile.active)
                    continue;
                if (projectile.type === spitType || projectile.type === diveSplashType || projectile.type === sandBlastType || projectile.type === greatSandBlastType)
                    projectile.active = false;
            }
        }
    }

    SpawnSegments(npc, state) {
        // Phase 13.09: the Desert Scourge is now one real NPC. The body and tail
        // are virtual geometry sampled from the head trail, reusing the same
        // mobile-first runtime already proven by the Abyss Oarfish. Body/tail
        // NPC types remain registered for save/ID stability but are never spawned.
        if (state.segmentsSpawned)
            return;
        const difficulty = GetDesertScourgeDifficultyFlags();
        let bodySegments = difficulty.death ? 24 : (difficulty.revenge ? 21 : (difficulty.expert ? 18 : 15));
        if (difficulty.goodWorld)
            bodySegments *= 3;
        const sourceVisualSegments = bodySegments + 1; // original visual length reference
        // Phase 13.09.5 keeps the natural 13.09.4 geometry for damage and curves.
        // Rendering may merge a few nearly-collinear pairs through precomposed
        // atlas frames, but the underlying segment positions remain unchanged.
        const visualSegments = Math.max(10, Math.ceil(sourceVisualSegments * 0.78));
        const bodyScale = difficulty.goodWorld ? 0.4 : 1.0;
        const totalVisualLength = sourceVisualSegments * 70 * bodyScale;
        const spacing = totalVisualLength / visualSegments;
        InitVirtualWorm(npc, state, visualSegments, spacing, 384);
        EnableVirtualWormDamage(npc, state, 116, 116);
        UpdateVirtualWorm(npc, state, visualSegments, spacing, 384);
        state.segmentsSpawned = true;
        state.sourceSegmentCount = bodySegments;
        state.segmentCount = 0;
        state.virtualSegmentCount = visualSegments;
        state.virtualSourceSegmentCount = sourceVisualSegments;
        state.virtualSpacing = spacing;
        state.virtualBodyScale = bodyScale;
        state.virtualBodyFrame = 0;
        state.singleEntityWorm = true;
        try {
            tl.log(`[CalamityPort SingleWorm] Desert Scourge 13.09.5: 1 real NPC + ${visualSegments} virtual hurtboxes; adaptive 2-in-1 straight-body atlas draw=on; native Damage proxy=on; defense=2.`);
        } catch (_) { }
    }

    SpawnNuisances(npc, player, state) {
        if (state.nuisancesSpawned || Terraria.Main.netMode === 1)
            return false;
        const types = GetNuisanceTypes();
        if (!(types.adultHead > 0 && types.youngHead > 0))
            return false;
        const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
        const adultX = Number(Terraria.PlayerCenterX(player)) - 320;
        const youngX = Number(Terraria.PlayerCenterX(player)) + 320;
        const spawnY = Number(Terraria.PlayerCenterY(player)) + 640;
        if (Terraria.Main.netMode !== 2) {
            for (const x of [adultX, youngX]) {
                FusionVFXSystem.SpawnLine({ x: x - 54, y: spawnY - 20 }, { x: x + 54, y: spawnY - 20 }, 2, { r: 242, g: 199, b: 119, a: 145 }, 22, { fadeIn: 4 });
                for (let i = 0; i < 4; i++) {
                    FusionVFXSystem.SpawnDot({ x: x + (i - 1.5) * 18, y: spawnY - 18 }, { x: (i - 1.5) * 0.08, y: -0.9 - i * 0.06 }, 3.2, { r: 236, g: 192, b: 112, a: 175 }, 22, { drag: 0.95, gravity: 0.05 });
                }
            }
        }
        const adult = Terraria.NPC.NewNPC(source, Math.floor(adultX), Math.floor(spawnY), types.adultHead, 0, 0, 0, npc.whoAmI, 0, Terraria.PlayerIndex(player));
        const young = Terraria.NPC.NewNPC(source, Math.floor(youngX), Math.floor(spawnY), types.youngHead, 0, 0, 0, npc.whoAmI, 0, Terraria.PlayerIndex(player));
        for (const index of [adult, young]) {
            if (index >= 0 && index < 200) {
                const nuisance = Terraria.Main.npc[index];
                nuisance.target = Terraria.PlayerIndex(player);
                nuisance.netUpdate = true;
            }
        }
        state.nuisancesSpawned = adult >= 0 || young >= 0;
        if (state.nuisancesSpawned) {
            state.nuisanceIntroShown = true;
            Tell('Duas criaturas menores responderam ao chamado do Flagelo do Deserto!', 255, 205, 120);
            npc.netUpdate = true;
        }
        return state.nuisancesSpawned;
    }

    Normalize(dx, dy, fallbackX = 0, fallbackY = 1) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (!(length > 0.0001))
            return { x: fallbackX, y: fallbackY };
        return { x: dx / length, y: dy / length };
    }

    MoveToward(npc, destinationX, destinationY, speed, inertia) {
        const dx = Number(destinationX) - Number(npc.Center.X);
        const dy = Number(destinationY) - Number(npc.Center.Y);
        const direction = this.Normalize(dx, dy, 0, 1);
        const velocity = npc.velocity;
        velocity.X = (Number(velocity.X) * (inertia - 1) + direction.x * speed) / inertia;
        velocity.Y = (Number(velocity.Y) * (inertia - 1) + direction.y * speed) / inertia;
        npc.velocity = velocity;
        return Math.sqrt(dx * dx + dy * dy);
    }














    TargetInsideDirectChaseBox(npc, player, distance) {
        const d = Math.max(16, Number(distance) || 16);
        const nx = Number(npc.position.X), ny = Number(npc.position.Y);
        const nw = Number(npc.width), nh = Number(npc.height);
        const px = Number(Terraria.PlayerPositionX(player)) - d;
        const py = Number(Terraria.PlayerPositionY(player)) - d;
        return nx < px + d * 2 && nx + nw > px && ny < py + d * 2 && ny + nh > py;
    }

    ApplyOfficialAirFall(npc, player, targetDeltaX, maxChaseSpeed, acceleration, death) {
        const velocity = npc.velocity;
        velocity.Y = Number(velocity.Y) + (death ? 0.125 : 0.1);
        if (Number(npc.Center.Y) - Number(Terraria.PlayerCenterY(player)) < -180) {
            velocity.Y = Number(velocity.Y) + 0.05;
            if (Number(velocity.Y) > 0)
                velocity.Y = Number(velocity.Y) + 0.05;
        }
        if (Number(velocity.Y) > maxChaseSpeed)
            velocity.Y = maxChaseSpeed;
        const slowX = Math.abs(Number(velocity.X)) > acceleration;
        if (Math.abs(Number(velocity.X)) + Math.abs(Number(velocity.Y)) < maxChaseSpeed * 0.4) {
            velocity.X = Number(velocity.X) < 0
                ? Number(velocity.X) - acceleration * 1.1
                : Number(velocity.X) + acceleration * 1.1;
        } else if (Number(velocity.Y) >= maxChaseSpeed - 0.0001) {
            if (slowX) {
                if (Number(velocity.X) < targetDeltaX)
                    velocity.X = Number(velocity.X) + acceleration;
                else if (Number(velocity.X) > targetDeltaX)
                    velocity.X = Number(velocity.X) - acceleration;
            } else
                velocity.X = 0;
        } else if (Number(velocity.Y) > 4) {
            if (slowX) {
                velocity.X = Number(velocity.X) < 0
                    ? Number(velocity.X) + acceleration * 0.9
                    : Number(velocity.X) - acceleration * 0.9;
            } else
                velocity.X = 0;
        }
        npc.velocity = velocity;
    }

    ApplyOfficialBurrowMovement(npc, targetX, targetY, maxChaseSpeed, acceleration, turnSpeed) {
        const centerX = Math.floor(Number(npc.Center.X) / 16) * 16;
        const centerY = Math.floor(Number(npc.Center.Y) / 16) * 16;
        let dx = Math.floor(Number(targetX) / 16) * 16 - centerX;
        let dy = Math.floor(Number(targetY) / 16) * 16 - centerY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (!(distance > 0.0001))
            distance = 0.0001;
        const absoluteX = Math.abs(dx);
        const absoluteY = Math.abs(dy);
        const scale = maxChaseSpeed / distance;
        dx *= scale;
        dy *= scale;
        const velocity = npc.velocity;
        const sameX = (Number(velocity.X) > 0 && dx > 0) || (Number(velocity.X) < 0 && dx < 0);
        const sameY = (Number(velocity.Y) > 0 && dy > 0) || (Number(velocity.Y) < 0 && dy < 0);
        if (sameX && sameY) {
            if (Number(velocity.X) < dx)
                velocity.X = Number(velocity.X) + turnSpeed;
            else if (Number(velocity.X) > dx)
                velocity.X = Number(velocity.X) - turnSpeed;
            if (Number(velocity.Y) < dy)
                velocity.Y = Number(velocity.Y) + turnSpeed;
            else if (Number(velocity.Y) > dy)
                velocity.Y = Number(velocity.Y) - turnSpeed;
        }
        if (sameX || sameY) {
            if (Number(velocity.X) < dx)
                velocity.X = Number(velocity.X) + acceleration;
            else if (Number(velocity.X) > dx)
                velocity.X = Number(velocity.X) - acceleration;
            if (Number(velocity.Y) < dy)
                velocity.Y = Number(velocity.Y) + acceleration;
            else if (Number(velocity.Y) > dy)
                velocity.Y = Number(velocity.Y) - acceleration;
            if (Math.abs(dy) < maxChaseSpeed * 0.2 && ((Number(velocity.X) > 0 && dx < 0) || (Number(velocity.X) < 0 && dx > 0))) {
                velocity.Y = Number(velocity.Y) > 0
                    ? Number(velocity.Y) + acceleration * 2
                    : Number(velocity.Y) - acceleration * 2;
            }
            if (Math.abs(dx) < maxChaseSpeed * 0.2 && ((Number(velocity.Y) > 0 && dy < 0) || (Number(velocity.Y) < 0 && dy > 0))) {
                velocity.X = Number(velocity.X) > 0
                    ? Number(velocity.X) + acceleration * 2
                    : Number(velocity.X) - acceleration * 2;
            }
        } else if (absoluteX > absoluteY) {
            if (Number(velocity.X) < dx)
                velocity.X = Number(velocity.X) + acceleration * 1.1;
            else if (Number(velocity.X) > dx)
                velocity.X = Number(velocity.X) - acceleration * 1.1;
            if (Math.abs(Number(velocity.X)) + Math.abs(Number(velocity.Y)) < maxChaseSpeed * 0.5) {
                velocity.Y = Number(velocity.Y) > 0
                    ? Number(velocity.Y) + acceleration
                    : Number(velocity.Y) - acceleration;
            }
        } else {
            if (Number(velocity.Y) < dy)
                velocity.Y = Number(velocity.Y) + acceleration * 1.1;
            else if (Number(velocity.Y) > dy)
                velocity.Y = Number(velocity.Y) - acceleration * 1.1;
            if (Math.abs(Number(velocity.X)) + Math.abs(Number(velocity.Y)) < maxChaseSpeed * 0.5) {
                velocity.X = Number(velocity.X) > 0
                    ? Number(velocity.X) + acceleration
                    : Number(velocity.X) - acceleration;
            }
        }
        npc.velocity = velocity;
    }

    SpawnOfficialSpitFan(npc, difficulty, state) {
        if (Terraria.Main.netMode !== 2)
            PlayCurrentDesertScourgeSandBlast(npc.Center);
        const projectileType = ModProjectile.getTypeByName('DesertScourgeSpit');
        if (!(projectileType > 0) || Terraria.Main.netMode === 1)
            return 0;
        let speed = difficulty.goodWorld ? 16 : (difficulty.death ? 8.5 : (difficulty.revenge ? 8 : (difficulty.expert ? 7.5 : 6)));
        let count = difficulty.death ? 24 : (difficulty.revenge ? 21 : (difficulty.expert ? 18 : 12));
        if (difficulty.goodWorld)
            count *= 2;
        const vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
        const direction = this.Normalize(vx, vy, 0, -1);
        const baseAngle = Math.atan2(direction.y, direction.x);
        const spread = difficulty.goodWorld ? Math.PI * 2 / 3 : Math.PI / 2;
        for (let i = 0; i < count; i++) {
            const ratio = count <= 1 ? 0.5 : i / (count - 1);
            const angle = baseAngle - spread + spread * 2 * ratio;
            const sx = Math.cos(angle), sy = Math.sin(angle);
            NewProjectile(null,
                Number(npc.Center.X) + sx * 5,
                Number(npc.Center.Y) + sy * 5,
                sx * speed, sy * speed,
                projectileType, 10, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
            if (Terraria.Main.netMode !== 2 && i % 2 === 0) {
                const dust = NewDust(Vector2.new(Number(npc.Center.X) + sx * 5, Number(npc.Center.Y) + sy * 5), 2, 2, SandDustType, sx * 1.4, sy * 1.4, 0, Color.White, 1.0);
                if (dust >= 0)
                    Terraria.Main.dust[dust].noGravity = true;
            }
        }
        state.sourceSpitCount = Number(state.sourceSpitCount || 0) + 1;
        state.chompTimer = 28;
        npc.netUpdate = true;
        return count;
    }

    SpawnSourceTerrainSplash(npc, difficulty, state) {
        if (Number(state.sourceSplashCooldown || 0) > 0)
            return false;
        const type = ModProjectile.getTypeByName('DesertScourgeDiveSplash');
        if (!(type > 0) || Terraria.Main.netMode === 1)
            return false;
        const x = Number(npc.Center.X);
        const y = Number(npc.Center.Y) - 40;
        NewProjectile(null, x, y, 0, 0, type, 0, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
        if (Terraria.Main.netMode !== 2) {
            try {
                Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, Vector2.new(x, y + 40), 74, 0);
            } catch (e) { }
        }
        if (difficulty.death) {
            const spitType = ModProjectile.getTypeByName('DesertScourgeSpit');
            if (spitType > 0) {
                for (let i = 0; i < 7; i++) {
                    const offset = i - 3;
                    const sx = offset * 3;
                    const sy = -Math.max(3, Math.abs(offset) * 3 + 3);
                    NewProjectile(null, x + offset * 16, y + 80 - Math.abs(offset * 16), sx, sy, spitType, 10, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
                }
            }
        }
        state.sourceSplashCooldown = 24;
        return true;
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        if (Number(state.chompTimer || 0) > 0)
            state.chompTimer = Math.max(0, Number(state.chompTimer) - 1);
        if (Number(state.sourceSplashCooldown || 0) > 0)
            state.sourceSplashCooldown = Math.max(0, Number(state.sourceSplashCooldown) - 1);
        if (!state.segmentsSpawned && Terraria.Main.netMode !== 1)
            this.SpawnSegments(npc, state);
        if (BossIntroRuntime.ShouldHoldNPC(npc))
            return false;

        if (Number(state.retargetTimer || 0) <= 0 || npc.target < 0 || npc.target >= 255) {
            npc.TargetClosest(false);
            state.retargetTimer = 30;
        } else
            state.retargetTimer = Number(state.retargetTimer) - 1;
        let player = npc.target >= 0 && npc.target < 255 ? Terraria.Main.player[npc.target] : null;
        if (!player || !player.active || player.dead) {
            npc.TargetClosest(false);
            player = npc.target >= 0 && npc.target < 255 ? Terraria.Main.player[npc.target] : null;
        }
        if (!player || !player.active || player.dead) {
            npc.damage = 0;
            npc.dontTakeDamage = true;
            state.despawnTimer = Number(state.despawnTimer || 0) + 1;
            const velocity = npc.velocity;
            velocity.X = Number(velocity.X) * 0.98;
            velocity.Y = Math.min(24, Number(velocity.Y) + 1);
            npc.velocity = velocity;
            if (state.despawnTimer >= 180)
                this.CleanupEncounter(npc, true);
            return false;
        }
        state.despawnTimer = 0;

        const difficulty = GetDesertScourgeDifficultyFlags();
        const death = difficulty.death === true;
        const revenge = difficulty.revenge === true;
        const expert = difficulty.expert === true;
        const lifeRatio = Number(npc.life) / Math.max(1, Number(npc.lifeMax));
        if (lifeRatio < 0.5 && state.phase2VfxShown !== true) {
            state.phase2VfxShown = true;
            BossPhaseVFX.Trigger(npc, 'desert', 1);
        }
        const hide = AnyNuisanceAlive(npc.whoAmI);
        const restoredDamage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 40;

        if (hide) {
            state.sourceAI0 = 0;
            state.sourceAI1 = 0;
            state.sourceAI3 = 0;
            state.sourceRoarPlayed = false;
        }

        npc.dontTakeDamage = hide;
        npc.damage = hide ? 0 : restoredDamage;
        try { npc.canDisplayBuffs = !hide; } catch (e) { }

        if (player.ZoneDesert === true)
            state.biomeEnrageTimer = 300;
        else
            state.biomeEnrageTimer = Math.max(0, Number(state.biomeEnrageTimer || 0) - 1);
        const biomeEnraged = Number(state.biomeEnrageTimer || 0) <= 0;
        const enrageScale = biomeEnraged ? 2 : 0;

        if (lifeRatio < 0.5 && expert && !state.nuisancesSpawned)
            this.SpawnNuisances(npc, player, state);

        if (hide) {
            npc.alpha = Math.min(255, Number(npc.alpha) + 3);
            if (Terraria.Main.netMode !== 2 && Number(state.age || 0) % 16 === 0) {
                const dust = NewDust(npc.position, npc.width, npc.height, SandDustType, -Number(npc.velocity.X) * 0.05, -Number(npc.velocity.Y) * 0.05, 100, Color.White, 1.1);
                if (dust >= 0) {
                    Terraria.Main.dust[dust].noGravity = true;
                    Terraria.Main.dust[dust].noLight = true;
                }
            }
        } else
            npc.alpha = Math.max(0, Number(npc.alpha) - 42);
        if (!hide && Number(npc.alpha) > 0) {
            npc.dontTakeDamage = true;
            npc.damage = 0;
        }

        const playerX = Number(Terraria.PlayerCenterX(player));
        const playerY = Number(Terraria.PlayerCenterY(player));
        const centerX = Number(npc.Center.X);
        const centerY = Number(npc.Center.Y);
        if (!hide && (centerY > playerY || Math.abs(centerX - playerX) > 480) && (revenge || lifeRatio < (expert ? 0.75 : 0.5)))
            state.sourceAI0 = Number(state.sourceAI0 || 0) + 1;

        let burrow = Number(state.sourceAI0 || 0) >= 600;
        const resetTime = Number(state.sourceAI0 || 0) >= 1200;
        let lungeUpward = burrow && Number(state.sourceAI1 || 0) === 1;
        let quickFall = Number(state.sourceAI1 || 0) === 2;
        const burrowDistance = hide ? 1080 : 800;

        let acceleration = death ? 0.105 : 0.085;
        let turnSpeed = death ? 0.21 : 0.17;
        if (expert) {
            acceleration += acceleration * 0.4 * (1 - lifeRatio);
            turnSpeed += turnSpeed * 0.4 * (1 - lifeRatio);
        }
        if (revenge) {
            acceleration += (death ? 0.03 : 0.02) * (1 - lifeRatio);
            turnSpeed += (death ? 0.06 : 0.04) * (1 - lifeRatio);
        }
        acceleration += 0.085 * enrageScale;
        turnSpeed += 0.17 * enrageScale;
        if (difficulty.goodWorld) {
            acceleration *= 1.1;
            turnSpeed *= 1.2;
        }
        if (lungeUpward || burrow) {
            acceleration *= 1.5;
            turnSpeed *= 1.5;
            if (!(Number(state.sourceAI3) !== 0) && lungeUpward)
                state.sourceAI3 = playerY - 600;
        }

        let maxChaseSpeed = difficulty.zenithWorld ? 24 : (difficulty.goodWorld ? 21 : (death ? 15 : (expert ? 12.5 : 10)));
        if (burrow || lungeUpward)
            maxChaseSpeed *= 1.5;
        if (expert)
            maxChaseSpeed += maxChaseSpeed * 0.2 * (1 - lifeRatio);

        let directChase = false;
        let directChaseDistance = death ? 600 : (expert ? 800 : 1000);
        if (biomeEnraged)
            directChaseDistance = 100;
        if (Number(npc.position.Y) > Number(Terraria.PlayerPositionY(player)) && !this.TargetInsideDirectChaseBox(npc, player, directChaseDistance))
            directChase = true;

        let shouldFly = UseDesertScourgeTraversal(npc, state, directChase);
        const insideTerrain = state.insideTerrain === true;
        if (lungeUpward)
            shouldFly = true;

        if (state.sourceInsideTerrain !== insideTerrain && Number(state.sourceAI0 || 0) >= 600) {
            this.SpawnSourceTerrainSplash(npc, difficulty, state);
            npc.netUpdate = true;
        }
        state.sourceInsideTerrain = insideTerrain;

        const burrowTarget = playerY + burrowDistance;
        const lungeTarget = Number(state.sourceAI3 || 0);
        if (burrow && centerY >= burrowTarget - 16 && !lungeUpward && !quickFall) {
            state.sourceAI1 = 1;
            state.sourceAI3 = playerY - 600;
            lungeUpward = true;
            if (!state.sourceRoarPlayed && Terraria.Main.netMode !== 2) {
                AndroidSound.PlayExclusive('desert-scourge-lunge-roar', 'Common/Sounds/DesertScourgeRoar.ogg', 0.9, playerX, playerY, 1800, 120, 0, true);
                state.sourceRoarPlayed = true;
            }
            npc.netUpdate = true;
        }

        if (lungeUpward && centerY <= Number(state.sourceAI3 || playerY - 600) + 180 && Math.abs(centerX - playerX) < 480 && !quickFall) {
            this.SpawnOfficialSpitFan(npc, difficulty, state);
            npc.TargetClosest(true);
            state.sourceAI1 = 2;
            state.sourceRoarPlayed = false;
            quickFall = true;
            lungeUpward = false;
            npc.netUpdate = true;
        }

        if (hide) {
            this.ApplyOfficialBurrowMovement(npc, playerX, burrowTarget, maxChaseSpeed, acceleration, turnSpeed);
            state.sourceCycleName = 'nuisance-intermission';
        } else {
            const targetY = lungeUpward ? Number(state.sourceAI3 || playerY - 600) : (burrow ? burrowTarget : playerY);
            if (!shouldFly)
                this.ApplyOfficialAirFall(npc, player, playerX - centerX, maxChaseSpeed, acceleration, death);
            else
                this.ApplyOfficialBurrowMovement(npc, playerX, targetY, maxChaseSpeed, acceleration, turnSpeed);
            state.sourceCycleName = quickFall ? 'quick-fall' : (lungeUpward ? 'upward-lunge' : (burrow ? 'deep-burrow' : (shouldFly ? 'terrain-chase' : 'air-fall')));
        }

        if (quickFall) {
            const velocity = npc.velocity;
            velocity.Y = Number(velocity.Y) + maxChaseSpeed * 0.02;
            npc.velocity = velocity;
            if (Number(npc.Center.Y) >= Number(state.sourceAI3 || playerY - 600) + 600) {
                state.sourceAI0 = 0;
                state.sourceAI1 = 0;
                state.sourceAI3 = 0;
                state.sourceRoarPlayed = false;
                burrow = false;
                quickFall = false;
                npc.netUpdate = true;
            }
        }
        if (resetTime) {
            state.sourceAI0 = 0;
            state.sourceAI1 = 0;
            state.sourceAI3 = 0;
            state.sourceRoarPlayed = false;
            npc.netUpdate = true;
        }

        if ((!burrow || lungeUpward) && !quickFall && !hide) {
            const destinationY = lungeUpward ? Number(state.sourceAI3 || playerY - 600) : playerY;
            const dx = playerX - Number(npc.Center.X);
            const dy = destinationY - Number(npc.Center.Y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > (lungeUpward ? 1000 : 2000)) {
                const direction = this.Normalize(dx, dy, 0, 1);
                const velocity = npc.velocity;
                velocity.X = Number(velocity.X) + direction.x * turnSpeed;
                velocity.Y = Number(velocity.Y) + direction.y * turnSpeed;
                npc.velocity = velocity;
            }
        }

        npc.rotation = Math.atan2(Number(npc.velocity.Y), Number(npc.velocity.X)) + Math.PI * 0.5;
        npc.spriteDirection = Number(npc.velocity.X) < 0 ? 1 : -1;
        npc.direction = npc.spriteDirection;

        state.sourceShouldFly = shouldFly;
        state.sourceAcceleration = acceleration;
        state.sourceTurnSpeed = turnSpeed;
        state.sourceMaxSpeed = maxChaseSpeed;
        state.sourceBurrowTimer = Number(state.sourceAI0 || 0);
        state.sourceBurrow = burrow;
        state.sourceLunge = lungeUpward;
        state.sourceQuickFall = quickFall;
        state.biomeEnraged = biomeEnraged;
        state.phase = hide ? 3 : (quickFall ? 2 : (lungeUpward ? 1 : 0));
        state.phase2 = lifeRatio < 0.5;
        state.revenge = revenge;
        state.death = death;
        state.attackName = state.sourceCycleName;
        state.combatBandName = lifeRatio < 0.5 ? 'below-half' : (lifeRatio < 0.75 ? 'pressure' : 'opening');
        state.cycleFrame = Number(state.sourceAI0 || 0);
        state.cycleLength = 1200;
        state.divePlanned = burrow;
        state.diveStage = quickFall ? 3 : (lungeUpward ? 2 : (burrow ? 1 : 0));
        state.diveImpacted = Number(state.sourceSplashCooldown || 0) > 0;
        state.sandBlastPlanned = false;
        state.sandBlastFired = false;
        if (state.singleEntityWorm === true) {
            const visualSegments = Math.max(1, Math.floor(Number(state.virtualSegmentCount || 1)));
            const bodyScale = Number(state.virtualBodyScale || 1);
            const spacing = Number(state.virtualSpacing || (70 * bodyScale));
            UpdateVirtualWorm(npc, state, visualSegments, spacing, 384);
            state.virtualBodyFrame = (Number(state.virtualBodyFrame || 0) + 0.12) % 7;
        }
        return false;
    }

    PreDraw(npc, spriteBatch, screenPos) {
        const state = CalamityNPCState.Get(npc);
        const geometry = GetVirtualWormGeometry(state);
        if (!geometry || !this.VirtualDrawPos || !this.VirtualDrawScale || !this.VirtualAtlasTexture || this.VirtualBodyVariants.length < 3)
            return true;
        if (globalThis.__TLProCurrentNPCBehindTilesPass === false)
            return true;
        const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
        if (Number(state.virtualBodyLastDrawTick) === tick)
            return true;
        state.virtualBodyLastDrawTick = tick;
        try {
            // 13.09.5 adaptive density: geometry/hurtboxes stay identical to
            // 13.09.4. Only nearly-straight neighboring body pieces may be drawn
            // as one precomposed atlas frame. Curves remain one sprite per sample.
            const draw = spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            const alpha = Math.max(0, 255 - Math.floor(Number(npc.alpha || 0)));
            const bucket = Math.max(0, Math.min(16, Math.round(alpha / 16)));
            let color = this.VirtualColorCache[bucket];
            if (!color) {
                color = Color.new(255, 255, 255, Math.min(255, bucket * 16));
                this.VirtualColorCache[bucket] = color;
            }
            const scale = Number(state.virtualBodyScale || 1);
            const screenW = Math.max(1, Math.floor(Number(Terraria.Main.screenWidth || 1920)));
            const screenH = Math.max(1, Math.floor(Number(Terraria.Main.screenHeight || 1080)));
            const screenX = Number(screenPos.X), screenY = Number(screenPos.Y);
            const gfxOffY = Number(npc.gfxOffY || 0);
            const margin = 220;
            const bodyFrame = Math.max(0, Math.min(6, Math.floor(Number(state.virtualBodyFrame || 0))));
            const animatedSource = this.VirtualBodyFrames[bodyFrame] || this.VirtualBodyFrames[0];
            const pairReady = this.VirtualBodyPairVariants.length >= 2 && !!this.VirtualPairOrigin;
            const maxMergedPairs = Math.min(3, Math.max(1, Math.floor(geometry.count * 0.20)));
            let mergedPairs = 0;
            let drawCalls = 0;
            for (let i = geometry.count - 1; i >= 0;) {
                const tail = i === geometry.count - 1;
                // Pair only static body pieces: never the animated first body
                // frame and never the tail. The shortest signed-angle delta is
                // used so wrapping around +/-PI cannot create a false curve.
                if (pairReady && !tail && i >= 2 && mergedPairs < maxMergedPairs) {
                    const j = i - 1;
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
                            const firstVariant = (Math.max(0, j - 1)) % 2;
                            draw(this.VirtualAtlasTexture, this.VirtualDrawPos, this.VirtualBodyPairVariants[firstVariant], color, r0 + delta * 0.5, this.VirtualPairOrigin, scale, SpriteEffects.None, 1.0);
                            mergedPairs++;
                            drawCalls++;
                            i -= 2;
                            continue;
                        }
                    }
                }
                const dx = Number(geometry.x[i]) - screenX;
                const dy = Number(geometry.y[i]) - screenY + gfxOffY;
                if (!(dx < -margin || dx > screenW + margin || dy < -margin || dy > screenH + margin)) {
                    this.VirtualDrawPos.X = dx;
                    this.VirtualDrawPos.Y = dy;
                    const variant = (Math.max(0, i - 1)) % 2;
                    const source = tail ? this.VirtualTailSource : (i === 0 ? animatedSource : this.VirtualBodyVariants[variant]);
                    const origin = i === 0 && !tail ? this.VirtualBodyOrigin : this.VirtualStaticOrigin;
                    if (tail && i > 0) {
                        const px = Number(geometry.x[i - 1]) - screenX;
                        const py = Number(geometry.y[i - 1]) - screenY + gfxOffY;
                        this.VirtualDrawPos.X = px + (dx - px) * 0.90;
                        this.VirtualDrawPos.Y = py + (dy - py) * 0.90;
                    }
                    draw(this.VirtualAtlasTexture, this.VirtualDrawPos, source, color, Number(geometry.rotation[i]), origin, scale, SpriteEffects.None, 1.0);
                    drawCalls++;
                }
                i--;
            }
            state.virtualBodyLastMergedPairs = mergedPairs;
            state.virtualBodyLastDrawCalls = drawCalls;
        } catch (e) {
            try { tl.log(`[CalamityPort SingleWorm] Desert Scourge virtual draw failed: ${e}`); } catch (_) { }
        }
        return true;
    }

    FindFrame(npc, frameHeight) {
        const state = CalamityNPCState.Get(npc);
        const mouthOpen = Number(state.phase) === 1 || Number(state.chompTimer || 0) > 0;
        const closeRange = npc.target >= 0 && npc.target < 255 && Terraria.Main.player[npc.target]
            ? Math.abs(Number(Terraria.PlayerCenterX(Terraria.Main.player[npc.target])) - Number(npc.Center.X)) < 220 &&
                Math.abs(Number(Terraria.PlayerCenterY(Terraria.Main.player[npc.target])) - Number(npc.Center.Y)) < 220
            : false;
        let frame = 0;
        if (mouthOpen || closeRange) {
            npc.frameCounter++;
            frame = Math.min(6, Math.floor(Number(npc.frameCounter) / 4) % 7);
        } else {
            npc.frameCounter = Math.max(0, Number(npc.frameCounter) - 1.5);
            frame = Math.max(0, Math.min(6, Math.floor(Number(npc.frameCounter) / 4)));
        }
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
    }

    BossHeadSlot(npc) {
        return AnyNuisanceAlive(npc.whoAmI) ? -1 : null;
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        const playerBalance = Number.isFinite(Number(balance)) ? Number(balance) : 1;
        const masterAdjustment = Number.isFinite(Number(bossAdjustment)) ? Number(bossAdjustment) : 1;
        npc.lifeMax = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.8 * playerBalance * masterAdjustment));
        npc.damage = Math.max(1, Math.floor(Number(npc.damage) * 0.8));
    }

    ModifyHitPlayer(npc, player, modifiers) {
        ApplyCircularContactFilter(npc, player, modifiers, 60 * Number(npc.scale || 1), true);
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) <= 0)
            return;
        const state = CalamityNPCState.Get(npc);
        state.chompTimer = 24;
    }

    CheckActive() {
        return false;
    }

    ModifyNPCLoot(npcLoot) {
        const pearlShard = ModItem.getTypeByName('PearlShard');
        const mask = ModItem.getTypeByName('DesertScourgeMask');
        const trophy = ModItem.getTypeByName('DesertScourgeTrophy');
        const bag = ModItem.getTypeByName('DesertScourgeBag');
        if (trophy > 0)
            npcLoot.Add(ItemDropRule.Common(trophy, 10, 1, 1));
        const notExpert = Conditions.NotExpert.new();
        if (mask > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, mask, 7, 1, 1, 1));
        if (pearlShard > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, pearlShard, 1, 25, 30, 1));
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, Terraria.ID.ItemID.Coral, 1, 25, 30, 1));
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, Terraria.ID.ItemID.Seashell, 1, 25, 30, 1));
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, Terraria.ID.ItemID.Starfish, 1, 25, 30, 1));
        if (bag > 0)
            npcLoot.Add(ItemDropRule.BossBag(bag));
        npcLoot.Add(ItemDropRule.Common(Terraria.ID.ItemID.LesserHealingPotion, 1, 5, 15));
    }

    BossLoot(npc, potionType) {
        return Terraria.ID.ItemID.SandBlock;
    }

    OnKill(npc) {
        DisableVirtualWormDamage(npc, CalamityNPCState.Get(npc));
        if (Terraria.Main.netMode !== 2) {
            try {
                const gameVolume = Number(Terraria.Main.soundVolume);
                const volume = Number.isFinite(gameVolume) ? Math.max(0, Math.min(1, gameVolume)) : 1.0;
                AndroidSound.PlayExclusive('desert-scourge-voice', 'Common/Sounds/DesertScourgeDeath.ogg', volume, Number(npc.Center.X), Number(npc.Center.Y), 1800, 180, 0, true);
            } catch (e) { }
        }
        this.CleanupEncounter(npc, false);
        const expert = Terraria.Main.expertMode === true || Terraria.Main.masterMode === true;
        if (!expert) {
            SpawnCalamityStyleWeapons(npc, [
                ModItem.getTypeByName('SaharaSlicers'),
                ModItem.getTypeByName('Barinade'),
                ModItem.getTypeByName('SandstreamScepter'),
                ModItem.getTypeByName('BrittleStarStaff'),
                ModItem.getTypeByName('ScourgeoftheDesert')
            ], 4);
        }
        const worldState = ModSystem.getByName('CalamityWorldState');
        const firstKill = worldState ? !worldState.DownedDesertScourge : false;
        const revenge = !!(worldState && worldState.RevengeanceMode === true);
        if (worldState && worldState.RecordDesertScourgeKill)
            worldState.RecordDesertScourgeKill();
        if (firstKill) {
            const lore = ModItem.getTypeByName('LoreDesertScourge');
            SpawnDrop(npc, lore, 1);
            Tell('O Flagelo do Deserto foi derrotado pela primeira vez!', 120, 255, 210);
            Tell('As tempestades de areia agora podem se erguer com mais frequência.', 255, 235, 150);
            try {
                if (!Terraria.GameContent.Events.Sandstorm.Happening)
                    Terraria.GameContent.Events.Sandstorm.Happening = true;
            } catch (e) { }
        }
        if (Terraria.Main.masterMode === true && revenge) {
            SpawnDrop(npc, ModItem.getTypeByName('DesertScourgeRelic'), 1);
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const dead = npc.life <= 0;
        const count = dead ? 32 : 4;
        for (let i = 0; i < count; i++) {
            const speedX = (Math.random() - 0.5) * (dead ? 5 : 1.6) + hitDirection * 0.2;
            const speedY = (Math.random() - 0.5) * (dead ? 5 : 1.6);
            NewDust(npc.position, npc.width, npc.height, SandDustType, speedX, speedY, 0, Color.White, dead ? 1.6 : 1.05);
        }
        if (!dead)
            QueueNextDesertScourgeHitSound(npc);
    }
}
