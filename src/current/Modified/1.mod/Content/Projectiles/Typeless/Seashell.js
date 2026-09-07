import { Terraria } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

export class Seashell extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/Seashell';
        this.AIType = 52;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 14;
        p.height = 14;
        p.friendly = true;
        p.penetrate = 2;
        p.aiStyle = 3;
        p.timeLeft = 300;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 10;
    }

    OnTileCollide(proj, hitDirection) {
        const velocity = proj.velocity;
        if (Math.abs(Number(hitDirection && hitDirection.X)) > 0.15)
            velocity.X *= -1;
        if (Math.abs(Number(hitDirection && hitDirection.Y)) > 0.15)
            velocity.Y *= -1;
        proj.velocity = velocity;
        return false;
    }
}
