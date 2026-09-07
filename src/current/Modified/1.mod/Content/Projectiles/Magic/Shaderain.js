import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class Shaderain extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/Shaderain';
    }

    SetDefaults() {
        this.Projectile.timeLeft = 600;
        this.Projectile.width = 20;
        this.Projectile.height = 20;
        this.Projectile.netImportant = true;
        this.Projectile.friendly = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.magic = true;
    }

    AI(proj) {
        proj.velocity.Y += 0.15;
        proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) - Math.PI / 2;
    }

    OnHitNPC(proj, npc) {
        const buff = Number(ModBuff.getTypeByName('BrainRot') || 0);
        if (buff > 0)
            try {
                npc.AddBuff(buff, 180, false);
            } catch (e) { }
    }
}
