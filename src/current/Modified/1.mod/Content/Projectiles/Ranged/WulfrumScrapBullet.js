import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class WulfrumScrapBullet extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/WulfrumEnergyBurst';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 8;
        p.height = 8;
        p.ranged = true;
        p.friendly = true;
        p.penetrate = 1;
        p.timeLeft = 100;
        p.extraUpdates = 2;
        p.alpha = 80;
    }

    AI(p) {
        const v = p.velocity;
        v.X *= .97;
        v.Y *= .97;
        p.velocity = v;
        p.rotation = Math.atan2(Number(v.Y), Number(v.X)) + Math.PI / 2;
        if (Number(p.timeLeft) % 4 === 0 && Terraria.Main.netMode !== 2) {
            const d = NewDust(p.position, p.width, p.height, Terraria.ID.DustID.GoldFlame, -Number(v.X) * .05, -Number(v.Y) * .05, 70, Color.White, .65);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
    }
}
