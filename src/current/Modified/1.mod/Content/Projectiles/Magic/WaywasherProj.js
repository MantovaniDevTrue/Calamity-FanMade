import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class WaywasherProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/WaywasherProj';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 16;
        p.height = 16;
        p.friendly = true;
        p.hostile = false;
        p.ignoreWater = true;
        p.alpha = 0;
        p.penetrate = 2;
        p.timeLeft = 300;
        p.magic = true;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
        p.tileCollide = true;
    }

    AI(p) {
        p.rotation = Number(p.rotation) + (Math.abs(Number(p.velocity.X)) + Math.abs(Number(p.velocity.Y))) * 0.02 * (Number(p.direction) || 1);
        try {
        } catch (e) { }
        if (Number(p.timeLeft) % 2 === 0)
            try {
                const d = NewDust(p.position, p.width, p.height, 33, Number(p.velocity.X) * 0.1, Number(p.velocity.Y) * 0.1, 0, Color.new(64, 224, 208, 255), 1.05);
                const dust = Terraria.Main.dust[d];
                if (dust)
                    dust.noGravity = true;
            } catch (e) { }
        if (Number(p.velocity.Y) > 16)
            p.velocity = Vector2.new(Number(p.velocity.X), 16);
    }

    OnKill(p) {
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, p.Center, 10, 0);
        } catch (e) { }
        for (let i = 0; i < 10; i++)
            try {
                NewDust(p.position, p.width, p.height, 33, Number(p.oldVelocity.X) * .5, Number(p.oldVelocity.Y) * .5, 0, Color.new(0, 142, 255, 255), 1);
            } catch (e) { }
    }
}
