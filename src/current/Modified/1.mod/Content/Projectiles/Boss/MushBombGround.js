import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const CrabulonDustType = 59; // Blue Fairy dust
function PlaySound(id, position, style = 1, pitch = 0) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](id, position, style, pitch);
    } catch (e) { }
}

export class MushBombGround extends ModProjectile {
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
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = 1;
        this.Projectile.timeLeft = 300;
        this.Projectile.aiStyle = 0;
        this.Projectile.light = 0.18;
    }

    AI(proj) {
        proj.frameCounter++;
        if (proj.frameCounter > 4) {
            proj.frameCounter = 0;
            proj.frame = (Number(proj.frame) + 1) % 4;
        }
        const velocity = proj.velocity;
        if (Math.abs(Number(velocity.X)) < 12)
            velocity.X *= 1.025;
        proj.velocity = velocity;
        proj.rotation = 0;
        if (Number(proj.timeLeft) % 8 === 0) {
            FusionVFXSystem.SpawnDot(proj.Center, { x: -Number(proj.velocity.X) * 0.04, y: -0.08 }, 2.25, { r: 95, g: 215, b: 255, a: 120 }, 16, { drag: 0.95 });
        }
    }

    OnKill(proj) {
        PlaySound(4, proj.Center, 1, 0);
        const dust = NewDust(proj.position, proj.width, proj.height, CrabulonDustType, 0, -1, 70, Color.White, 0.95);
        if (dust >= 0)
            Terraria.Main.dust[dust].noGravity = true;
        for (let i = 0; i < 5; i++) {
            const angle = Math.PI * 2 * i / 5;
            const speed = 0.8 + Math.random() * 1.4;
            FusionVFXSystem.SpawnDot(proj.Center, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, 2.5, { r: 120, g: 230, b: 255, a: 175 }, 18, { drag: 0.95, gravity: 0.02 });
        }
    }
}
