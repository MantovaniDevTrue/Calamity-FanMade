import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModGore } from './../../../../TL/ModGore.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { InitVirtualWorm, UpdateVirtualWorm, GetVirtualWormGeometry, EnableVirtualWormDamage, DisableVirtualWormDamage } from './../../../../Core/SingleEntityWormRuntime.js';
import {

    IsExpert,
    IsRevengeance,
    IsDeath,
    IsGoodWorld,
    TargetPlayer,
    FindHive,
    SpawnWormSegments,
    SpawnSplittingMediumSegments,
    FollowPreviousSegment,
    FollowSplittingMediumSegment,
    SplitMediumChainAt,
    PromoteMediumRearChain,
    ApplyPerforatorWormMovement,
    HeadFacesTarget,
    CountNPC,
    GetPerfTypes,
    SpawnProjectile,
    GetProjectileType,
    CanSee,
    ApplyBurningBlood,
    ApplyIchor,
    PlayItemSlot,
    DeactivateNoLoot
} from './../../../../Core/PerforatorRuntime.js';
const { Color, Vector2, Rectangle, Effects } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function goreSet(npc, names) {
    // Disabled in the Phase 12.74.12 mobile spike benchmark.
}

function dropHeart(npc, amount = 1) {
    if (!npc || Terraria.Main.netMode === 1)
        return;
    for (let i = 0; i < Math.max(1, Math.floor(Number(amount))); i++)
        try {
            NewItem(Math.floor(Number(npc.position.X)), Math.floor(Number(npc.position.Y)), Number(npc.width), Number(npc.height), Number(Terraria.ID.ItemID.Heart || 58), 1, false, 0, false);
        } catch (e) { }
}

function targetNeedsHeart(npc) {
    const player = TargetPlayer(npc);
    return !!player && Number(player.statLife) < Number(player.statLifeMax2 || player.statLifeMax || 0);
}

function mediumDeathBurst(npc) {
    if (!IsGoodWorld() || Terraria.Main.netMode === 1)
        return;
    const blob = GetProjectileType('IchorBlob'), shot = GetProjectileType('IchorShot');
    if (blob > 0)
        SpawnProjectile(blob, npc.Center, Vector2.new(0, 1), 12, 0, 0, 0);
    if (!(shot > 0))
        return;
    for (let i = -1; i <= 1; i++) {
        const speed = -12.5 + Math.random() * 7.5, spread = (16 + Math.random() * 20) * Math.PI / 180 * i;
        SpawnProjectile(shot, npc.Center, Vector2.new(-Math.sin(spread) * speed, Math.cos(spread) * speed), 12, 0, 0, 0);
    }
}

const GORES = {
    small: { head: ['SmallPerf'], body: ['SmallPerf2'], tail: ['SmallPerf3'] },
    medium: { head: ['MediumPerf', 'MediumPerf2'], body: ['MediumPerf2', 'MediumPerf3'], tail: ['MediumPerf3', 'MediumPerf4'] },
    large: {
        head: ['LargePerf', 'LargePerf2'], body: ['LargePerf2', 'LargePerf3', 'LargePerf4'], tail: ['LargePerf4', 'LargePerf5']
    }
};
function hitDust(npc, amount) {
    // Disabled in the Phase 12.74.12 mobile spike benchmark.
}

function randomHitSound(npc, base) {
    try {
        npc.HitSound = Terraria.ID.SoundID[`Item${base + Math.floor(Math.random() * 3)}`] || Terraria.ID.SoundID.NPCHit13;
    } catch (e) { }
}

const CONFIG = {
    small: {
        head: [42, 62, 22, 0, 900, 1150], body: [42, 42, 12, 4], tail: [40, 34, 10, 8], speed: [10, 12, 14], turn: [0.15, 0.2, 0.26], spacing: 36, bodies: [4, 6, 8], burn: true, duration: [240, 120], hitSlot: 160, deathSlot: 163
    },
    medium: {
        head: [58, 68, 24, 2, 120, 150], body: [40, 40, 14, 6], tail: [40, 50, 12, 10], speed: [8.5, 10, 12], turn: [0.085, 0.12, 0.16], spacing: 38, bodies: [10, 12, 14], burn: false, duration: [360, 240], hitSlot: 164, deathSlot: 167
    },
    large: {
        head: [70, 84, 40, 4, 2000, 2600], body: [60, 60, 20, 8], tail: [60, 78, 16, 12], speed: [7, 8.5, 10], turn: [0.07, 0.1, 0.14], spacing: 54, bodies: [14, 20, 26], burn: true, duration: [300, 180], hitSlot: 168, deathSlot: 171
    }
};
function difficultyIndex() {
    return IsDeath() ? 2 : (IsExpert() || IsRevengeance() ? 1 : 0);
}
function difficultyScale() {
    return IsDeath() ? 1.2 : (IsRevengeance() ? 1.15 : (IsExpert() ? 1.1 : 1));
}

function bodyCountFor(kind, config, index) {
    const original = kind === 'medium' && IsGoodWorld() ? 20 : Number(config.bodies[index]);
    // Phase 12.74.11 mobile benchmark: the runtime log shows the fight progressively
    // growing from 8-body worms to a 26-body large worm. Keep every worm phase, head,
    // tail and attack, but cap real AI-bearing body NPCs to roughly half the original
    // population so we can measure segment-count cost independently from projectiles.
    const cap = kind === 'small' ? 4 : (kind === 'medium' ? 7 : 13);
    return Math.max(1, Math.min(original, cap));
}

class WormHeadBase extends ModNPC {
    constructor(kind, texture) {
        super();
        this.kind = kind;
        this.Texture = texture;
        this.hideFromBestiary = true;
        this.VirtualAtlasTexture = null;
        this.VirtualBodySource = null;
        this.VirtualTailSource = null;
        this.VirtualPairSource = null;
        this.VirtualBodyOrigin = null;
        this.VirtualTailOrigin = null;
        this.VirtualPairOrigin = null;
        this.VirtualDrawPos = null;
        this.VirtualColorCache = new Array(17);
    }

    cfg() {
        return CONFIG[this.kind];
    }

    PostSetupContent() {
        try {
            const name = this.kind === 'small' ? 'Small' : (this.kind === 'medium' ? 'Medium' : 'Large');
            this.VirtualAtlasTexture = tl.texture.load(`Textures/NPCs/Bosses/Perforator/Perforator${name}VirtualAtlas.png`);
            this.VirtualDrawPos = Vector2.new();
            const c = this.cfg();
            const bw = Number(c.body[0]), bh = Number(c.body[1]);
            const tw = Number(c.tail[0]), th = Number(c.tail[1]);
            const ph = bh + Number(c.spacing);
            this.VirtualBodySource = Rectangle.new(0, 0, bw, bh);
            this.VirtualTailSource = Rectangle.new(128, 0, tw, th);
            this.VirtualPairSource = Rectangle.new(0, 128, bw, ph);
            this.VirtualBodyOrigin = Vector2.new(bw * 0.5, bh * 0.5);
            this.VirtualTailOrigin = Vector2.new(tw * 0.5, th * 0.5);
            this.VirtualPairOrigin = Vector2.new(bw * 0.5, ph * 0.5);
        } catch (e) {
            this.VirtualAtlasTexture = null;
            this.VirtualBodySource = null;
            this.VirtualTailSource = null;
            this.VirtualPairSource = null;
            try { tl.log(`[CalamityPort SingleWorm] Perforator ${this.kind} virtual atlas load failed: ${e}`); } catch (_) { }
        }
    }

    SetDefaults() {
        const c = this.cfg(), h = c.head, idx = difficultyIndex();
        this.NPC.damage = h[2];
        this.NPC.width = h[0];
        this.NPC.height = h[1];
        this.NPC.defense = h[3];
        this.NPC.lifeMax = idx > 0 ? h[5] : h[4];
        if (IsGoodWorld())
            this.NPC.lifeMax *= 4;
        this.NPC.scale = difficultyScale();
        this.NPC.aiStyle = -1;
        this.NPC.knockBackResist = 0;
        this.NPC.alpha = 255;
        this.NPC.behindTiles = true;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.netAlways = true;
        this.NPC.npcSlots = 0;
        this.NPC.boss = false;
        this.NPC.HitSound = Terraria.ID.SoundID[`Item${c.hitSlot}`] || Terraria.ID.SoundID.NPCHit13;
        this.NPC.DeathSound = Terraria.ID.SoundID[`Item${c.deathSlot}`] || Terraria.ID.SoundID.NPCDeath13;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        Object.assign(s, {
            segmentsSpawned: false, spitTimer: 0, spitLocked: false, initialFrames: 0, shouldFly: false, smallReturnTimer: 0, smallAttachedToHive: false
        });
        npc.TargetClosest(true);
    }

    SpawnSegments(npc, state) {
        if (state.segmentsSpawned === true)
            return;
        const c = this.cfg(), idx = difficultyIndex();
        const bodyCount = bodyCountFor(this.kind, c, idx);
        const visualSegments = bodyCount + 1;
        const spacing = Number(c.spacing);
        InitVirtualWorm(npc, state, visualSegments, spacing, 256);
        const scale = Math.max(0.1, Number(npc.scale || 1));
        const hurtW = Math.max(Number(c.body[0]), Number(c.tail[0])) * scale;
        const hurtH = Math.max(Number(c.body[1]), Number(c.tail[1])) * scale;
        EnableVirtualWormDamage(npc, state, hurtW, hurtH);
        UpdateVirtualWorm(npc, state, visualSegments, spacing, 256);
        state.segmentsSpawned = true;
        state.singleEntityWorm = true;
        state.virtualSegmentCount = visualSegments;
        state.virtualSpacing = spacing;
        state.sourceSegmentCount = bodyCount;
        state.segmentCount = 0;
        npc.netUpdate = true;
        try {
            tl.log(`[CalamityPort SingleWorm] Perforator ${this.kind} 13.09.7: 1 real NPC + ${visualSegments} virtual hurtboxes; adaptive atlas draw=on; native Damage proxy=on.`);
        } catch (_) { }
    }

    DrawSpitTelegraph(npc, state) {
        // Keep spit timing/attack logic, but skip Dust telegraph allocation for this benchmark.
    }

    UpdateLargeSpit(npc, player, state) {
        const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X), dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const eligible = dist > 320 && dist <= 960 && HeadFacesTarget(npc, player, Math.PI * 0.25) && CanSee(npc, player);
        if (!(eligible || state.spitLocked === true))
            return;
        state.spitTimer = Math.min(120, Number(state.spitTimer || 0) + 1);
        if (state.spitTimer >= 90) {
            state.spitLocked = true;
            if (state.spitTimer % 5 === 0) this.DrawSpitTelegraph(npc, state);
        }
        if (!(state.spitTimer >= 120 && eligible))
            return;
        state.spitTimer = 0;
        state.spitLocked = false;
        const vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y), len = Math.max(0.001, Math.sqrt(vx * vx + vy * vy));
        const bx = vx / len, by = vy / len;
        const origin = Vector2.new(Number(npc.Center.X) + bx * 20, Number(npc.Center.Y) + by * 20);
        PlayItemSlot(152, origin, null);
        for (let i = 0; i < 4; i++) {
            const type = Math.random() < 0.5 ? GetProjectileType('IchorShot') : GetProjectileType('BloodGeyser');
            const angle = Math.random() * Math.PI * 2, radius = Math.random() * 3;
            SpawnProjectile(type, Vector2.new(Number(origin.X) + (Math.random() - 0.5) * 16, Number(origin.Y) + (Math.random() - 0.5) * 16), Vector2.new(bx * 16 + Math.cos(angle) * radius, by * 16 + Math.sin(angle) * radius), 12, 0, Terraria.PlayerCenterY(player), 0);
        }
        if (IsDeath())
            for (let i = 0; i < 1; i++) {
                const angle = Math.random() * Math.PI * 2, radius = Math.random() * 2;
                SpawnProjectile(GetProjectileType('IchorBlob'), origin, Vector2.new(bx * 8 + Math.cos(angle) * radius, by * 8 + Math.sin(angle) * radius), 12, 0, Terraria.PlayerCenterY(player), 0);
            }
        npc.netUpdate = true;
    }

    UpdateSmallGoodWorldReturn(npc, hive, state) {
        if (this.kind !== 'small' || !IsGoodWorld())
            return false;
        state.smallReturnTimer = Number(state.smallReturnTimer || 0) + 1;
        if (state.smallReturnTimer < 300)
            return false;
        const dx = Number(hive.Center.X) - Number(npc.Center.X), dy = Number(hive.Center.Y) - Number(npc.Center.Y);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 32) {
            const len = Math.max(0.001, distance);
            const targetX = dx / len * 16, targetY = dy / len * 16;
            let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
            vx += Math.max(-0.15, Math.min(0.15, targetX - vx));
            vy += Math.max(-0.15, Math.min(0.15, targetY - vy));
            npc.velocity = Vector2.new(vx, vy);
            npc.rotation = Math.atan2(vy, vx) + Math.PI * 0.5;
            state.smallAttachedToHive = false;
        } else {
            npc.position = Vector2.new(Number(hive.Center.X) - Number(npc.width) * 0.5, Number(hive.Center.Y) - Number(npc.height) * 0.5 + 4);
            npc.velocity = Vector2.new(0, 0);
            const hiveState = CalamityNPCState.Get(hive);
            hiveState.smallReturnCharge = Number(hiveState.smallReturnCharge || 0) + 1;
            state.smallAttachedToHive = true;
        }
        if (state.smallReturnTimer >= 600) {
            state.smallReturnTimer = 0;
            state.smallAttachedToHive = false;
            const hiveState = CalamityNPCState.Get(hive);
            hiveState.smallReturnCharge = 0;
        }
        return true;
    }

    PreAI(npc) {
        const s = CalamityNPCState.Get(npc);
        const hive = FindHive();
        if (!hive) {
            DisableVirtualWormDamage(npc, s);
            DeactivateNoLoot(npc);
            return false;
        }
        const player = TargetPlayer(npc);
        if (!player)
            return false;
        const c = this.cfg();
        if (s.segmentsSpawned !== true)
            this.SpawnSegments(npc, s);
        const lifeRatio = Number(npc.life) / Math.max(1, Number(npc.lifeMax));
        if (this.kind === 'medium' && Number(s.initialFrames || 0) < 3) {
            s.initialFrames = Number(s.initialFrames || 0) + 1;
            const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X), dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y), len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
            const initialSpeed = (IsDeath() ? 0.3 : 0.2) * 0.125;
            npc.velocity = Vector2.new(dx / len * initialSpeed, dy / len * initialSpeed);
        }
        if (!this.UpdateSmallGoodWorldReturn(npc, hive, s))
            ApplyPerforatorWormMovement(npc, player, this.kind, lifeRatio, s);
        if (this.kind === 'large')
            this.UpdateLargeSpit(npc, player, s);
        return false;
    }

    PostAI(npc) {
        const state = CalamityNPCState.Get(npc);
        if (state.singleEntityWorm !== true)
            return;
        const visualSegments = Math.max(1, Math.floor(Number(state.virtualSegmentCount || 1)));
        const spacing = Number(state.virtualSpacing || this.cfg().spacing);
        UpdateVirtualWorm(npc, state, visualSegments, spacing, 256);
    }

    PreDraw(npc, spriteBatch, screenPos) {
        const state = CalamityNPCState.Get(npc);
        const geometry = GetVirtualWormGeometry(state);
        if (!geometry || !this.VirtualAtlasTexture || !this.VirtualDrawPos || !this.VirtualBodySource || !this.VirtualTailSource)
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
            const scale = Math.max(0.1, Number(npc.scale || 1));
            const margin = 140;
            const pairReady = !!this.VirtualPairSource && !!this.VirtualPairOrigin;
            const maxMergedPairs = Math.min(4, Math.max(1, Math.floor(geometry.count * 0.35)));
            let mergedPairs = 0;
            let drawCalls = 0;
            for (let i = geometry.count - 1; i >= 0;) {
                const tail = i === geometry.count - 1;
                if (pairReady && !tail && i >= 2 && mergedPairs < maxMergedPairs) {
                    const j = i - 1;
                    if (j >= 0) {
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
                                draw(this.VirtualAtlasTexture, this.VirtualDrawPos, this.VirtualPairSource, color, r0 + delta * 0.5, this.VirtualPairOrigin, scale, SpriteEffects.None, 1.0);
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
                    const source = tail ? this.VirtualTailSource : this.VirtualBodySource;
                    const origin = tail ? this.VirtualTailOrigin : this.VirtualBodyOrigin;
                    draw(this.VirtualAtlasTexture, this.VirtualDrawPos, source, color, Number(geometry.rotation[i]), origin, scale, SpriteEffects.None, 1.0);
                    drawCalls++;
                }
                i--;
            }
            state.virtualBodyLastMergedPairs = mergedPairs;
            state.virtualBodyLastDrawCalls = drawCalls;
        } catch (e) {
            try { tl.log(`[CalamityPort SingleWorm] Perforator ${this.kind} virtual draw failed: ${e}`); } catch (_) { }
        }
        return true;
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) <= 0)
            return;
        const c = this.cfg();
        if (c.burn)
            ApplyBurningBlood(player, c.duration[0]);
        else
            ApplyIchor(player, c.duration[0]);
    }

    HitEffect(npc, hitDirection, damage) {
        hitDust(npc, npc.life <= 0 ? 18 : 2);
        if (npc.life <= 0)
            goreSet(npc, GORES[this.kind].head);
        else
            randomHitSound(npc, this.cfg().hitSlot);
    }

    OnKill(npc) {
        const state = CalamityNPCState.Get(npc);
        DisableVirtualWormDamage(npc, state);
        if (this.kind === 'medium') {
            if (Math.random() < 0.25 && targetNeedsHeart(npc))
                dropHeart(npc, 1);
            mediumDeathBurst(npc);
        } else
            dropHeart(npc, 3 + Math.floor(Math.random() * 3));
        CalamityNPCState.Remove(npc);
    }

    CheckActive() {
        return false;
    }
}

class WormSegmentBase extends ModNPC {
    constructor(kind, part, texture) {
        super();
        this.kind = kind;
        this.part = part;
        this.Texture = texture;
        this.hideFromBestiary = true;
    }

    cfg() {
        return CONFIG[this.kind];
    }

    SetDefaults() {
        const c = this.cfg(), p = this.part === 'body' ? c.body : c.tail, idx = difficultyIndex();
        this.NPC.damage = p[2];
        this.NPC.width = p[0];
        this.NPC.height = p[1];
        this.NPC.defense = p[3];
        this.NPC.lifeMax = idx > 0 ? c.head[5] : c.head[4];
        if (IsGoodWorld())
            this.NPC.lifeMax *= 4;
        this.NPC.scale = difficultyScale();
        this.NPC.aiStyle = -1;
        this.NPC.knockBackResist = 0;
        this.NPC.alpha = 255;
        this.NPC.behindTiles = true;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.npcSlots = 0;
        this.NPC.dontCountMe = true;
        this.NPC.HitSound = Terraria.ID.SoundID[`Item${c.hitSlot}`] || Terraria.ID.SoundID.NPCHit13;
        this.NPC.DeathSound = Terraria.ID.SoundID[`Item${c.deathSlot}`] || Terraria.ID.SoundID.NPCDeath13;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.perfCadencePhase = Math.abs(Math.floor(Number(npc.whoAmI))) % 4;
    }

    PreAI(npc) {
        // The head already owns the Hive liveness check. Segment validity is derived from
        // its cached chain link, avoiding one extra Hive lookup for every body every frame.
        const state = CalamityNPCState.Get(npc);
        // Body/tail NPCs are visual followers. On Android, updating every segment through
        // the JS/native bridge every frame scales linearly with chain length. Stagger each
        // segment across a 4-tick cadence; heads still run every tick, so combat/targeting
        // remains responsive while follower bridge work is reduced by about three quarters.
        const tick = Math.floor(Number(Terraria.Main.GameUpdateCount || 0));
        const phase = Number(state.perfCadencePhase || 0);
        if ((tick + phase) % 4 !== 0)
            return false;
        if (this.kind === 'medium') {
            npc.realLife = -1;
            if (!FollowSplittingMediumSegment(npc, this.cfg().spacing, state)) {
                PromoteMediumRearChain(npc.whoAmI, npc.target, Number(npc.life) / Math.max(1, Number(npc.lifeMax)));
                DeactivateNoLoot(npc);
            }
        } else
            FollowPreviousSegment(npc, this.cfg().spacing, state);
        return false;
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) <= 0)
            return;
        const c = this.cfg();
        if (c.burn)
            ApplyBurningBlood(player, c.duration[1]);
        else
            ApplyIchor(player, c.duration[1]);
    }

    HitEffect(npc, hitDirection, damage) {
        // Phase 12.74.11 benchmark: segment hit Dust/gores multiply with every body that a
        // piercing/bouncing weapon touches. Keep hit audio but omit per-segment FX.
        if (npc.life > 0)
            randomHitSound(npc, this.cfg().hitSlot);
    }

    OnKill(npc) {
        if (this.kind === 'medium') {
            if (Math.random() < 0.25 && targetNeedsHeart(npc))
                dropHeart(npc, 1);
            mediumDeathBurst(npc);
            SplitMediumChainAt(npc);
        }
        CalamityNPCState.Remove(npc);
    }

    CheckActive() {
        return false;
    }
}

export class PerforatorHeadSmall extends WormHeadBase {
    constructor() {
        super('small', 'NPCs/Bosses/Perforator/PerforatorHeadSmall');
    }
}

export class PerforatorBodySmall extends WormSegmentBase {
    constructor() {
        super('small', 'body', 'NPCs/Bosses/Perforator/PerforatorBodySmall');
    }
}

export class PerforatorTailSmall extends WormSegmentBase {
    constructor() {
        super('small', 'tail', 'NPCs/Bosses/Perforator/PerforatorTailSmall');
    }
}

export class PerforatorHeadMedium extends WormHeadBase {
    constructor() {
        super('medium', 'NPCs/Bosses/Perforator/PerforatorHeadMedium');
    }
}

export class PerforatorBodyMedium extends WormSegmentBase {
    constructor() {
        super('medium', 'body', 'NPCs/Bosses/Perforator/PerforatorBodyMedium');
    }
}

export class PerforatorTailMedium extends WormSegmentBase {
    constructor() {
        super('medium', 'tail', 'NPCs/Bosses/Perforator/PerforatorTailMedium');
    }
}

export class PerforatorHeadLarge extends WormHeadBase {
    constructor() {
        super('large', 'NPCs/Bosses/Perforator/PerforatorHeadLarge');
    }
}

export class PerforatorBodyLarge extends WormSegmentBase {
    constructor() {
        super('large', 'body', 'NPCs/Bosses/Perforator/PerforatorBodyLarge');
    }
}

export class PerforatorTailLarge extends WormSegmentBase {
    constructor() {
        super('large', 'tail', 'NPCs/Bosses/Perforator/PerforatorTailLarge');
    }
}
