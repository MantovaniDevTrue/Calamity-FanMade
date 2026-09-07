import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import {

    FindHiveMind,
    GetHiveWorld,
    IsExpert,
    IsRevengeance,
    IsDeath,
    IsGoodWorld,
    IsZenithWorld,
    Normalize,
    TargetPlayer,
    CanSee,
    SpawnNPC,
    SpawnProjectile,
    GetNPCType,
    GetProjectileType,
    DeactivateNoLoot,
    RandInt,
    Chance
} from './../../../../Core/HiveMindRuntime.js';
const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];
function stateFastVariant(npc) {
    return CalamityNPCState.Get(npc).fastVariant === true;
}

export class HiveBlob extends ModNPC {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/HiveMind/HiveBlob';
        this.hideFromBestiary = true;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.NPCID.Sets.NeedsExpertScaling[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.NPCID.Sets.BossBestiaryPriority.Add(this.Type);
        } catch (e) { }
    }

    SetDefaults() {
        this.NPC.npcSlots = 0.1;
        this.NPC.aiStyle = -1;
        this.NPC.damage = 0;
        this.NPC.width = 25;
        this.NPC.height = 25;
        this.NPC.lifeMax = IsGoodWorld() ? 100 : 50;
        this.NPC.knockBackResist = 0.9;
        this.NPC.noGravity = true;
        this.NPC.noTileCollide = true;
        this.NPC.chaseable = false;
        this.NPC.HitSound = Terraria.ID.SoundID.NPCHit1;
        this.NPC.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }

    OnSpawn(npc) {
        const existing = CalamityNPCState.Get(npc);
        const ownerBoss = Number(existing.ownerBoss ?? -1);
        const fast = existing.fastVariant === true;
        const state = CalamityNPCState.Reset(npc);
        state.ownerBoss = ownerBoss;
        state.fastVariant = fast;
        state.offsetTimer = 0;
        state.offsetX = 1;
        state.offsetY = 0;
        state.shootTimer = 0;
        state.losTimer = Math.abs(Number(npc.whoAmI || 0)) % 8;
        state.cachedCanSee = true;
    }

    PreAI(npc) {
        const state = CalamityNPCState.Get(npc);
        let boss = null;
        const index = Number(state.ownerBoss ?? -1);
        if (index >= 0 && index < 200) {
            const candidate = Terraria.Main.npc[index];
            if (candidate && candidate.active && Number(candidate.type) === GetNPCType('HiveMind'))
                boss = candidate;
        }
        if (!boss)
            boss = FindHiveMind();
        if (!boss || Number(boss.life) / Math.max(1, Number(boss.lifeMax)) < 0.8) {
            this.HitEffect(npc, 0, 10);
            DeactivateNoLoot(npc);
            return false;
        }
        npc.alpha = boss.alpha;
        state.ownerBoss = Number(boss.whoAmI);
        const player = TargetPlayer(boss);
        if (!player)
            return false;
        state.offsetTimer -= IsZenithWorld() ? 10 : 1;
        const randomMultiplier = IsZenithWorld() ? 4 : 1;
        if (state.offsetTimer <= 0) {
            state.offsetTimer = RandInt(180, 361);
            state.offsetX = RandInt(-100, 101) * randomMultiplier;
            state.offsetY = RandInt(-100, 101) * randomMultiplier;
        }
        const relocateSpeed = IsZenithWorld() ? 1.2 : (IsDeath() ? 0.8 : (IsRevengeance() ? 0.7 : (IsExpert() ? 0.6 : 0.5)));
        const distanceFromMind = (state.fastVariant ? 96 : 128) * (IsGoodWorld() ? 2 : 1);
        const dir = Normalize(Number(state.offsetX), Number(state.offsetY), 1, 0);
        const targetX = Number(boss.Center.X) + dir.x * distanceFromMind;
        const targetY = Number(boss.Center.Y) + dir.y * distanceFromMind;
        // Keep this movement identical to the PC HiveBlob AI, but write X/Y back
        // directly. On TLPro, grabbing npc.velocity can yield a value-type wrapper;
        // mutating the wrapper and assigning it back was intermittently leaving blobs
        // at zero velocity after spawn.
        const acceleration = 0.8;
        let vx = Number(npc.velocity.X), vy = Number(npc.velocity.Y);
        if (Number(npc.position.X) < targetX) {
            vx += relocateSpeed;
            if (vx < 0 && dir.x > 0)
                vx *= acceleration;
        } else if (Number(npc.position.X) > targetX) {
            vx -= relocateSpeed;
            if (vx > 0 && dir.x < 0)
                vx *= acceleration;
        }
        if (Number(npc.position.Y) < targetY) {
            vy += relocateSpeed;
            if (vy < 0 && dir.y > 0)
                vy *= acceleration;
        } else if (Number(npc.position.Y) > targetY) {
            vy -= relocateSpeed;
            if (vy > 0 && dir.y < 0)
                vy *= acceleration;
        }
        const limit = relocateSpeed * 16;
        // Vector2 is a value type in the TLPro bridge: assign the whole vector, as
        // AFTER MOON does, otherwise X/Y changes may stay on a temporary wrapper.
        npc.velocity = Vector2.new(
            Math.max(-limit, Math.min(limit, vx)),
            Math.max(-limit, Math.min(limit, vy))
        );
        const gate = state.fastVariant ? 180 : 240;
        // Native CanHit/Collision is expensive through the JS bridge. Cache LOS and
        // stagger refreshes between blobs instead of raycasting twice per blob/tick.
        state.losTimer = Number(state.losTimer || 0) - 1;
        if (state.losTimer <= 0) {
            state.losTimer = 8;
            state.cachedCanSee = CanSee(npc, player);
        }
        const canSeePlayer = state.cachedCanSee !== false;
        if (!canSeePlayer)
            state.shootTimer = gate * 0.5;
        if (state.shootTimer < gate) {
            state.shootTimer += 1;
            if (state.shootTimer < gate - 120)
                state.shootTimer += RandInt(0, 2);
            if (IsDeath())
                state.shootTimer += 1;
        }
        if (Number(npc.alpha) <= 0 && state.shootTimer >= gate) {
            const dx = Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X);
            const dy = Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y);
            const n = Normalize(dx, dy, 0, 1);
            if (n.length > 80 && canSeePlayer) {
                state.shootTimer = 0;
                let speed = IsDeath() ? 8 : (IsRevengeance() ? 7 : (IsExpert() ? 6 : 4));
                if (IsGoodWorld())
                    speed *= 1.5;
                let projectileType = GetProjectileType('VileClot');
                let projectileDamage = 8;
                let velocityX = n.x * speed;
                let velocityY = n.y * speed;
                if (IsGoodWorld() && Chance(5)) {
                    projectileType = 96; // Cursed Flame
                    projectileDamage = 15;
                    const predicted = Normalize(Number(Terraria.PlayerCenterX(player)) - Number(npc.Center.X) - Number(Terraria.PlayerVelocity(player).X) * 20, Number(Terraria.PlayerCenterY(player)) - Number(npc.Center.Y) - Number(Terraria.PlayerVelocity(player).Y) * 20, 0, 1);
                    velocityX = predicted.x * speed;
                    velocityY = predicted.y * speed;
                }
                if (projectileType > 0)
                    SpawnProjectile(projectileType, npc.Center, Vector2.new(velocityX, velocityY), projectileDamage);
                npc.netUpdate = true;
            }
        }
        npc.rotation = Math.atan2(Number(npc.velocity.Y), Number(npc.velocity.X));
        return false;
    }

    OnKill(npc) {
        const boss = FindHiveMind();
        const player = boss ? TargetPlayer(boss) : null;
        if (player && Number(player.statLife) < Number(player.statLifeMax2) && Math.random() < 0.25 && Terraria.Main.netMode !== 1) {
            try {
                NewItem(Math.floor(Number(npc.position.X)), Math.floor(Number(npc.position.Y)), npc.width, npc.height, Number(Terraria.ID.ItemID.Heart || 58), 1, false, 0, false);
            } catch (e) { }
        }
        CalamityNPCState.Remove(npc);
    }

    GetAlpha(npc, newColor) {
        const state = CalamityNPCState.Get(npc);
        const gate = state.fastVariant ? 180 : 240;
        if (Number(state.shootTimer || 0) <= gate - 120)
            return newColor;
        const amount = Math.max(0, Math.min(1, (Number(state.shootTimer) - (gate - 120)) / 120));
        return Color.Lerp(newColor, Color.LimeGreen, amount);
    }

    HitEffect(npc, hitDirection, damage) {
        const state = CalamityNPCState.Get(npc);
        const dead = npc.life <= 0;
        const now = Number(Terraria.Main.GameUpdateCount || 0);
        if (dead || now - Number(state.lastHitFxTick || -9999) >= 4) {
            state.lastHitFxTick = now;
            const count = dead ? 8 : 1;
            for (let i = 0; i < count; i++)
                NewDust(npc.position, npc.width, npc.height, 14, Number(hitDirection), -1, 0, Color.White, 1);
        }
        if (Terraria.Main.netMode !== 1 && stateFastVariant(npc) && IsZenithWorld()) {
            const spawnX = Number(npc.Center.X);
            const spawnY = Number(npc.Center.Y) + Number(npc.height) / 2;
            for (let i = 0; i < 2; i++)
                SpawnNPC(GetNPCType('HiveBlob'), spawnX, spawnY, -1, { fastVariant: false });
        }
    }

    CheckActive() {
        return false;
    }
}
