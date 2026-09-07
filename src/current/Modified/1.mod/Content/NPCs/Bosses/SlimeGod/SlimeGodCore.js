import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModItem } from './../../../../TL/ModItem.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { BossIntroRuntime } from './../../../../Core/BossIntroRuntime.js';
import { BossPhaseVFX } from './../../../../Core/BossPhaseVFX.js';
import {
    GetSlimeWorld,
    GetSlimeTypes,
    GetProjectileType,
    SetActiveCore,
    ClearActiveCore,
    TargetPlayer,
    SpawnNPC,
    SpawnProjectile,
    FamilyAlive,
    FamilyLife,
    FamilyLifeMax,
    NearestFamilyMember,
    SlimeFlyDestination,
    MarkSingleHostPossessed,
    ClearSingleHostPossessed,
    IsExpert,
    IsRevengeance,
    IsDeath,
    IsGoodWorld,
    Distance,
    MoveToward,
    RandInt,
    PlayItemSlot,
    DeactivateNoLoot,
    CleanupSlimeGodEncounter
} from './../../../../Core/SlimeGodRuntime.js';
const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
const NewText = Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'];

function setVelocity(npc, x, y) {
    npc.velocity = Vector2.new(Number(x), Number(y));
}

function drop(npc, type, stack = 1) {
    if (!(Number(type) > 0) || Terraria.Main.netMode === 1)
        return;
    try {
        NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), Math.max(1, npc.width), Math.max(1, npc.height), Math.floor(Number(type)), Math.max(1, Math.floor(Number(stack))), false, -1, true);
    } catch (e) { }
}

function dustBurst(npc, count = 24, strength = 1) {
    if (Terraria.Main.netMode === 2)
        return;
    for (let i = 0; i < Math.min(48, count); i++) {
        const color = Math.random() < 0.5 ? Color.Lavender : Color.Crimson;
        const d = NewDust(npc.position, npc.width, npc.height, 4, 0, 0, npc.alpha, color, i < 12 ? 1.4 : 2.2);
        if (d >= 0) {
            const dust = Terraria.Main.dust[d];
            dust.noGravity = i >= 12;
            dust.velocity = Vector2.new((Math.random() - 0.5) * 7 * strength, (Math.random() - 0.5) * 7 * strength);
        }
    }
}

function validNPC(index, types = null) {
    const i = Math.floor(Number(index));
    if (i < 0 || i >= 200)
        return null;
    const n = Terraria.Main.npc[i];
    if (!n || !n.active)
        return null;
    if (types && types.indexOf(Number(n.type)) < 0)
        return null;
    return n;
}

export class SlimeGodCore extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/SlimeGod/SlimeGodCore';
        this.Music = 86;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 1;
        try {
            Terraria.ID.NPCID.Sets.BossBestiaryPriority.Add(this.Type);
            Terraria.ID.NPCID.Sets.MPAllowedEnemies[this.Type] = true;
            Terraria.ID.NPCID.Sets.TrailCacheLength[this.Type] = 8;
            Terraria.ID.NPCID.Sets.TrailingMode[this.Type] = 1;
        } catch (e) { }
    }

    SetDefaults() {
        const n = this.NPC;
        n.damage = 40;
        n.npcSlots = 10;
        n.width = 44;
        n.height = 44;
        n.scale = IsGoodWorld() ? 2 : 1;
        n.defense = 6;
        // Official core value. The current life is mapped to the combined Paladin ratio for TLPro's native boss bar.
        n.lifeMax = 420;
        n.aiStyle = -1;
        n.knockBackResist = 0;
        n.value = ModNPC.NPCValue(0, 8, 0, 0);
        n.alpha = 51;
        n.boss = true;
        n.noGravity = true;
        n.noTileCollide = true;
        n.dontTakeDamage = true;
        n.netAlways = true;
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        npc.lifeMax = 420;
        npc.damage = Math.max(1, Math.floor(Number(npc.damage) * 0.8));
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        Object.assign(s, {
            spawned: false,
            combatTimer: 0,
            possessionTimer: 0,
            possessionMode: 0,
            possessionHost: -1,
            possessionFamily: '',
            possessionTicks: 0,
            contactTimer: 0,
            victoryTimer: 0,
            lootDone: false,
            despawnTimer: 0,
            initialFamilyMax: 0,
            phase2VfxShown: false
        });
        SetActiveCore(npc);
        npc.TargetClosest(true);
        BossIntroRuntime.Trigger(npc, 'slimeGod');
    }

    PreAI(npc) {
        SetActiveCore(npc);
        const s = CalamityNPCState.Get(npc), player = TargetPlayer(npc), t = GetSlimeTypes();
        if (BossIntroRuntime.ShouldHoldNPC(npc))
            return false;
        if (!s.spawned) {
            s.spawned = true;
            if (Terraria.Main.netMode !== 1) {
                SpawnNPC(t.ebon, Number(npc.Center.X), Number(npc.Center.Y));
                SpawnNPC(t.crim, Number(npc.Center.X), Number(npc.Center.Y));
            }
            try { NewText('The Slime God has awoken!', 175, 90, 230); } catch (e) { }
            npc.netUpdate = true;
        }

        const crimsonAlive = FamilyAlive('crim'), ebonAlive = FamilyAlive('ebon');
        const familyLife = FamilyLife('crim') + FamilyLife('ebon');
        const currentFamilyMax = FamilyLifeMax('crim') + FamilyLifeMax('ebon');
        // Keep the first combined maximum as a fixed boss-bar denominator. When a large Paladin
        // splits, its children represent its remaining life and must not refill the native bar.
        if (!(Number(s.initialFamilyMax || 0) > 0) && currentFamilyMax > 0)
            s.initialFamilyMax = currentFamilyMax;
        const familyMax = Math.max(1, Number(s.initialFamilyMax || currentFamilyMax || 1));
        if (familyLife > 0)
            npc.life = Math.max(1, Math.min(420, Math.round(420 * familyLife / familyMax)));
        else
            npc.life = 1;

        if (!player || Distance(Terraria.PlayerCenter(player), npc.Center) > 3200) {
            s.despawnTimer = Number(s.despawnTimer || 0) + 1;
            npc.damage = 0;
            npc.alpha = Math.min(255, Number(npc.alpha) + 3);
            setVelocity(npc, Number(npc.velocity.X) * 0.98, Math.min(16, Number(npc.velocity.Y) + 0.2));
            if (s.despawnTimer >= 90)
                CleanupSlimeGodEncounter();
            return false;
        }
        s.despawnTimer = 0;
        if (Number(npc.timeLeft) < 1800)
            npc.timeLeft = 1800;

        if (!crimsonAlive && !ebonAlive) {
            this.VictoryAI(npc, s);
            return false;
        }

        const phase2 = !crimsonAlive || !ebonAlive;
        if (phase2 && s.phase2VfxShown !== true) {
            s.phase2VfxShown = true;
            BossPhaseVFX.Trigger(npc, 'slime', 2);
        }
        if (this.UpdatePossession(npc, s, crimsonAlive, ebonAlive, phase2))
            return false;

        s.possessionTimer = Number(s.possessionTimer || 0) + 1;
        const gate = phase2 ? 300 : 900;
        if (s.possessionTimer >= gate)
            this.BeginPossession(npc, s, crimsonAlive, ebonAlive);
        if (Number(s.possessionMode || 0) !== 0)
            return false;

        npc.alpha = Math.max(51, Number(npc.alpha) - 12);
        s.combatTimer = Number(s.combatTimer || 0) + 1;
        if (IsExpert()) {
            let interval = IsDeath() ? 180 : (IsRevengeance() ? 240 : 300);
            if (phase2)
                interval = Math.floor(interval / 2);
            if (s.combatTimer % interval === 0) {
                const crimson = Math.random() < 0.5;
                const type = GetProjectileType(crimson ? 'UnstableCrimulanGlob' : 'UnstableEbonianGlob');
                const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
                const dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
                const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const speed = crimson ? 8 : 4;
                SpawnProjectile(type, npc.Center, Vector2.new(dx / len * speed, dy / len * speed), 15, 0, 0, 0);
                PlayItemSlot(174 + RandInt(0, 2), npc.Center, null, 0.8, 0);
            }
        }

        const destination = SlimeFlyDestination(npc, player);
        const speed = (IsDeath() ? 15 : (IsRevengeance() ? 13.5 : (IsExpert() ? 12 : 9))) * (phase2 ? 1.25 : 1) * (IsGoodWorld() ? 1.25 : 1);
        const distance = Distance(npc.Center, destination);
        if (distance < 200)
            s.contactTimer = 20;
        else
            s.contactTimer = Math.max(0, Number(s.contactTimer || 0) - 1);
        npc.damage = Number(s.contactTimer || 0) > 0 ? Number(npc.defDamage || 40) : 0;
        MoveToward(npc, Number(destination.X), Number(destination.Y), speed, distance < 300 ? 7 : (distance < 350 ? 10 : 50));
        npc.rotation = distance < 200 ? Number(npc.rotation) + Number(npc.direction || 1) * 0.3 : Number(npc.velocity.X) * 0.1;
        npc.direction = Number(npc.velocity.X) < 0 ? -1 : 1;
        npc.spriteDirection = npc.direction;
        return false;
    }

    BeginPossession(npc, s, crimsonAlive, ebonAlive) {
        let family;
        if (crimsonAlive && ebonAlive)
            family = Math.random() < 0.5 ? 'crim' : 'ebon';
        else
            family = crimsonAlive ? 'crim' : 'ebon';
        const host = NearestFamilyMember(family, npc.Center);
        if (!host)
            return;
        s.possessionFamily = family;
        s.possessionHost = Number(host.whoAmI);
        s.possessionMode = 1;
        s.possessionTicks = 0;
        s.possessionTimer = 0;
        MarkSingleHostPossessed(host, 720);
        PlayItemSlot(172, npc.Center, null, 1, 0);
        npc.netUpdate = true;
    }

    UpdatePossession(npc, s, crimsonAlive, ebonAlive, phase2) {
        const mode = Number(s.possessionMode || 0);
        if (mode === 0)
            return false;
        const t = GetSlimeTypes();
        const host = validNPC(s.possessionHost, [t.crim, t.ebon, t.splitCrim, t.splitEbon]);
        npc.damage = 0;
        npc.rotation = Number(npc.rotation) + Number(npc.direction || 1) * 0.3;

        if (mode === 1) {
            if (!host) {
                this.ExitPossession(npc, s, null);
                return true;
            }
            MarkSingleHostPossessed(host, 720);
            const dx = Number(host.Center.X) - Number(npc.Center.X), dy = Number(host.Center.Y) - Number(npc.Center.Y);
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            setVelocity(npc, dx / len * 24, dy / len * 24);
            if (len < 24) {
                setVelocity(npc, 0, 0);
                npc.position = Vector2.new(Number(host.Center.X) - npc.width * 0.5, Number(host.Center.Y) - npc.height * 0.5);
                npc.alpha = Math.min(255, Number(npc.alpha) + 45);
                if (Number(npc.alpha) >= 250) {
                    npc.alpha = 255;
                    s.possessionMode = 2;
                    s.possessionTicks = 0;
                }
            }
            return true;
        }

        if (mode === 2) {
            if (!host) {
                this.ExitPossession(npc, s, null);
                return true;
            }
            MarkSingleHostPossessed(host, 720);
            npc.position = Vector2.new(Number(host.Center.X) - npc.width * 0.5, Number(host.Center.Y) - npc.height * 0.5);
            setVelocity(npc, 0, 0);
            npc.alpha = 255;
            s.possessionTicks = Number(s.possessionTicks || 0) + 1;
            if (s.possessionTicks >= 600)
                this.ExitPossession(npc, s, host);
            return true;
        }
        return false;
    }

    ExitPossession(npc, s, host) {
        if (host)
            ClearSingleHostPossessed(host);
        s.possessionMode = 0;
        s.possessionHost = -1;
        s.possessionFamily = '';
        s.possessionTicks = 0;
        s.possessionTimer = 0;
        npc.alpha = 51;
        setVelocity(npc, 0, -12);
        PlayItemSlot(173, npc.Center, null, 1, 0);
        dustBurst(npc, 38, 1.2);
        npc.netUpdate = true;
    }

    VictoryAI(npc, s) {
        npc.damage = 0;
        s.victoryTimer = Number(s.victoryTimer || 0) + 1;
        setVelocity(npc, Number(npc.velocity.X) * 0.97, Number(npc.velocity.Y) * 0.97);
        npc.rotation = Number(npc.rotation) + Number(npc.direction || 1) * 0.3;
        npc.alpha = Math.min(255, 51 + Math.floor(204 * Math.min(160, s.victoryTimer) / 160));
        npc.life = 1;
        if ((s.victoryTimer % 8) === 0)
            dustBurst(npc, 6, 0.7);
        if (s.victoryTimer >= 160 && !s.lootDone) {
            s.lootDone = true;
            this.DropVictoryLoot(npc);
            const w = GetSlimeWorld();
            if (w && w.RecordSlimeGodKill)
                w.RecordSlimeGodKill();
            try { NewText('The Slime God has been defeated!', 220, 90, 230); } catch (e) { }
            PlayItemSlot(172, npc.Center, null, 1, 0);
            dustBurst(npc, 48, 1.6);
            ClearActiveCore(npc);
            DeactivateNoLoot(npc);
        }
    }

    DropVictoryLoot(npc) {
        if (Terraria.Main.netMode === 1)
            return;
        const world = GetSlimeWorld(), first = world ? world.DownedSlimeGod !== true : false;
        drop(npc, Number(Terraria.ID.ItemID.HealingPotion || 188), RandInt(5, 16));
        drop(npc, Number(Terraria.ID.ItemID.GoldCoin || 74), 8);
        drop(npc, Number(Terraria.ID.ItemID.Gel || 23), RandInt(32, 49));
        if (IsExpert()) {
            drop(npc, ModItem.getTypeByName('SlimeGodBag'), 1);
        } else {
            drop(npc, ModItem.getTypeByName('PurifiedGel'), RandInt(30, 46));
            const weapons = ['OverloadedBlaster', 'AbyssalTome', 'EldritchTome', 'CorroslimeStaff', 'CrimslimeStaff'].map(n => Number(ModItem.getTypeByName(n) || 0)).filter(n => n > 0);
            let any = false;
            for (const type of weapons) {
                if (Math.random() >= 0.25)
                    continue;
                drop(npc, type, 1);
                any = true;
            }
            if (!any && weapons.length)
                drop(npc, weapons[Math.floor(Math.random() * weapons.length)], 1);
            if (Math.random() < 1 / 7)
                drop(npc, ModItem.getTypeByName('SlimeGodMask'), 1);
            if (Math.random() < 1 / 7)
                drop(npc, ModItem.getTypeByName('SlimeGodMask2'), 1);
            if (Math.random() < 0.01)
                drop(npc, ModItem.getTypeByName('ThankYouPainting'), 1);
        }
        if (Math.random() < 0.10)
            drop(npc, ModItem.getTypeByName('SlimeGodTrophy'), 1);
        if (IsRevengeance() || Terraria.Main.masterMode === true)
            drop(npc, ModItem.getTypeByName('SlimeGodRelic'), 1);
        if (IsGoodWorld())
            drop(npc, 4988, 1);
        if (first)
            drop(npc, ModItem.getTypeByName('LoreSlimeGod'), 1);
    }

    HitEffect(npc, hitDirection, damage) {
        if (Terraria.Main.netMode === 2)
            return;
        for (let i = 0; i < 5; i++) {
            const color = Math.random() < 0.5 ? Color.Lavender : Color.Crimson;
            NewDust(npc.position, npc.width, npc.height, 4, hitDirection, -1, npc.alpha, color, 1);
        }
    }

    OnHitPlayer(npc, player) {
        try {
            const id = Number(Terraria.Main.zenithWorld === true ? (Terraria.ID.BuffID.Confused || 31) : (Terraria.ID.BuffID.Slimed || 137));
            if (id > 0)
                player.AddBuff(id, 180, true);
        } catch (e) { }
    }

    OnKill(npc) {
        const w = GetSlimeWorld();
        if (w && w.RecordSlimeGodKill)
            w.RecordSlimeGodKill();
        ClearActiveCore(npc);
    }
}
