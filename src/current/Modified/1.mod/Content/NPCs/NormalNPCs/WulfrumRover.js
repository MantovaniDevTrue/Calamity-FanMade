import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';

const { Color } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
export class WulfrumRover extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/NormalNPCs/WulfrumRover';
        this.BestiaryRarityStars = 1;
        this.Acceleration = 0.075;
        this.MaxSpeed = 1.45;
        this.Friction = 0.88;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 16;
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = 40;
        this.NPC.height = 40;
        this.NPC.damage = 10;
        this.NPC.defense = 4;
        this.NPC.lifeMax = 40;
        this.NPC.knockBackResist = 0.15;
        this.NPC.value = ModNPC.NPCValue(0, 0, 0, 75);
        this.NPC.noGravity = false;
        this.NPC.noTileCollide = false;
        this.NPC.npcSlots = 0.7;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit4;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath14;
    }

    OnSpawn(npc) {
        CalamityNPCState.Reset(npc);
        npc.TargetClosest(true);
    }

    SetBestiary(database, bestiaryEntry) {
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.Surface);
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Times.DayTime);
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Visuals.Sun);
        const flavor = FlavorTextBestiaryInfoElement.new();
        flavor._key = ModLocalization.Translate('Bestiary.WulfrumRover');
        bestiaryEntry.Info.Add(flavor);
    }

    SpawnChance(info) {
        if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe || !info.Day || !info.AboveSurface)
            return 0;
        if (info.PlayerInTown || info.Dungeon || info.Underworld || SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))
            return 0;
        const amp = Number(ModNPC.getTypeByName('WulfrumAmplifier') || 0);
        const boosted = amp > 0 && Terraria.NPC.AnyNPCs(amp);
        return (info.HardMode ? 0.025 : 0.06) * (boosted ? 5.5 : 1);
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        const supercharged = state.superchargeTimer > 0;
        npc.defense = supercharged ? 13 : 4;
        if (supercharged && state.age % 12 === 0 && Terraria.Main.netMode !== 2) {
            const dust = NewDust(npc.position, npc.width, npc.height, Terraria.ID.DustID.Electric, 0, -0.4, 80, Color.White, 0.65);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
        if (state.retargetTimer <= 0 || npc.target < 0 || npc.target >= 255) {
            npc.TargetClosest(true);
            state.retargetTimer = 30;
        }
        let target = Terraria.Main.player[npc.target];
        if (!target || !target.active || target.dead) {
            npc.TargetClosest(true);
            target = Terraria.Main.player[npc.target];
        }
        const velocity = npc.velocity;
        if (!target || !target.active || target.dead) {
            velocity.X *= 0.94;
            npc.velocity = velocity;
            return false;
        }
        const deltaX = Number(Terraria.PlayerCenterX(target)) - Number(npc.Center.X);
        const deltaY = Number(Terraria.PlayerCenterY(target)) - Number(npc.Center.Y);
        const previousDirection = Number(npc.direction) || state.lastDirection || 1;
        let direction = previousDirection;
        if (deltaX > 6)
            direction = 1;
        else if (deltaX < -6)
            direction = -1;
        npc.direction = direction;
        npc.spriteDirection = -direction;
        state.lastDirection = direction;
        if (Math.abs(deltaX) > 20) {
            velocity.X += this.Acceleration * direction;
            velocity.X = Math.max(-this.MaxSpeed, Math.min(this.MaxSpeed, Number(velocity.X)));
        } else {
            velocity.X *= 0.72;
        }
        const grounded = npc.collideY || Math.abs(Number(velocity.Y)) < 0.05;
        const moved = Math.abs(Number(npc.position.X) - Number(state.lastX));
        if (grounded && Math.abs(deltaX) > 42 && moved < 0.08)
            state.stuckTicks++;
        else
            state.stuckTicks = 0;
        const obstacleJump = npc.collideX && grounded;
        const targetAboveJump = grounded && deltaY < -42 && Math.abs(deltaX) < 110;
        const stuckJump = grounded && state.stuckTicks > 38;
        if (state.jumpCooldown <= 0 && (obstacleJump || targetAboveJump || stuckJump)) {
            velocity.Y = targetAboveJump ? -5.4 : -4.7;
            velocity.X += 0.35 * direction;
            state.jumpCooldown = 28;
            state.stuckTicks = 0;
        }
        if (grounded && !npc.collideX)
            velocity.X *= this.Friction;
        state.lastX = Number(npc.position.X);
        npc.velocity = velocity;
        if (previousDirection !== direction)
            npc.netUpdate = true;
        return false;
    }

    FindFrame(npc, frameHeight) {
        if (npc.IsABestiaryIconDummy)
            npc.spriteDirection = -1;
        else
            npc.spriteDirection = -npc.direction;
        const moving = Math.abs(Number(npc.velocity.X)) > 0.08;
        npc.frameCounter += moving ? 1 + Math.abs(Number(npc.velocity.X)) : 0.4;
        let frame = moving ? Math.floor(npc.frameCounter / 6) % 8 : 0;
        if (CalamityNPCState.Get(npc).superchargeTimer > 0)
            frame += 8;
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
        npc.gfxOffY = -2;
    }

    ModifyNPCLoot(npcLoot) {
        const scrapType = ModItem.getTypeByName('WulfrumMetalScrap');
        const batteryType = ModItem.getTypeByName('WulfrumBattery');
        const roverDriveType = ModItem.getTypeByName('RoverDrive');
        if (scrapType > 0)
            npcLoot.Add(ItemDropRule.Common(scrapType, 1, 1, 2));
        if (batteryType > 0)
            npcLoot.Add(ItemDropRule.Common(batteryType, 14, 1, 1));
        if (roverDriveType > 0)
            npcLoot.Add(ItemDropRule.Common(roverDriveType, 10, 1, 1));
    }

    OnKill(npc) {
        const state = CalamityNPCState.Get(npc);
        if (state.superchargeTimer > 0) {
            const coreType = ModItem.getTypeByName('EnergyCore');
            if (coreType > 0)
                NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), npc.width, npc.height, coreType, 1, false, -1, false);
        }
        const worldState = ModSystem.getByName('CalamityWorldState');
        if (worldState)
            worldState.RecordWulfrumRoverKill();
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const dead = npc.life <= 0;
        const count = dead ? 16 : 4;
        for (let i = 0; i < count; i++) {
            const speedX = (Math.random() - 0.5) * (dead ? 3 : 1) + hitDirection * 0.25;
            const speedY = (Math.random() - 0.5) * (dead ? 3 : 1);
            NewDust(npc.position, npc.width, npc.height, Terraria.ID.DustID.GrassBlades, speedX, speedY, 0, Color.White, dead ? 1.1 : 0.8);
        }
    }
}
