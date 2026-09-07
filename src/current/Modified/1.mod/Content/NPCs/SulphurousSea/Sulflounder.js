import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';
import { WaterAtSpawn, CountNPC, SpawnAquaticNPC, ModeMultiplier, SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';
import { GetAbyssAggroRange, HasAnechoicCoating } from './../../../Core/AbyssAggroRuntime.js';

const { Vector2, Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function addBestiary(entry, key) {
    try {
        const text = FlavorTextBestiaryInfoElement.new();
        text._key = ModLocalization.Translate(key);
        entry.Info.Add(text);
    } catch (e) { }
}

function canSpawn(info, type) {
    if (!info || !info.Player || !info.CommonEnemy)
        return false;
    if (!SulphurousSeaPreviewRuntime.IsCoastalArea() || !SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))
        return false;
    if (!WaterAtSpawn(info))
        return false;
    return true;
}

function modeValues() {
    const m = ModeMultiplier();
    if (m >= 2) return { movement: 2, attack: 3 };
    if (m >= 1.5) return { movement: 1.5, attack: 2 };
    return { movement: 1, attack: 1 };
}

function playerCenter(player) {
    return {
        x: Number(player.position.X) + Number(player.width) * 0.5,
        y: Number(player.position.Y) + Number(player.height) * 0.5
    };
}

function npcCenter(npc) {
    return {
        x: Number(npc.position.X) + Number(npc.width) * 0.5,
        y: Number(npc.position.Y) + Number(npc.height) * 0.5
    };
}

function distanceTo(npc, player) {
    const a = npcCenter(npc);
    const b = playerCenter(player);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return { dx, dy, value: Math.sqrt(dx * dx + dy * dy), npc: a };
}

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}

export class Sulflounder extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SulphurousSea/Sulflounder';
        this.BestiaryRarityStars = 1;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 4;
    }

    SetDefaults() {
        const npc = this.NPC;
        npc.chaseable = false;
        npc.damage = 0;
        npc.width = 42;
        npc.height = 32;
        npc.defense = 15;
        npc.lifeMax = 60;
        npc.aiStyle = -1;
        npc.value = Terraria.Item.buyPrice(0, 0, 0, 80);
        npc.HitSound = Terraria.ID.SoundID.NPCHit50;
        npc.DeathSound = Terraria.ID.SoundID.NPCDeath53;
        npc.knockBackResist = 0.35;
        npc.noGravity = true;
        npc.noTileCollide = false;
        npc.npcSlots = 0.65;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.phase = 0;
        state.revealTicks = 0;
        state.attackTimer = 0;
        state.distance = 9999;
        state.coating = false;
        npc.alpha = 200;
        npc.chaseable = false;
        SetNPCVelocity(npc, state, 0, 0);
        npc.direction = Math.random() < 0.5 ? -1 : 1;
        npc.directionY = Math.random() < 0.5 ? -1 : 1;
        npc.spriteDirection = npc.direction;
        npc.TargetClosest(true);
    }

    SetBestiary(database, entry) {
        addBestiary(entry, 'Bestiary.Sulflounder');
    }

    SpawnChance(info) {
        return canSpawn(info, this.Type) ? 0.20 : 0;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 42, 32);
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        if (!(Number(npc.target) >= 0 && Number(npc.target) < 255))
            npc.TargetClosest(true);

        const player = Terraria.Main.player[Number(npc.target)];
        if (!player || !player.active || player.dead) {
            npc.TargetClosest(true);
            return false;
        }

        const target = distanceTo(npc, player);
        state.distance = target.value;
        state.coating = HasAnechoicCoating(player);
        const phase = Math.floor(Number(state.phase) || 0);

        if (phase === 0) {
            npc.alpha = 200;
            npc.chaseable = false;
            SetNPCVelocity(npc, state, 0, 0);
            const detectionRange = GetAbyssAggroRange(player, 170);
            if (npc.justHit || target.value < detectionRange) {
                state.phase = 1;
                state.revealTicks = 16;
                npc.netUpdate = true;
            }
            return false;
        }

        if (phase === 1) {
            npc.chaseable = false;
            npc.alpha = Math.max(0, Number(npc.alpha) - 13);
            state.revealTicks = Math.max(0, Number(state.revealTicks || 0) - 1);
            if (Number(state.revealTicks) <= 0 || Number(npc.alpha) <= 0) {
                state.phase = 2;
                npc.alpha = 0;
                npc.chaseable = true;
                npc.direction = target.dx >= 0 ? 1 : -1;
                SetNPCVelocity(npc, state, Number(npc.direction) * 2, 0);
                npc.netUpdate = true;
            }
            return false;
        }

        npc.alpha = 0;
        npc.chaseable = true;
        this.ActiveSwimmingAI(npc, player, state, target);
        return false;
    }

    ActiveSwimmingAI(npc, player, state, target) {
        if (!npc.wet) {
            let vx = Number(npc.velocity.X) * 0.94;
            if (Math.abs(vx) < 0.2)
                vx = 0;
            const vy = Math.min(12, Number(npc.velocity.Y) + 0.4);
            SetNPCVelocity(npc, state, vx, vy);
            npc.rotation = clamp(vy * (Number(npc.direction) || 1) * 0.1, -0.2, 0.2);
            return;
        }

        let direction = target.dx >= 0 ? 1 : -1;
        let directionY = target.dy >= 0 ? 1 : -1;
        let vx = Number(npc.velocity.X);
        let vy = Number(npc.velocity.Y);

        if (npc.collideX) {
            direction *= -1;
            vx *= -0.7;
        }
        if (npc.collideY) {
            directionY *= -1;
            vy *= -0.7;
        }

        const mode = modeValues();
        vx += direction * 0.1 * mode.movement;
        vy += directionY * 0.1 * mode.movement;
        vx = clamp(vx, -2 * mode.movement, 2 * mode.movement);
        vy = clamp(vy, -1 * mode.movement, 1 * mode.movement);

        npc.direction = direction;
        npc.directionY = directionY;
        npc.spriteDirection = direction;
        SetNPCVelocity(npc, state, vx, vy);
        npc.rotation = clamp(vy * direction * 0.1, -0.2, 0.2);

        if (target.value >= 350)
            return;

        state.attackTimer = Number(state.attackTimer || 0) + mode.attack;
        if (Number(state.attackTimer) < 180)
            return;

        state.attackTimer = 0;
        if (Terraria.Main.netMode === 1)
            return;

        const projectileType = Number(ModProjectile.getTypeByName('SulphuricAcidMist') || 0);
        if (!(projectileType > 0))
            return;

        const spreadX = (Math.random() * 40) - 20;
        const spreadY = (Math.random() * 40) - 20;
        const aimX = target.dx + spreadX;
        const aimY = target.dy + spreadY;
        const length = Math.max(1, Math.sqrt(aimX * aimX + aimY * aimY));
        const speed = 4 / length;
        const damage = Terraria.Main.masterMode ? 21 : (Terraria.Main.expertMode ? 25 : 35);

        NewProjectile(
            null,
            target.npc.x + direction * 10,
            target.npc.y,
            aimX * speed,
            aimY * speed,
            projectileType,
            damage,
            0,
            Terraria.Main.myPlayer,
            0,
            0,
            0,
            null
        );
    }

    FindFrame(npc, frameHeight) {
        if (!npc.wet) {
            npc.frameCounter = 0;
            const still = npc.frame;
            still.Y = 0;
            npc.frame = still;
            return;
        }

        npc.frameCounter = (Number(npc.frameCounter) + 0.15) % 4;
        const frame = Math.floor(Number(npc.frameCounter));
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) <= 0)
            return;
        const irradiated = Number(ModBuff.getTypeByName('Irradiated') || 0);
        if (!(irradiated > 0))
            return;
        try {
            player.AddBuff(irradiated, 120, true);
        } catch (e) {
            try {
                player.AddBuff(irradiated, 120, false);
            } catch (ignored) { }
        }
    }

    ModifyNPCLoot(loot) {
        const coating = Number(ModItem.getTypeByName('AnechoicCoating') || 0);
        if (coating > 0)
            loot.Add(ItemDropRule.Common(coating, 2, 1, 1));
    }

    HitEffect(npc, hitDirection) {
        const dead = Number(npc.life) <= 0;
        const count = dead ? 15 : 3;
        for (let i = 0; i < count; i++) {
            NewDust(
                Vector2.new(Number(npc.position.X), Number(npc.position.Y)),
                Number(npc.width),
                Number(npc.height),
                5,
                Number(hitDirection || 0),
                -1,
                0,
                Color.White,
                dead ? 1.05 : 0.9
            );
        }
        if (dead)
            CalamityNPCState.Remove(npc);
    }

    OnKill(npc) {
        CalamityNPCState.Remove(npc);
    }
}
