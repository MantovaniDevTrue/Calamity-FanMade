import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
const { Vector2 } = Modules;
function center(e) {
    try { const r = e['Rectangle getRect()'](); return Vector2.new(Number(r.X) + Number(r.Width) * 0.5, Number(r.Y) + Number(r.Height) * 0.5); }
    catch (_) { try { return e.Center; } catch (_) { return Vector2.Zero; } }
}
function rotatingCollision(p, target) {
    try {
        const c = center(p), scale = Math.max(0.01, Number(p.scale) || 1);
        const hw = Number(p.width) * 0.5 * scale, hh = Number(p.height) * 0.5 * scale;
        const a = Number(p.rotation) || 0, ca = Math.cos(a), sa = Math.sin(a);
        const tx = Number(target.X) + Number(target.Width) * 0.5, ty = Number(target.Y) + Number(target.Height) * 0.5;
        const dx = tx - Number(c.X), dy = ty - Number(c.Y);
        const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
        const ex = Number(target.Width) * 0.5, ey = Number(target.Height) * 0.5;
        return Math.abs(lx) <= hw + Math.abs(ca) * ex + Math.abs(sa) * ey && Math.abs(ly) <= hh + Math.abs(sa) * ex + Math.abs(ca) * ey;
    } catch (_) { return null; }
}
export class StormSurgeTornado extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Ranged/StormSurgeTornado'; }
    SetStaticDefaults() { try { Terraria.Main.projFrames[this.Type] = 6; } catch (_) { } }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 160; p.height = 42; p.friendly = true; p.ranged = true;
        p.ignoreWater = true; p.tileCollide = false; p.penetrate = 2;
        p.usesIDStaticNPCImmunity = true; p.idStaticNPCHitCooldown = 10;
    }
    AI(p) {
        const vx = Number(p.velocity.X) || 0, vy = Number(p.velocity.Y) || 0;
        p.rotation = Math.atan2(vy, vx) + Math.PI / 2;
        const age = 1 + Math.max(0, Number(p.frameCounter) || 0);
        p.scale = 0.25 * Math.pow(1.03, age);
        p.frameCounter = age;
        p.frame = Math.floor(age / 3) % 6;
        if (Number(p.scale) >= 1) { try { p.Kill(); } catch (_) { p.active = false; } }
    }
    Colliding(p, myRect, targetRect) { return rotatingCollision(p, targetRect); }
}
