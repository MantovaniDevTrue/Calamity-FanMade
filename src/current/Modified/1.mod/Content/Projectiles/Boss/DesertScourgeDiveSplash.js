import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SandDustType = Number.isFinite(Number(Terraria.ID.DustID.Sand)) ? Math.floor(Number(Terraria.ID.DustID.Sand)) : 32;
export class DesertScourgeDiveSplash extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/DesertScourgeDiveSplash';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 14;
    }

    SetDefaults() {
        this.Projectile.width = 84;
        this.Projectile.height = 84;
        this.Projectile.friendly = false;
        this.Projectile.hostile = false;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 75;
        this.Projectile.aiStyle = 0;
        this.Projectile.drawLayer = 7;
    }

    OnSpawn(proj) {
        for (let i = 0; i < 4; i++) {
            const speedX = (Math.random() - 0.5) * 5.5;
            const speedY = -1.2 - Math.random() * 3.2;
            const dust = NewDust(proj.position, proj.width, proj.height, SandDustType, speedX, speedY, 40, Color.White, 1.0 + Math.random() * 0.35);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = false;
        }
    }

    AI(proj) {
        const velocity = proj.velocity;
        if (Math.abs(Number(velocity.X)) > 0.001 || Math.abs(Number(velocity.Y)) > 0.001) {
            velocity.X = 0;
            velocity.Y = 0;
            proj.velocity = velocity;
        }
        proj.frameCounter++;
        if (Number(proj.frameCounter) > 4) {
            proj.frameCounter = 0;
            proj.frame = Number(proj.frame) + 1;
        }
        if (Number(proj.frame) >= 14) {
            proj.Kill();
            return;
        }
        if (Number(proj.frameCounter) === 0 && Number(proj.frame) % 3 === 0) {
            for (let i = 0; i < 2; i++) {
                FusionVFXSystem.SpawnDot({ x: Number(proj.Center.X) + (i === 0 ? -18 : 18), y: Number(proj.Center.Y) + 18 }, { x: (i === 0 ? -0.45 : 0.45), y: -0.75 - Math.random() * 0.35 }, 3.5, { r: 236, g: 199, b: 126, a: 165 }, 18, { drag: 0.94, gravity: 0.025 });
            }
        }
    }

    CanDamage() {
        return false;
    }

    GetAlpha(proj, lightColor) {
        return Color.new(255, 245, 220, 255);
    }
}
