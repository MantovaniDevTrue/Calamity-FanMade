import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class SandstreamScepterExplosion extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/SandstreamScepterExplosion';
    }

    SetDefaults() {
        this.Projectile.width = 224;
        this.Projectile.height = 224;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.magic = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.tileCollide = false;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 2;
        this.Projectile.aiStyle = 0;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = 10;
    }

    OnSpawn(proj) {
        const sand = 32;
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            try {
                const index = NewDust(proj.Center, 2, 2, Math.random() < 0.35 ? 216 : sand, Math.cos(angle) * speed, Math.sin(angle) * speed, 0, Color.White, 1.0 + Math.random() * 0.7);
                const dust = Terraria.Main.dust[index];
                if (dust)
                    dust.noGravity = false;
            } catch (e) { }
        }
    }

    Colliding(proj, myRect, targetRect) {
        const centerX = Number(proj.Center.X);
        const centerY = Number(proj.Center.Y);
        const left = Number(targetRect.X);
        const top = Number(targetRect.Y);
        const right = left + Number(targetRect.Width);
        const bottom = top + Number(targetRect.Height);
        const nearestX = Math.max(left, Math.min(centerX, right));
        const nearestY = Math.max(top, Math.min(centerY, bottom));
        const dx = centerX - nearestX;
        const dy = centerY - nearestY;
        return dx * dx + dy * dy <= 112 * 112;
    }

    PreDraw() {
        return false;
    }
}
