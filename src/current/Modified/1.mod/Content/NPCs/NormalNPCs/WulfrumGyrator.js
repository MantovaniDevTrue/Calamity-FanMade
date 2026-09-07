import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';

const { Color, Vector2 } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
const SolidTiles = Terraria.Collision['bool SolidTiles(Vector2 position, int width, int height)'];
export class WulfrumGyrator extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/NormalNPCs/WulfrumGyrator';
        this.BestiaryRarityStars = 1;
        this.SearchDistance = 500;
        this.ClosePassDistance = 90;
        this.MaxSpeed = 3.7;
        this.WanderSpeed = 1.55;
        this.Acceleration = 0.045;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 10;
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = 40;
        this.NPC.height = 40;
        this.NPC.damage = 15;
        this.NPC.defense = 5;
        this.NPC.lifeMax = 25;
        this.NPC.knockBackResist = 0.15;
        this.NPC.value = ModNPC.NPCValue(0, 0, 0, 75);
        this.NPC.noGravity = false;
        this.NPC.noTileCollide = false;
        this.NPC.npcSlots = 0.7;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit4;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath14;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.lastDirection = Math.random() < 0.5 ? -1 : 1;
        state.decisionTimer = 70 + Math.floor(Math.random() * 80);
        state.attackTimer = 35 + Math.floor(Math.random() * 50);
        npc.direction = state.lastDirection;
        npc.spriteDirection = state.lastDirection;
        npc.TargetClosest(true);
    }

    SetBestiary(database, bestiaryEntry) {
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.Surface);
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Times.DayTime);
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Visuals.Sun);
        const flavor = FlavorTextBestiaryInfoElement.new();
        flavor._key = ModLocalization.Translate('Bestiary.WulfrumGyrator');
        bestiaryEntry.Info.Add(flavor);
    }

    SpawnChance(info) {
        if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe || !info.Day || !info.AboveSurface)
            return 0;
        if (info.PlayerInTown || info.Dungeon || info.Underworld || SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))
            return 0;
        const amp = Number(ModNPC.getTypeByName('WulfrumAmplifier') || 0);
        const boosted = amp > 0 && Terraria.NPC.AnyNPCs(amp);
        return (info.HardMode ? 0.02 : 0.05) * (boosted ? 5.5 : 1);
    }

    IsSolid(x, y, width, height) {
        try {
            return SolidTiles(Vector2.new(x, y), width, height) === true;
        } catch (e) {
            return false;
        }
    }

    IsGrounded(npc) {
        if (npc.collideY)
            return true;
        return this.IsSolid(Number(npc.position.X) + 5, Number(npc.position.Y) + Number(npc.height), Math.max(4, Number(npc.width) - 10), 5);
    }

    HasGroundAhead(npc, direction) {
        const x = direction > 0
            ? Number(npc.position.X) + Number(npc.width) + 2
            : Number(npc.position.X) - 10;
        const y = Number(npc.position.Y) + Number(npc.height) + 2;
        return this.IsSolid(x, y, 8, 24);
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        const supercharged = state.superchargeTimer > 0;
        if (supercharged && state.age % 10 === 0 && Terraria.Main.netMode !== 2) {
            const dust = NewDust(npc.position, npc.width, npc.height, Terraria.ID.DustID.Electric, 0, -0.5, 80, Color.White, 0.7);
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
        const grounded = this.IsGrounded(npc);
        let direction = Number(state.lastDirection) || Number(npc.direction) || 1;
        let targetSpeed = this.WanderSpeed * direction;
        let deltaX = 9999;
        let deltaY = 0;
        if (target && target.active && !target.dead) {
            deltaX = Number(Terraria.PlayerCenterX(target)) - Number(npc.Center.X);
            deltaY = Number(Terraria.PlayerCenterY(target)) - Number(npc.Center.Y);
            const distanceX = Math.abs(deltaX);
            if (distanceX < this.SearchDistance && distanceX > this.ClosePassDistance) {
                direction = deltaX < 0 ? -1 : 1;
                targetSpeed = this.MaxSpeed * direction;
            } else if (distanceX <= this.ClosePassDistance) {
                targetSpeed = this.MaxSpeed * 0.82 * direction;
            }
        }
        if (state.decisionTimer <= 0) {
            if (Math.abs(deltaX) >= this.SearchDistance && Math.random() < 0.55)
                direction *= -1;
            state.decisionTimer = 70 + Math.floor(Math.random() * 100);
        }
        npc.direction = direction;
        npc.spriteDirection = direction;
        state.lastDirection = direction;
        targetSpeed = Math.abs(deltaX) < this.SearchDistance
            ? (Math.abs(deltaX) <= this.ClosePassDistance ? this.MaxSpeed * 0.82 * direction : this.MaxSpeed * direction)
            : this.WanderSpeed * direction;
        const activeMaxSpeed = this.MaxSpeed * (supercharged ? 1.25 : 1);
        const activeAcceleration = this.Acceleration * (supercharged ? 1.6 : 1);
        targetSpeed = Math.sign(targetSpeed || direction) * Math.min(Math.abs(targetSpeed) * (supercharged ? 1.25 : 1), activeMaxSpeed);
        velocity.X += (targetSpeed - Number(velocity.X)) * activeAcceleration;
        velocity.X = Math.max(-activeMaxSpeed, Math.min(activeMaxSpeed, Number(velocity.X)));
        const moved = Math.abs(Number(npc.position.X) - Number(state.lastX));
        if (grounded && Math.abs(Number(velocity.X)) > 0.35 && moved < 0.06)
            state.stuckTicks++;
        else
            state.stuckTicks = 0;
        const holeAhead = grounded && !this.HasGroundAhead(npc, direction);
        const obstacleAhead = grounded && npc.collideX;
        const targetAbove = grounded && deltaY < -55 && Math.abs(deltaX) < 210;
        const stuck = grounded && state.stuckTicks > 32;
        const periodicHop = grounded && state.attackTimer <= 0;
        if (state.jumpCooldown <= 0 && (holeAhead || obstacleAhead || targetAbove || stuck || periodicHop)) {
            let jumpSpeed = -5.4 - Math.random() * 1.25;
            if (targetAbove)
                jumpSpeed = -7.2;
            else if (holeAhead || obstacleAhead)
                jumpSpeed = -6.25;
            if (supercharged)
                jumpSpeed *= 1.35;
            velocity.Y = jumpSpeed;
            velocity.X += direction * (periodicHop ? 0.85 : 0.5);
            velocity.X = Math.max(-activeMaxSpeed, Math.min(activeMaxSpeed, Number(velocity.X)));
            state.jumpCooldown = 24;
            state.attackTimer = 45 + Math.floor(Math.random() * 65);
            state.stuckTicks = 0;
            npc.netUpdate = true;
        }
        state.lastX = Number(npc.position.X);
        npc.velocity = velocity;
        return false;
    }

    FindFrame(npc, frameHeight) {
        const state = CalamityNPCState.Get(npc);
        npc.frameCounter += 1 + Math.abs(Number(npc.velocity.X)) * 0.3;
        let frame = Math.floor(Number(npc.frameCounter) / 5) % 5;
        if (state.superchargeTimer > 0)
            frame += 5;
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
        npc.gfxOffY = -1;
    }

    ModifyNPCLoot(npcLoot) {
        const scrapType = ModItem.getTypeByName('WulfrumMetalScrap');
        const batteryType = ModItem.getTypeByName('WulfrumBattery');
        if (scrapType > 0)
            npcLoot.Add(ItemDropRule.Common(scrapType, 1, 1, 2));
        if (batteryType > 0)
            npcLoot.Add(ItemDropRule.Common(batteryType, 14, 1, 1));
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
            worldState.RecordWulfrumGyratorKill();
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const dead = npc.life <= 0;
        const count = dead ? 20 : 5;
        for (let i = 0; i < count; i++) {
            const speedX = (Math.random() - 0.5) * (dead ? 3.2 : 1.1) + hitDirection * 0.25;
            const speedY = (Math.random() - 0.5) * (dead ? 3.2 : 1.1);
            NewDust(npc.position, npc.width, npc.height, Terraria.ID.DustID.GrassBlades, speedX, speedY, 0, Color.White, dead ? 1.1 : 0.8);
        }
    }
}
