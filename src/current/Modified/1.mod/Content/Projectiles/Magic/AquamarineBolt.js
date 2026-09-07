import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function center(e) {
    try { const r = e['Rectangle getRect()'](); return Vector2.new(N(r.X) + N(r.Width) * 0.5, N(r.Y) + N(r.Height) * 0.5); }
    catch (_) { try { return e.Center; } catch (_) { return Vector2.Zero; } }
}
export class AquamarineBolt extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Magic/AquamarineBolt'; }
    SetStaticDefaults() {
        try { Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 2; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0; } catch (_) { }
    }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 16; p.height = 16; p.friendly = true; p.magic = true;
        p.ignoreWater = true; p.penetrate = 1;
    }
    AI(p) {
        p.rotation = N(p.rotation) + 0.3 * (N(p.direction) || 1);
        const c = center(p);
        try {
            Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'](
                c, 2, 2, 68, N(p.velocity.X) * 0.5, N(p.velocity.Y) * 0.5, 100, null, 1.5);
            if (Math.random() < 0.0625) {
                Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'](
                    c, 2, 2, 68, N(p.velocity.X) * 0.5, N(p.velocity.Y) * 0.5, 100, null, 1.0);
            }
        } catch (_) { }
    }
}
