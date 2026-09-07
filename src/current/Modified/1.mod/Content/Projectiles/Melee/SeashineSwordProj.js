import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color } = Modules;
export class SeashineSwordProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/SeashineSwordProj';
    }

    SetDefaults() {
        this.Projectile.width = 16;
        this.Projectile.height = 16;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.melee = true;
        this.Projectile.penetrate = 1;
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = false;
        this.Projectile.timeLeft = 600;
        this.Projectile.alpha = 20;
        this.Projectile.light = 0.55;
        this.Projectile.extraUpdates = 0;
    }

    AI(proj) {
        proj.rotation = Math.atan2(proj.velocity.Y, proj.velocity.X) + Math.PI / 4;
        const pulse = Math.sin((600 - proj.timeLeft) * 0.18);
        proj.scale = 0.96 + pulse * 0.04;
        proj.alpha = Math.max(0, Math.min(70, 28 + Math.floor(pulse * 18)));
    }

    GetAlpha(proj, lightColor) {
        return Color.new(128, 255, 255, 255 - proj.alpha);
    }
}
