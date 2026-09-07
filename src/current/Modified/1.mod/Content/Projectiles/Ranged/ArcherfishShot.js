import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export class ArcherfishShot extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 8; p.height = 8; p.friendly = true; p.ranged = true; p.ignoreWater = true;
        p.penetrate = 2; p.alpha = 255; p.timeLeft = 600; p.extraUpdates = 2;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.tileCollide = true; p.aiStyle = -1;
    }
    AI(p) {
        // Light mobile-friendly water trail; the projectile itself is invisible in the official mod.
        try {
            if ((N(Terraria.Main.GameUpdateCount) + N(p.whoAmI)) % 2 === 0) {
                const d = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
                if (d) d(p.position, p.width, p.height, Terraria.ID.DustID.Wet, N(p.velocity.X) * 0.5, N(p.velocity.Y) * 0.5, 100, Modules.Color.White, 1);
            }
        } catch (_) { }
    }
    OnHitNPC(p, npc) {
        try { npc.AddBuff(Terraria.ID.BuffID.Wet, 120, false); } catch (_) { }
        const riptide = N(ModBuff.getTypeByName('RiptideDebuff'));
        if (riptide > 0) try { npc.AddBuff(riptide, 120, false); } catch (_) { }
    }
}

export class ArcherfishRing extends ModProjectile {
    constructor() { super(); this.Texture = 'Particles/HollowCircleHardEdge'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 60; p.height = 34; p.friendly = true; p.ranged = true; p.ignoreWater = true;
        p.penetrate = 2; p.tileCollide = false; p.alpha = 15; p.timeLeft = 300; p.extraUpdates = 2;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.aiStyle = -1; p.scale = 0.5;
    }
    AI(p) {
        if (N(p.scale) < 1.5) p.scale = Math.min(1.5, N(p.scale, 0.5) * 1.015);
        const vx = N(p.velocity.X), vy = N(p.velocity.Y);
        if (Math.sqrt(vx * vx + vy * vy) < 0.08) p.alpha = Math.min(255, N(p.alpha) + 15);
        if (N(p.alpha) >= 255) { p.Kill(); return; }
        p.velocity = Vector2.Multiply(p.velocity, 0.95);
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + Math.PI * 0.5;
    }
}
