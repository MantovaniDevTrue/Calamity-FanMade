import { Terraria } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

export class UrchinSpike extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/UrchinSpike';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.MinionShot[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 6;
        p.height = 6;
        p.friendly = true;
        p.hostile = false;
        p.timeLeft = 600;
        p.aiStyle = 1;
        p.penetrate = 1;
    }

    AI(proj) {
        proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) + Math.PI / 2;
    }

    OnHitNPC(proj, target) {
        try {
            target.AddBuff(20, 180, false);
        } catch (e) { }
    }
}
