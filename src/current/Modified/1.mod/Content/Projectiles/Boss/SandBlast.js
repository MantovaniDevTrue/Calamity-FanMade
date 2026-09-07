import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SandDustType = Number.isFinite(Number(Terraria.ID.DustID.Sand)) ? Math.floor(Number(Terraria.ID.DustID.Sand)) : 32;
function PlayImpact(position) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, position, 14, 0);
    } catch (e) { }
}

export class SandBlast extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/SandBlast';
    }

    SetDefaults() {
        this.Projectile.width = 10;
        this.Projectile.height = 10;
        this.Projectile.friendly = false;
        this.Projectile.hostile = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.tileCollide = true;
        this.Projectile.extraUpdates = 1;
        this.Projectile.penetrate = 1;
        this.Projectile.timeLeft = 1200;
        this.Projectile.aiStyle = 0;
        this.Projectile.alpha = 255;
    }

    AI(proj) {
        const local = new ProjAI(proj, true);
        const age = Number(local[0] || 0) + 1;
        local[0] = age;
        proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) + Math.PI * 0.5;
        proj.alpha = Math.max(0, 255 - age * 24);
        if (Terraria.Main.netMode !== 2 && age % 4 === 0) {
            FusionVFXSystem.SpawnDot({ x: Number(proj.Center.X), y: Number(proj.Center.Y) }, { x: -Number(proj.velocity.X) * 0.035, y: -Number(proj.velocity.Y) * 0.035 }, 2.4, { r: 232, g: 197, b: 126, a: 135 }, 10, { drag: 0.92 });
        }
        if (Terraria.Main.netMode !== 2 && age % 20 === 0) {
            const dust = NewDust(proj.position, proj.width, proj.height, SandDustType, 0, 0, 110, Color.White, 0.72);
            if (dust >= 0) {
                Terraria.Main.dust[dust].noGravity = true;
                const velocity = Terraria.Main.dust[dust].velocity;
                velocity.X = 0;
                velocity.Y = 0;
                Terraria.Main.dust[dust].velocity = velocity;
            }
        }
    }

    OnKill(proj) {
        if (Terraria.Main.netMode !== 2) {
            PlayImpact(proj.Center);
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI * 2 * i / 6;
                FusionVFXSystem.SpawnDot({ x: Number(proj.Center.X), y: Number(proj.Center.Y) }, { x: Math.cos(angle) * 1.7, y: Math.sin(angle) * 1.7 }, 2.7, { r: 238, g: 202, b: 132, a: 175 }, 15, { drag: 0.92, gravity: 0.035 });
            }
        }
    }

    GetAlpha(proj, lightColor) {
        return Color.new(255, 250, 230, Math.max(0, 255 - Number(proj.alpha)));
    }
}
