import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { ModGore } from './../../../../TL/ModGore.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import {

    IsExpert,
    IsRevengeance,
    IsDeath,
    IsGoodWorld,
    Normalize,
    TargetPlayer,
    ApplyBrainRot,
    SpawnProjectile,
    GetProjectileType
} from './../../../../Core/HiveMindRuntime.js';
const { Color, Vector2, Effects } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function SpawnDankCreeperGoresOnce(npc) {
    if (!npc || Terraria.Main.netMode === 2)
        return;
    const state = CalamityNPCState.Get(npc);
    if (state.deathGoresSpawned === true)
        return;
    state.deathGoresSpawned = true;
    for (const name of ['DankCreeperGore', 'DankCreeperGore2', 'DankCreeperGore3']) {
        const type = Number(ModGore.getTypeByName(name) || 0);
        if (!(type > 0))
            continue;
        try {
            Effects.NewGoreFromNPC(npc, type, false);
        } catch (e) { }
    }
}

export class DankCreeper extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/HiveMind/DankCreeper';
        this.hideFromBestiary = true;
    }

    SetDefaults() {
        this.NPC.damage = 24;
        this.NPC.width = 70;
        this.NPC.height = 70;
        this.NPC.defense = 6;
        this.NPC.lifeMax = IsGoodWorld() ? 360 : 120;
        this.NPC.aiStyle = -1;
        this.NPC.knockBackResist = 0.3;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit1;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath1;
        try {
            if (IsGoodWorld())
                this.NPC.reflectsProjectiles = true;
        } catch (e) { }
    }

    OnSpawn(npc) {
        const state = CalamityNPCState.Reset(npc);
        state.speedRamp = 0;
        state.dashTimer = 0;
        npc.TargetClosest(true);
    }

    PreAI(npc) {
        npc.damage = 0;
        const state = CalamityNPCState.Get(npc);
        const player = TargetPlayer(npc);
        if (!player)
            return false;
        const maxSpeed = IsDeath() ? 15 : (IsRevengeance() ? 13 : 11);
        state.speedRamp = Math.min(90, Number(state.speedRamp || 0) + 1);
        const speed = 3 + (maxSpeed - 3) * (state.speedRamp / 90);
        npc.rotation = Number(npc.velocity.X) * 0.05;
        const lowLife = Number(npc.life) / Math.max(1, Number(npc.lifeMax)) < 0.25;
        const suicideMode = lowLife && IsExpert();
        const targetX = Number(Terraria.PlayerCenterX(player));
        const targetY = Number(Terraria.PlayerCenterY(player)) - (suicideMode ? 400 : 0);
        const dx = targetX - (Number(npc.Center.X) + (Number(npc.direction) || 1) * 20);
        const dy = targetY - (Number(npc.Center.Y) + 6);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (suicideMode && distance < 80) {
            npc.life = 0;
            npc.checkDead();
            return false;
        }
        if (!lowLife) {
            state.dashTimer = Number(state.dashTimer || 0) - 1;
            const dash = distance < 200;
            if (dash || state.dashTimer > 0) {
                npc.damage = Number(npc.defDamage) > 0 ? Number(npc.defDamage) : 24;
                if (dash)
                    state.dashTimer = 20;
                npc.direction = Number(npc.velocity.X) < 0 ? -1 : 1;
                return false;
            }
        }
        const inertia = (distance < 300 || lowLife) ? 8 : (distance < 400 ? 20 : 50);
        const n = Normalize(dx, dy, Number(npc.direction) || 1, 0);
        const nextVX = (Number(npc.velocity.X) * inertia + n.x * speed) / (inertia + 1);
        const nextVY = (Number(npc.velocity.Y) * inertia + n.y * speed) / (inertia + 1);
        npc.velocity = Vector2.new(nextVX, nextVY);
        npc.direction = nextVX < 0 ? -1 : 1;
        return false;
    }

    OnHitPlayer(npc, player, damageSource, damage) {
        if (Number(damage) >= 0)
            ApplyBrainRot(player, 120);
    }

    OnKill(npc) {
        SpawnDankCreeperGoresOnce(npc);
        const playerIndex = Terraria.Player.FindClosest(npc.Center, 1, 1);
        const player = Terraria.Main.player[playerIndex];
        if (player && Number(player.statLife) < Number(player.statLifeMax2) && Math.random() < 0.25 && Terraria.Main.netMode !== 1) {
            try {
                NewItem(Math.floor(Number(npc.position.X)), Math.floor(Number(npc.position.Y)), npc.width, npc.height, Number(Terraria.ID.ItemID.Heart || 58), 1, false, 0, false);
            } catch (e) { }
        }
        if (IsExpert()) {
            const cloud = GetProjectileType('ShadeNimbusHostile');
            if (cloud > 0)
                SpawnProjectile(cloud, npc.Center, Vector2.new(0, 0), 12);
        }
        CalamityNPCState.Remove(npc);
    }

    HitEffect(npc, hitDirection, damage) {
        const state = CalamityNPCState.Get(npc);
        const dead = npc.life <= 0;
        const now = Number(Terraria.Main.GameUpdateCount || 0);
        if (dead || now - Number(state.lastHitFxTick || -9999) >= 4) {
            state.lastHitFxTick = now;
            const count = dead ? 10 : 1;
            for (let i = 0; i < count; i++)
                NewDust(npc.position, npc.width, npc.height, 13, Number(hitDirection), -1, 0, Color.White, 1);
        }
        if (dead)
            SpawnDankCreeperGoresOnce(npc);
    }
}
