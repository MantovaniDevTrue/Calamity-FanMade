import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color } = Modules;
export class PuffCloud extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/PuffCloud';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 7;
        try {
            Terraria.ID.ProjectileID.Sets.MinionShot[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.Projectile.width = 16;
        this.Projectile.height = 16;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = 1;
        this.Projectile.tileCollide = false;
        this.Projectile.aiStyle = 0;
        this.Projectile.timeLeft = 60;
    }

    AI(proj) {
        try {
        } catch (e) { }
        const velocity = proj.velocity;
        velocity.X *= 0.97;
        velocity.Y *= 0.97;
        proj.velocity = velocity;
        proj.rotation = Math.atan2(Number(velocity.Y), Number(velocity.X)) + Math.PI / 2;
        proj.frameCounter++;
        if (Number(proj.frameCounter) % 4 === 3) {
            proj.frame++;
            if (Number(proj.frame) >= 7)
                proj.Kill();
        }
    }

    GetAlpha(proj, lightColor) {
        try {
            return Color.White;
        } catch (e) {
            return lightColor;
        }
    }
}
