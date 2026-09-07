import { Terraria } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

export class HeronBobber extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/HeronBobber';
        this.AIType = Terraria.ID.ProjectileID.BobberWooden;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ProjectileID.BobberWooden);
        const p = this.Projectile;
        p.width = 14;
        p.height = 14;
        p.aiStyle = 61;
        p.bobber = true;
    }
}
