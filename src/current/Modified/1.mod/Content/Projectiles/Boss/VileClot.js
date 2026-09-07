import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function PlayItem(style, position) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, position, style, 0);
    } catch (e) { }
}

export class VileClot extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/VileClot';
    }

    SetDefaults() {
        this.Projectile.width = 12;
        this.Projectile.height = 12;
        this.Projectile.light = 0.6;
        this.Projectile.hostile = true;
        this.Projectile.friendly = false;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 300;
        this.Projectile.tileCollide = true;
        this.Projectile.aiStyle = 0;
    }

    AI(proj) {
        const state = FusionEntityData.GetProjectileBag(proj, 'vileClot', () => ({ started: false }));
        if (!state.started) {
            state.started = true;
            PlayItem(20, proj.Center);
        }
        const vx = Number(proj.velocity.X), vy = Number(proj.velocity.Y);
        if (Math.sqrt(vx * vx + vy * vy) < 12) {
            proj.velocity.X = vx * 1.01;
            proj.velocity.Y = vy * 1.01;
        }
        proj.rotation = Number(proj.rotation) + 0.3 * (Number(proj.direction) || 1);
        if (Terraria.Main.netMode !== 2) {
            const dust = NewDust(proj.position, proj.width, proj.height, 75, Number(proj.velocity.X) * 0.1, Number(proj.velocity.Y) * 0.1, 100, Color.White, 1.5);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
    }

    OnHitPlayer(proj, player) {
        try {
            player.AddBuff(39, 60, false);
        } catch (e) { }
    }

    OnKill(proj) {
        PlayItem(10, proj.Center);
        for (let i = 0; i < 6; i++) {
            let dust = NewDust(proj.position, proj.width, proj.height, 75, -Number(proj.velocity.X) * 0.2, -Number(proj.velocity.Y) * 0.2, 100, Color.White, 2.5);
            if (dust >= 0) {
                Terraria.Main.dust[dust].noGravity = true;
                Terraria.Main.dust[dust].velocity.X *= 2;
                Terraria.Main.dust[dust].velocity.Y *= 2;
            }
            dust = NewDust(proj.position, proj.width, proj.height, 75, -Number(proj.velocity.X) * 0.2, -Number(proj.velocity.Y) * 0.2, 100, Color.White, 1.2);
            if (dust >= 0) {
                Terraria.Main.dust[dust].velocity.X *= 2;
                Terraria.Main.dust[dust].velocity.Y *= 2;
            }
        }
        FusionEntityData.ClearProjectile(proj);
    }
}
