import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SandDustType = Number.isFinite(Number(Terraria.ID.DustID.Sand)) ? Math.floor(Number(Terraria.ID.DustID.Sand)) : 32;
export class DesertScourgeSpit extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/DesertScourgeSpit';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 4;
        try {
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 2;
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0;
        } catch (e) { }
    }

    SetDefaults() {
        this.Projectile.width = 16;
        this.Projectile.height = 16;
        this.Projectile.friendly = false;
        this.Projectile.hostile = true;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = 1;
        this.Projectile.timeLeft = 600;
        this.Projectile.aiStyle = 0;
        this.Projectile.alpha = 255;
        this.Projectile.light = 0.15;
    }

    AI(proj) {
        const age = 600 - Number(proj.timeLeft);
        proj.frameCounter++;
        if (proj.frameCounter > 4) {
            proj.frameCounter = 0;
            proj.frame = (Number(proj.frame) + 1) % 4;
        }
        if (age > 4)
            proj.alpha = Math.max(0, Number(proj.alpha) - 50);
        if (age > 60)
            proj.tileCollide = true;
        proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) + Math.PI * 0.5;
        if (age > 100) {
            proj.velocity = Vector2.new(Number(proj.velocity.X) * 0.995, Math.min(12, Number(proj.velocity.Y) + 0.035));
        }
        if (age % 8 === 0) {
            const dust = NewDust(proj.position, proj.width, proj.height, SandDustType, 0, 0, 100, Color.White, 0.85);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
    }

    OnHitPlayer(proj, player) {
        const vx = Number(player.velocity.X);
        const vy = Number(player.velocity.Y);
        player.velocity = Vector2.new(vx * 0.5, vy * 0.5);
    }

    OnKill(proj) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.PI * 2 * i / 10;
            NewDust(proj.position, proj.width, proj.height, SandDustType, Math.cos(angle) * 2.2, Math.sin(angle) * 2.2, 0, Color.White, 1.05);
        }
    }

    GetAlpha(proj, lightColor) {
        return Color.new(255, 235, 175, 255 - Number(proj.alpha));
    }
}
