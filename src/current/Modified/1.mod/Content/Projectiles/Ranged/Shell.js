import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class Shell extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/Shell';
        this.AIType = Number(Terraria.ID.ProjectileID.WoodenArrowFriendly);
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 34;
        p.height = 18;
        p.ignoreWater = true;
        p.friendly = true;
        p.hostile = false;
        p.ranged = true;
        p.penetrate = 5;
        p.aiStyle = 1;
        p.arrow = true;
        p.timeLeft = 600;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
        p.tileCollide = true;
    }

    AI(p) {
        p.velocity = Modules.Vector2.Multiply(p.velocity, 0.9995);
    }

    OnKill(p) {
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, p.Center, 10, 0);
        } catch (e) { }
        for (let i = 0; i < 10; i++) {
            try {
                const index = NewDust(p.position, p.width, p.height, 14, Number(p.oldVelocity.X) / 4, Number(p.oldVelocity.Y) / 4, 0, Color.new(0, 255, 255, 255), 1.5);
                const dust = Terraria.Main.dust[index];
                if (dust) {
                    dust.noGravity = true;
                    dust.velocity = Modules.Vector2.Multiply(dust.velocity, 3);
                }
            } catch (e) { }
        }
    }
}
