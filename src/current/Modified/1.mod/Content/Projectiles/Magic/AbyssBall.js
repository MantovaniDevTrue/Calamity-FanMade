import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class AbyssBall extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/UnstableEbonianGlob';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 26;
        p.height = 26;
        p.friendly = true;
        p.magic = true;
        p.alpha = 60;
        p.penetrate = 2;
        p.tileCollide = false;
        p.timeLeft = 300;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
    }

    AI(p) {
        p.velocity = Vector2.new(Number(p.velocity.X) * 0.985, Number(p.velocity.Y) * 0.985);
        NewDust(p.position, p.width, p.height, 173, Number(p.velocity.X) * 0.5, Number(p.velocity.Y) * 0.5, 0, Color.White, 1);
    }

    OnKill(p) {
        const c = p.Center;
        p.position = Vector2.new(Number(c.X) - 80, Number(c.Y) - 80);
        p.width = 160;
        p.height = 160;
        p.penetrate = -1;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 10;
        try {
            p.Damage();
        } catch (e) { }
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, p.Center, 14, 0);
        } catch (e) { }
        for (let i = 0; i < 35; i++) {
            const d = NewDust(p.position, p.width, p.height, 173, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 100, Color.White, 1.2 + Math.random() * 0.6);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = i > 12;
        }
    }
}
