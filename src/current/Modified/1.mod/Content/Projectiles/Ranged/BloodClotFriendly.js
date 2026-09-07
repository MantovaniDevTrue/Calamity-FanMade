import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class BloodClotFriendly extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/BloodClotFriendly';
        this.AIType = Number(Terraria.ID.ProjectileID.Bullet || 14);
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 4;
        p.height = 4;
        p.friendly = true;
        p.ranged = true;
        p.penetrate = 1;
        p.aiStyle = 1;
        p.extraUpdates = 3;
        p.timeLeft = 600;
    }

    AI(p) {
        if (Math.random() < 0.45) {
            const d = NewDust(p.position, p.width, p.height, 5, 0, 0, 100, Color.White, 1);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
        p.rotation = Math.atan2(Number(p.velocity.Y), Number(p.velocity.X)) + Math.PI / 2;
    }

    OnHitNPC(p, npc) {
        const b = Number(ModBuff.getTypeByName('BurningBlood') || 0);
        if (b > 0)
            try {
                npc.AddBuff(b, 240, false);
            } catch (e) { }
    }
}
