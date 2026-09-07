import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class PerforaMini extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Pets/PerforaMini';
        this.BuffType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 8;
        Terraria.Main.projPet[this.Type] = true;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.netImportant = true;
        p.width = 32;
        p.height = 32;
        p.friendly = true;
        p.penetrate = -1;
        p.timeLeft = 90000;
        p.tileCollide = false;
        p.ignoreWater = true;
        p.aiStyle = -1;
    }

    AI(p) {
        const owner = Terraria.Main.player[p.owner];
        if (!(this.BuffType > 0))
            this.BuffType = Number(ModBuff.getTypeByName('BloodBound') || 0);
        let ok = owner && owner.active && !owner.dead;
        try {
            ok = ok && owner.FindBuffIndex(this.BuffType) >= 0;
        } catch (e) {
            ok = false;
        }
        if (!ok) {
            p.Kill();
            return;
        }
        p.timeLeft = 2;
        const tx = Number(Terraria.PlayerCenterX(owner)) - Number(Terraria.PlayerDirection(owner) || 1) * 55, ty = Number(Terraria.PlayerCenterY(owner)) - 55, dx = tx - Number(p.Center.X), dy = ty - Number(p.Center.Y), dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2000 && Number(p.owner) === Number(Terraria.Main.myPlayer)) {
            p.Center = Vector2.new(tx, ty);
            p.velocity = Vector2.Zero;
            p.netUpdate = true;
        } else if (dist > 12) {
            const sp = dist > 300 ? 12 : (dist > 100 ? 8 : 5);
            p.velocity = Vector2.new((Number(p.velocity.X) * 20 + dx / Math.max(1, dist) * sp) / 21, (Number(p.velocity.Y) * 20 + dy / Math.max(1, dist) * sp) / 21);
        } else
            p.velocity = Vector2.new(Number(p.velocity.X) * 0.94, Number(p.velocity.Y) * 0.94);
        if (Math.abs(Number(p.velocity.X)) > 0.2) {
            p.direction = Number(p.velocity.X) < 0 ? -1 : 1;
            p.spriteDirection = p.direction;
        }
        p.frameCounter++;
        if (p.frameCounter > 6) {
            p.frame = (Number(p.frame) + 1) % 6;
            p.frameCounter = 0;
        }
        if (Math.random() < 0.02) {
            const d = NewDust(p.position, p.width, p.height, 5, 0, 0, 100, Color.White, 1.3);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
    }
}
