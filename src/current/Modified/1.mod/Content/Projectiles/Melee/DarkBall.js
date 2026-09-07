import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ProjAI } from './../../../TL/ProjAI.js';

const { Color } = Modules;
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class DarkBall extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/DarkBall';
    }

    SetDefaults() {
        this.Projectile.width = 20;
        this.Projectile.height = 20;
        this.Projectile.scale = 0.9;
        this.Projectile.friendly = true;
        this.Projectile.melee = true;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 200;
        this.Projectile.tileCollide = false;
        this.Projectile.usesIDStaticNPCImmunity = true;
        this.Projectile.idStaticNPCHitCooldown = 10;
    }

    AI(proj) {
        try {
            if (SolidCollision(proj.position, proj.width, proj.height)) {
                proj.velocity.X = 0;
                proj.velocity.Y = -0.2;
            }
        } catch (e) { }
        if (Number(proj.timeLeft) <= 3 && Number(proj.width) < 128) {
            const cx = Number(proj.Center.X), cy = Number(proj.Center.Y);
            proj.tileCollide = false;
            proj.alpha = 255;
            proj.width = 128;
            proj.height = 128;
            proj.position.X = cx - 64;
            proj.position.Y = cy - 64;
            proj.knockBack = 8;
        }
        const ai = new ProjAI(proj);
        const gravityTimer = Math.min(10, Number(ai[0]) + 1);
        ai[0] = gravityTimer;
        if (gravityTimer >= 10) {
            if (Number(proj.velocity.Y) === 0 && Number(proj.velocity.X) !== 0) {
                proj.velocity.X *= 0.97;
                if (Math.abs(Number(proj.velocity.X)) < 0.01)
                    proj.velocity.X = 0;
            }
            proj.velocity.Y += 0.18;
        }
        proj.rotation += Number(proj.velocity.X) * 0.1;
    }

    OnHitNPC(proj, npc) {
        const buff = Number(ModBuff.getTypeByName('BrainRot') || 0);
        if (buff > 0)
            try {
                npc.AddBuff(buff, 120, false);
            } catch (e) { }
        proj.Kill();
    }

    OnKill(proj) {
        for (let i = 0; i < 40; i++) {
            try {
                const d = NewDust(proj.position, Math.max(1, proj.width), Math.max(1, proj.height), 14, 0, 0, 100, Color.White, i < 20 ? 1.5 : 2.5);
                if (d >= 0 && i >= 20)
                    Terraria.Main.dust[d].noGravity = true;
            } catch (e) { }
        }
    }
}
