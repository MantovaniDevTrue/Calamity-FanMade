import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModSystem } from './../../../../TL/ModSystem.js';
import { ModGore } from './../../../../TL/ModGore.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { BossIntroRuntime } from './../../../../Core/BossIntroRuntime.js';
import { AndroidSound } from './../../../../Common/Snippets/AndroidSound.js';
import {

    GetHiveState,
    SetActiveHiveMind,
    ClearActiveHiveMind,
    GetHiveWorld,
    IsExpert,
    IsRevengeance,
    IsDeath,
    IsGoodWorld,
    IsZenithWorld,
    Normalize,
    Distance,
    TargetPlayer,
    IsCorruptionPlayer,
    CountNPC,
    AnyNPC,
    SpawnNPC,
    SpawnProjectile,
    GetNPCType,
    GetProjectileType,
    FindGroundBelow,
    IsSolidAt,
    CanSee,
    PlaySound,
    ApplyBrainRot,
    DeactivateNoLoot,
    RandInt,
    Chance
} from './../../../../Core/HiveMindRuntime.js';
const { Color, Vector2, Rectangle, Effects } = Modules;
const { ItemDropRule, Conditions } = Terraria.GameContent.ItemDropRules;
const NativeRectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const NativeVector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function Vec(x, y) {
    const v = NativeVector2.new();
    v.X = Number(x);
    v.Y = Number(y);
    return v;
}

function Rect(x, y, w, h) {
    const r = NativeRectangle.new();
    r.X = Math.floor(x);
    r.Y = Math.floor(y);
    r.Width = Math.floor(w);
    r.Height = Math.floor(h);
    return r;
}

function Clamp(v, min, max) {
    return Math.max(min, Math.min(max, Number(v)));
}

// TLPro bridge note: Vector2 is a value type. Mutating npc.velocity.X/Y or npc.position.X/Y
// can modify only a temporary wrapper. AFTER MOON avoids this by assigning the whole Vector2.
function SetVelocity(npc, x, y) {
    npc.velocity = Vector2.new(Number(x), Number(y));
}

function AddVelocity(npc, dx, dy) {
    npc.velocity = Vector2.new(Number(npc.velocity.X) + Number(dx), Number(npc.velocity.Y) + Number(dy));
}

function Next(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Roll(denominator) {
    return Math.random() < 1 / Math.max(1, Number(denominator));
}

function PlayHiveMindRoar(position, fast = false) {
    // AFTER MOON-style hot path: keep combat sounds on Terraria's native mixer.
    // Starting Android MediaPlayer instances during dashes caused periodic frame spikes.
    PlaySound(15, position, 1, fast ? 0.15 : 0);
    return true;
}

function SpawnGoreSet(entity, prefix, amount) {
    if (!entity || Terraria.Main.netMode === 2)
        return;
    for (let i = 1; i <= amount; i++) {
        const type = Number(ModGore.getTypeByName(`${prefix}${i}`) || 0);
        if (!(type > 0))
            continue;
        try {
            Effects.NewGoreFromNPC(entity, type, false);
        } catch (e) { }
    }
}

function SpawnHiveMindDeathGoresOnce(npc, state) {
    if (!state || state.deathGoresSpawned === true)
        return;
    state.deathGoresSpawned = true;
    SpawnGoreSet(npc, 'HiveMindP2Gore', 10);
}

function Tell(text, r = 90, g = 220, b = 255) {
    try {
        NewText(String(text), r, g, b);
    } catch (e) { }
}

function SpawnDrop(npc, type, stack = 1) {
    if (!(Number(type) > 0) || Terraria.Main.netMode === 1)
        return;
    try {
        NewItem(Math.floor(Number(npc.position.X)), Math.floor(Number(npc.position.Y)), Math.max(1, Number(npc.width)), Math.max(1, Number(npc.height)), Math.floor(Number(type)), Math.max(1, Math.floor(Number(stack))), false, -1, true);
    } catch (e) { }
}

function DropClassicWeaponsWithPity(npc) {
    if (IsExpert() || Terraria.Main.netMode === 1)
        return;
    const weapons = ['PerfectDark', 'Shadethrower', 'ShaderainStaff', 'DankStaff', 'RotBall']
        .map(name => Number(ModItem.getTypeByName(name) || 0)).filter(type => type > 0);
    let dropped = false;
    for (const type of weapons) {
        if (!Roll(4))
            continue;
        SpawnDrop(npc, type, 1);
        dropped = true;
    }
    if (!dropped && weapons.length === 5)
        SpawnDrop(npc, weapons[Math.floor(Math.random() * weapons.length)], 1);
}

function SpawnDustBurst(npc, amount = 20) {
    if (Terraria.Main.netMode === 2)
        return;
    const capped = Math.min(amount, 35);
    for (let i = 0; i < capped; i++) {
        const dust = NewDust(npc.position, npc.width, npc.height, 14, 0, 0, 100, Color.White, i < capped * 0.4 ? 2 : 3);
        if (dust >= 0) {
            Terraria.Main.dust[dust].noGravity = i >= capped * 0.4;
            Terraria.Main.dust[dust].velocity.X *= i >= capped * 0.4 ? 4 : 2;
            Terraria.Main.dust[dust].velocity.Y *= i >= capped * 0.4 ? 4 : 2;
        }
    }
}

function DropHeartIfNeeded(npc, chance = 1) {
    if (Terraria.Main.netMode === 1 || Math.random() >= chance)
        return;
    const playerIndex = Terraria.Player.FindClosest(npc.Center, 1, 1);
    const player = Terraria.Main.player[playerIndex];
    if (!player || Number(player.statLife) >= Number(player.statLifeMax2))
        return;
    try {
        NewItem(Math.floor(Number(npc.position.X)), Math.floor(Number(npc.position.Y)), npc.width, npc.height, Number(Terraria.ID.ItemID.Heart || 58), 1, false, 0, false);
    } catch (e) { }
}

function CircleContactAllowed(npc, player, radius) {
    const left = Number(Terraria.PlayerPositionX(player)), top = Number(Terraria.PlayerPositionY(player));
    const right = left + Number(Terraria.PlayerWidth(player)), bottom = top + Number(Terraria.PlayerHeight(player));
    const cx = Number(npc.Center.X), cy = Number(npc.Center.Y);
    const points = [[left, top], [right, top], [left, bottom], [right, bottom]];
    let min = Number.POSITIVE_INFINITY;
    for (const [x, y] of points)
        min = Math.min(min, Math.sqrt((x - cx) ** 2 + (y - cy) ** 2));
    return min <= radius && Number(npc.alpha) === 0 && Math.abs(Number(npc.scale) - 1) < 0.001;
}

export class HiveMind extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/HiveMind/HiveMind';
        this.Music = 79;
        this.Phase2Texture = null;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 16;
        try {
            Terraria.ID.NPCID.Sets.TrailingMode[this.Type] = 1;
        } catch (e) { }
        try {
            Terraria.ID.NPCID.Sets.TrailCacheLength[this.Type] = 6;
        } catch (e) { }
        try {
            Terraria.ID.NPCID.Sets.BossBestiaryPriority.Add(this.Type);
        } catch (e) { }
        try {
            Terraria.ID.NPCID.Sets.MPAllowedEnemies[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.NPC.damage = 40;
        this.NPC.npcSlots = 5;
        this.NPC.width = 178;
        this.NPC.height = 122;
        this.NPC.defense = 8;
        this.NPC.lifeMax = IsRevengeance() ? 7000 : 5000;
        this.NPC.aiStyle = -1;
        this.NPC.knockBackResist = 0;
        this.NPC.value = ModNPC.NPCValue(0, 5, 0, 0);
        this.NPC.boss = true;
        this.NPC.noGravity = false;
        this.NPC.noTileCollide = false;
        this.NPC.netAlways = true;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit1;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }

    PostSetupContent() {
        try {
            this.Phase2Texture = tl.texture.load('Textures/NPCs/Bosses/HiveMind/HiveMindP2.png');
        } catch (e) {
            this.Phase2Texture = null;
        }
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        const bal = Number.isFinite(Number(balance)) ? Number(balance) : 1;
        const adjust = Number.isFinite(Number(bossAdjustment)) ? Number(bossAdjustment) : 1;
        npc.lifeMax = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.8 * bal * adjust));
        npc.damage = Math.max(1, Math.floor(Number(npc.damage) * 0.8));
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.hiveInitialized = false;
        GetHiveState(npc);
        SetActiveHiveMind(npc);
        npc.TargetClosest(true);
        BossIntroRuntime.Trigger(npc, 'hive');
    }

    IsPhaseTwo(npc) {
        return Number(npc.life) / Math.max(1, Number(npc.lifeMax)) < 0.8;
    }

    BossHeadSlot(npc) {
        if (!this.IsPhaseTwo(npc))
            return null;
        try {
            const base = Number(Terraria.ID.NPCID.Sets.BossHeadTextures[this.Type]);
            return base >= 0 ? base + 1 : null;
        } catch (e) {
            return null;
        }
    }

    SpawnInitialBlobs(npc, state) {
        if (state.initialBlobsSpawned || Terraria.Main.netMode === 1)
            return;
        state.initialBlobsSpawned = true;
        let count = IsDeath() ? 15 : (IsRevengeance() ? 7 : (IsExpert() ? 6 : 5));
        if (IsGoodWorld())
            count *= 2;
        if (IsZenithWorld())
            count = 50;
        const type = GetNPCType('HiveBlob');
        for (let i = 0; i < count; i++) {
            SpawnNPC(type, npc.Center.X, npc.Center.Y, npc.whoAmI, { fastVariant: Math.random() < 0.5 });
        }
    }

    SpawnPhaseOneWave(npc, state) {
        PlaySound(4, npc.Center, 22, 0);
        SpawnDustBurst(npc, 24);
        const maxSpawns = IsDeath() ? 5 : (IsRevengeance() ? 4 : (IsExpert() ? RandInt(3, 5) : RandInt(2, 4)));
        const maxDank = IsDeath() ? RandInt(2, 4) : (IsRevengeance() ? 2 : (IsExpert() ? RandInt(1, 3) : 1));
        const blob = GetNPCType('HiveBlob');
        const dank = GetNPCType('DankCreeper');
        for (let i = 0; i < maxSpawns; i++) {
            const type = CountNPC(dank) < maxDank ? dank : blob;
            SpawnNPC(type, Number(npc.position.X) + Math.random() * Math.max(1, Number(npc.width) - 32), Number(npc.position.Y) + Math.random() * Math.max(1, Number(npc.height) - 32), npc.whoAmI, type === blob ? { fastVariant: false } : null);
        }
    }

    SpawnStuff(npc) {
        const max = IsDeath() ? RandInt(3, 5) : (IsRevengeance() ? 3 : (IsExpert() ? RandInt(2, 4) : 2));
        const candidates = [6, 7, GetNPCType('DankCreeper')];
        if (IsDeath())
            candidates.push(94);
        for (let i = 0; i < max; i++) {
            let type = -1;
            for (const candidate of candidates) {
                if (candidate > 0 && !AnyNPC(candidate)) {
                    type = candidate;
                    break;
                }
            }
            if (!(type > 0))
                break;
            SpawnNPC(type, Number(npc.position.X) + Math.random() * Number(npc.width), Number(npc.position.Y) + Math.random() * Number(npc.height), npc.whoAmI);
        }
        if (IsZenithWorld() && CountNPC(GetNPCType('HiveTumor')) < 3) {
            SpawnNPC(GetNPCType('HiveTumor'), Number(npc.Center.X), Number(npc.Center.Y), npc.whoAmI);
        }
    }

    StartPhaseTwo(npc, state) {
        if (state.phaseTransition)
            return;
        state.phaseTransition = true;
        state.phaseTwo = true;
        BossIntroRuntime.Trigger(npc, 'hivePhase');
        state.hiveState = 0;
        state.nextState = 0;
        state.phase2Timer = state.minimumDriftTime;
        state.frameX = 0;
        state.frameY = 0;
        SpawnGoreSet(npc, 'HiveMindGore', 7);
        PlaySound(4, npc.Center, 1, 0);
        SpawnDustBurst(npc, 35);
        npc.noGravity = true;
        npc.noTileCollide = true;
        npc.scale = 1;
        npc.alpha = 0;
        npc.dontTakeDamage = false;
        npc.damage = 0;
        npc.netUpdate = true;
    }

    Despawn(npc, state, phaseOne = false) {
        // Match the PC Hive Mind's localAI[3] despawn/recovery behavior.
        // Do not force invulnerability here; the official AI only disables contact damage.
        npc.damage = 0;
        if (Number(npc.timeLeft) > 60)
            npc.timeLeft = 60;
        state.despawnTicks = Math.min(120, Number(state.despawnTicks || 0) + 1);
        if (state.despawnTicks > 60) {
            SetVelocity(npc, Number(npc.velocity.X), Number(npc.velocity.Y) + (state.despawnTicks - 60) * 0.5);
            if (phaseOne) {
                npc.noGravity = true;
                npc.noTileCollide = true;
                if (Number(state.burrowTimer) > 30)
                    state.burrowTimer = 30;
            }
        }
    }

    EngagementGate(npc, state, player, phaseOne = false) {
        // Calamity PC despawns outside Corruption, but TLPro's ZoneCorrupt flag can
        // flicker/return false while the player is visibly inside the biome. That was
        // making Hive Mind repeatedly enter its upward despawn routine and then return.
        // Keep the PC distance/dead-player behavior, but do not use the unreliable
        // mobile biome flag as an AI-state gate.
        const invalidTarget = !player || player.active === false || player.dead === true ||
            Distance(npc.Center, Terraria.PlayerCenter(player)) > 8000;
        if (invalidTarget) {
            try { npc.TargetClosest(false); } catch (e) { }
            const replacement = TargetPlayer(npc);
            const replacementValid = !!replacement && replacement.active !== false && replacement.dead !== true &&
                Distance(npc.Center, Terraria.PlayerCenter(replacement)) <= 8000;
            if (!replacementValid) {
                this.Despawn(npc, state, phaseOne);
                return { hold: true, player: replacement || player };
            }
            player = replacement;
        }

        if (Number(npc.timeLeft) < 1800)
            npc.timeLeft = 1800;

        // A valid player should immediately cancel a transient despawn state. PC uses a
        // gradual localAI[3] countdown, but on TLPro a single bad target/biome read can
        // otherwise leave the boss drifting away for seconds.
        state.despawnTicks = 0;
        return { hold: false, player };
    }

    SelectNextState(npc, state, lifeRatio) {
        if (state.nextState !== 0)
            return;
        const revenge = IsRevengeance();
        const death = IsDeath();

        // Exact Calamity PC ranges. C# Main.rand.Next(min, max) excludes max.
        // The previous port used inclusive RandInt and could directly select state 6
        // (deceleration) or choose Rain Dash at health ranges where PC cannot.
        if (revenge && lifeRatio < 0.6) {
            let min = 3;
            let maxExclusive;
            if (death || lifeRatio < 0.3)
                maxExclusive = 6; // 3,4,5
            else
                maxExclusive = 5; // 3,4
            do {
                state.nextState = min + Math.floor(Math.random() * (maxExclusive - min));
            } while (state.nextState === state.previousState);
            state.previousState = state.nextState;
        } else if (revenge && (Chance(3) || state.reelCount === 2)) {
            state.reelCount = 0;
            state.nextState = 2;
        } else {
            state.reelCount++;
            if (IsExpert() && state.reelCount === 2) {
                state.reelCount = 0;
                state.nextState = 2;
            } else {
                state.nextState = 1;
            }
            state.teleportX = 0;
            state.teleportY = 0;
        }
        if (state.nextState === 3)
            state.orbitRotation = Math.random() * Math.PI * 2;
        npc.netUpdate = true;
    }

    ReelBack(npc, state, player) {
        npc.alpha = 0;
        state.phase2Timer = 0;
        state.decelX = Number(npc.velocity.X) / 255 * state.reelbackFade;
        state.decelY = Number(npc.velocity.Y) / 255 * state.reelbackFade;
        if (IsRevengeance()) {
            state.hiveState = 2;
            PlayHiveMindRoar(npc.Center, true);
        } else {
            if (Distance(npc.Center, Terraria.PlayerCenter(player)) > 80)
                this.SpawnStuff(npc);
            state.hiveState = state.nextState;
            state.nextState = 0;
            PlayHiveMindRoar(npc.Center, state.hiveState !== 2);
        }
        npc.netUpdate = true;
    }

    PhaseTwoAI(npc, state, player) {
        const lifeRatio = Number(npc.life) / Math.max(1, Number(npc.lifeMax));
        npc.noGravity = true;
        npc.noTileCollide = true;
        const radius = Number(state.teleportRadius || 300);
        const expert = IsExpert();
        const revenge = IsRevengeance();
        const death = IsDeath();

        // This state machine is intentionally kept line-for-line equivalent to the
        // Calamity PC HiveMind.cs attack flow. Mobile-specific changes are limited to
        // the unreliable biome despawn check and expensive visual/native bridge calls.
        switch (Number(state.hiveState) | 0) {
            case 0: { // Slow drift
                npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 40;
                if (Number(npc.alpha) > 0)
                    npc.alpha = Math.max(0, Number(npc.alpha) - 3);

                this.SelectNextState(npc, state, lifeRatio);

                const engagement = this.EngagementGate(npc, state, player, false);
                player = engagement.player || player;
                if (engagement.hold)
                    return;

                const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
                const dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
                const dir = Normalize(dx, dy, 0, 1);

                state.phase2Timer = Number(state.phase2Timer || 0) - 1;
                if (death && npc.justHit === true)
                    state.phase2Timer -= 4;

                if (state.phase2Timer <= -180) {
                    // PC does NOT normalize here. It keeps the full player-to-boss vector
                    // and scales it before ReelBack(), producing the visible backwards slide.
                    const factor = (2 / 255) * Number(state.reelbackFade || 2);
                    SetVelocity(npc, dx * factor, dy * factor);
                    this.ReelBack(npc, state, player);
                    npc.netUpdate = true;
                } else {
                    const speed = expert ? Number(state.driftSpeed) + Number(state.driftBoost) * lifeRatio : Number(state.driftSpeed);
                    SetVelocity(npc, dir.x * speed, dir.y * speed);
                }
                break;
            }

            case 1: { // Reelback and teleport
                npc.damage = 0;
                npc.alpha = Number(npc.alpha) + Number(state.reelbackFade);
                SetVelocity(npc, Number(npc.velocity.X) - Number(state.decelX || 0), Number(npc.velocity.Y) - Number(state.decelY || 0));

                if (Number(npc.alpha) >= 255) {
                    npc.alpha = 255;
                    SetVelocity(npc, 0, 0);
                    state.hiveState = 0;

                    if ((Number(state.teleportX) !== 0 || Number(state.teleportY) !== 0)) {
                        // PC stores tile coordinates in ai[1]/ai[2]. The JS state stores
                        // the resolved pixel coordinates directly.
                        npc.Center = Vector2.new(Number(state.teleportX), Number(state.teleportY));
                    }

                    state.phase2Timer = Number(state.minimumDriftTime) + Math.floor(Math.random() * (death ? 61 : 121));
                    state.teleportX = 0;
                    state.teleportY = 0;
                    npc.netUpdate = true;
                } else if (Number(state.teleportX) === 0 && Number(state.teleportY) === 0) {
                    for (let i = 0; i < 10; i++) {
                        const tileX = Math.floor(Number(Terraria.PlayerCenterX(player)) / 16) + RandInt(15, 46) * (Math.random() < 0.5 ? -1 : 1);
                        const tileY = Math.floor(Number(Terraria.PlayerCenterY(player)) / 16) + RandInt(15, 46) * (Math.random() < 0.5 ? -1 : 1);
                        const x = tileX * 16;
                        const y = tileY * 16;
                        if (!IsSolidAt(x, y, 1, 1) && CanSee({ position: Vec(x, y), width: 1, height: 1 }, player)) {
                            state.teleportX = x;
                            state.teleportY = y;
                            npc.netUpdate = true;
                            break;
                        }
                    }
                }
                break;
            }

            case 2: { // Reelback for lunge / advanced attacks
                npc.damage = 0;
                npc.alpha = Number(npc.alpha) + Number(state.reelbackFade);
                SetVelocity(npc, Number(npc.velocity.X) - Number(state.decelX || 0), Number(npc.velocity.Y) - Number(state.decelY || 0));

                if (Number(npc.alpha) >= 255) {
                    npc.alpha = 255;
                    SetVelocity(npc, 0, 0);
                    state.dashStarted = false;

                    if (revenge && lifeRatio < 0.6 && Number(state.lungesPerformed || 0) === 0 && Number(state.rainDashesPerformed || 0) === 0) {
                        // PC: state = nextState; nextState = 0; previousState = state.
                        let chosen = Number(state.nextState || 0) | 0;
                        // Defensive recovery for TLPro state loss. Never let the boss sit
                        // in reelback or deceleration as an "attack".
                        if (chosen < 3 || chosen > 5) {
                            if (death || lifeRatio < 0.3)
                                chosen = 3 + Math.floor(Math.random() * 3);
                            else
                                chosen = 3 + Math.floor(Math.random() * 2);
                            if (chosen === Number(state.previousState))
                                chosen = chosen === 3 ? 4 : 3;
                        }
                        state.hiveState = chosen;
                        state.nextState = 0;
                        state.previousState = chosen;
                    } else {
                        state.hiveState = state.performingRainDashCombo ? 5 : 3;
                    }

                    if (!state.performingRainDashCombo) {
                        const pvx = Number(Terraria.PlayerVelocity(player).X);
                        state.rotationDirection = pvx > 0 ? 1 : (pvx < 0 ? -1 : (Number(Terraria.PlayerDirection(player)) || 1));
                    }
                    npc.netUpdate = true;
                }
                break;
            }

            case 3: { // Spin lunge
                npc.damage = 0;
                if (Number(npc.alpha) > 0) {
                    npc.Center = Vector2.new(
                        Number(Terraria.PlayerCenterX(player)) + Math.cos(Number(state.orbitRotation || 0)) * radius,
                        Number(Terraria.PlayerCenterY(player)) + Math.sin(Number(state.orbitRotation || 0)) * radius
                    );
                    state.orbitRotation = Number(state.orbitRotation || 0) + Number(state.rotationIncrement) * Number(state.rotationDirection || 1);
                    state.phase2Timer = Number(state.lungesPerformed || 0) > 0 ? Math.floor(Number(state.lungeDelay) / (Number(state.lungesPerformed) + 1)) : Number(state.lungeDelay);
                    npc.alpha = Math.max(0, Number(npc.alpha) - Number(state.lungeFade));
                    npc.netUpdate = true;
                } else {
                    state.phase2Timer = Number(state.phase2Timer || 0) - 1;
                    if (!state.dashStarted) {
                        if (state.phase2Timer <= 0) {
                            npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 40;
                            state.phase2Timer = Number(state.lungeTime);
                            const d = Normalize(
                                Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X),
                                Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y),
                                0, 1
                            );
                            SetVelocity(npc, d.x * (radius / Number(state.lungeTime)), d.y * (radius / Number(state.lungeTime)));
                            state.dashStarted = true;
                            PlayHiveMindRoar(npc.Center, false);
                            npc.netUpdate = true;
                        } else {
                            npc.Center = Vector2.new(
                                Number(Terraria.PlayerCenterX(player)) + Math.cos(Number(state.orbitRotation || 0)) * radius,
                                Number(Terraria.PlayerCenterY(player)) + Math.sin(Number(state.orbitRotation || 0)) * radius
                            );
                            state.orbitRotation = Number(state.orbitRotation || 0) + Number(state.rotationIncrement) * Number(state.rotationDirection || 1) * state.phase2Timer / Number(state.lungeDelay);
                        }
                    } else {
                        npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 40;
                        if (state.phase2Timer <= 0) {
                            npc.damage = 0;
                            state.performingLungeCombo = death;
                            state.hiveState = 6;
                            state.phase2Timer = 0;
                            state.decelX = Number(npc.velocity.X) / Number(state.decelerationTime);
                            state.decelY = Number(npc.velocity.Y) / Number(state.decelerationTime);
                            npc.netUpdate = true;
                        }
                    }
                }
                break;
            }

            case 4: { // Semicircle enemy-spawn arc
                npc.damage = 0;
                if (Number(npc.alpha) > 0) {
                    npc.Center = Vector2.new(Number(Terraria.PlayerCenterX(player)), Number(Terraria.PlayerCenterY(player)) + radius);
                    npc.alpha = Math.max(0, Number(npc.alpha) - 5);
                    npc.netUpdate = true;
                } else if (!state.dashStarted) {
                    npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 40;
                    state.dashStarted = true;
                    PlayHiveMindRoar(npc.Center, false);
                    SetVelocity(npc, Math.PI * radius / Number(state.arcTime) * Number(state.rotationDirection || 1), 0);
                    state.arcSegments = 0;
                    state.phase2Timer = 0;
                    npc.netUpdate = true;
                } else {
                    npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 40;
                    const angle = Math.PI / Number(state.arcTime) * -Number(state.rotationDirection || 1);
                    const vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
                    SetVelocity(npc, vx * Math.cos(angle) - vy * Math.sin(angle), vx * Math.sin(angle) + vy * Math.cos(angle));

                    state.phase2Timer = Number(state.phase2Timer || 0) + 1;
                    if (state.phase2Timer === Math.floor(Number(state.arcTime) / 6)) {
                        state.phase2Timer = 0;
                        state.arcSegments = Number(state.arcSegments || 0) + 1;
                        if (state.arcSegments === 6) {
                            // PC performs one final rotation step before entering decel.
                            const vx2 = Number(npc.velocity.X), vy2 = Number(npc.velocity.Y);
                            SetVelocity(npc, vx2 * Math.cos(angle) - vy2 * Math.sin(angle), vx2 * Math.sin(angle) + vy2 * Math.cos(angle));
                            if (Distance(npc.Center, Terraria.PlayerCenter(player)) > 80)
                                this.SpawnStuff(npc);
                            state.hiveState = 6;
                            state.arcSegments = 0;
                            state.decelX = Number(npc.velocity.X) / Number(state.decelerationTime);
                            state.decelY = Number(npc.velocity.Y) / Number(state.decelerationTime);
                            npc.netUpdate = true;
                        }
                    }
                }
                break;
            }

            case 5: { // Rain dash
                npc.damage = 0;
                if (Number(npc.alpha) > 0) {
                    const side = Number(state.rainDashesPerformed || 0) === 0 ? Number(state.rotationDirection || 1) : -Number(state.rotationDirection || 1);
                    npc.Center = Vector2.new(
                        Number(Terraria.PlayerCenterX(player)) + (death ? radius * 1.5 : radius) * side,
                        Number(Terraria.PlayerCenterY(player)) - radius
                    );
                    npc.alpha = Math.max(0, Number(npc.alpha) - 5);
                    npc.netUpdate = true;
                } else if (!state.dashStarted) {
                    npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 40;
                    state.dashStarted = true;
                    PlayHiveMindRoar(npc.Center, false);
                    const side = Number(state.rainDashesPerformed || 0) === 0 ? -Number(state.rotationDirection || 1) : Number(state.rotationDirection || 1);
                    SetVelocity(npc, radius / Number(state.arcTime) * 3 * side, 0);
                    state.rainClouds = 0;
                    state.phase2Timer = 0;
                    npc.netUpdate = true;
                } else {
                    npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 40;
                    state.phase2Timer = Number(state.phase2Timer || 0) + 1;
                    const trigger = Math.floor(Number(state.arcTime) / (death ? 15 : 20));
                    if ((state.phase2Timer % 30) === trigger) {
                        state.phase2Timer = 0;
                        state.rainClouds = Number(state.rainClouds || 0) + 1;
                        const cloud = GetProjectileType('ShadeNimbusHostile');
                        if (cloud > 0) {
                            const px = Number(npc.position.X) + Math.random() * Number(npc.width);
                            const py = Number(npc.position.Y) + Math.random() * Number(npc.height);
                            const rv = IsGoodWorld() ? Vector2.new((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8) : Vector2.Zero;
                            SpawnProjectile(cloud, Vector2.new(px, py), rv, 12, 11);
                        }
                        if (state.rainClouds === 10) {
                            state.performingRainDashCombo = death;
                            state.hiveState = 6;
                            state.rainClouds = 0;
                            state.decelX = Number(npc.velocity.X) / Number(state.decelerationTime);
                            state.decelY = Number(npc.velocity.Y) / Number(state.decelerationTime);
                            npc.netUpdate = true;
                        }
                    }
                }
                break;
            }

            case 6: { // Deceleration
                npc.damage = 0;
                SetVelocity(npc, Number(npc.velocity.X) - Number(state.decelX || 0), Number(npc.velocity.Y) - Number(state.decelY || 0));
                state.phase2Timer = Number(state.phase2Timer || 0) + 1;
                if (state.phase2Timer >= Number(state.decelerationTime)) {
                    if (state.performingRainDashCombo) {
                        state.rainDashesPerformed = Number(state.rainDashesPerformed || 0) + 1;
                        if (state.rainDashesPerformed < Number(state.rainDashAmount)) {
                            state.hiveState = 2;
                        } else {
                            state.phase2Timer = Number(state.minimumDriftTime) + Math.floor(Math.random() * (death ? 61 : 121));
                            state.performingRainDashCombo = false;
                            state.rainDashesPerformed = 0;
                            state.hiveState = 0;
                        }
                    } else if (state.performingLungeCombo) {
                        state.lungesPerformed = Number(state.lungesPerformed || 0) + 1;
                        if (state.lungesPerformed < Number(state.lungeAmount)) {
                            state.hiveState = 2;
                        } else {
                            state.phase2Timer = Number(state.minimumDriftTime) + Math.floor(Math.random() * (death ? 61 : 121));
                            state.performingLungeCombo = false;
                            state.lungesPerformed = 0;
                            state.hiveState = 0;
                        }
                    } else {
                        state.phase2Timer = Number(state.minimumDriftTime) + Math.floor(Math.random() * (death ? 61 : 121));
                        state.hiveState = 0;
                    }
                    state.dashStarted = false;
                    npc.netUpdate = true;
                }
                break;
            }

            default:
                // Corrupt/unknown state recovery. PC never has an attack state outside 0-6.
                state.hiveState = 0;
                state.nextState = 0;
                state.phase2Timer = Number(state.minimumDriftTime);
                state.dashStarted = false;
                npc.alpha = Math.max(0, Math.min(255, Number(npc.alpha)));
                npc.netUpdate = true;
                break;
        }

        // Dark Heart spawns in phase 2, matching the PC health gate.
        if (Number(npc.life) > 0 && expert && lifeRatio < 0.5) {
            state.darkHeartGate = Math.min(Number(state.darkHeartGate), Number(npc.lifeMax) * 0.6);
            const tenPercent = Number(npc.lifeMax) * 0.1;
            if (Number(npc.life) + tenPercent < Number(state.darkHeartGate)) {
                state.darkHeartGate = Number(npc.life);
                const type = GetNPCType('DarkHeart');
                if (!AnyNPC(type)) {
                    PlaySound(4, npc.Center, 22, 0);
                    SpawnDustBurst(npc, 12);
                    SpawnNPC(type, Number(npc.position.X) + Math.random() * Number(npc.width), Number(npc.position.Y) + Math.random() * Number(npc.height), npc.whoAmI);
                }
            }
        }
    }

    PhaseOneAI(npc, state, player) {
        npc.damage = 0;
        const engagement = this.EngagementGate(npc, state, player, true);
        player = engagement.player || player;
        if (engagement.hold)
            return;
        npc.noGravity = false;
        npc.noTileCollide = false;
        this.SpawnInitialBlobs(npc, state);
        if (!(state.healthGate > 0))
            state.healthGate = Number(npc.lifeMax);
        const fivePercent = Number(npc.lifeMax) * 0.05;
        if (Number(npc.life) + fivePercent < Number(state.healthGate)) {
            state.healthGate = Number(npc.life);
            this.SpawnPhaseOneWave(npc, state);
            return;
        }
        state.burrowTimer--;
        if (state.burrowTimer < -120) {
            state.burrowTimer = IsDeath() ? 180 : (IsRevengeance() ? 300 : (IsExpert() ? 360 : 420));
            state.burrowTimer = Math.max(30, state.burrowTimer);
            npc.scale = 1;
            npc.alpha = 0;
            npc.dontTakeDamage = false;
            return;
        }
        if (state.burrowTimer < -60) {
            npc.scale = Number(npc.scale) + 0.0165;
            npc.alpha = Math.max(0, Number(npc.alpha) - 4);
            return;
        }
        if (state.burrowTimer === -60) {
            npc.scale = 0.01;
            npc.Center = Vector2.new(Number(Terraria.PlayerCenterX(player)), FindGroundBelow(player, npc.height) + Number(npc.height) / 2);
            const blobType = GetNPCType('HiveBlob');
            for (let i = 0; i < 200; i++) {
                const blob = Terraria.Main.npc[i];
                if (blob && blob.active && blob.type === blobType) {
                    blob.position.X = npc.position.X;
                    blob.position.Y = npc.position.Y;
                }
            }
            npc.netUpdate = true;
            return;
        }
        if (state.burrowTimer < 0) {
            npc.scale = Number(npc.scale) - 0.0165;
            npc.alpha = Math.min(255, Number(npc.alpha) + 4);
            return;
        }
        if (state.burrowTimer === 0) {
            npc.TargetClosest(true);
            npc.dontTakeDamage = true;
        }
    }

    PreAI(npc) {
        SetActiveHiveMind(npc);
        const phaseTwoNow = this.IsPhaseTwo(npc);
        const oldCenterX = Number(npc.Center.X), oldCenterY = Number(npc.Center.Y);
        const wantedHeight = phaseTwoNow ? 140 : 122;
        if (Number(npc.width) !== 178 || Number(npc.height) !== wantedHeight) {
            npc.width = 178;
            npc.height = wantedHeight;
            npc.Center = Vector2.new(oldCenterX, oldCenterY);
        }
        const state = GetHiveState(npc);
        const player = TargetPlayer(npc);
        if (!player) {
            this.Despawn(npc, state, !phaseTwoNow);
            return false;
        }
        if (BossIntroRuntime.ShouldHoldNPC(npc))
            return false;
        if (phaseTwoNow) {
            this.StartPhaseTwo(npc, state);
            this.PhaseTwoAI(npc, state, player);
        } else
            this.PhaseOneAI(npc, state, player);
        return false;
    }


    ModifyHitPlayer(npc, player, modifiers) {
        if (!CircleContactAllowed(npc, player, 60)) {
            modifiers.damage = 0;
            modifiers.hitDirection = 0;
            modifiers.quiet = true;
            modifiers.dodgeable = false;
        }
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) < 0 || !CircleContactAllowed(npc, player, 60))
            return;
        ApplyBrainRot(player, 240);
    }

    FindFrame(npc, frameHeight) {
        const state = GetHiveState(npc);
        state.frameY = (Number(state.frameY || 0) + (1 / 6));
        const maxY = this.IsPhaseTwo(npc) ? 8 : 16;
        const total = this.IsPhaseTwo(npc) ? 16 : 16;
        const frameIndex = Math.floor(state.frameY) % total;
        state.frameX = this.IsPhaseTwo(npc) ? Math.floor(frameIndex / maxY) : 0;
        const y = frameIndex % maxY;
        const rect = npc.frame;
        rect.X = state.frameX * 178;
        rect.Y = y * (this.IsPhaseTwo(npc) ? 142 : 122);
        rect.Width = 178;
        rect.Height = this.IsPhaseTwo(npc) ? 140 : 120;
        npc.frame = rect;
    }

    PreDraw(npc, spriteBatch, screenPos) {
        try {
            const phaseTwo = this.IsPhaseTwo(npc);
            const texture = phaseTwo ? this.Phase2Texture : Terraria.GameContent.TextureAssets.Npc[this.Type]?.Value;
            if (!texture)
                return true;
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            const source = npc.frame;
            const origin = Vec(Number(npc.width) / 2, Number(npc.height));
            const center = Vec(Number(npc.position.X) - Number(screenPos.X) + Number(origin.X), Number(npc.position.Y) - Number(screenPos.Y) + Number(origin.Y));
            const scale = Number(npc.scale);
            const alpha = Math.max(0, 255 - Number(npc.alpha));
            const color = Color.new(255, 255, 255, alpha);
            const effects = Number(npc.direction) === 1 ? SpriteEffects.FlipHorizontally : SpriteEffects.None;
            const state = GetHiveState(npc);
            if (phaseTwo && Number(state.hiveState || 0) !== 0) {
                const frameWidth = Number(texture.Width) / 2;
                const frameHeight = Number(texture.Height) / 8;
                try {
                    // One cached afterimage is enough visually and halves phase-2 draw calls.
                    const i = 2;
                    const oldPos = npc.oldPos;
                    const old = oldPos && oldPos.get_Item ? oldPos.get_Item(i) : null;
                    if (old) {
                        let oldRotation = Number(npc.rotation) || 0;
                        try {
                            const oldRot = npc.oldRot;
                            if (oldRot && oldRot.get_Item)
                                oldRotation = Number(oldRot.get_Item(i)) || oldRotation;
                        } catch (e) { }
                        const after = Vec(Number(old.X) + Number(npc.width) / 2 - Number(screenPos.X) - frameWidth * scale / 2 + Number(origin.X) * scale, Number(old.Y) + Number(npc.height) / 2 - Number(screenPos.Y) - frameHeight * scale / 2 + Number(origin.Y) * scale + Number(npc.gfxOffY || 0));
                        const afterAlpha = Math.max(0, Math.floor(alpha * 0.18));
                        draw(texture, after, source, Color.new(255, 255, 255, afterAlpha), oldRotation, origin, scale, effects, 0);
                    }
                } catch (e) { }
            }
            draw(texture, center, source, color, Number(npc.rotation), origin, scale, effects, 0);
            return false;
        } catch (e) {
            return true;
        }
    }

    ModifyNPCLoot(npcLoot) {
        const bag = Number(ModItem.getTypeByName('HiveMindBag') || 0);
        const mask = Number(ModItem.getTypeByName('HiveMindMask') || 0);
        const trophy = Number(ModItem.getTypeByName('HiveMindTrophy') || 0);
        const filthyGlove = Number(ModItem.getTypeByName('FilthyGlove') || 0);
        const rottingEyeball = Number(ModItem.getTypeByName('RottingEyeball') || 0);
        const thankYouPainting = Number(ModItem.getTypeByName('ThankYouPainting') || 0);
        const ItemID = Terraria.ID.ItemID;
        if (trophy > 0)
            npcLoot.Add(ItemDropRule.Common(trophy, 10, 1, 1));
        const notExpert = Conditions.NotExpert.new();
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, ItemID.DemoniteBar, 1, 10, 15, 1));
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, ItemID.RottenChunk, 1, 10, 15, 1));
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, ItemID.CorruptSeeds, 1, 10, 15, 1));
        if (mask > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, mask, 7, 1, 1, 1));
        if (filthyGlove > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, filthyGlove, 4, 1, 1, 1));
        if (rottingEyeball > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, rottingEyeball, 10, 1, 1, 1));
        if (thankYouPainting > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, thankYouPainting, 100, 1, 1, 1));
        if (bag > 0)
            npcLoot.Add(ItemDropRule.BossBag(bag));
    }

    BossLoot(npc, potionType) {
        return Terraria.ID.ItemID.HealingPotion;
    }

    OnKill(npc) {
        const state = GetHiveState(npc);
        SpawnHiveMindDeathGoresOnce(npc, state);
        const world = GetHiveWorld();
        const firstKill = world ? world.DownedHiveMind !== true : false;
        if (!IsExpert() && Terraria.Main.hardMode === true) {
            SpawnDrop(npc, Terraria.ID.ItemID.CursedFlame, Next(10, 20));
        }
        DropClassicWeaponsWithPity(npc);
        if (IsZenithWorld()) {
            for (const type of [
                Terraria.ID.ItemID.WarriorEmblem,
                Terraria.ID.ItemID.RangerEmblem,
                Terraria.ID.ItemID.SorcererEmblem,
                Terraria.ID.ItemID.SummonerEmblem,
                ModItem.getTypeByName('RogueEmblem')
            ])
                SpawnDrop(npc, type, 1);
        }
        if (IsRevengeance() || Terraria.Main.masterMode === true) {
            SpawnDrop(npc, ModItem.getTypeByName('HiveMindRelic'), 1);
        }
        if (world && typeof world.RecordHiveMindKill === 'function')
            world.RecordHiveMindKill();
        if (firstKill) {
            SpawnDrop(npc, ModItem.getTypeByName('LoreHiveMind'), 1);
            Tell('A Mente da Colmeia foi derrotada pela primeira vez!', 80, 230, 255);
        }
        SpawnDustBurst(npc, 35);
        ClearActiveHiveMind(npc);
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const state = GetHiveState(npc);
        const dead = npc.life <= 0;
        const now = Number(Terraria.Main.GameUpdateCount || 0);
        // Rapid-hit weapons used to cross the JS/native bridge for dust + NPC counts
        // on every single hit. Stagger cosmetic work while preserving hit feedback.
        if (dead || now - Number(state.lastHitFxTick || -9999) >= 3) {
            state.lastHitFxTick = now;
            const count = dead ? 8 : Math.min(2, Math.max(1, Math.floor(Number(damage) / Math.max(1, Number(npc.lifeMax)) * 30)));
            for (let i = 0; i < count; i++)
                NewDust(npc.position, npc.width, npc.height, 14, Number(hitDirection), -1, 0, Color.White, 1);
        }
        if (!dead && !this.IsPhaseTwo(npc) && Terraria.Main.netMode !== 1 && now - Number(state.lastHitSpawnCheckTick || -9999) >= 4) {
            state.lastHitSpawnCheckTick = now;
            const player = TargetPlayer(npc);
            if (player && Distance(npc.Center, Terraria.PlayerCenter(player)) > 80) {
                if (Chance(30) && CountNPC(6) < 2)
                    SpawnNPC(6, npc.Center.X, npc.Center.Y, npc.whoAmI);
                if (Chance(45) && !AnyNPC(7))
                    SpawnNPC(7, npc.Center.X, npc.Center.Y, npc.whoAmI);
            }
        }
        if (dead) {
            SpawnHiveMindDeathGoresOnce(npc, state);
            SpawnDustBurst(npc, 20);
        }
    }

    CheckActive() {
        return true;
    }
}
