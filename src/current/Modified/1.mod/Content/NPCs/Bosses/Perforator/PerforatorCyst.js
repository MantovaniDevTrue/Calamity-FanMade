import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import { AndroidSound } from './../../../../Common/Snippets/AndroidSound.js';
import { GetPerfTypes, AnyNPC, SpawnNPC, IsGoodWorld } from './../../../../Core/PerforatorRuntime.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class PerforatorCyst extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/Perforator/PerforatorCyst';
        this.BestiaryRarityStars = 2;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 4;
    }

    SetDefaults() {
        this.NPC.npcSlots = 0.1;
        this.NPC.aiStyle = -1;
        this.NPC.damage = 0;
        this.NPC.width = 30;
        this.NPC.height = 26;
        this.NPC.defense = 0;
        this.NPC.lifeMax = IsGoodWorld() ? 2000 : 1000;
        this.NPC.knockBackResist = 0;
        this.NPC.chaseable = false;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit13;
        this.NPC.rarity = 2;
    }

    SpawnChance(info) {
        const p = info.Player, t = GetPerfTypes();
        if (!info.CommonEnemy) return 0;
        if (!p || p.ZoneCrimson !== true || info.PlayerSafe === true || AnyNPC(this.Type) || AnyNPC(t.hive))
            return 0;
        let crimson = true;
        try {
            crimson = Terraria.ID.TileID.Sets.Crimson[info.SpawnTileType] === true || Number(info.SpawnTileType) === 204;
        } catch (e) { }
        if (!crimson)
            return 0;
        return Terraria.Main.hardMode === true ? 0.05 : (Terraria.NPC.downedBoss2 === true ? 1.5 : 0.5);
    }

    ApplyDifficultyAndPlayerScaling(npc) {
        npc.lifeMax = 2000;
    }

    FindFrame(npc, frameHeight) {
        npc.frameCounter = (Number(npc.frameCounter) + 0.15) % 4;
        const r = npc.frame;
        r.Y = Math.floor(Number(npc.frameCounter)) * frameHeight;
        npc.frame = r;
    }

    OnKill(npc) {
        for (let i = 0; i < 4; i++)
            NewDust(npc.position, npc.width, npc.height, 5, 0, -1, 0, Color.White, 1.2);
        const t = GetPerfTypes();
        if (Terraria.Main.netMode !== 1 && !AnyNPC(t.hive))
            SpawnNPC(t.hive, npc.Center.X, npc.Bottom.Y);
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection) {
        if (npc.life <= 0 && Terraria.Main.netMode !== 2)
            AndroidSound.PlayOneShot('Common/Sounds/Perforator/PerfHiveSpawn.ogg', 1.0, Number(npc.Center.X), Number(npc.Center.Y), 1600, 150);
        for (let i = 0; i < (npc.life <= 0 ? 4 : 1); i++)
            NewDust(npc.position, npc.width, npc.height, 5, Number(hitDirection), -1, 0, Color.White, 1);
    }
}
