import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const PlaySound = Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'];
export class BarinadeArrow extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/BarinadeArrow';
    }

    SetDefaults() {
        this.Projectile.width = 20;
        this.Projectile.height = 20;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ranged = true;
        this.Projectile.arrow = true;
        this.Projectile.penetrate = 1;
        this.Projectile.timeLeft = 300;
        this.Projectile.extraUpdates = 2;
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = false;
        this.Projectile.aiStyle = 0;
        this.Projectile.light = 0.35;
    }

    AI(proj) {
        proj.rotation = Vector2.ToRotation(proj.velocity) + Math.PI / 2;
        if (proj.timeLeft % 6 === 0) {
            const dustId = 32;
            const index = NewDust(proj.position, proj.width, proj.height, dustId, -Number(proj.velocity.X) * 0.04, -Number(proj.velocity.Y) * 0.04, 120, Color.White, 0.75);
            const dust = Terraria.Main.dust[index];
            if (dust)
                dust.noGravity = true;
        }
    }

    OnKill(proj) {
        try {
            PlaySound(0, proj.Center, 1, 0);
        } catch (e) { }
        const sand = 32;
        for (let i = 0; i < 6; i++) {
            const spreadX = (Math.random() - 0.5) * 2.4;
            const spreadY = (Math.random() - 0.5) * 2.4;
            NewDust(proj.position, proj.width, proj.height, sand, spreadX, spreadY, 80, Color.White, 0.9 + Math.random() * 0.25);
        }
    }
}
