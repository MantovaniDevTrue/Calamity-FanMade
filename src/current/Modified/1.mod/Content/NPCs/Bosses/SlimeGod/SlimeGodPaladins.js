import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import {
    GetSlimeTypes,
    GetProjectileType,
    FindCore,
    TargetPlayer,
    SpawnNPC,
    SpawnProjectile,
    FamilyAlive,
    IsExpert,
    IsRevengeance,
    IsDeath,
    IsGoodWorld,
    Distance,
    Normalize,
    CanSee,
    RandInt,
    Chance,
    PlayItemSlot,
    DeactivateNoLoot
} from './../../../../Core/SlimeGodRuntime.js';
const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];

function setVelocity(npc, x, y) {
    npc.velocity = Vector2.new(Number(x), Number(y));
}

function dustBurst(npc, crimson, count = 18) {
    if (Terraria.Main.netMode === 2)
        return;
    const color = crimson ? Color.Crimson : Color.Lavender;
    for (let i = 0; i < Math.min(36, count); i++) {
        const d = NewDust(npc.position, npc.width, npc.height, 4, 0, 0, npc.alpha, color, i < 10 ? 1.2 : 1.8);
        if (d >= 0) {
            const dust = Terraria.Main.dust[d];
            dust.noGravity = i >= 10;
            dust.velocity = Vector2.new((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
        }
    }
}

function fireFanAngle(npc, crimson, count, speed, baseAngle, spread, gravity = 0, damage = 15, skipMiddle = false) {
    const type = GetProjectileType(crimson ? 'UnstableCrimulanGlob' : 'UnstableEbonianGlob');
    if (!(type > 0) || Terraria.Main.netMode === 1)
        return;
    for (let i = 0; i < count; i++) {
        if (skipMiddle && i >= Math.floor(count / 2) - 1 && i <= Math.floor(count / 2) + 1)
            continue;
        const t = count <= 1 ? 0.5 : i / (count - 1);
        const angle = baseAngle - spread + spread * 2 * t;
        const vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
        const n = Normalize(vx, vy, 0, -1);
        const start = Vector2.new(Number(npc.Center.X) + n.x * 30 * Number(npc.scale || 1), Number(npc.Center.Y) + n.y * 30 * Number(npc.scale || 1));
        SpawnProjectile(type, start, Vector2.new(vx, vy), damage, gravity, 0, 0);
    }
}

function fireAimedFan(npc, player, crimson, count, speed, spread, damage = 15) {
    const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
    const dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
    fireFanAngle(npc, crimson, count, speed, Math.atan2(dy, dx), spread, 0, damage, false);
}

function resizeAtBottom(npc, width, height, scale) {
    const bottomX = Number(npc.Center.X), bottomY = Number(npc.Bottom.Y);
    npc.scale = Number(scale);
    npc.width = Math.max(24, Math.floor(width * scale));
    npc.height = Math.max(18, Math.floor(height * scale));
    npc.position = Vector2.new(bottomX - npc.width * 0.5, bottomY - npc.height);
}

class SlimePaladinBase extends ModNPC {
    constructor(texture, family, split = false) {
        super();
        this.Texture = texture;
        this.family = family;
        this.split = split;
        this.crimson = family === 'crim';
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 6;
    }

    SetDefaults() {
        const n = this.NPC, split = this.split, crimson = this.crimson;
        n.damage = split ? 36 : (crimson ? 42 : 40);
        n.width = 150;
        n.height = 92;
        n.scale = split ? 0.8 : 1.1;
        n.defense = split ? (crimson ? 10 : 8) : (crimson ? 12 : 10);
        n.lifeMax = split ? (IsExpert() ? (crimson ? 2250 : 2400) : (crimson ? 1875 : 2000)) : (IsExpert() ? (crimson ? 9000 : 9600) : (crimson ? 7500 : 8000));
        n.aiStyle = -1;
        n.knockBackResist = 0;
        n.value = 0;
        n.alpha = 51;
        n.noGravity = false;
        n.noTileCollide = false;
        n.netAlways = true;
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        const bal = Number.isFinite(Number(balance)) ? Number(balance) : 1, adj = Number.isFinite(Number(bossAdjustment)) ? Number(bossAdjustment) : 1;
        npc.lifeMax = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.8 * bal * adj));
        npc.damage = Math.max(1, Math.floor(Number(npc.damage) * 0.8));
    }

    OnSpawn(npc) {
        const inherited = CalamityNPCState.Get(npc);
        const inheritedPossession = Number(inherited.inheritedPossession || inherited.possessedTicks || 0);
        const s = CalamityNPCState.Reset(npc);
        Object.assign(s, {
            family: this.family,
            split: this.split,
            mode: 0,
            modeTimer: 0,
            modeStage: 0,
            jumpTimer: 0,
            jumpCount: 0,
            attackTimer: 0,
            lastAttack: 0,
            lostSight: 0,
            teleportTimer: 0,
            nextSpawnRatio: this.crimson ? 0.85 : 0.80,
            possessedTicks: inheritedPossession,
            possessionHost: inheritedPossession > 0,
            splitDone: false,
            baseWidth: 150,
            baseHeight: 92
        });
        npc.TargetClosest(true);
    }

    FindFrame(npc, frameHeight) {
        const s = CalamityNPCState.Get(npc), grounded = this.IsGrounded(npc);
        let frame = 0;
        if (Number(s.mode || 0) === 4)
            frame = 4;
        else if (!grounded)
            frame = Number(npc.velocity.Y) < 0 ? 2 : 3;
        else if (Number(s.jumpTimer || 0) > this.JumpGate() - 25)
            frame = 4;
        else
            frame = (Math.floor(Number(Terraria.Main.GameUpdateCount || 0) / 8) & 1);
        const r = npc.frame;
        r.Y = Math.max(0, Math.min(5, frame)) * frameHeight;
        npc.frame = r;
    }

    IsGrounded(npc) {
        // Terraria resolves a real floor landing by zeroing vertical velocity. In this TLPro
        // runtime npc.collideY is not reliable for these custom NPCs, which previously kept
        // every Paladin in the airborne branch and made it slide across the floor.
        // noTileCollide stays true while rising, so the extra guard avoids mistaking the jump
        // apex or a ceiling impact for a landing without performing any tile scan.
        const velocityY = Number(npc.velocity.Y);
        return Number.isFinite(velocityY) && Math.abs(velocityY) < 0.05 && npc.noTileCollide !== true;
    }

    JumpGate() {
        if (this.split)
            return this.crimson ? 35 : 40;
        return this.crimson ? 50 : 60;
    }

    AttackGate() {
        if (this.split)
            return this.crimson ? 180 : 210;
        return this.crimson ? 360 : 420;
    }

    PreAI(npc) {
        const core = FindCore();
        if (!core || !core.active) {
            npc.damage = 0;
            if (Number(npc.timeLeft) > 30)
                npc.timeLeft = 30;
            npc.noGravity = false;
            npc.noTileCollide = false;
            return false;
        }
        const player = TargetPlayer(npc), s = CalamityNPCState.Get(npc);
        if (!player) {
            npc.damage = 0;
            if (Number(npc.timeLeft) > 30)
                npc.timeLeft = 30;
            return false;
        }
        if (Number(npc.timeLeft) < 1800)
            npc.timeLeft = 1800;

        const ratio = Math.max(0, Number(npc.life) / Math.max(1, Number(npc.lifeMax)));
        const otherAlive = FamilyAlive(this.crimson ? 'ebon' : 'crim');
        const enraged = !otherAlive;
        const possessed = Number(s.possessedTicks || 0) > 0;
        if (possessed)
            s.possessedTicks = Number(s.possessedTicks) - 1;
        else
            s.possessionHost = false;
        const baseDefense = Number(npc.defDefense || (this.split ? (this.crimson ? 10 : 8) : (this.crimson ? 12 : 10)));
        const baseDamage = Number(npc.defDamage || (this.split ? 36 : (this.crimson ? 42 : 40)));
        npc.defense = baseDefense + (possessed ? (this.split ? 20 : 24) : ((!possessed && enraged) ? baseDefense : 0));
        const attackDamage = baseDamage + (possessed ? (this.split ? 18 : 25) : 0);

        const worldScale = IsGoodWorld() ? 0.8 : 1;
        const scale = (this.split ? 0.8 : 1.1) * (0.75 + ratio * 0.5) * worldScale;
        if (Math.abs(Number(npc.scale) - scale) > 0.015)
            resizeAtBottom(npc, 150, 92, scale);

        if (!this.split && IsExpert() && ratio <= 0.5 && !s.splitDone) {
            this.SplitPaladin(npc, s);
            return false;
        }
        this.SpawnMinionsAtThresholds(npc, s, ratio);

        const distance = Distance(npc.Center, Terraria.PlayerCenter(player));
        const canSee = (Number(Terraria.Main.GameUpdateCount || 0) + Number(npc.whoAmI)) % 12 !== 0 ? true : CanSee(npc, player);
        if (!canSee || distance > 2400)
            s.lostSight = Number(s.lostSight || 0) + (IsDeath() || possessed ? 3 : 2);
        else
            s.lostSight = Number(s.lostSight || 0) + 1;

        if (Number(s.mode || 0) === 0 && Number(s.lostSight || 0) >= 720 && this.IsGrounded(npc)) {
            s.mode = 4;
            s.modeTimer = 0;
            s.lostSight = 0;
        }
        if (distance > 2400 && Number(s.mode || 0) === 0) {
            s.mode = 5;
            s.modeTimer = 0;
        }

        switch (Number(s.mode || 0)) {
            case 1:
                this.ShootState(npc, player, s, attackDamage, possessed, enraged);
                break;
            case 2:
                this.SlamState(npc, player, s, attackDamage, possessed, enraged);
                break;
            case 3:
                this.MultiJumpState(npc, player, s, attackDamage, possessed);
                break;
            case 4:
                this.TeleportState(npc, player, s);
                break;
            case 5:
                this.PhaseChaseState(npc, player, s, attackDamage);
                break;
            default:
                this.NormalState(npc, player, s, ratio, attackDamage, possessed, enraged);
                break;
        }

        npc.direction = Number(npc.Center.X) < Number(Terraria.PlayerCenterX(player)) ? 1 : -1;
        npc.spriteDirection = npc.direction;
        return false;
    }

    SplitPaladin(npc, s) {
        s.splitDone = true;
        const type = this.crimson ? GetSlimeTypes().splitCrim : GetSlimeTypes().splitEbon;
        if (type > 0 && Terraria.Main.netMode !== 1) {
            const count = Terraria.Main.zenithWorld === true ? 3 : 2;
            const spawned = [];
            for (let i = 0; i < count; i++) {
                const x = Number(npc.Center.X) + (i - (count - 1) * 0.5) * 60;
                const y = Number(npc.Bottom.Y) - 20 - (i === 2 ? 30 : 0);
                // Possession is transferred to only one child below. Seeding every child would
                // duplicate the Core's single-host buff when the possessed Paladin splits.
                const idx = SpawnNPC(type, x, y, { inheritedPossession: 0 });
                if (idx >= 0) {
                    Terraria.Main.npc[idx].velocity = Vector2.new((i - (count - 1) * 0.5) * 5, -6);
                    spawned.push(idx);
                }
            }
            if (s.possessionHost === true && Number(s.possessedTicks || 0) > 0 && spawned.length) {
                const hostIndex = spawned[0];
                const hostState = CalamityNPCState.Get(Terraria.Main.npc[hostIndex]);
                hostState.possessedTicks = Number(s.possessedTicks || 0);
                hostState.possessionHost = true;
                const core = FindCore();
                if (core && core.active) {
                    const coreState = CalamityNPCState.Get(core);
                    coreState.possessionHost = hostIndex;
                    core.netUpdate = true;
                }
            }
            if (Terraria.Main.zenithWorld === true) {
                const glob = GetProjectileType(this.crimson ? 'UnstableCrimulanGlob' : 'UnstableEbonianGlob');
                for (let i = 0; i < 18; i++) {
                    const angle = Math.PI * 2 * i / 18;
                    const speed = 8 + Math.random() * 6;
                    SpawnProjectile(glob, npc.Center, Vector2.new(Math.cos(angle) * speed, Math.sin(angle) * speed), 35, 0, 0, 0);
                }
            }
        }
        PlayItemSlot(this.crimson ? 176 : 177, npc.Center, null, 1, 0);
        dustBurst(npc, this.crimson, 32);
        DeactivateNoLoot(npc);
    }

    SpawnMinionsAtThresholds(npc, s, ratio) {
        while (ratio < Number(s.nextSpawnRatio || 0) && Number(s.nextSpawnRatio || 0) > 0.05) {
            if (Terraria.Main.netMode !== 1) {
                const t = GetSlimeTypes();
                const type = this.crimson ? (Chance(3) ? t.crimsonSpawn2 : t.crimsonSpawn) : t.corruptSpawn;
                const idx = SpawnNPC(type, Number(npc.Center.X) + RandInt(-40, 41), Number(npc.Center.Y) + RandInt(-15, 16));
                if (idx >= 0)
                    Terraria.Main.npc[idx].velocity = Vector2.new((Math.random() - 0.5) * 4, -2 - Math.random() * 3);
            }
            s.nextSpawnRatio = Number(s.nextSpawnRatio) - (this.crimson ? 0.15 : 0.20);
        }
    }

    ChooseAttack(s, possessed) {
        let attack;
        if (this.crimson) {
            attack = Number(s.lastAttack || 0) === 2 ? 3 : 2;
        } else {
            const choices = IsRevengeance() || possessed ? [1, 2, 3] : [2, 3];
            const filtered = choices.filter(x => x !== Number(s.lastAttack || 0));
            attack = filtered[Math.floor(Math.random() * filtered.length)];
        }
        s.lastAttack = attack;
        s.mode = attack;
        s.modeTimer = 0;
        s.modeStage = 0;
        s.jumpCount = 0;
    }

    NormalState(npc, player, s, ratio, attackDamage, possessed, enraged) {
        npc.noGravity = false;
        const grounded = this.IsGrounded(npc);
        npc.noTileCollide = !grounded && Number(npc.velocity.Y) < 0;
        if (grounded) {
            npc.damage = 0;
            setVelocity(npc, Number(npc.velocity.X) * 0.8, 0);
            const acceleration = IsRevengeance() ? 1 + (IsDeath() || possessed ? 4 : 2) * (1 - ratio) : 1;
            s.jumpTimer = Number(s.jumpTimer || 0) + acceleration;
            s.attackTimer = Number(s.attackTimer || 0) + acceleration;
            if (s.attackTimer >= this.AttackGate()) {
                s.attackTimer = 0;
                this.ChooseAttack(s, possessed);
                return;
            }
            let gate = this.JumpGate();
            if (IsRevengeance())
                gate -= (this.crimson ? (IsDeath() || possessed ? 45 : 30) : (IsDeath() || possessed ? 60 : 40)) * (1 - ratio);
            if (s.jumpTimer >= Math.max(8, gate)) {
                s.jumpTimer = 0;
                s.jumpCount = Number(s.jumpCount || 0) + 1;
                const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
                const dir = dx < 0 ? -1 : 1;
                const distanceBoost = Math.min(8, Distance(npc.Center, Terraria.PlayerCenter(player)) * 0.005);
                let speedX;
                if (this.crimson)
                    speedX = IsDeath() || possessed ? 10 : (IsRevengeance() ? 9 : (IsExpert() ? 8 : 6));
                else
                    speedX = IsDeath() || possessed ? 8 : (IsRevengeance() ? 7 : (IsExpert() ? 6 : 4));
                const speedY = this.crimson ? 4 : 5;
                const alternate = (Number(s.jumpCount) & 1) === 0 ? 1.25 : 1;
                setVelocity(npc, dir * (speedX * alternate + distanceBoost), -speedY * (Number(npc.position.Y) > Number(Terraria.PlayerPositionY(player)) + 80 ? 1.5 : 1));
                npc.damage = attackDamage;
                npc.noTileCollide = true;
            }
        } else {
            npc.damage = attackDamage;
            let vx = Number(npc.velocity.X) * 0.99;
            if (Math.abs(vx) < 1)
                vx = Number(npc.direction || 1);
            setVelocity(npc, vx, Number(npc.velocity.Y));
            if (Number(npc.velocity.Y) > 0 && Number(npc.Bottom.Y) > Number(Terraria.PlayerPositionY(player)))
                npc.noTileCollide = false;
        }
    }

    ShootState(npc, player, s, attackDamage, possessed, enraged) {
        npc.noGravity = false;
        npc.noTileCollide = false;
        npc.damage = 0;
        if (!this.IsGrounded(npc))
            return;
        setVelocity(npc, Number(npc.velocity.X) * 0.85, 0);
        s.modeTimer = Number(s.modeTimer || 0) + 1;
        if (s.modeTimer < 30)
            return;
        if (this.crimson) {
            fireAimedFan(npc, player, true, this.split ? 3 : 5, 8, Math.PI / 8, 15);
        } else {
            const count = this.split ? (IsDeath() || possessed ? 5 : 3) : (IsDeath() || possessed ? 6 : 4);
            fireAimedFan(npc, player, false, count, 6, IsDeath() || possessed ? Math.PI / 12 : Math.PI / 18, 15);
        }
        PlayItemSlot(174 + RandInt(0, 2), npc.Center, null, 0.85, 0);
        this.ResetMode(s);
    }

    SlamState(npc, player, s, attackDamage, possessed, enraged) {
        npc.noGravity = true;
        npc.noTileCollide = true;
        const stage = Number(s.modeStage || 0);
        if (stage === 0) {
            npc.damage = 0;
            const targetX = Number(Terraria.PlayerCenterX(player));
            const targetY = Number(Terraria.PlayerCenterY(player)) - 350;
            const n = Normalize(targetX - Number(npc.Center.X), targetY - Number(npc.Center.Y), 0, -1);
            const speed = (this.crimson ? 9 : 8) + (IsExpert() ? 1 : 0) + (IsRevengeance() ? 1 : 0) + (IsDeath() || possessed ? 1 : 0);
            setVelocity(npc, (Number(npc.velocity.X) * 5 + n.x * speed) / 6, (Number(npc.velocity.Y) * 5 + n.y * speed) / 6);
            if (Math.abs(Number(npc.Center.X) - targetX) < 40 && Number(npc.Center.Y) < Number(Terraria.PlayerCenterY(player)) - 300) {
                s.modeStage = 1;
                s.modeTimer = 0;
            }
            return;
        }
        if (stage === 1) {
            npc.damage = 0;
            s.modeTimer = Number(s.modeTimer || 0) + 1;
            const n = Normalize(Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X), Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y), 0, 1);
            const speed = this.crimson ? (IsDeath() || possessed ? 10 : (IsRevengeance() ? 9 : (IsExpert() ? 8 : 7))) : (IsDeath() || possessed ? 9 : (IsRevengeance() ? 8 : (IsExpert() ? 7 : 6)));
            setVelocity(npc, (Number(npc.velocity.X) * 4 + n.x * speed) / 5, (Number(npc.velocity.Y) * 4 + n.y * speed) / 5);
            if (s.modeTimer > 12) {
                s.modeStage = 2;
                s.modeTimer = 0;
                setVelocity(npc, n.x * speed, Math.max(8, n.y * speed));
            }
            return;
        }
        npc.damage = attackDamage;
        s.modeTimer = Number(s.modeTimer || 0) + 1;
        const fallLimit = IsDeath() || possessed ? 15 : (IsRevengeance() ? 14 : (IsExpert() ? 13 : 12));
        setVelocity(npc, Number(npc.velocity.X) * 0.99, Math.min(fallLimit, Number(npc.velocity.Y) + 0.5));
        if (Number(npc.Bottom.Y) >= Number(Terraria.PlayerPositionY(player)) || s.modeTimer > 75) {
            npc.damage = 0;
            if (this.crimson) {
                fireFanAngle(npc, true, this.split ? 3 : 5, this.split ? 10 : 12, -Math.PI / 2, Math.PI / 4, 1, 15, false);
            } else {
                fireFanAngle(npc, false, this.split ? 9 : 11, 4, -Math.PI / 2, Math.PI / 2, 0, 15, true);
            }
            if (enraged && IsExpert())
                fireAimedFan(npc, player, this.crimson, 1, this.crimson ? 8 : 4, 0, 15);
            PlayItemSlot(174 + RandInt(0, 2), npc.Center, null, 1, -0.05);
            this.ResetMode(s);
            npc.noGravity = false;
            npc.noTileCollide = false;
        }
    }

    MultiJumpState(npc, player, s, attackDamage, possessed) {
        npc.noGravity = false;
        npc.noTileCollide = Number(npc.velocity.Y) < 0;
        const grounded = this.IsGrounded(npc);
        if (grounded) {
            npc.damage = 0;
            setVelocity(npc, Number(npc.velocity.X) * 0.8, 0);
            s.modeTimer = Number(s.modeTimer || 0) + 1;
            const total = this.crimson ? 3 : 2;
            if (Number(s.jumpCount || 0) >= total) {
                this.ResetMode(s);
                return;
            }
            if (s.modeTimer > 15) {
                s.modeTimer = 0;
                s.jumpCount = Number(s.jumpCount || 0) + 1;
                const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
                const dir = dx < 0 ? -1 : 1;
                const speedX = this.crimson ? (this.split ? 11 : 14) : (this.split ? 9 : 11);
                let vy = this.crimson ? -3 : -6;
                const above = Number(npc.Center.Y) - Number(Terraria.PlayerCenterY(player));
                if (above > 0)
                    vy -= Math.min(10, above / 40 * (this.crimson ? 1.5 : 1.2));
                setVelocity(npc, dir * (speedX + Math.min(8, Distance(npc.Center, Terraria.PlayerCenter(player)) * 0.005)), vy);
                npc.damage = attackDamage;
            }
        } else {
            npc.damage = attackDamage;
            const minimum = this.crimson ? (this.split ? 4 : 4.5) : (this.split ? 5 : 5.5);
            let vx = Number(npc.velocity.X) * 0.98;
            if (Math.abs(vx) < minimum)
                vx = minimum * Number(npc.direction || 1);
            setVelocity(npc, vx, Number(npc.velocity.Y));
            if (Number(npc.velocity.Y) > 0 && Number(npc.Bottom.Y) > Number(Terraria.PlayerPositionY(player)))
                npc.noTileCollide = false;
        }
    }

    TeleportState(npc, player, s) {
        npc.damage = 0;
        npc.noGravity = true;
        npc.noTileCollide = true;
        s.teleportTimer = Number(s.teleportTimer || 0) + 1;
        if (Number(s.modeStage || 0) === 0) {
            setVelocity(npc, Number(npc.velocity.X) * 0.5, 0);
            npc.alpha = Math.min(255, Number(npc.alpha) + 7);
            if (s.teleportTimer >= 35) {
                const direction = Number(Terraria.PlayerDirection(player) || 1);
                const side = direction === 0 ? -1 : -direction;
                npc.position = Vector2.new(Number(Terraria.PlayerCenterX(player)) + side * 800 - npc.width * 0.5, Number(Terraria.PlayerCenterY(player)) - 120 - npc.height);
                s.modeStage = 1;
                s.teleportTimer = 0;
            }
        } else {
            npc.alpha = Math.max(51, Number(npc.alpha) - 10);
            if (s.teleportTimer >= 20) {
                npc.alpha = 51;
                this.ResetMode(s);
            }
        }
    }

    PhaseChaseState(npc, player, s, attackDamage) {
        npc.damage = attackDamage;
        npc.noGravity = true;
        npc.noTileCollide = true;
        const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
        const dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y) - 16;
        const n = Normalize(dx, dy, 0, 1);
        setVelocity(npc, (Number(npc.velocity.X) * 4 + n.x * 12) / 5, (Number(npc.velocity.Y) * 4 + n.y * 12) / 5);
        if (Distance(npc.Center, Terraria.PlayerCenter(player)) < 500) {
            npc.damage = 0;
            this.ResetMode(s);
        }
    }

    ResetMode(s) {
        s.mode = 0;
        s.modeTimer = 0;
        s.modeStage = 0;
        s.jumpCount = 0;
        s.jumpTimer = 0;
        s.attackTimer = 0;
    }

    OnKill(npc) {
        if (!this.split || Terraria.Main.netMode === 1)
            return;
        try {
            NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), npc.width, npc.height, Number(Terraria.ID.ItemID.Gel || 23), RandInt(32, 49), false, -1, true);
        } catch (e) { }
    }

    HitEffect(npc, hitDirection, damage) {
        if (Terraria.Main.netMode !== 2) {
            const color = this.crimson ? Color.Crimson : Color.Lavender;
            for (let i = 0; i < (Number(npc.life) <= 0 ? 24 : 5); i++)
                NewDust(npc.position, npc.width, npc.height, 4, hitDirection, -1, npc.alpha, color, 1);
        }
    }

    OnHitPlayer(npc, player) {
        try {
            const id = Number(Terraria.ID.BuffID.Slimed || 137);
            if (id > 0)
                player.AddBuff(id, 180, true);
        } catch (e) { }
    }
}

export class CrimulanPaladin extends SlimePaladinBase {
    constructor() { super('NPCs/Bosses/SlimeGod/CrimulanPaladin', 'crim', false); }
}
export class EbonianPaladin extends SlimePaladinBase {
    constructor() { super('NPCs/Bosses/SlimeGod/EbonianPaladin', 'ebon', false); }
}
export class SplitCrimulanPaladin extends SlimePaladinBase {
    constructor() { super('NPCs/Bosses/SlimeGod/SplitCrimulanPaladin', 'crim', true); }
}
export class SplitEbonianPaladin extends SlimePaladinBase {
    constructor() { super('NPCs/Bosses/SlimeGod/SplitEbonianPaladin', 'ebon', true); }
}
