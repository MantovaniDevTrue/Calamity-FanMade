import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class EldritchTentacle extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/InvisibleProj';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 40;
        p.height = 40;
        p.friendly = true;
        p.magic = true;
        p.penetrate = 2;
        p.extraUpdates = 2;
        p.timeLeft = 180;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
    }

    AI(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'eldritch', () => ({ life: 0, ax: (Math.random() - 0.5) * 0.08, ay: (Math.random() - 0.5) * 0.08 }));
        s.life += s.life < 0.1 ? 0.01 : 0.025;
        if (s.life >= 0.95) {
            p.Kill();
            return;
        }
        const scale = Math.max(0.05, 1 - s.life), c = p.Center;
        p.scale = scale;
        p.width = Math.max(2, Math.floor(20 * scale));
        p.height = p.width;
        p.position = Vector2.new(Number(c.X) - p.width / 2, Number(c.Y) - p.height / 2);
        let vx = Number(p.velocity.X) + Number(s.ax) * 1.5, vy = Number(p.velocity.Y) + Number(s.ay) * 1.5, len = Math.sqrt(vx * vx + vy * vy);
        if (len > 16) {
            vx = vx / len * 16;
            vy = vy / len * 16;
        }
        p.velocity = Vector2.new(vx, vy);
        s.ax *= 1.05;
        s.ay *= 1.05;
        if (Math.random() < 0.65) {
            const d = NewDust(p.position, p.width, p.height, 60, -vx * 0.3, -vy * 0.3, 100, Color.White, 0.8 + scale);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
    }
}
