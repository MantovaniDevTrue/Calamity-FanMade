import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModSystem } from './../../../../TL/ModSystem.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { AnyNPC, SpawnNPC, GetNPCType, IsZenithWorld, RandInt } from './../../../../Core/HiveMindRuntime.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class HiveTumor extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/HiveMind/HiveTumor';
        this.BestiaryRarityStars = 2;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 4;
    }

    SetDefaults() {
        this.NPC.npcSlots = 0;
        this.NPC.aiStyle = -1;
        this.NPC.damage = 0;
        this.NPC.width = 30;
        this.NPC.height = 30;
        this.NPC.defense = 0;
        this.NPC.lifeMax = IsZenithWorld() ? 10 : 1000;
        this.NPC.knockBackResist = 0;
        this.NPC.chaseable = false;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit1;
        this.NPC.rarity = 2;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.spawnTimer = 0;
    }

    SpawnChance(info) {
        const player = info.Player;
        if (!info.CommonEnemy) return 0;
        if (!player || player.ZoneCorrupt !== true || info.PlayerSafe === true)
            return 0;
        let corruptTile = false;
        try {
            corruptTile = Terraria.ID.TileID.Sets.Corrupt[info.SpawnTileType] === true || Number(info.SpawnTileType) === 22;
        } catch (e) {
            corruptTile = true;
        }
        if (!corruptTile || AnyNPC(this.Type) || AnyNPC(GetNPCType('HiveMind')))
            return 0;
        const world = ModSystem.getByName('CalamityWorldState');
        if (Terraria.NPC.downedBoss2 === true && !(world && world.DownedHiveMind === true))
            return 1.5;
        return Terraria.Main.hardMode === true ? 0.05 : 0.5;
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        npc.lifeMax = 2000;
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        if (IsZenithWorld() && AnyNPC(GetNPCType('HiveMind'))) {
            state.spawnTimer++;
            if (state.spawnTimer >= 120) {
                state.spawnTimer = 0;
                const choice = RandInt(0, 5);
                let type = 6;
                if (choice === 2)
                    type = 7;
                else if (choice === 3)
                    type = GetNPCType('DankCreeper');
                else if (choice === 4)
                    type = GetNPCType('HiveBlob');
                SpawnNPC(type, npc.Center.X, npc.Center.Y);
            }
        }
        return false;
    }

    FindFrame(npc, frameHeight) {
        npc.frameCounter = (Number(npc.frameCounter) + 0.15) % 4;
        const rect = npc.frame;
        rect.Y = Math.floor(Number(npc.frameCounter)) * frameHeight;
        npc.frame = rect;
    }

    OnKill(npc) {
        if (Terraria.Main.netMode !== 1 && (!AnyNPC(GetNPCType('HiveMind')) || IsZenithWorld())) {
            const index = SpawnNPC(GetNPCType('HiveMind'), npc.Bottom.X, npc.Bottom.Y);
            if (index >= 0 && index < 200)
                Terraria.Main.npc[index].TargetClosest(true);
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const count = npc.life <= 0 ? 25 : 5;
        for (let i = 0; i < count; i++)
            NewDust(npc.position, npc.width, npc.height, 14, Number(hitDirection), -1, 0, Color.White, 1);
    }
}
