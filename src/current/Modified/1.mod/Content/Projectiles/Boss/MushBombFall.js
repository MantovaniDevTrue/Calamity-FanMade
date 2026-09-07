import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const CrabulonDustType = 59; // Blue Fairy dust
function PlaySound(id, position, style = 1, pitch = 0) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](id, position, style, pitch);
    } catch (e) { }
}

export class MushBombFall extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/MushBomb';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 4;
    }

    SetDefaults() {
        this.Projectile.width = 14;
        this.Projectile.height = 14;
        this.Projectile.friendly = false;
        this.Projectile.hostile = true;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = 1;
        this.Projectile.timeLeft = 600;
        this.Projectile.aiStyle = 0;
        this.Projectile.alpha = 191;
        this.Projectile.light = 0.15;
    }

    AI(proj) {
        const ai = new ProjAI(proj, false);
        const mode = Math.floor(Number(ai[0] || 0));
        const targetY = Number(ai[1] || 0);
        const descending = Number(proj.velocity.Y) > 0;
        if (descending && Number(proj.alpha) > 0) {
            proj.alpha = 0;
            PlaySound(2, proj.Center, 21, 0);
            for (let i = 0; i < 3; i++) {
                const dust = NewDust(proj.position, proj.width, proj.height, CrabulonDustType, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 70, Color.White, 0.9);
                if (dust >= 0)
                    Terraria.Main.dust[dust].noGravity = true;
            }
            for (let i = 0; i < 8; i++) {
                const angle = Math.PI * 2 * i / 8;
                FusionVFXSystem.SpawnDot(proj.Center, { x: Math.cos(angle) * 1.25, y: Math.sin(angle) * 1.25 }, 2.5 + (i % 2), { r: 125, g: 235, b: 255, a: 180 }, 18, { drag: 0.95 });
            }
        } else if (!descending && Number(proj.timeLeft) % 18 === 0) {
            FusionVFXSystem.SpawnDot(proj.Center, { x: 0, y: -0.04 }, 2.1, { r: 105, g: 220, b: 255, a: 115 }, 15, { drag: 0.96 });
        }
        proj.frameCounter++;
        if (proj.frameCounter > 4) {
            proj.frameCounter = 0;
            proj.frame = (Number(proj.frame) + 1) % 4;
        }
        if (descending && targetY > 0 && Number(proj.position.Y) > targetY)
            proj.tileCollide = true;
        const velocity = proj.velocity;
        const yLimit = mode === 1 ? 1 : 5;
        const yIncrement = mode === 1 ? 0.1 : 0.1;
        if (Number(velocity.Y) < yLimit)
            velocity.Y = Number(velocity.Y) + yIncrement;
        if (Math.abs(Number(velocity.X)) > (mode === 1 ? 0 : 2))
            velocity.X *= 0.995;
        proj.velocity = velocity;
        proj.rotation = Math.atan2(Number(velocity.Y), Number(velocity.X)) + Math.PI * 0.5;
    }

    CanDamage(proj) {
        return Number(proj.alpha) <= 0;
    }

    OnKill(proj) {
        PlaySound(4, proj.Center, 1, 0);
        for (let i = 0; i < 3; i++) {
            const dust = NewDust(proj.position, proj.width, proj.height, CrabulonDustType, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 80, Color.White, 0.9);
            if (dust >= 0 && i > 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI * 2 * i / 6;
            const speed = 0.8 + Math.random() * 1.4;
            FusionVFXSystem.SpawnDot(proj.Center, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, 2.4, { r: 125, g: 235, b: 255, a: 175 }, 18, { drag: 0.95, gravity: 0.02 });
        }
    }

    GetAlpha(proj, lightColor) {
        return Color.new(255, 255, 255, 255 - Number(proj.alpha));
    }
}
