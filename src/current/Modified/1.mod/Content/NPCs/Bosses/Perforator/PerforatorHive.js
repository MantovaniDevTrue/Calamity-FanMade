import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { ModGore } from './../../../../TL/ModGore.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { BossIntroRuntime } from './../../../../Core/BossIntroRuntime.js';
import { BossPhaseVFX } from './../../../../Core/BossPhaseVFX.js';
import { AndroidSound } from './../../../../Common/Snippets/AndroidSound.js';
import {

    GetPerfWorld,
    IsExpert,
    IsRevengeance,
    IsDeath,
    IsGoodWorld,
    IsCrimsonPlayer,
    TargetPlayer,
    SetActiveHive,
    ClearActiveHive,
    GetPerfTypes,
    CountNPC,
    SpawnNPC,
    SpawnProjectile,
    ProcessPerforatorProjectileQueue,
    ClearPerforatorProjectileQueue,
    GetProjectileType,
    MoveToward,
    Distance,
    RandInt
} from './../../../../Core/PerforatorRuntime.js';
const { Color, Vector2, Effects } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const { ItemDropRule, Conditions } = Terraria.GameContent.ItemDropRules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
let PerforatorLowFxLogged = false;
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function roll(d) {
    return Math.random() < 1 / Math.max(1, Number(d));
}

function drop(npc, type, stack = 1) {
    if (!(Number(type) > 0) || Terraria.Main.netMode === 1)
        return;
    try {
        NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), npc.width, npc.height, Math.floor(Number(type)), Math.max(1, Math.floor(Number(stack))), false, -1, true);
    } catch (e) { }
}

function goreHive(npc) {
    if (Terraria.Main.netMode === 2)
        return;
    const s = CalamityNPCState.Get(npc);
    if (s.goresDone)
        return;
    s.goresDone = true;
    for (let i = 1; i <= 4; i++) {
        const t = Number(ModGore.getTypeByName(`Hive${i}`) || 0);
        if (t > 0)
            try {
                Effects.NewGoreFromNPC(npc, t, false);
            } catch (e) { }
    }
}

const PERF_HIVE_SOUND_ROOT = 'Common/Sounds/Perforator';

function playPerfHiveSound(fileName, position, channel = '', cooldownTicks = 0, releaseTicks = 120) {
    if (!position || Terraria.Main.netMode === 2)
        return false;
    const x = Number(position.X), y = Number(position.Y);
    const path = `${PERF_HIVE_SOUND_ROOT}/${fileName}.ogg`;
    let result = null;
    try {
        result = channel
            ? AndroidSound.PlayCachedExclusive(channel, path, 1.0, x, y, 1600, releaseTicks, cooldownTicks, false)
            : AndroidSound.PlayOneShot(path, 1.0, x, y, 1600, releaseTicks);
    } catch (e) {
        try { tl.log(`[CalamityPort PerforatorAudio] failed ${fileName}: ${String(e)}`); } catch (ignored) { }
        return false;
    }
    if (!result || (!result.ok && !result.skipped))
        try { tl.log(`[CalamityPort PerforatorAudio] failed ${fileName}: ${String(result && result.error || AndroidSound.LastError || 'unknown')}`); } catch (ignored) { }
    return !!(result && result.ok);
}

function playHiveHit(position) {
    // One cached variant avoids synchronous preparation of three separate MediaPlayers mid-fight.
    return playPerfHiveSound('PerfHiveHit1', position, 'perforator-hive-hit', 4, 90);
}

function playHiveGeyser(position) {
    return playPerfHiveSound('PerfHiveShoot1', position, 'perforator-hive-geyser', 4, 120);
}

function spawnDust(npc, amount) {
    // Phase 12.74.12 benchmark: combat Dust disabled to isolate CPU/allocation spikes.
}

function velocityLength(npc) {
    const vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
    return Math.sqrt(vx * vx + vy * vy);
}

function spawnWormTelegraphDust(npc, queuedWorm, timer) {
    // Telegraph timing remains, but Dust allocation is disabled in this mobile spike benchmark.
}

function applyWormProtection(npc, state, wormsAlive) {
    if (Number(state.lastWormCount) === Number(wormsAlive))
        return;
    state.lastWormCount = Number(wormsAlive);
    npc.dontTakeDamage = wormsAlive >= 2;
    npc.defense = wormsAlive === 1 ? 24 : 4;
    // Use the native multiplier when the TLPro runtime exposes it. The defense fallback remains active otherwise.
    try {
        npc.takenDamageMultiplier = wormsAlive === 1 ? 0.5 : 1;
        state.nativeDamageMultiplier = true;
        if (wormsAlive === 1)
            npc.defense = 4;
    } catch (e) {
        state.nativeDamageMultiplier = false;
    }
    npc.netUpdate = true;
}

function fireSmallReturnReward(npc, player, state) {
    if (Number(state.smallReturnCharge || 0) < 6)
        return;
    state.smallReturnCharge = 0;
    const type = Math.random() < 0.5 ? GetProjectileType('IchorShot') : GetProjectileType('BloodGeyser');
    const angle = (-45 + Math.random() * 90) * Math.PI / 180;
    const speed = 5 + Math.random() * 7.5;
    SpawnProjectile(type, npc.Center, Vector2.new(Math.sin(angle) * speed, -Math.cos(angle) * speed), 12, 0, Terraria.PlayerCenterY(player), 0);
    if (Terraria.Main.netMode !== 1) {
        const heal = Math.min(Math.floor(Number(npc.lifeMax) / 1000), Math.max(0, Number(npc.lifeMax) - Number(npc.life)));
        if (heal > 0) {
            npc.life = Number(npc.life) + heal;
            try { npc.HealEffect(heal, true); } catch (e) { }
            npc.netUpdate = true;
        }
    }
}

function spawnBlobTelegraph(npc, timer) {
    // Telegraph timing remains, but Dust allocation is disabled in this mobile spike benchmark.
}

function fireBlobVolley(npc, player, wormsAlive, largeSpawned) {
    playPerfHiveSound('PerfHiveIchorShoot', npc.Center, 'perforator-hive-ichor', 2, 120);
    spawnDust(npc, 8);
    const bigWormPhase = wormsAlive > 0 && largeSpawned === true;
    let count = IsExpert() ? (bigWormPhase ? 4 : 6) : (bigWormPhase ? 2 : 4);
    if (IsGoodWorld())
        count *= 2;
    count = Math.max(1, Math.ceil(count * 0.5));
    const spread = IsExpert() ? (bigWormPhase ? 66 : 100) : (bigWormPhase ? 33 : 66);
    for (let i = 0; i < count; i++) {
        let vx = RandInt(-spread, spread + 1), vy = RandInt(-spread, spread + 1);
        let len = Math.sqrt(vx * vx + vy * vy);
        if (len < 0.001) {
            vx = 0;
            vy = 1;
            len = 1;
        }
        let speed = 4 + Math.random() * 4;
        if (IsGoodWorld())
            speed *= 1 + Math.random();
        vx = vx / len * speed;
        vy = vy / len * speed;
        if (vy < 2)
            vy = 2 + Math.abs(vy) * 0.25;
        SpawnProjectile(GetProjectileType('IchorBlob'), Vector2.new(Number(npc.Center.X), Number(npc.Center.Y) + 50), Vector2.new(vx, vy), 12, 0, Terraria.PlayerCenterY(player), 0);
    }
}

function fireGeyserFan(npc, player, wormsAlive) {
    playHiveGeyser(npc.Center);
    let count = IsDeath() ? 16 : (IsRevengeance() ? 14 : (IsExpert() ? 12 : 10));
    if (IsGoodWorld())
        count *= 2;
    count = Math.max(1, Math.ceil(count * 0.5));
    const destination = wormsAlive > 0 ? Terraria.PlayerCenter(player) : Vector2.new(npc.Center.X, Number(npc.Center.Y) - 100);
    const horizontal = Number(destination.X) - Number(npc.Center.X);
    const horizontalLength = Math.max(1, Math.abs(horizontal));
    const baseX = horizontal / horizontalLength * 8;
    const baseY = -8;
    const baseAngle = Math.atan2(baseY, baseX);
    const spread = 75 * Math.PI / 180;
    for (let i = 0; i < count; i++) {
        const a = baseAngle - spread + 2 * spread * (i / Math.max(1, count - 1));
        const type = Math.random() < 0.5 ? GetProjectileType('IchorShot') : GetProjectileType('BloodGeyser');
        const vx = Math.cos(a) * 8 + (Math.random() - 0.5);
        const vy = Math.sin(a) * 8 + (Math.random() - 0.5);
        const len = Math.max(0.001, Math.sqrt(vx * vx + vy * vy));
        const origin = Vector2.new(Number(npc.Center.X) + vx / len * 50, Number(npc.Center.Y) + vy / len * 50);
        SpawnProjectile(type, origin, Vector2.new(vx, vy), 12, 0, Terraria.PlayerCenterY(player), 0);
    }
}

export class PerforatorHive extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/Perforator/PerforatorHive';
        this.Music = 87;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 10;
        try {
            Terraria.ID.NPCID.Sets.BossBestiaryPriority.Add(this.Type);
        } catch (e) { }
        try {
            Terraria.ID.NPCID.Sets.MPAllowedEnemies[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.NPC.npcSlots = 18;
        this.NPC.damage = 30;
        this.NPC.width = 110;
        this.NPC.height = 100;
        this.NPC.defense = 4;
        this.NPC.lifeMax = IsExpert() || IsRevengeance() ? 5750 : 4000;
        this.NPC.aiStyle = -1;
        this.NPC.knockBackResist = 0;
        this.NPC.value = ModNPC.NPCValue(0, 5, 0, 0);
        this.NPC.boss = true;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.netAlways = true;
        // After Moon pattern for mobile hot paths: let Terraria's native audio mixer own
        // per-hit sounds. Android MediaPlayer calls inside HitEffect can hitch on repeated
        // boss hits even when the audio itself is cached.
        try { this.NPC.HitSound = Terraria.ID.SoundID.Item160 || Terraria.ID.SoundID.NPCHit13; } catch (e) { this.NPC.HitSound = Terraria.ID.SoundID.NPCHit13; }
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        const bal = Number.isFinite(Number(balance)) ? Number(balance) : 1, adj = Number.isFinite(Number(bossAdjustment)) ? Number(bossAdjustment) : 1;
        npc.lifeMax = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.8 * bal * adj));
        npc.damage = Math.max(1, Math.floor(Number(npc.damage) * 0.8));
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        Object.assign(s, {
            smallSpawned: false, mediumSpawned: false, largeSpawned: false, spawnTimer: 0, queuedWorm: '', geyserTimer: 0, blobTimer: 0, squashTimer: 0, goresDone: false, lastWormCount: -1, smallReturnCharge: 0, nativeDamageMultiplier: false
        });
        SetActiveHive(npc);
        npc.TargetClosest(true);
        BossIntroRuntime.Trigger(npc, 'perforators');
        if (!PerforatorLowFxLogged) {
            PerforatorLowFxLogged = true;
            try {
                tl.log('[CalamityPort PerforatorSpawnSmoothing] active; bodies=4/7/13; segmentFollow=1/4; bodySpawn<=3/frame; projectileSpawn<=2/tick; fightDust=off; fixedAudioVariants=on; shotLife=240; blobLife=360.');
            } catch (e) { }
        }
    }

    FindFrame(npc, frameHeight) {
        npc.frameCounter = (Number(npc.frameCounter) + 0.15) % 10;
        const r = npc.frame;
        r.Y = Math.floor(Number(npc.frameCounter)) * frameHeight;
        npc.frame = r;
    }

    PreAI(npc) {
        SetActiveHive(npc);
        ProcessPerforatorProjectileQueue(2);
        const player = TargetPlayer(npc), s = CalamityNPCState.Get(npc), t = GetPerfTypes();
        // Keep the visual burst, but move its NativeObject-heavy dust allocation off the
        // exact frame that creates a worm head/segment chain.
        if (Number(s.delayedWormSpawnDust || 0) > 0) {
            spawnDust(npc, Number(s.delayedWormSpawnDust));
            s.delayedWormSpawnDust = 0;
        }
        if (!player || !IsCrimsonPlayer(player) || Distance(Terraria.PlayerCenter(player), npc.Center) > 5600) {
            npc.damage = 0;
            npc.dontTakeDamage = true;
            if (Number(npc.timeLeft) > 60)
                npc.timeLeft = 60;
            npc.velocity = Vector2.new(Number(npc.velocity.X) * 0.98, Math.min(12, Math.max(-3, Number(npc.velocity.Y)) + 0.1));
            npc.rotation = Number(npc.velocity.X) * 0.04;
            s.lastWormCount = -1;
            return false;
        }
        if (Number(npc.timeLeft) < 1800)
            npc.timeLeft = 1800;
        if (BossIntroRuntime.ShouldHoldNPC(npc))
            return false;

        fireSmallReturnReward(npc, player, s);
        const lifeRatio = Number(npc.life) / Math.max(1, Number(npc.lifeMax));
        const smallAlive = CountNPC(t.smallHead) > 0, mediumAlive = CountNPC(t.mediumHead) > 0, largeAlive = CountNPC(t.largeHead) > 0;
        const wormsAlive = (smallAlive ? 1 : 0) + (mediumAlive ? 1 : 0) + (largeAlive ? 1 : 0);
        applyWormProtection(npc, s, wormsAlive);

        if (!s.smallSpawned && lifeRatio < 0.75 && !s.queuedWorm) {
            s.queuedWorm = 'small';
            BossPhaseVFX.Trigger(npc, 'perforator', 1);
        } else if (!s.mediumSpawned && lifeRatio < 0.50 && !s.queuedWorm) {
            s.queuedWorm = 'medium';
            BossPhaseVFX.Trigger(npc, 'perforator', 2);
        } else if (!s.largeSpawned && lifeRatio < 0.25 && !s.queuedWorm) {
            s.queuedWorm = 'large';
            BossPhaseVFX.Trigger(npc, 'perforator', 3);
        }

        if (s.queuedWorm) {
            s.spawnTimer = Number(s.spawnTimer || 0) + 1;
            npc.damage = 0;
            npc.velocity = Vector2.new(Number(npc.velocity.X) * 0.94, Number(npc.velocity.Y) * 0.94);
            npc.rotation = Number(npc.velocity.X) * 0.04;
            spawnWormTelegraphDust(npc, s.queuedWorm, s.spawnTimer);
            // Android MediaPlayer.prepare() is synchronous. Starting the official worm-spawn
            // sound a few frames before NewNPC keeps the same telegraph moment while preventing
            // audio decoding and worm construction from hitting the same frame.
            if (s.spawnSoundPlayed !== true && Number(s.spawnTimer) >= 56) {
                playPerfHiveSound('PerfHiveWormSpawn', npc.Center, 'perforator-hive-worm-spawn', 2, 150);
                s.spawnSoundPlayed = true;
            }
            if (s.spawnTimer >= 60) {
                let type = -1;
                if (s.queuedWorm === 'small') {
                    type = t.smallHead;
                    s.smallSpawned = true;
                } else if (s.queuedWorm === 'medium') {
                    type = t.mediumHead;
                    s.mediumSpawned = true;
                } else {
                    type = t.largeHead;
                    s.largeSpawned = true;
                }
                if (type > 0) {
                    SpawnNPC(type, Number(npc.Center.X) + RandInt(-25, 26), Number(npc.Center.Y) + RandInt(-25, 26));
                    if (IsDeath() && s.queuedWorm === 'small')
                        SpawnNPC(type, Number(npc.Center.X) + RandInt(-25, 26), Number(npc.Center.Y) + RandInt(-25, 26));
                }
                if (s.spawnSoundPlayed !== true)
                    playPerfHiveSound('PerfHiveWormSpawn', npc.Center, 'perforator-hive-worm-spawn', 2, 150);
                s.delayedWormSpawnDust = s.queuedWorm === 'large' ? 36 : 24;
                s.queuedWorm = '';
                s.spawnTimer = 0;
                s.spawnSoundPlayed = false;
                s.squashTimer = 24;
                npc.netUpdate = true;
            }
            return false;
        }

        if (Number(s.squashTimer || 0) > 0)
            s.squashTimer--;
        npc.rotation = Number(npc.velocity.X) * 0.04;
        if (Math.abs(Number(npc.Center.X) - Number(Terraria.PlayerCenterX(player))) > 10) {
            npc.direction = Number(npc.Center.X) < Number(Terraria.PlayerCenterX(player)) ? 1 : -1;
            npc.spriteDirection = npc.direction;
        }

        const phase2 = lifeRatio < 0.70;
        const canRunBlobPhase = phase2 && (wormsAlive === 0 || s.largeSpawned || Number(s.blobTimer || 0) >= 480 || IsGoodWorld());
        if (canRunBlobPhase) {
            s.blobTimer = Number(s.blobTimer || 0) + 1;
            if (s.blobTimer >= 480 && s.blobTimer < 600) {
                npc.damage = 0;
                MoveToward(npc, Terraria.PlayerCenterX(player), Number(Terraria.PlayerCenterY(player)) - 450, IsRevengeance() ? 9 : 6, IsRevengeance() ? 0.3 : 0.2);
                return false;
            }
            if (s.blobTimer >= 600) {
                npc.damage = 0;
                if (s.blobTimer < 780) {
                    if (velocityLength(npc) > 0.5)
                        npc.velocity = Vector2.new(Number(npc.velocity.X) * 0.96, Number(npc.velocity.Y) * 0.96);
                    else
                        s.blobTimer = 780;
                    spawnBlobTelegraph(npc, s.blobTimer);
                    if (s.blobTimer < 780)
                        return false;
                }
                fireBlobVolley(npc, player, wormsAlive, s.largeSpawned === true);
                s.blobTimer = 0;
                npc.netUpdate = true;
                return false;
            }
        }

        s.geyserTimer = Number(s.geyserTimer || 0) + 1;
        const interval = (IsRevengeance() ? 200 : 250) + wormsAlive * 150;
        if (s.geyserTimer >= interval && Number(npc.Bottom.Y) < Number(Terraria.PlayerPositionY(player)) && Distance(Terraria.PlayerCenter(player), npc.Center) > 80) {
            s.geyserTimer = 0;
            fireGeyserFan(npc, player, wormsAlive);
        }

        if (!IsRevengeance()) {
            npc.damage = 0;
            MoveToward(npc, Terraria.PlayerCenterX(player), Number(Terraria.PlayerCenterY(player)) - 350, 6, 0.15);
        } else if (wormsAlive === 0) {
            npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 30;
            if (s.largeSpawned || IsDeath())
                MoveToward(npc, Terraria.PlayerCenterX(player), Number(Terraria.PlayerCenterY(player)) - 20, 13, IsDeath() ? 0.115 : 0.1);
            else if (s.mediumSpawned)
                MoveToward(npc, Terraria.PlayerCenterX(player), Number(Terraria.PlayerCenterY(player)) - 30, 12, IsDeath() ? 0.11 : 0.095);
            else if (s.smallSpawned)
                MoveToward(npc, Terraria.PlayerCenterX(player), Number(Terraria.PlayerCenterY(player)) - 40, 11, IsDeath() ? 0.105 : 0.09);
            else
                MoveToward(npc, Terraria.PlayerCenterX(player), Number(Terraria.PlayerCenterY(player)) - 50, 10, IsDeath() ? 0.1 : 0.085);
        } else {
            npc.damage = 0;
            const y = wormsAlive === 1 ? 350 : (wormsAlive === 2 ? 275 : 200);
            MoveToward(npc, Terraria.PlayerCenterX(player), Number(Terraria.PlayerCenterY(player)) - y, 8, 0.2);
        }
        return false;
    }

    PreDraw(npc, spriteBatch, screenPos) {
        try {
            const texture = Terraria.GameContent.TextureAssets.Npc[this.Type]?.Value;
            if (!texture)
                return true;
            const draw = spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)'];
            const source = npc.frame;
            const origin = Vector2.new(Number(source.Width) / 2, Number(source.Height) / 2);
            const state = CalamityNPCState.Get(npc);
            const stretch = Math.max(0, Math.min(0.3, 0.3 * Number(state.squashTimer || 0) / 24));
            const scale = Vector2.new((1 - stretch) * Number(npc.scale), (1 + stretch) * Number(npc.scale));
            const yOffset = stretch * 0.5 * Number(npc.height);
            const position = Vector2.new(Number(npc.Center.X) - Number(screenPos.X), Number(npc.Center.Y) - Number(screenPos.Y) + Number(npc.gfxOffY || 0) - yOffset);
            const effects = Number(npc.spriteDirection) === 1 ? SpriteEffects.FlipHorizontally : SpriteEffects.None;
            const alpha = Math.max(0, 255 - Number(npc.alpha));
            draw(texture, position, source, Color.new(255, 255, 255, alpha), Number(npc.rotation), origin, scale, effects, 0);
            return false;
        } catch (e) {
            return true;
        }
    }

    ModifyNPCLoot(npcLoot) {
        const bag = Number(ModItem.getTypeByName('PerforatorBag') || 0), trophy = Number(ModItem.getTypeByName('PerforatorTrophy') || 0), mask = Number(ModItem.getTypeByName('PerforatorMask') || 0), pet = Number(ModItem.getTypeByName('BloodyVein') || 0), painting = Number(ModItem.getTypeByName('ThankYouPainting') || 0), glove = Number(ModItem.getTypeByName('BloodstainedGlove') || 0);
        if (trophy > 0)
            npcLoot.Add(ItemDropRule.Common(trophy, 10, 1, 1));
        const notExpert = Conditions.NotExpert.new();
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, Terraria.ID.ItemID.CrimtaneBar, 1, 10, 15, 1));
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, Terraria.ID.ItemID.TissueSample, 1, 10, 15, 1));
        npcLoot.Add(ItemDropRule.ByCondition(notExpert, Terraria.ID.ItemID.CrimsonSeeds, 1, 10, 15, 1));
        if (mask > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, mask, 7, 1, 1, 1));
        if (glove > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, glove, 4, 1, 1, 1));
        if (pet > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, pet, 10, 1, 1, 1));
        if (painting > 0)
            npcLoot.Add(ItemDropRule.ByCondition(notExpert, painting, 100, 1, 1, 1));
        if (bag > 0)
            npcLoot.Add(ItemDropRule.BossBag(bag));
    }

    BossLoot(npc, potionType) {
        return Terraria.ID.ItemID.HealingPotion;
    }

    OnKill(npc) {
        ClearPerforatorProjectileQueue();
        playPerfHiveSound('PerfHiveDeath', npc.Center, 'perforator-hive-death', 0, 180);
        goreHive(npc);
        spawnDust(npc, 40);
        const world = GetPerfWorld();
        const first = world ? world.DownedPerforators !== true : false;
        if (!IsExpert() && Terraria.Main.hardMode === true)
            drop(npc, Terraria.ID.ItemID.Ichor, RandInt(10, 21));
        if (!IsExpert()) {
            const weapons = ['Aorta', 'SausageMaker', 'VeinBurster', 'Eviscerator', 'BloodBath', 'FleshOfInfidelity', 'ToothBall'].map(n => Number(ModItem.getTypeByName(n) || 0)).filter(n => n > 0);
            let any = false;
            for (const type of weapons) {
                if (!roll(4))
                    continue;
                drop(npc, type, 1);
                any = true;
            }
            if (!any && weapons.length)
                drop(npc, weapons[Math.floor(Math.random() * weapons.length)], 1);
        }
        if (IsRevengeance() || Terraria.Main.masterMode === true)
            drop(npc, ModItem.getTypeByName('PerforatorsRelic'), 1);
        if (IsGoodWorld())
            drop(npc, ModItem.getTypeByName('Bloodfin'), 9999);
        if (world && typeof world.RecordPerforatorsKill === 'function')
            world.RecordPerforatorsKill();
        if (first) {
            drop(npc, ModItem.getTypeByName('LorePerforators'), 1);
            try {
                NewText('Os Perfuradores foram derrotados pela primeira vez!', 180, 60, 60);
            } catch (e) { }
        }
        ClearActiveHive(npc);
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        // Keep HitEffect essentially allocation-free while the boss is alive.
        // Native HitSound above is sufficient; death-only VFX stay here.
        if (npc.life <= 0) {
            goreHive(npc);
            spawnDust(npc, 40);
        }
    }

    CheckActive() {
        return false;
    }
}
