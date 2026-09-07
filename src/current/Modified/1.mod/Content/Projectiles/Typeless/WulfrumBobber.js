import { Terraria } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

export class WulfrumBobber extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/WulfrumBobber';
        this.AIType = Terraria.ID.ProjectileID.BobberWooden;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ProjectileID.BobberWooden);
        this.Projectile.width = 14;
        this.Projectile.height = 14;
        this.Projectile.aiStyle = 61;
        this.Projectile.bobber = true;
    }
}
