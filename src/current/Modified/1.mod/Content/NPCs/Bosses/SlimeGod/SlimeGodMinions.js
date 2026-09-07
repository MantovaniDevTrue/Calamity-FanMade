import { Terraria, Modules } from './../../../../TL/ModImports.js';
import { ModNPC } from './../../../../TL/ModNPC.js';
import { CalamityNPCState } from './../../../../Core/CalamityNPCState.js';
import {
    FindCore,
    TargetPlayer,
    SpawnNPC,
    SpawnProjectile,
    GetSlimeTypes,
    GetProjectileType,
    Distance,
    Normalize,
    CanSee,
    Chance,
    IsExpert,
    IsZenithWorld
} from './../../../../Core/SlimeGodRuntime.js';
const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];

function radialGlobs(npc, crimson, damage) {
    const type = GetProjectileType(crimson ? 'UnstableCrimulanGlob' : 'UnstableEbonianGlob');
    if (!(type > 0) || Terraria.Main.netMode === 1)
        return;
    for (let i = 0; i < 10; i++) {
        const angle = Math.PI * 2 * i / 10;
        const speed = 0.3;
        SpawnProjectile(type, npc.Center, Vector2.new(Math.cos(angle) * speed, Math.sin(angle) * speed), damage, 0, 0, 0);
    }
}

class SlimeSpawnBase extends ModNPC {
    constructor(texture, crimson, second = false) {
        super();
        this.Texture = texture;
        this.crimson = crimson;
        this.second = second;
    }

    SetStaticDefaults() {
        Terraria.Main.npcFrameCount[this.Type] = this.crimson && this.second ? 5 : (this.crimson ? 2 : (this.second ? 2 : 4));
    }

    SetDefaults() {
        const n = this.NPC;
        n.aiStyle = this.crimson ? 1 : (this.second ? 1 : 14);
        n.damage = this.crimson && !this.second ? 20 : (this.second ? (this.crimson ? 28 : 20) : 28);
        n.width = 40;
        n.height = 30;
        n.defense = this.second ? (this.crimson ? 6 : 4) : (this.crimson ? 4 : 6);
        n.lifeMax = this.crimson ? (this.second ? 130 : 110) : (this.second ? 90 : 180);
        n.knockBackResist = this.crimson ? (this.second ? 0.7 : 0.8) : (this.second ? 0.9 : 0.7);
        n.alpha = 51;
        n.noGravity = false;
        n.noTileCollide = false;
        n.HitSound = Terraria.ID.SoundID.NPCHit1;
        n.DeathSound = Terraria.ID.SoundID.NPCDeath1;
    }

    OnSpawn(npc) {
        const s = CalamityNPCState.Reset(npc);
        s.shotTimer = this.crimson && this.second ? 60 : 0;
        npc.TargetClosest(true);
    }

    PostAI(npc) {
        const core = FindCore();
        if (!core || !core.active) {
            if (Number(npc.timeLeft) > 60)
                npc.timeLeft = 60;
            return;
        }
        if (Number(npc.timeLeft) < 600)
            npc.timeLeft = 600;
        const moving = Math.sqrt(Number(npc.velocity.X) ** 2 + Number(npc.velocity.Y) ** 2);
        npc.damage = (Math.abs(Number(npc.velocity.Y)) < 0.05 || moving < 3) ? 0 : Number(npc.defDamage || npc.damage || 20);
        if (this.crimson && this.second)
            this.CrimsonShooterAI(npc);
    }

    CrimsonShooterAI(npc) {
        const s = CalamityNPCState.Get(npc), player = TargetPlayer(npc);
        s.shotTimer = Math.max(0, Number(s.shotTimer || 0) - 1);
        if (!player || npc.wet === true || s.shotTimer > 0 || Math.abs(Number(npc.velocity.Y)) >= 0.05)
            return;
        const target = Terraria.PlayerCenter(player);
        const distance = Distance(npc.Center, target);
        if (distance >= 360 || !CanSee(npc, player))
            return;
        const type = GetProjectileType('CrimsonSpike');
        if (!(type > 0))
            return;
        if (IsExpert() && distance < 120) {
            const count = IsZenithWorld() ? 12 : 5;
            for (let i = 0; i < count; i++) {
                const centered = i - (count - 1) * 0.5;
                const vx = centered * (count > 5 ? 0.55 : 1);
                const vy = -4;
                const n = Normalize(vx * (0.9 + Math.random() * 0.2), vy * (0.9 + Math.random() * 0.2), 0, -1);
                const speed = 3.5 + Math.random();
                SpawnProjectile(type, npc.Center, Vector2.new(n.x * speed, n.y * speed), 11, 0, 0, 0);
            }
            s.shotTimer = 30;
        } else {
            const dx = Number(target.X) - Number(npc.Center.X);
            const dy = Number(target.Y) - Number(npc.Center.Y) - Math.random() * 200;
            const n = Normalize(dx, dy, 0, -1);
            SpawnProjectile(type, npc.Center, Vector2.new(n.x * 6.5, n.y * 6.5), 11, 0, 0, 0);
            s.shotTimer = 50;
        }
        try { npc.ai[0] = -40; } catch (e) { }
        npc.velocity = Vector2.new(Number(npc.velocity.X) * 0.9, Number(npc.velocity.Y));
    }

    FindFrame(npc, frameHeight) {
        npc.frameCounter = Number(npc.frameCounter) + 1;
        if (Number(npc.frameCounter) >= 8) {
            npc.frameCounter = 0;
            const count = Terraria.Main.npcFrameCount[this.Type] || 1;
            const r = npc.frame;
            r.Y = (Number(r.Y) + frameHeight) % (frameHeight * count);
            npc.frame = r;
        }
    }

    HitEffect(npc, hitDirection, damage) {
        if (Terraria.Main.netMode === 2)
            return;
        const color = this.crimson ? Color.Crimson : Color.Lavender;
        for (let i = 0; i < (Number(npc.life) <= 0 ? 20 : 5); i++)
            NewDust(npc.position, npc.width, npc.height, 4, hitDirection, -1, npc.alpha, color, 1);
    }

    OnKill(npc) {
        if (!this.crimson && !this.second && Terraria.Main.netMode !== 1) {
            const type = GetSlimeTypes().corruptSpawn2;
            if (type > 0)
                SpawnNPC(type, Number(npc.Center.X), Number(npc.Bottom.Y) - 15);
            if (IsZenithWorld()) {
                const shade = GetProjectileType('ShadeNimbusHostile');
                if (shade > 0)
                    SpawnProjectile(shade, npc.Center, Vector2.new(0, 0), 12, 0, 0, 0);
            }
        }
        if (IsZenithWorld() && Chance(5))
            radialGlobs(npc, this.crimson, this.crimson ? 30 : 15);
        if (Terraria.Main.netMode !== 1 && Chance(8)) {
            const idx = Terraria.Player.FindClosest(npc.Center, 1, 1), p = Terraria.Main.player[idx];
            if (p && Number(p.statLife) < Number(p.statLifeMax2))
                try { NewItem(Math.floor(npc.position.X), Math.floor(npc.position.Y), npc.width, npc.height, Number(Terraria.ID.ItemID.Heart || 58), 1, false, 0, false); } catch (e) { }
        }
    }
}

export class CorruptSlimeSpawn extends SlimeSpawnBase {
    constructor() { super('NPCs/Bosses/SlimeGod/CorruptSlimeSpawn', false, false); }
}
export class CorruptSlimeSpawn2 extends SlimeSpawnBase {
    constructor() { super('NPCs/Bosses/SlimeGod/CorruptSlimeSpawn2', false, true); }
}
export class CrimsonSlimeSpawn extends SlimeSpawnBase {
    constructor() { super('NPCs/Bosses/SlimeGod/CrimsonSlimeSpawn', true, false); }
}
export class CrimsonSlimeSpawn2 extends SlimeSpawnBase {
    constructor() { super('NPCs/Bosses/SlimeGod/CrimsonSlimeSpawn2', true, true); }
}
