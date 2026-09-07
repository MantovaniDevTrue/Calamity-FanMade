import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ProjAI } from './../../../TL/ProjAI.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class ShadeFire extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/InvisibleProj';
    }

    SetDefaults() {
        this.Projectile.width = 6;
        this.Projectile.height = 6;
        this.Projectile.friendly = true;
        this.Projectile.ranged = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = 3;
        this.Projectile.extraUpdates = 2;
        this.Projectile.timeLeft = 60;
        this.Projectile.usesIDStaticNPCImmunity = true;
        this.Projectile.idStaticNPCHitCooldown = 12;
    }

    AI(proj) {
        const ai = new ProjAI(proj);
        const time = Number(ai[0]) + 1;
        ai[0] = time;
        if (time < 6)
            return;
        const t = Math.max(0, Math.min(1, (time - 6) / 30));
        proj.scale = 1.5 * t;
        try {
            const d = NewDust(proj.Center, 2, 2, 14, Number(proj.velocity.X) * 0.3, Number(proj.velocity.Y) * 0.3, 120, Color.White, 0.8 + Math.random() * 0.8);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        } catch (e) { }
    }

    Colliding(proj, myRect, targetRect) {
        const cx = Number(proj.Center.X), cy = Number(proj.Center.Y);
        const left = Number(targetRect.X), top = Number(targetRect.Y);
        const right = left + Number(targetRect.Width), bottom = top + Number(targetRect.Height);
        const nx = Math.max(left, Math.min(cx, right)), ny = Math.max(top, Math.min(cy, bottom));
        const dx = cx - nx, dy = cy - ny, radius = 26 * Math.max(0.1, Number(proj.scale) || 1);
        return dx * dx + dy * dy <= radius * radius;
    }

    OnHitNPC(proj, npc) {
        const buff = Number(ModBuff.getTypeByName('BrainRot') || 0);
        if (buff > 0)
            try {
                npc.AddBuff(buff, 1200, false);
            } catch (e) { }
    }

    PreDraw() {
        return false;
    }
}
