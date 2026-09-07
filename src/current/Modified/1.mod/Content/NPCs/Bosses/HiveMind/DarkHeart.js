import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import {

    FindHiveMind,
    IsRevengeance,
    IsDeath,
    IsGoodWorld,
    TargetPlayer,
    CanSee,
    SpawnProjectile,
    GetProjectileType,
    DeactivateNoLoot
} from './../../../../Core/HiveMindRuntime.js';
const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function Clamp(v, min, max) {
    return Math.max(min, Math.min(max, Number(v)));
}

export class DarkHeart extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/HiveMind/DarkHeart';
        this.hideFromBestiary = true;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = 4;
        try {
            Terraria.ID.NPCID.Sets.NeedsExpertScaling[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.NPC.damage = 0;
        this.NPC.width = 32;
        this.NPC.height = 32;
        this.NPC.defense = 2;
        this.NPC.lifeMax = IsGoodWorld() ? 225 : 75;
        this.NPC.aiStyle = -1;
        this.NPC.knockBackResist = 0.4;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = false;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit13;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath21;
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.rainTimer = 0;
        state.losTimer = Math.abs(Number(npc.whoAmI || 0)) % 8;
        state.cachedCanSee = true;
        npc.TargetClosest(true);
    }

    PreAI(npc) {
        const boss = FindHiveMind();
        if (!boss) {
            DeactivateNoLoot(npc);
            return false;
        }
        const player = TargetPlayer(npc);
        if (!player)
            return false;
        const state = CalamityNPCState.Get(npc);
        npc.rotation = Number(npc.velocity.X) / 20;
        const velocityLimit = IsGoodWorld() ? 10 : (IsDeath() ? 7 : (IsRevengeance() ? 6 : 4));
        const acceleration = IsGoodWorld() ? 0.5 : (IsDeath() ? 0.35 : (IsRevengeance() ? 0.3 : 0.2));
        const deceleration = IsGoodWorld() ? 0.9 : (IsDeath() ? 0.95 : (IsRevengeance() ? 0.96 : 0.98));
        const velocity = npc.velocity;
        if (Number(npc.position.Y) > Number(Terraria.PlayerPositionY(player)) - 400) {
            if (Number(velocity.Y) > 0)
                velocity.Y *= deceleration;
            velocity.Y = Clamp(Number(velocity.Y) - acceleration, -velocityLimit * 1.5, velocityLimit);
        } else if (Number(npc.position.Y) < Number(Terraria.PlayerPositionY(player)) - 450) {
            if (Number(velocity.Y) < 0)
                velocity.Y *= deceleration;
            velocity.Y = Clamp(Number(velocity.Y) + acceleration, -velocityLimit, velocityLimit * 1.5);
        }
        state.losTimer = Number(state.losTimer || 0) - 1;
        if (state.losTimer <= 0) {
            state.losTimer = 8;
            state.cachedCanSee = CanSee(npc, player);
        }
        let dropRain = Number(npc.Bottom.Y) < Number(Terraria.PlayerPositionY(player)) - 350 && state.cachedCanSee !== false;
        const distanceX = IsDeath() ? 200 : 400;
        if (Number(npc.Center.X) > Number(Terraria.PlayerCenterX(player)) + distanceX) {
            dropRain = false;
            if (Number(velocity.X) > 0)
                velocity.X *= deceleration;
            velocity.X = Clamp(Number(velocity.X) - acceleration, -velocityLimit * 1.5, velocityLimit);
        }
        if (Number(npc.Center.X) < Number(Terraria.PlayerCenterX(player)) - distanceX) {
            dropRain = false;
            if (Number(velocity.X) < 0)
                velocity.X *= deceleration;
            velocity.X = Clamp(Number(velocity.X) + acceleration, -velocityLimit, velocityLimit * 1.5);
        }
        npc.velocity = velocity;
        if (dropRain) {
            state.rainTimer++;
            const rate = IsGoodWorld() ? 10 : (IsDeath() ? 15 : (IsRevengeance() ? 20 : 30));
            if (state.rainTimer >= rate) {
                state.rainTimer = 0;
                const rain = GetProjectileType('ShaderainHostile');
                if (rain > 0) {
                    const x = Number(npc.position.X) + 10 + Math.random() * Math.max(1, Number(npc.width) - 20);
                    const y = Number(npc.position.Y) + Number(npc.height) + 4;
                    SpawnProjectile(rain, Vector2.new(x, y), Vector2.new(IsGoodWorld() ? Math.random() * 5 : 0, 8), 12);
                }
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
        const playerIndex = Terraria.Player.FindClosest(npc.Center, 1, 1);
        const player = Terraria.Main.player[playerIndex];
        if (player && Number(player.statLife) < Number(player.statLifeMax2) && Terraria.Main.netMode !== 1) {
            try {
                NewItem(Math.floor(Number(npc.position.X)), Math.floor(Number(npc.position.Y)), npc.width, npc.height, Number(Terraria.ID.ItemID.Heart || 58), 1, false, 0, false);
            } catch (e) { }
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const state = CalamityNPCState.Get(npc);
        const dead = npc.life <= 0;
        const now = Number(Terraria.Main.GameUpdateCount || 0);
        if (!dead && now - Number(state.lastHitFxTick || -9999) < 4)
            return;
        state.lastHitFxTick = now;
        const count = dead ? 10 : 1;
        for (let i = 0; i < count; i++)
            NewDust(npc.position, npc.width, npc.height, 14, Number(hitDirection), -1, 0, Color.White, 1);
    }
}
