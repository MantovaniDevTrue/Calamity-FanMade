import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ProjAI } from './../../../TL/ProjAI.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function applyIrradiated(player) {
    const buff = Number(ModBuff.getTypeByName('Irradiated') || 0);
    if (!(buff > 0))
        return;

    try {
        player.AddBuff(buff, 300, true);
    } catch (e) {
        try {
            player.AddBuff(buff, 300, false);
        } catch (ignored) { }
    }
}

export class SulphuricAcidMist extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Enemy/SulphuricAcidMist';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 10;
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 20;
        projectile.height = 20;
        projectile.hostile = true;
        projectile.friendly = false;
        projectile.ignoreWater = true;
        projectile.tileCollide = true;
        projectile.penetrate = 1;
        projectile.timeLeft = 600;
        projectile.alpha = 255;
        projectile.aiStyle = 0;
    }

    AI(projectile) {
        const ai = new ProjAI(projectile, false);
        const age = Number(ai[0] || 0) + 1;
        ai[0] = age;

        projectile.frameCounter = Number(projectile.frameCounter) + 1;
        if (Number(projectile.frameCounter) > 4) {
            projectile.frameCounter = 0;
            projectile.frame = Number(projectile.frame) + 1;
        }

        if (Number(projectile.frame) > 5 && age < 480)
            projectile.frame = 3;
        else if (Number(projectile.frame) > 7)
            projectile.frame = 4;

        const vx = Number(projectile.velocity.X);
        const vy = Number(projectile.velocity.Y);
        projectile.spriteDirection = vx < 0 ? -1 : 1;
        projectile.rotation = Math.atan2(vy, vx);

        if (age >= 480) {
            projectile.alpha = Math.min(255, Number(projectile.alpha) + 5);
            if (Number(projectile.alpha) >= 255) {
                try {
                    projectile.Kill();
                } catch (e) {
                    projectile.active = false;
                }
            }
        } else {
            projectile.alpha = Math.max(26, Number(projectile.alpha) - 31);
        }
    }

    CanDamage(projectile) {
        return Number(projectile.alpha) <= 26;
    }

    OnHitPlayer(projectile, player) {
        if (Number(projectile.alpha) <= 26)
            applyIrradiated(player);
    }

    OnKill(projectile) {
        const x = Number(projectile.position.X);
        const y = Number(projectile.position.Y);
        for (let i = 0; i < 4; i++) {
            const dust = NewDust(
                Vector2.new(x, y),
                Number(projectile.width),
                Number(projectile.height),
                75,
                Number(projectile.velocity.X) * 0.1,
                Number(projectile.velocity.Y) * 0.1,
                80,
                Color.White,
                0.9
            );
            if (dust >= 0 && Terraria.Main.dust[dust])
                Terraria.Main.dust[dust].noGravity = true;
        }
    }

    GetAlpha(projectile, lightColor) {
        return Color.new(255, 255, 255, Math.max(0, 255 - Number(projectile.alpha)));
    }
}
