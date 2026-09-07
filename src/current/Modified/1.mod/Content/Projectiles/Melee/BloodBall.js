import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class BloodBall extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/BloodBall';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 20;
        p.height = 20;
        p.friendly = true;
        p.penetrate = -1;
        p.timeLeft = 200;
        p.melee = true;
        p.tileCollide = true;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
    }

    AI(p) {
        if (p.timeLeft < 190)
            p.velocity = Vector2.new(Number(p.velocity.X), Math.min(12, Number(p.velocity.Y) + 0.18));
        p.rotation += Number(p.velocity.X) * 0.04;
    }

    OnTileCollide(p, oldVelocity) {
        p.velocity = Vector2.Zero;
        p.timeLeft = Math.min(Number(p.timeLeft), 3);
        return false;
    }

    OnHitNPC(p, npc) {
        const b = Number(ModBuff.getTypeByName('BurningBlood') || 0);
        if (b > 0)
            try {
                npc.AddBuff(b, 120, false);
            } catch (e) { }
        p.timeLeft = Math.min(Number(p.timeLeft), 3);
    }

    OnKill(p) {
        const center = p.Center;
        p.position = Vector2.new(Number(center.X) - 60, Number(center.Y) - 60);
        p.width = 120;
        p.height = 120;
        try {
            p.Damage();
        } catch (e) { }
        for (let i = 0; i < 24; i++) {
            const d = NewDust(p.position, p.width, p.height, 5, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 100, Color.White, 1.5);
            if (d >= 0 && i < 10)
                Terraria.Main.dust[d].noGravity = true;
        }
    }
}
