import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';
import { WaterAtSpawn, InAbyssLayer1Spawn, CountNPC, SpawnAquaticNPC, SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';

const { Vector2, Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const SolidTiles = Terraria.Collision['bool SolidTiles(Vector2 position, int width, int height)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function solidAround(npc, state) {
    // The original port did SolidTiles + WetCollision every frame for every
    // urchin. In Sulphur this can be a dozen NPCs at once, so cache the solid
    // probe for four frames. Movement/collision state remains frame-accurate.
    const tick = (Number(state.solidProbeTick || 0) + 1);
    state.solidProbeTick = tick;
    if (tick > 1 && (tick & 3) !== 0)
        return state.attached === true;
    try {
        let pos = state.solidProbePosition;
        if (!pos) { pos = Vector2.new(); state.solidProbePosition = pos; }
        pos.X = Number(npc.position.X) - 5; pos.Y = Number(npc.position.Y) - 5;
        return SolidTiles(
            pos,
            Math.max(1, Number(npc.width) + 10),
            Math.max(1, Number(npc.height) + 10)
        ) === true;
    } catch (e) {
        return state.attached === true;
    }
}

function inWater(npc) {
    // npc.wet is already maintained by vanilla collision code; avoid a second
    // native WetCollision call plus a fresh Vector2 allocation every frame.
    return npc.wet === true;
}

function addBestiary(entry, key) {
    try {
        const text = FlavorTextBestiaryInfoElement.new();
        text._key = ModLocalization.Translate(key);
        entry.Info.Add(text);
    } catch (e) { }
}


function canSpawn(info, type) {
    if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe)
        return false;
    const inSulphur = SulphurousSeaPreviewRuntime.IsCoastalArea() && SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player);
    const inAbyss1 = InAbyssLayer1Spawn(info);
    if (!inSulphur && !inAbyss1)
        return false;
    if (!WaterAtSpawn(info))
        return false;
    return CountNPC(type) < 12;
}

export class AquaticUrchin extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SulphurousSea/AquaticUrchin';
        this.BestiaryRarityStars = 1;
    }

    SetDefaults() {
        const npc = this.NPC;
        npc.aiStyle = -1;
        npc.damage = Terraria.Main.hardMode ? 50 : 25;
        npc.width = 20;
        npc.height = 20;
        npc.defense = 10;
        npc.lifeMax = Terraria.Main.hardMode ? 300 : 100;
        npc.knockBackResist = 0.8;
        npc.value = Terraria.Item.buyPrice(0, 0, 3, 0);
        npc.HitSound = Terraria.ID.SoundID.NPCHit1;
        npc.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        npc.noGravity = true;
        npc.noTileCollide = false;
        npc.behindTiles = true;
        npc.npcSlots = 0.3333;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.mode = 0;
        state.edge = 1;
        state.lastX = Number(npc.position.X);
        state.lastY = Number(npc.position.Y);
        state.attached = false;
        state.wasAttached = false;
        state.turns = 0;
        npc.direction = Math.random() < 0.5 ? -1 : 1;
        npc.directionY = Math.random() < 0.5 ? -1 : 1;
        npc.spriteDirection = npc.direction;
    }

    SetBestiary(database, entry) {
        addBestiary(entry, 'Bestiary.AquaticUrchin');
    }

    SpawnChance(info) {
        return canSpawn(info, this.Type) ? 1.0 : 0;
    }

    SpawnNPC(spawnX, spawnY) {
        return SpawnAquaticNPC(this.Type, spawnX, spawnY, 20, 20);
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        const x = Number(npc.position.X);
        const y = Number(npc.position.Y);
        const stoppedX = Math.abs(x - Number(state.lastX)) < 0.01;
        const stoppedY = Math.abs(y - Number(state.lastY)) < 0.01;
        const attached = solidAround(npc, state);
        const wet = inWater(npc);
        let vx = Number(npc.velocity.X);
        let vy = Number(npc.velocity.Y);

        state.lastX = x;
        state.lastY = y;
        state.attached = attached;
        npc.noGravity = attached;

        if (!attached) {
            state.wasAttached = false;
            vx *= wet ? 0.96 : 0.98;
            vy = Math.min(wet ? 2.2 : 7, vy + (wet ? 0.04 : 0.28));
            SetNPCVelocity(npc, state, vx, vy);
            npc.rotation += vx * 0.025;
            return false;
        }

        const speed = 0.22;
        if (!state.wasAttached) {
            state.wasAttached = true;
            SetNPCVelocity(npc, state, (Number(npc.direction) || 1) * speed, (Number(npc.directionY) || 1) * speed);
            return false;
        }

        let mode = Number(state.mode) || 0;
        let edge = Number(state.edge) || 1;
        let direction = Number(npc.direction) || 1;
        let directionY = Number(npc.directionY) || 1;

        if (mode === 0) {
            npc.rotation += direction * directionY * 0.006;
            if (stoppedY)
                edge = 2;
            if (!stoppedY && edge === 2) {
                direction *= -1;
                mode = 1;
                edge = 1;
                state.turns = Number(state.turns || 0) + 1;
            }
            if (stoppedX) {
                directionY *= -1;
                mode = 1;
                state.turns = Number(state.turns || 0) + 1;
            }
        } else {
            npc.rotation -= direction * directionY * 0.006;
            if (stoppedX)
                edge = 2;
            if (!stoppedX && edge === 2) {
                directionY *= -1;
                mode = 0;
                edge = 1;
                state.turns = Number(state.turns || 0) + 1;
            }
            if (stoppedY) {
                direction *= -1;
                mode = 0;
                state.turns = Number(state.turns || 0) + 1;
            }
        }

        state.mode = mode;
        state.edge = edge;
        npc.direction = direction;
        npc.directionY = directionY;
        npc.spriteDirection = direction;
        vx = direction * speed;
        vy = directionY * speed;
        SetNPCVelocity(npc, state, vx, vy);
        return false;
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) <= 0)
            return;
        const irradiated = Number(ModBuff.getTypeByName('Irradiated') || 0);
        if (irradiated <= 0)
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
        const stinger = Number(ModItem.getTypeByName('UrchinStinger') || 0);
        if (stinger > 0)
            loot.Add(ItemDropRule.Common(stinger, 15, 1, 1));
    }

    HitEffect(npc, hitDirection) {
        const dead = Number(npc.life) <= 0;
        const count = dead ? 20 : 5;
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
