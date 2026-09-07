import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { ModeMultiplier, SetNPCVelocity } from './../../../Core/SulphurousSeaEcologyRuntime.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './../../../Core/SulphurousSeaTerrainRuntime.js';

const { Vector2, Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function addBestiary(entry, key) {
    try {
        const text = FlavorTextBestiaryInfoElement.new();
        text._key = ModLocalization.Translate(key);
        entry.Info.Add(text);
    } catch (e) { }
}

function canSpawn(info) {
    if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe)
        return false;
    return SulphurousSeaPreviewRuntime.IsCoastalArea()
        && SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player);
}

function worldModeMultiplier() {
    const m = ModeMultiplier();
    return m >= 2 ? 1.2 : (m >= 1.5 ? 1 : .8);
}

export class Gnasher extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/SulphurousSea/Gnasher';
        this.BestiaryRarityStars = 1;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 5;
    }

    SetDefaults() {
        const npc = this.NPC;
        npc.damage = 25;
        npc.width = 50;
        npc.height = 36;
        npc.defense = 30;
        npc.lifeMax = 50;
        npc.aiStyle = 3;
        this.AIType = 67;
        npc.value = Terraria.Item.buyPrice(0, 0, 0, 60);
        npc.HitSound = Terraria.ID.SoundID.NPCHit50;
        npc.DeathSound = Terraria.ID.SoundID.NPCDeath54;
        npc.knockBackResist = 0;
        npc.noGravity = false;
        npc.noTileCollide = false;
        npc.npcSlots = .8;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.speedLimit = 0;
        state.distance = 0;
        npc.TargetClosest(true);
    }

    SetBestiary(database, entry) {
        addBestiary(entry, 'Bestiary.Gnasher');
    }

    SpawnChance(info) {
        return canSpawn(info) ? .10 : 0;
    }

    PostAI(npc) {
        npc.spriteDirection = Number(npc.direction) > 0 ? -1 : 1;
        if (!(Number(npc.target) >= 0 && Number(npc.target) < 255))
            npc.TargetClosest(true);

        const player = Terraria.Main.player[Number(npc.target)];
        if (!player || !player.active || player.dead)
            return;

        const dx = Number(Terraria.PlayerCenterX(player)) - (Number(npc.position.X) + Number(npc.width) * .5);
        const dy = Number(Terraria.PlayerCenterY(player)) - (Number(npc.position.Y) + Number(npc.height) * .5);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const distanceFactor = Math.min(1.5, distance * .0025);
        let maxVelocity = (Terraria.Main.expertMode === true || Terraria.Main.masterMode === true ? 2.5 : 2.25) - distanceFactor;
        maxVelocity *= worldModeMultiplier();
        maxVelocity = Math.max(.35, maxVelocity);

        const state = CalamityNPCState.Get(npc);
        let vx = Number(npc.velocity.X);
        let vy = Number(npc.velocity.Y);
        if ((vx < -maxVelocity || vx > maxVelocity) && Math.abs(vy) < .01) {
            vx *= .8;
            vy *= .8;
        } else if (Number(npc.direction) === 1 && vx < maxVelocity) {
            vx = Math.min(maxVelocity, vx + 1);
        } else if (Number(npc.direction) === -1 && vx > -maxVelocity) {
            vx = Math.max(-maxVelocity, vx - 1);
        }
        SetNPCVelocity(npc, state, vx, vy);

        state.speedLimit = maxVelocity;
        state.distance = distance;
    }

    FindFrame(npc, frameHeight) {
        npc.frameCounter = (Number(npc.frameCounter) + .15) % 5;
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
        const bile = Number(ModItem.getTypeByName('ContaminatedBile') || 0);
        if (bile > 0)
            loot.Add(ItemDropRule.Common(bile, 5, 1, 1));
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
                dead ? 1.05 : .9
            );
        }
        if (dead)
            CalamityNPCState.Remove(npc);
    }

    OnKill(npc) {
        CalamityNPCState.Remove(npc);
    }
}
