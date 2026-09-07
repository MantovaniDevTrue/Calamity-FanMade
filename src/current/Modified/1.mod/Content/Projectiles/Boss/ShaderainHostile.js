import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ApplyBrainRot } from './../../../Core/HiveMindRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class ShaderainHostile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/ShaderainHostile';
    }

    SetDefaults() {
        this.Projectile.width = 4;
        this.Projectile.height = 40;
        this.Projectile.hostile = true;
        this.Projectile.friendly = false;
        this.Projectile.penetrate = -1;
        this.Projectile.ignoreWater = true;
        this.Projectile.tileCollide = true;
        this.Projectile.timeLeft = 300;
        this.Projectile.alpha = 255;
        this.Projectile.aiStyle = 0;
    }

    CanDamage(proj) {
        return Number(proj.timeLeft) >= 85;
    }

    GetAlpha(proj, lightColor) {
        if (Number(proj.timeLeft) < 85) {
            const brightness = Math.max(0, Math.min(255, Number(proj.timeLeft) * 3));
            const alpha = Math.floor(Number(proj.alpha) * (brightness / 255));
            return Color.new(brightness, brightness, brightness, alpha);
        }
        return Color.new(255, 255, 255, Number(proj.alpha));
    }

    OnHitPlayer(proj, player) {
        ApplyBrainRot(player, 120);
    }

    OnKill(proj) {
        const impact = Vector2.new(Number(proj.position.X), Number(proj.position.Y) + Number(proj.height) - 2);
        const dust = NewDust(impact, 2, 2, 14, 0, 0, 0, Color.White, 1);
        if (dust >= 0) {
            const d = Terraria.Main.dust[dust];
            d.position.X = Number(d.position.X) - 2;
            d.alpha = 38;
            d.velocity.X = Number(d.velocity.X) * 0.1 - Number(proj.oldVelocity.X) * 0.25;
            d.velocity.Y = Number(d.velocity.Y) * 0.1 - Number(proj.oldVelocity.Y) * 0.25;
            d.scale = 0.95;
        }
    }
}
