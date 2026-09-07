import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import {

    FollowPreviousSegment,
    GetCurrentDesertScourgeHitSound,
    QueueNextDesertScourgeHitSound,
    GetDesertScourgeDifficultyFlags,
    ApplyCircularContactFilter
} from './DesertScourgeShared.js';
const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SandDustType = Number.isFinite(Number(Terraria.ID.DustID.Sand)) ? Math.floor(Number(Terraria.ID.DustID.Sand)) : 32;
export class DesertScourgeBody extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/DesertScourge/DesertScourgeBody';
        this.hideFromBestiary = true;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 7;
    }

    SetDefaults() {
        this.NPC.aiStyle = -1;
        this.NPC.width = 104;
        this.NPC.height = 104;
        this.NPC.damage = 16;
        this.NPC.defense = 6;
        const difficulty = GetDesertScourgeDifficultyFlags();
        this.NPC.lifeMax = difficulty.revenge ? 5000 : 4200;
        if (difficulty.goodWorld)
            this.NPC.lifeMax *= 2;
        this.NPC.scale = difficulty.goodWorld ? 0.4 : 1.0;
        this.NPC.knockBackResist = 0;
        this.NPC.value = 0;
        this.NPC.npcSlots = 0;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.behindTiles = true;
        this.NPC.boss = false;
        this.NPC.netAlways = false;
        this.NPC.dontCountMe = true;
        this.NPC.alpha = 255;
        this.NPC.HitSound = GetCurrentDesertScourgeHitSound();
        // DeathSound is owned by the linked head's official DesertScourgeDeath playback.
    }

    PreAI(npc) {
        FollowPreviousSegment(npc, 70);
        return false;
    }

    FindFrame(npc, frameHeight) {
        npc.frameCounter += 0.6;
        const frame = Math.floor(Number(npc.frameCounter) / 5) % 7;
        const rect = npc.frame;
        rect.Y = frame * frameHeight;
        npc.frame = rect;
    }

    ApplyDifficultyAndPlayerScaling(npc, numPlayers, balance, bossAdjustment) {
        const playerBalance = Number.isFinite(Number(balance)) ? Number(balance) : 1;
        const masterAdjustment = Number.isFinite(Number(bossAdjustment)) ? Number(bossAdjustment) : 1;
        npc.lifeMax = Math.max(1, Math.floor(Number(npc.lifeMax) * 0.8 * playerBalance * masterAdjustment));
    }

    ModifyHitPlayer(npc, player, modifiers) {
        ApplyCircularContactFilter(npc, player, modifiers, (Math.floor(Number(npc.ai[3])) === 3 ? 30 : 45) * Number(npc.scale || 1), true);
    }

    CheckActive() {
        return false;
    }

    HitEffect(npc, hitDirection, damage) {
        const count = npc.life <= 0 ? 12 : 1;
        for (let i = 0; i < count; i++) {
            NewDust(npc.position, npc.width, npc.height, SandDustType, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0, Color.White, npc.life <= 0 ? 1.25 : 0.9);
        }
        if (npc.life > 0)
            QueueNextDesertScourgeHitSound(npc);
    }
}
