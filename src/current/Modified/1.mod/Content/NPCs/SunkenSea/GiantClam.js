import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SunkenSeaPreviewRuntime } from './../../../Core/SunkenSeaPreviewRuntime.js';
import { WaterAtSpawn, SpawnAquaticNPC } from './../../../Core/SulphurousSeaEcologyRuntime.js';
import { SunkenSeaTerrainRuntime } from './../../../Core/SunkenSeaTerrainRuntime.js';
import { IsGiantClamDenTile, CleanupAbandonedGiantClam, ApplyClamity } from './../../../Core/GiantClamRuntime.js';
import { AndroidSound } from './../../../Common/Snippets/AndroidSound.js';
import { BossIntroRuntime } from './../../../Core/BossIntroRuntime.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function RectOf(npc) {
    try {
        return npc['Rectangle getRect()']();
    } catch (e) {
        return null;
    }
}

function CenterOf(npc) {
    const r = RectOf(npc);
    return r ? { x: Number(r.X) + Number(r.Width) * 0.5, y: Number(r.Y) + Number(r.Height) * 0.5 } : null;
}

function AddBestiary(entry, key) {
    try {
        const f = FlavorTextBestiaryInfoElement.new();
        f._key = ModLocalization.Translate(key);
        entry.Info.Add(f);
    } catch (e) { }
}

function DustAt(npc, type, count, scale = 1) {
    const r = RectOf(npc);
    if (!r)
        return;
    for (let i = 0; i < count; i++)
        NewDust(Vector2.new(Number(r.X), Number(r.Y)), Math.floor(Number(r.Width)), Math.floor(Number(r.Height)), type, (Math.random() - .5) * 3, (Math.random() - .5) * 3, 0, Color.White, scale);
}

function InSunken(info) {
    if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe)
        return false;
    return SunkenSeaPreviewRuntime.ContainsPlayer(info.Player);
}

function BaseDefense() {
    return Terraria.Main.hardMode ? 35 : 10;
}

function BaseDamage() {
    return Terraria.Main.hardMode ? 100 : 50;
}

function SpawnClam(npc, xOffset) {
    const type = Number(ModNPC.getTypeByName('Clam') || 0);
    if (!(type > 0))
        return -1;
    const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
    const c = CenterOf(npc);
    if (!c)
        return -1;
    const index = Terraria.NPC.NewNPC(source, Math.floor(c.x + xOffset), Math.floor(c.y), type, 0, 0, 0, 0, 0, 255);
    if (index >= 0) {
        const child = Terraria.Main.npc[index];
        if (child) {
            const s = CalamityNPCState.Get(child);
            s.summonedByGiantClam = true;
            child.netUpdate = true;
        }
    }
    return index;
}

function SlamSound(npc) {
    const c = CenterOf(npc);
    if (!c)
        return;
    const result = AndroidSound.PlayExclusive('giant-clam-slam', 'Sounds/Item/ClamImpact.ogg', 0.85, c.x, c.y, 1600, 120, 8, true);
    if (!result.ok) {
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, Vector2.new(c.x, c.y), 14, -0.15);
        } catch (e) { }
    }
}

export class GiantClam extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SunkenSea/GiantClam';
        this.Music = 78;
        this.BestiaryRarityStars = 4;
        this.GlowTexture = null;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 12;
        try {
            Terraria.ID.NPCID.Sets.BossBestiaryPriority.Add(this.Type);
        } catch (e) { }
        try {
            Terraria.ID.NPCID.Sets.MPAllowedEnemies[this.Type] = true;
        } catch (e) { }
    }

    PostSetupContent() {
        try {
            this.GlowTexture = tl.texture.load('Textures/NPCs/SunkenSea/GiantClamGlow.png');
        } catch (e) {
            this.GlowTexture = null;
        }
    }

    SetDefaults() {
        const n = this.NPC;
        n.npcSlots = 5;
        n.aiStyle = -1;
        n.damage = BaseDamage();
        n.width = 160;
        n.height = 120;
        n.defense = 9999;
        n.lifeMax = Terraria.Main.hardMode ? 7500 : 1250;
        n.knockBackResist = 0;
        n.value = Terraria.Main.hardMode ? Terraria.Item.buyPrice(0, 5, 0, 0) : Terraria.Item.buyPrice(0, 1, 0, 0);
        n.HitSound = Terraria.ID.SoundID.NPCHit4;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        n.noGravity = false;
        n.noTileCollide = false;
        n.lavaImmune = true;
        n.boss = true;
        n.netAlways = true;
        n.chaseable = false;
        n.rarity = 2;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        this.InitializeState(npc, s, true);
    }

    InitializeState(npc, s, reset = false) {
        if (reset || s.giantClamInitialized !== true) {
            s.giantClamInitialized = true;
            s.hitAmount = reset ? 0 : Math.max(0, Math.min(5, Number(s.hitAmount || 0)));
            s.awake = reset ? false : s.awake === true;
            s.warmup = reset ? 0 : Math.max(0, Number(s.warmup || 0));
            s.attack = reset ? -1 : Number.isFinite(Number(s.attack)) ? Number(s.attack) : -1;
            s.giantClamIdleTimer = reset ? 0 : Math.max(0, Number(s.giantClamIdleTimer || 0));
            s.attackStage = reset ? 0 : Math.max(0, Number(s.attackStage || 0));
            s.stageTimer = reset ? 0 : Math.max(0, Number(s.stageTimer || 0));
            s.nextAttack = reset ? 0 : Math.max(0, Number(s.nextAttack || 0));
            s.hide = reset ? false : s.hide === true;
            s.attackAnim = reset ? false : s.attackAnim === true;
            s.noPlayerTimer = reset ? 0 : Math.max(0, Number(s.noPlayerTimer || 0));
            s.wasDescending = reset ? false : s.wasDescending === true;
            s.dormantHitLatch = false;
            s.lastLife = Number(npc.life);
        }
        return s;
    }

    SetBestiary(database, entry) {
        AddBestiary(entry, 'Bestiary.GiantClam');
    }

    SpawnChance(info) {
        if (!InSunken(info) || !WaterAtSpawn(info))
            return 0;
        const world = ModSystem.getByName('CalamityWorldState');
        if (!world || world.DownedDesertScourge !== true)
            return 0;
        if (Terraria.NPC.AnyNPCs(this.Type))
            return 0;
        return 0.044;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 160, 120);
    }

    RegisterHit(npc) {
        const s = CalamityNPCState.Get(npc);
        if (s.awake)
            return;
        s.hitAmount = Math.min(5, Number(s.hitAmount || 0) + 1);
        if (s.hitAmount >= 5) {
            s.awake = true;
            s.warmup = 0;
            s.hide = false;
            npc.defense = BaseDefense();
            npc.chaseable = true;
            npc.netUpdate = true;
            BossIntroRuntime.Trigger(npc, 'giantClam');
            try {
                NewText(ModLocalization.Translate('Messages.GiantClamAwoken'), 80, 235, 240);
            } catch (e) { }
        }
    }

    ResetAttack(npc, s) {
        s.attack = -1;
        s.giantClamIdleTimer = 0;
        s.attackStage = 0;
        s.stageTimer = 0;
        s.hide = false;
        s.attackAnim = false;
        s.wasDescending = false;
        npc.alpha = 0;
        npc.damage = 0;
        npc.defense = BaseDefense();
        npc.chaseable = true;
        npc.dontTakeDamage = false;
        npc.noGravity = false;
        npc.noTileCollide = false;
        npc.velocity = Vector2.new(0, 0);
        npc.netUpdate = true;
    }

    BeginNextAttack(npc, s) {
        let attack = Math.random() < 0.5 ? 0 : 1;
        if (attack === 0)
            attack = Math.random() < 0.5 ? 0 : 1;
        s.attack = attack;
        s.nextAttack = Number(s.nextAttack || 0) + 1;
        s.attackStage = 0;
        s.stageTimer = 0;
        s.giantClamIdleTimer = 0;
        npc.netUpdate = true;
    }

    DoSummon(npc, s) {
        s.stageTimer++;
        s.hide = true;
        s.attackAnim = false;
        npc.damage = 0;
        npc.defense = 9999;
        npc.chaseable = false;
        npc.velocity = Vector2.new(0, Number(npc.velocity.Y));
        if (s.stageTimer >= 90) {
            SpawnClam(npc, -56);
            SpawnClam(npc, 0);
            SpawnClam(npc, 56);
            this.ResetAttack(npc, s);
        }
    }

    DoSlam(npc, s, player) {
        s.stageTimer++;
        if (s.attackStage === 0) {
            s.hide = true;
            npc.damage = 0;
            npc.chaseable = false;
            npc.dontTakeDamage = true;
            npc.noGravity = true;
            npc.noTileCollide = true;
            npc.alpha = Math.min(255, Number(npc.alpha) + (Terraria.Main.hardMode ? 8 : 5));
            npc.velocity = Vector2.new(0, 0);
            if (npc.alpha >= 255) {
                const centerX = Terraria.PlayerCenterX(player) - 15;
                const centerY = Terraria.PlayerCenterY(player) - 300;
                npc['void set_Center(Vector2 value)'](Vector2.new(centerX, centerY));
                s.attackStage = 1;
                s.stageTimer = 0;
                npc.netUpdate = true;
            }
            return;
        }
        if (s.attackStage === 1) {
            npc.alpha = Math.max(0, Number(npc.alpha) - (Terraria.Main.hardMode ? 7 : 4));
            npc.velocity = Vector2.new(0, 0);
            if (npc.alpha <= 0) {
                s.hide = false;
                s.attackAnim = true;
                s.attackStage = 2;
                s.stageTimer = 0;
                npc.damage = BaseDamage();
                npc.chaseable = true;
                npc.dontTakeDamage = false;
                npc.velocity = Vector2.new(0, 1);
                npc.netUpdate = true;
            }
            return;
        }
        let vy = Math.min(18, Number(npc.velocity.Y) + 0.8);
        npc.velocity = Vector2.new(0, vy);
        npc.noGravity = true;
        const c = CenterOf(npc);
        if (c && c.y > Terraria.PlayerCenterY(player) - 70)
            npc.noTileCollide = false;
        if (vy > 1)
            s.wasDescending = true;
        const landed = (npc.collideY === true) || (s.wasDescending && s.stageTimer > 15 && Math.abs(Number(npc.velocity.Y)) < 0.01);
        if (landed) {
            SlamSound(npc);
            DustAt(npc, 33, 35, 1.35);
            this.ResetAttack(npc, s);
        }
    }

    PreAI(npc) {
        const s = this.InitializeState(npc, CalamityNPCState.Get(npc), false);
        npc.TargetClosest(true);
        const player = Terraria.Main.player[Number(npc.target)];
        if (!player || player.dead) {
            s.noPlayerTimer = Number(s.noPlayerTimer || 0) + 1;
            if (s.noPlayerTimer >= 60) {
                CleanupAbandonedGiantClam(npc);
                return false;
            }
        } else {
            s.noPlayerTimer = 0;
        }
        if (BossIntroRuntime.ShouldHoldNPC(npc))
            return false;
        if (!s.awake) {
            const lifeNow = Number(npc.life);
            const nativeHit = npc.justHit === true;
            const lifeDropped = Number.isFinite(Number(s.lastLife)) && lifeNow < Number(s.lastLife);
            const hitNow = nativeHit || lifeDropped;
            if (hitNow && s.dormantHitLatch !== true)
                this.RegisterHit(npc);
            s.dormantHitLatch = hitNow;
            s.lastLife = Number(npc.life);
            npc.damage = 0;
            npc.defense = 9999;
            npc.chaseable = false;
            npc.dontTakeDamage = false;
            npc.velocity = Vector2.new(Number(npc.velocity.X) * 0.75, Number(npc.velocity.Y));
            return false;
        }
        s.dormantHitLatch = false;
        s.lastLife = Number(npc.life);
        if (player && player.active && !player.dead)
            ApplyClamity(player, 2);
        if (!s.hide) {
            const c = CenterOf(npc);
            if (c) {
                try {
                    Terraria.Lighting.AddLight(Vector2.new(c.x, c.y), 0, 0.55, 0.65);
                } catch (e) { }
            }
        }
        if (s.warmup < 240) {
            s.warmup++;
            npc.damage = 0;
            npc.defense = BaseDefense();
            npc.chaseable = true;
            npc.velocity = Vector2.new(0, Number(npc.velocity.Y));
            return false;
        }
        if (!player || player.dead)
            return false;
        if (s.attack === -1) {
            npc.damage = 0;
            npc.defense = BaseDefense();
            npc.chaseable = true;
            s.giantClamIdleTimer = Number(s.giantClamIdleTimer || 0) + 1;
            if (s.giantClamIdleTimer >= 240)
                this.BeginNextAttack(npc, s);
            return false;
        }
        if (s.attack === 0)
            this.DoSummon(npc, s);
        else
            this.DoSlam(npc, s, player);
        return false;
    }

    FindFrame(npc, h) {
        const s = CalamityNPCState.Get(npc);
        const r = npc.frame;
        if (!s.awake || s.hide) {
            r.Y = h * 11;
            npc.frame = r;
            return;
        }
        npc.frameCounter += 1;
        if (s.attackAnim) {
            if (npc.frameCounter > 2) {
                npc.frameCounter = 0;
                r.Y += h;
                if (r.Y < h * 3)
                    r.Y = h * 3;
                if (r.Y > h * 10)
                    r.Y = h * 3;
            }
        } else if (npc.frameCounter > 5) {
            npc.frameCounter = 0;
            r.Y += h;
            if (r.Y > h * 3)
                r.Y = 0;
        }
        npc.frame = r;
    }

    PostDraw(npc, spriteBatch, screenPos) {
        if (!this.GlowTexture || Number(npc.alpha) >= 255)
            return;
        try {
            const draw = spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            const source = npc.frame;
            const origin = Vector2.new(Number(source.Width) * 0.5, Number(source.Height) * 0.5);
            const position = Vector2.new(Number(npc.Center.X) - Number(screenPos.X), Number(npc.Center.Y) - Number(screenPos.Y) + Number(npc.gfxOffY || 0));
            const strength = Math.max(0, 255 - Number(npc.alpha));
            const glow = Color.new(Math.floor(strength * 0.5), strength, strength, 0);
            draw(this.GlowTexture, position, source, glow, Number(npc.rotation), origin, Number(npc.scale), SpriteEffects.None, 0);
        } catch (e) { }
    }

    ModifyNPCLoot(loot) {
        const nav = Number(ModItem.getTypeByName('Navystone') || 0), pearl = Number(ModItem.getTypeByName('GiantPearl') || 0), pendant = Number(ModItem.getTypeByName('AmidiasPendant') || 0), trophy = Number(ModItem.getTypeByName('GiantClamTrophy') || 0);
        if (nav > 0)
            loot.Add(ItemDropRule.Common(nav, 1, 30, 40));
        loot.Add(ItemDropRule.Common(4412, 2, 1, 1));
        loot.Add(ItemDropRule.Common(4413, 4, 1, 1));
        loot.Add(ItemDropRule.Common(4414, 10, 1, 1));
        if (pearl > 0)
            loot.Add(ItemDropRule.Common(pearl, 3, 1, 1));
        if (pendant > 0)
            loot.Add(ItemDropRule.Common(pendant, 3, 1, 1));
        if (trophy > 0)
            loot.Add(ItemDropRule.Common(trophy, 10, 1, 1));
    }

    OnKill(npc) {
        const world = ModSystem.getByName('CalamityWorldState');
        if (world && typeof world.RecordGiantClamKill === 'function')
            world.RecordGiantClamKill();
        const r = RectOf(npc);
        const seaKing = Number(ModNPC.getTypeByName('SeaKing') || 0);
        if (r && seaKing > 0 && Number(Terraria.Main.netMode) !== 1 && !Terraria.NPC.AnyNPCs(seaKing)) {
            const source = Terraria.NPC.GetSpawnSourceForNaturalSpawn();
            const idx = Terraria.NPC.NewNPC(source, Math.floor(Number(r.X) + Number(r.Width) * .5), Math.floor(Number(r.Y) + Number(r.Height) * .5), seaKing, 0, 0, 0, 0, 0, 255);
            if (idx >= 0)
                Terraria.Main.npc[idx].netUpdate = true;
        }
        const revenge = !!(world && world.RevengeanceMode === true);
        if (r && (revenge || Terraria.Main.masterMode === true)) {
            const relic = Number(ModItem.getTypeByName('GiantClamRelic') || 0);
            if (relic > 0)
                try {
                    NewItem(Math.floor(Number(r.X)), Math.floor(Number(r.Y)), Math.floor(Number(r.Width)), Math.floor(Number(r.Height)), relic, 1, false, -1, true);
                } catch (e) {
                    tl.log(`[CalamityPort] Giant Clam relic drop failed: ${e}`);
                }
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc) {
        DustAt(npc, 37, npc.life <= 0 ? 50 : 5, npc.life <= 0 ? 1.2 : 0.9);
    }
}
