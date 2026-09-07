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
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
export class WulfrumDrone extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/NormalNPCs/WulfrumDrone';
        this.BestiaryRarityStars = 1;
        this.SearchOffsetX = 300;
        this.SearchOffsetY = -90;
        this.SearchSpeed = 6;
        this.ChargeSpeed = 6;
        this.SearchDelay = 40;
        this.TotalChargeTime = 75;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 6;
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = 32;
        this.NPC.height = 32;
        this.NPC.damage = 16;
        this.NPC.defense = 4;
        this.NPC.lifeMax = 25;
        this.NPC.knockBackResist = 0.35;
        this.NPC.value = ModNPC.NPCValue(0, 0, 0, 80);
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.npcSlots = 0.7;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit4;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath14;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.phase = 0; // 0 = searching, 1 = charging
        state.subphaseTimer = 0;
        state.flyAwayTimer = 0;
        state.lastDirection = Math.random() < 0.5 ? -1 : 1;
        npc.direction = state.lastDirection;
        npc.TargetClosest(false);
    }

    SetBestiary(database, bestiaryEntry) {
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.Surface);
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Times.DayTime);
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Visuals.Sun);
        const flavor = FlavorTextBestiaryInfoElement.new();
        flavor._key = ModLocalization.Translate('Bestiary.WulfrumDrone');
        bestiaryEntry.Info.Add(flavor);
    }

    SpawnChance(info) {
        if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe || !info.Day || !info.AboveSurface)
            return 0;
        if (info.PlayerInTown || info.Dungeon || info.Underworld || SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))
            return 0;
        const amp = Number(ModNPC.getTypeByName('WulfrumAmplifier') || 0);
        const boosted = amp > 0 && Terraria.NPC.AnyNPCs(amp);
        return (info.HardMode ? 0.022 : 0.055) * (boosted ? 5.5 : 1);
    }

    Normalize(dx, dy, fallbackX = 0, fallbackY = -1) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (!(length > 0.0001))
            return { x: fallbackX, y: fallbackY };
        return { x: dx / length, y: dy / length };
    }

    MoveToward(npc, destinationX, destinationY, speed, responsiveness) {
        const dx = destinationX - Number(npc.Center.X);
        const dy = destinationY - Number(npc.Center.Y);
        const direction = this.Normalize(dx, dy, 0, -1);
        const velocity = npc.velocity;
        velocity.X += (direction.x * speed - Number(velocity.X)) * responsiveness;
        velocity.Y += (direction.y * speed - Number(velocity.Y)) * responsiveness;
        npc.velocity = velocity;
        return dx * dx + dy * dy;
    }

    ShootLaser(npc, player) {
        if (Terraria.Main.netMode === 1)
            return;
        const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
        const dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
        const direction = this.Normalize(dx, dy, 0, 1);
        const speed = 6;
        const damage = Terraria.Main.masterMode ? 8 : Terraria.Main.expertMode ? 9 : 12;
        const saucerLaser = Number(Terraria.ID.ProjectileID.SaucerLaser);
        const fallbackLaser = Number(Terraria.ID.ProjectileID.DeathLaser);
        const laserType = saucerLaser > 0 ? saucerLaser : fallbackLaser;
        if (!(laserType > 0))
            return;
        const index = NewProjectile(null, Number(npc.Center.X) + direction.x * 6, Number(npc.Center.Y) + direction.y * 6, direction.x * speed, direction.y * speed, laserType, damage, 0, Terraria.Main.myPlayer, 0, 0, 0, null);
        if (index >= 0 && index < 1000) {
            const projectile = Terraria.Main.projectile[index];
            if (projectile) {
                projectile.hostile = true;
                projectile.friendly = false;
                projectile.netUpdate = true;
            }
        }
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        const supercharged = state.superchargeTimer > 0;
        if (state.retargetTimer <= 0 || npc.target < 0 || npc.target >= 255) {
            npc.TargetClosest(false);
            state.retargetTimer = 30;
        }
        let player = Terraria.Main.player[npc.target];
        if (!player || !player.active || player.dead) {
            npc.TargetClosest(false);
            player = Terraria.Main.player[npc.target];
        }
        const velocity = npc.velocity;
        if (!player || !player.active || player.dead) {
            npc.damage = 0;
            velocity.X *= 0.96;
            velocity.Y = Math.max(-8, Number(velocity.Y) - 0.08);
            npc.velocity = velocity;
            return false;
        }
        const playerDX = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
        const playerDY = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
        const playerDistanceSq = playerDX * playerDX + playerDY * playerDY;
        if (playerDistanceSq > 960 * 960) {
            npc.damage = 0;
            state.flyAwayTimer++;
            velocity.X *= 0.96;
            if (state.flyAwayTimer > 180)
                velocity.Y += (-8 - Number(velocity.Y)) * 0.1;
            else
                velocity.Y *= 0.96;
            npc.velocity = velocity;
            npc.rotation = Number(npc.rotation) * 0.9;
            return false;
        }
        state.flyAwayTimer = Math.max(0, Number(state.flyAwayTimer) - 3);
        npc.noGravity = true;
        npc.noTileCollide = true;
        if (state.phase === 0) {
            npc.damage = 0;
            const direction = Number(state.lastDirection) || 1;
            const destinationX = Number(Terraria.PlayerCenterX(player)) + this.SearchOffsetX * direction;
            const destinationY = Number(Terraria.PlayerCenterY(player)) + this.SearchOffsetY;
            const distanceSq = this.MoveToward(npc, destinationX, destinationY, this.SearchSpeed, 0.1);
            if (distanceSq < 40 * 40) {
                const slowingVelocity = npc.velocity;
                slowingVelocity.X *= 0.95;
                slowingVelocity.Y *= 0.95;
                npc.velocity = slowingVelocity;
                state.subphaseTimer++;
                if (state.subphaseTimer >= this.SearchDelay) {
                    state.phase = 1;
                    state.subphaseTimer = 0;
                    npc.netUpdate = true;
                }
            } else {
                state.subphaseTimer = 0;
            }
        } else {
            npc.damage = 16;
            if (state.subphaseTimer < 25) {
                this.MoveToward(npc, Number(Terraria.PlayerCenterX(player)), Number(Terraria.PlayerCenterY(player)), this.ChargeSpeed, 0.1);
            }
            if (supercharged && state.subphaseTimer % 30 === 29) {
                this.ShootLaser(npc, player);
            }
            state.subphaseTimer++;
            if (state.subphaseTimer > this.TotalChargeTime) {
                state.phase = 0;
                state.subphaseTimer = 0;
                state.lastDirection = -(Number(state.lastDirection) || 1);
                npc.netUpdate = true;
            }
        }
        const currentVelocity = npc.velocity;
        if (Math.abs(Number(currentVelocity.X)) > 0.05) {
            npc.spriteDirection = Number(currentVelocity.X) < 0 ? 1 : -1;
        } else {
            npc.spriteDirection = Number(state.lastDirection) < 0 ? 1 : -1;
        }
        npc.direction = -npc.spriteDirection;
        npc.rotation = Number(currentVelocity.X) / 25;
        if (Terraria.Main.netMode !== 2 && state.age % (supercharged ? 6 : 10) === 0) {
            const dustType = supercharged ? Terraria.ID.DustID.Electric : Terraria.ID.DustID.Vortex;
            const dust = NewDust(npc.position, npc.width, npc.height, dustType, 0, 0.35, 80, Color.White, supercharged ? 0.7 : 0.6);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
        return false;
    }

    FindFrame(npc, frameHeight) {
        const state = CalamityNPCState.Get(npc);
        npc.frameCounter++;
        let frame = Math.floor(Number(npc.frameCounter) / 5) % 3;
        if (state.superchargeTimer > 0)
            frame += 3;
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
    }

    ModifyNPCLoot(npcLoot) {
        const scrapType = ModItem.getTypeByName('WulfrumMetalScrap');
        const batteryType = ModItem.getTypeByName('WulfrumBattery');
        if (scrapType > 0)
            npcLoot.Add(ItemDropRule.Common(scrapType, 1, 1, 3));
        if (batteryType > 0)
            npcLoot.Add(ItemDropRule.Common(batteryType, 14, 1, 1));
    }

    OnKill(npc) {
        const state = CalamityNPCState.Get(npc);
        if (state.superchargeTimer > 0) {
            const coreType = ModItem.getTypeByName('EnergyCore');
            if (coreType > 0) {
                NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), npc.width, npc.height, coreType, 1, false, -1, false);
            }
        }
        const worldState = ModSystem.getByName('CalamityWorldState');
        if (worldState && typeof worldState.RecordWulfrumDroneKill === 'function') {
            worldState.RecordWulfrumDroneKill();
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const dead = npc.life <= 0;
        const count = dead ? 15 : 3;
        for (let i = 0; i < count; i++) {
            const speedX = (Math.random() - 0.5) * (dead ? 3 : 1) + hitDirection * 0.25;
            const speedY = (Math.random() - 0.5) * (dead ? 3 : 1);
            NewDust(npc.position, npc.width, npc.height, Terraria.ID.DustID.GrassBlades, speedX, speedY, 0, Color.White, dead ? 1.05 : 0.8);
        }
    }
}
