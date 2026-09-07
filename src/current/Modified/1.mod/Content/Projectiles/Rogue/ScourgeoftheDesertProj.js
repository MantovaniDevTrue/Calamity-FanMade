import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { IsStealthStrike, MarkRogueProjectile } from './../../../Core/RogueRuntime.js';
import { PlayDigSound, PlayNPCHitSound } from '../../../Common/Snippets/LegacySoundCompat.js';

const { Color, Vector2 } = Modules;
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const FLAG_INITIAL_TILE_HIT = 1;
const FLAG_POST_EXIT_TILES = 2;
const FLAG_STEALTH_STRIKE = 4; // Stealth Strike
function NormalizeOr(vector, fallbackX = 1, fallbackY = 0) {
    const x = Number(vector.X) || 0;
    const y = Number(vector.Y) || 0;
    const length = Math.sqrt(x * x + y * y);
    if (length <= 0.001)
        return Vector2.new(fallbackX, fallbackY);
    return Vector2.new(x / length, y / length);
}

function SpawnDustBurst(proj, count, reverse, large) {
    const sand = 32;
    const smoke = 31;
    const base = reverse ? Vector2.Multiply(proj.velocity, -1) : proj.velocity;
    for (let i = 0; i < count; i++) {
        try {
            const angle = (Math.random() - 0.5) * (Math.PI / 3);
            const speed = (large ? 0.35 : 0.08) + Math.random() * (large ? 0.9 : 0.55);
            const velocity = Vector2.Multiply(Vector2.RotatedBy(base, angle), speed);
            const dustType = Math.random() < 0.72 ? sand : smoke;
            const index = NewDust(proj.position, proj.width, proj.height, dustType, Number(velocity.X), Number(velocity.Y), large ? 20 : 70, Color.White, (large ? 1.15 : 0.55) + Math.random() * (large ? 0.55 : 0.35));
            const dust = Terraria.Main.dust[index];
            if (dust)
                dust.noGravity = large;
        } catch (e) { }
    }
}

function PlayDig(position, pitch = 0.15, volume = 0.7) {
    try {
        PlayDigSound(position, pitch, volume);
    } catch (e) { }
}

function PlayEmerge(position) {
    try {
        PlayNPCHitSound(11, position, 0.45, 1.0);
        return;
    } catch (e) { }
    PlayDig(position, 0.45, 0.9);
}

function NPCCenter(npc) {
    if (!npc)
        return null;
    try {
        const rect = npc['Rectangle getRect()']();
        if (rect)
            return Vector2.new(Number(rect.X) + Number(rect.Width) * 0.5, Number(rect.Y) + Number(rect.Height) * 0.5);
    } catch (e) { }
    return null;
}

function ResolveNativeTarget(found) {
    if (found === null || found === undefined)
        return null;
    try {
        if (found.active !== undefined)
            return found;
    } catch (e) { }
    const index = Math.floor(Number(found));
    if (Number.isFinite(index) && index >= 0 && index < 200) {
        try {
            return Terraria.Main.npc[index];
        } catch (e) { }
    }
    return null;
}

export class ScourgeoftheDesertProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/ScourgeoftheDesert';
        this.TargetRange = 1800;
    }

    SetDefaults() {
        this.Projectile.width = 50;
        this.Projectile.height = 50;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ranged = false;
        this.Projectile.penetrate = 2;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = false;
        this.Projectile.timeLeft = 600;
        this.Projectile.extraUpdates = 1;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = 50;
        this.Projectile.aiStyle = 0;
    }

    IsValidTarget(npc) {
        return !!(npc && npc.active && !npc.friendly && !npc.dontTakeDamage && Number(npc.life) > 0 && Number(npc.lifeMax) > 5 && NPCCenter(npc));
    }

    FindTarget(proj) {
        try {
            const found = ResolveNativeTarget(proj.FindTargetWithinRange(this.TargetRange, true));
            if (this.IsValidTarget(found))
                return found;
        } catch (e) { }
        return null;
    }

    HomeUnderground(proj, target, timeUnderground) {
        if (!target) {
            const velocity = proj.velocity;
            if (Number(velocity.Y) < 0)
                velocity.Y = Number(velocity.Y) * 0.98;
            velocity.Y = Number(velocity.Y) + 0.08;
            velocity.X = Number(velocity.X) * 0.99;
            proj.velocity = velocity;
            return;
        }
        const targetCenter = NPCCenter(target);
        if (!targetCenter)
            return;
        const toTarget = Vector2.Subtract(targetCenter, proj.Center);
        const distance = toTarget.Length();
        if (distance <= 0.001 || distance >= this.TargetRange || timeUnderground <= 25)
            return;
        const desired = Vector2.Multiply(NormalizeOr(toTarget), 10);
        const acceleration = 0.2;
        const velocity = proj.velocity;
        const dx = Number(desired.X);
        const dy = Number(desired.Y);
        if (Number(velocity.X) < dx) {
            velocity.X = Number(velocity.X) + acceleration;
            if (Number(velocity.X) < 0 && dx > 0)
                velocity.X = Number(velocity.X) + acceleration;
        } else if (Number(velocity.X) > dx) {
            velocity.X = Number(velocity.X) - acceleration;
            if (Number(velocity.X) > 0 && dx < 0)
                velocity.X = Number(velocity.X) - acceleration;
        }
        if (Number(velocity.Y) < dy) {
            velocity.Y = Number(velocity.Y) + acceleration;
            if (Number(velocity.Y) < 0 && dy > 0)
                velocity.Y = Number(velocity.Y) + acceleration;
        } else if (Number(velocity.Y) > dy) {
            velocity.Y = Number(velocity.Y) - acceleration;
            if (Number(velocity.Y) > 0 && dy < 0)
                velocity.Y = Number(velocity.Y) - acceleration;
        }
        proj.velocity = velocity;
    }

    AI(proj) {
        MarkRogueProjectile(proj, 'ScourgeoftheDesert', false);
        if (IsStealthStrike(proj)) {
            const aiFlags = new ProjAI(proj);
            aiFlags[2] = Math.floor(Number(aiFlags[2]) || 0) | FLAG_STEALTH_STRIKE;
            proj.penetrate = Math.max(4, Number(proj.penetrate));
        }
        const ai = new ProjAI(proj);
        const local = new ProjAI(proj, true);
        ai[0] = Number(ai[0]) + 1;
        let flags = Math.floor(Number(ai[2]) || 0);
        let postHitNoDig = Math.max(0, Math.floor(Number(local[0]) || 0));
        if (postHitNoDig > 0) {
            postHitNoDig--;
            local[0] = postHitNoDig;
        }
        const direction = NormalizeOr(proj.velocity, 1, 0);
        const collisionPosition = Vector2.Add(proj.Center, Vector2.Multiply(direction, 10));
        let insideTiles = false;
        try {
            insideTiles = SolidCollision(collisionPosition, 10, 10);
        } catch (e) { }
        proj.rotation = Vector2.ToRotation(proj.velocity) + Math.PI / 4;
        if (Math.random() < 0.45) {
            try {
                const sand = 32;
                const index = NewDust(proj.position, proj.width, proj.height, sand, -Number(proj.velocity.X) * 0.18, -Number(proj.velocity.Y) * 0.18, 90, Color.White, 0.45 + Math.random() * 0.25);
                const dust = Terraria.Main.dust[index];
                if (dust)
                    dust.noGravity = true;
            } catch (e) { }
        }
        const initialTileHit = (flags & FLAG_INITIAL_TILE_HIT) !== 0;
        const postExitTiles = (flags & FLAG_POST_EXIT_TILES) !== 0;
        if (!initialTileHit && Number(ai[0]) > 45) {
            const velocity = proj.velocity;
            if (Number(velocity.Y) < 0)
                velocity.Y = Number(velocity.Y) * 0.95;
            velocity.Y = Number(velocity.Y) + 0.15;
            velocity.X = Number(velocity.X) * 0.98;
            proj.velocity = velocity;
        }
        if (initialTileHit && !insideTiles && !postExitTiles) {
            proj.extraUpdates = 4;
            if ((flags & FLAG_STEALTH_STRIKE) === 0)
                proj.timeLeft = Math.min(Number(proj.timeLeft), 200);
            SpawnDustBurst(proj, 22, true, true);
            PlayEmerge(proj.Center);
            flags |= FLAG_POST_EXIT_TILES;
            ai[2] = flags;
        }
        if ((flags & FLAG_POST_EXIT_TILES) !== 0) {
            const speed = proj.velocity.Length();
            if (speed < 10)
                proj.velocity = Vector2.Multiply(proj.velocity, 1.02);
        }
        if (insideTiles) {
            ai[1] = Number(ai[1]) + 1;
            try {
            } catch (e) { }
            if (Math.floor(Number(ai[0])) % 15 === 0 && Number(ai[1]) < 120)
                PlayDig(proj.Center, 0.15, 0.55);
            this.HomeUnderground(proj, this.FindTarget(proj), Number(ai[1]));
        }
        if (!initialTileHit && postHitNoDig === 0 && insideTiles && Number(ai[0]) > 5) {
            SpawnDustBurst(proj, 22, false, true);
            proj.velocity = Vector2.Multiply(proj.velocity, 0.7);
            PlayDig(proj.Center, 0.45, 1.0);
            flags |= FLAG_INITIAL_TILE_HIT;
            ai[2] = flags;
        }
    }

    OnHitNPC(proj, npc) {
        SpawnDustBurst(proj, 7, false, false);
        const ai = new ProjAI(proj);
        let flags = Math.floor(Number(ai[2]) || 0);
        if ((flags & FLAG_STEALTH_STRIKE) !== 0) {
            const local = new ProjAI(proj, true);
            proj.extraUpdates = 1;
            proj.timeLeft = 600;
            ai[0] = 10;
            ai[1] = 0;
            local[0] = 50;
            flags &= ~FLAG_INITIAL_TILE_HIT;
            flags &= ~FLAG_POST_EXIT_TILES;
            ai[2] = flags;
        }
    }

    OnKill(proj) {
        SpawnDustBurst(proj, 24, false, true);
    }
}
