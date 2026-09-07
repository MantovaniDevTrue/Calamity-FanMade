import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModNPC } from './../../../TL/ModNPC.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModSystem } from './../../../TL/ModSystem.js';
import { ModLocalization } from './../../../TL/ModLocalization.js';
import { CalamityNPCState } from './../../../Core/CalamityNPCState.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';
import { SulphurousSeaPreviewRuntime } from './../../../Core/SulphurousSeaPreviewRuntime.js';

const { Color, Vector2 } = Modules;
const { ItemDropRule } = Terraria.GameContent.ItemDropRules;
const { BestiaryDatabaseNPCsPopulator, FlavorTextBestiaryInfoElement } = Terraria.GameContent.Bestiary;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SolidTiles = Terraria.Collision['bool SolidTiles(Vector2 position, int width, int height)'];

export class WulfrumAmplifier extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/NormalNPCs/WulfrumAmplifier';
        this.BestiaryRarityStars = 2;
        this.ChargeRadiusMax = 495;
        this.ActivationRadius = 330.165;
        this.SuperchargeTime = 720;
        this.ChargeTypes = null;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 6;
    }

    SetDefaults() {
        const npc = this.NPC;
        npc.aiStyle = -1;
        npc.width = 44;
        npc.height = 44;
        npc.damage = 0;
        npc.defense = 4;
        npc.lifeMax = Terraria.Main.zenithWorld === true ? 200 : 100;
        npc.knockBackResist = 0;
        npc.value = ModNPC.NPCValue(0, 0, 1, 0);
        npc.noGravity = false;
        npc.noTileCollide = false;
        npc.npcSlots = 1;
        npc.HitSound = Terraria.ID.SoundID.NPCHit4;
        npc.DeathSound = Terraria.ID.SoundID.NPCDeath14;
        if (Terraria.Main.zenithWorld === true)
            npc.scale = 1.5;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.charging = false;
        state.chargeRadius = 0;
        state.lastChargedCount = 0;
        state.nextChargeScan = 0;
        state.reinforcementsSpawned = false;
        state.reinforcementsRequested = 0;
        state.reinforcementsSpawnedCount = 0;
        state.reinforcementAttempts = 0;
        state.chargeScans = 0;
        state.chargeBursts = 0;
        npc.TargetClosest(false);
    }

    SetBestiary(database, bestiaryEntry) {
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Biomes.Surface);
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Times.DayTime);
        bestiaryEntry.Info.Add(BestiaryDatabaseNPCsPopulator.CommonTags.SpawnConditions.Visuals.Sun);
        const flavor = FlavorTextBestiaryInfoElement.new();
        flavor._key = ModLocalization.Translate('Bestiary.WulfrumAmplifier');
        bestiaryEntry.Info.Add(flavor);
    }

    SpawnChance(info) {
        if (!info || !info.Player || !info.CommonEnemy || info.PlayerSafe || !info.Day || !info.AboveSurface)
            return 0;
        if (info.PlayerInTown || info.Dungeon || info.Underworld)
            return 0;
        if (SulphurousSeaPreviewRuntime.ContainsPlayer(info.Player))
            return 0;

        let playerX = Number(Terraria.PlayerCenterX(info.Player));
        if (!Number.isFinite(playerX))
            playerX = Number(info.Player.position.X) || 0;
        const worldWidth = Math.max(1, Number(Terraria.Main.maxTilesX) * 16);
        const centralThird = playerX > worldWidth / 3 && playerX < worldWidth * 2 / 3;
        // Calibrated against the same OverworldDaySlime baseline used by the
        // other Wulfrum enemies. The old port made Amplifiers about 2x rarer
        // than Calamity's 0.06 / 0.15 pre-HM relative weights.
        const baseChance = info.HardMode
            ? (centralThird ? 0.006 : 0.016)
            : (centralThird ? 0.026 : 0.064);
        return baseChance * (Terraria.NPC.AnyNPCs(this.Type) ? 1 : 1.3);
    }

    DistanceSquared(a, b) {
        const dx = Number(a.X) - Number(b.X);
        const dy = Number(a.Y) - Number(b.Y);
        return dx * dx + dy * dy;
    }

    GetChargeTypes() {
        if (!this.ChargeTypes) {
            this.ChargeTypes = {
                drone: Number(ModNPC.getTypeByName('WulfrumDrone') || -1),
                gyrator: Number(ModNPC.getTypeByName('WulfrumGyrator') || -1),
                hover: Number(ModNPC.getTypeByName('WulfrumHovercraft') || -1),
                rover: Number(ModNPC.getTypeByName('WulfrumRover') || -1)
            };
        }
        return this.ChargeTypes;
    }

    IsChargeable(type) {
        const types = this.GetChargeTypes();
        const value = Number(type);
        return value === types.drone || value === types.gyrator || value === types.hover || value === types.rover;
    }

    GetReinforcementCount() {
        if (Terraria.Main.getGoodWorld === true)
            return 4;
        const world = ModSystem.getByName('CalamityWorldState');
        if (world && world.DeathMode === true)
            return 3;
        if (world && world.RevengeanceMode === true)
            return 2;
        return 1;
    }

    PickReinforcementType() {
        const types = this.GetChargeTypes();
        if (Terraria.Main.zenithWorld === true) {
            const all = [types.drone, types.hover, types.gyrator, types.rover].filter(type => type > 0);
            return all.length > 0 ? all[Math.floor(Math.random() * all.length)] : -1;
        }
        return Math.random() < 0.5 ? types.drone : types.hover;
    }

    IsClearSpawn(x, y) {
        const worldWidth = Number(Terraria.Main.maxTilesX) * 16;
        const worldHeight = Number(Terraria.Main.maxTilesY) * 16;
        if (x < 80 || x > worldWidth - 80 || y < 80 || y > worldHeight - 160)
            return false;
        try {
            return SolidTiles(Vector2.new(x - 18, y - 18), 36, 36) !== true;
        } catch (e) {
            return true;
        }
    }

    SpawnReinforcements(npc, player, state) {
        if (state.reinforcementsSpawned === true)
            return;
        state.reinforcementsSpawned = true;
        const wanted = this.GetReinforcementCount();
        state.reinforcementsRequested = wanted;
        if (Terraria.Main.netMode === 1)
            return;

        const centerX = Number(Terraria.PlayerCenterX(player));
        const centerY = Number(Terraria.PlayerCenterY(player));
        let spawned = 0;
        let attempts = 0;
        for (let i = 0; i < wanted; i++) {
            const type = this.PickReinforcementType();
            if (!(type > 0))
                continue;
            let spawnX = centerX;
            let spawnY = centerY - 180;
            let valid = false;
            for (let tries = 0; tries < 120; tries++) {
                attempts++;
                const angle = Math.random() * Math.PI * 2;
                const distance = 600 + Math.random() * 415;
                spawnX = centerX + Math.cos(angle) * distance * 1.5;
                spawnY = centerY + Math.sin(angle) * distance;
                if (spawnY > centerY)
                    spawnY = centerY;
                if (this.IsClearSpawn(spawnX, spawnY)) {
                    valid = true;
                    break;
                }
            }
            if (!valid)
                continue;
            const index = Terraria.NPC.NewNPC(
                Terraria.NPC.GetSpawnSourceForNaturalSpawn(),
                Math.floor(spawnX),
                Math.floor(spawnY),
                type,
                0, 0, 0, 0, 0,
                Number(npc.target)
            );
            if (index >= 0 && index < 200) {
                const reinforcement = Terraria.Main.npc[index];
                if (reinforcement) {
                    reinforcement.target = Number(npc.target);
                    reinforcement.netUpdate = true;
                }
                spawned++;
            }
        }
        state.reinforcementsSpawnedCount = spawned;
        state.reinforcementAttempts = attempts;
    }

    ChargeNearbyWulfrum(npc, state) {
        const radius = Math.max(0, Number(state.chargeRadius));
        const radiusSq = radius * radius;
        let chargedCount = 0;
        state.chargeScans = Number(state.chargeScans || 0) + 1;
        const sourcePos = npc.position;
        const sourceX = Number(sourcePos && sourcePos.X) + Number(npc.width) * 0.5;
        const sourceY = Number(sourcePos && sourcePos.Y) + Number(npc.height) * 0.5;
        const slots = FrozenCubeTrackedIndices();
        for (let k = 0; k < slots.length; k++) {
            const other = FrozenCubeNPC(slots[k]);
            if (!other || other === npc)
                continue;
            if (!this.IsChargeable(other.type))
                continue;
            const otherPos = other.position;
            const dx = Number(otherPos && otherPos.X) + Number(other.width) * 0.5 - sourceX;
            const dy = Number(otherPos && otherPos.Y) + Number(other.height) * 0.5 - sourceY;
            if (dx * dx + dy * dy > radiusSq)
                continue;
            const otherState = CalamityNPCState.Get(other);
            if (!(Number(otherState.superchargeTimer) > 0)) {
                otherState.superchargeTimer = this.SuperchargeTime;
                otherState.superchargedEver = true;
                other.netUpdate = true;
                if (Terraria.Main.netMode !== 2) {
                    for (let d = 0; d < 10; d++) {
                        const dust = NewDust(
                            other.position,
                            other.width,
                            other.height,
                            Terraria.ID.DustID.Electric,
                            (Math.random() - 0.5) * 2.4,
                            (Math.random() - 0.5) * 2.4,
                            0,
                            Color.White,
                            0.9
                        );
                        if (dust >= 0 && Terraria.Main.dust[dust])
                            Terraria.Main.dust[dust].noGravity = true;
                    }
                }
            }
            if (Number(otherState.superchargeTimer) > 0)
                chargedCount++;
        }
        state.lastChargedCount = chargedCount;
    }

    DrawChargeParticles(npc, state) {
        if (Terraria.Main.netMode === 2 || Number(state.age) % 6 !== 0)
            return;
        const radius = Math.max(24, Number(state.chargeRadius));
        const particleCount = 12;
        state.chargeBursts = Number(state.chargeBursts || 0) + 1;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.PI * 2 * i / particleCount + Number(state.age) * 0.025;
            const x = Number(npc.Center.X) + Math.cos(angle) * radius;
            const y = Number(npc.Center.Y) + Math.sin(angle) * radius;
            const dust = NewDust(Vector2.new(x, y), 2, 2, Terraria.ID.DustID.Vortex, Number(npc.velocity.X), Number(npc.velocity.Y), 80, Color.White, 0.7);
            if (dust >= 0 && Terraria.Main.dust[dust])
                Terraria.Main.dust[dust].noGravity = true;
        }
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        if (Number(state.retargetTimer) <= 0 || Number(npc.target) < 0 || Number(npc.target) >= 255) {
            npc.TargetClosest(false);
            state.retargetTimer = 30;
        }
        const player = Terraria.Main.player[Number(npc.target)];
        const velocity = npc.velocity;
        velocity.X *= 0.8;
        npc.velocity = velocity;
        if (!player || !player.active || player.dead)
            return false;

        if (state.charging !== true && this.DistanceSquared(Terraria.PlayerCenter(player), npc.Center) < this.ActivationRadius * this.ActivationRadius) {
            this.SpawnReinforcements(npc, player, state);
            state.charging = true;
            state.chargeRadius = 0;
            npc.netUpdate = true;
        }

        if (state.charging === true) {
            const current = Number(state.chargeRadius) || 0;
            state.chargeRadius = Math.min(this.ChargeRadiusMax, Math.floor(current + (this.ChargeRadiusMax - current) * 0.1));
            if (this.ChargeRadiusMax - Number(state.chargeRadius) <= 1)
                state.chargeRadius = this.ChargeRadiusMax;
            const age = Number(state.age) || 0;
            if (age >= Number(state.nextChargeScan || 0)) {
                state.nextChargeScan = age + 6;
                this.ChargeNearbyWulfrum(npc, state);
            }
            this.DrawChargeParticles(npc, state);
        }
        return false;
    }

    FindFrame(npc, frameHeight) {
        npc.frameCounter++;
        const frame = Math.floor(Number(npc.frameCounter) / 8) % 6;
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
    }

    ModifyNPCLoot(npcLoot) {
        const scrapType = Number(ModItem.getTypeByName('WulfrumMetalScrap') || 0);
        const batteryType = Number(ModItem.getTypeByName('WulfrumBattery') || 0);
        const coreType = Number(ModItem.getTypeByName('EnergyCore') || 0);
        if (scrapType > 0)
            npcLoot.Add(ItemDropRule.Common(scrapType, 1, 2, 3));
        if (batteryType > 0)
            npcLoot.Add(ItemDropRule.Common(batteryType, 14, 1, 1));
        if (coreType > 0)
            npcLoot.Add(ItemDropRule.Common(coreType, 1, 1, 1));
    }

    OnKill(npc) {
        const worldState = ModSystem.getByName('CalamityWorldState');
        if (worldState && typeof worldState.RecordWulfrumAmplifierKill === 'function')
            worldState.RecordWulfrumAmplifierKill();
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection) {
        const dead = Number(npc.life) <= 0;
        const count = dead ? 18 : 3;
        for (let i = 0; i < count; i++) {
            NewDust(
                npc.position,
                npc.width,
                npc.height,
                3,
                Number(hitDirection || 0),
                -1,
                0,
                Color.White,
                dead ? 1.05 : 0.85
            );
        }
    }
}
