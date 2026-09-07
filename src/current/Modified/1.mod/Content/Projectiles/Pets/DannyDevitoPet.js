import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2 } = Modules;
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function owner(index) { try { return Terraria.Main.player.get_Item(Math.floor(N(index, -1))); } catch (_) { try { return Terraria.Main.player[Math.floor(N(index, -1))]; } catch (_) { return null; } } }
function center(entity) { try { return { x: N(entity.Center.X), y: N(entity.Center.Y) }; } catch (_) { return { x: N(entity.position?.X) + N(entity.width) * .5, y: N(entity.position?.Y) + N(entity.height) * .5 }; } }

export class DannyDevitoPet extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Pets/DannyDevitoPet'; }
    SetStaticDefaults() { Terraria.Main.projFrames[this.Type] = 8; Terraria.Main.projPet[this.Type] = true; }
    SetDefaults() {
        const p = this.Projectile;
        p.netImportant = true; p.width = 42; p.height = 42; p.friendly = true; p.hostile = false;
        p.penetrate = -1; p.timeLeft = 18000; p.tileCollide = true; p.aiStyle = -1; p.hide = false;
    }
    State(p) { return FusionEntityData.GetProjectileBag(p, 'trashManPet', () => ({ fly: false, still: 0 })); }
    AI(p) {
        const plr = owner(p.owner);
        if (!plr || !plr.active || plr.dead) { try { p.Kill(); } catch (_) { p.active = false; } return; }
        const buff = Number(ModBuff.getTypeByName('DannyDevito') || 0);
        let hasBuff = false; try { hasBuff = buff > 0 && Number(plr.FindBuffIndex(buff)) >= 0; } catch (_) { }
        if (!hasBuff) { try { p.Kill(); } catch (_) { p.active = false; } return; }
        p.timeLeft = 2;
        const s = this.State(p), pc = center(plr), c = center(p);
        let dx = pc.x - c.x, dy = pc.y - c.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1200) { p.position = Vector2.new(pc.x - N(p.width) * .5, pc.y - N(p.height) * .5); p.netUpdate = true; return; }

        if (!s.fly) {
            p.tileCollide = true; p.rotation = 0;
            if (d > 600) { s.fly = true; p.tileCollide = false; p.velocity = Vector2.Zero; }
            else {
                let vx = N(p.velocity.X), vy = N(p.velocity.Y);
                if (d > 100) vx += (dx > 0 ? .1 : -.1);
                else if (vx > .5) vx -= .15; else if (vx < -.5) vx += .15; else vx = 0;
                vx = Math.max(-7, Math.min(7, vx));
                if (Math.abs(dx) > 110 && Math.abs(vx) < .05) vy = -5;
                vy = Math.min(7, vy + .2);
                p.velocity = Vector2.new(vx, vy);
                if (Math.abs(vx) < .01 && Math.abs(vy) < .01) p.frame = 0;
                else if (vy > .3) { p.frame = 1; p.frameCounter = 0; }
                else { p.frameCounter = N(p.frameCounter) + 1; if (N(p.frameCounter) > 5) { p.frameCounter = 0; p.frame = N(p.frame) + 1; } if (N(p.frame) < 2 || N(p.frame) > 6) p.frame = 2; }
            }
        }
        if (s.fly) {
            p.tileCollide = false;
            const dir = N(plr.direction, 1) || 1;
            const tx = pc.x - 60 * dir, ty = pc.y - 60;
            dx = tx - c.x; dy = ty - c.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
            let accel = d > 300 ? 1 : (d < 100 ? .1 : .3);
            const wantedX = dx / d * 18, wantedY = dy / d * 18;
            let vx = N(p.velocity.X), vy = N(p.velocity.Y);
            vx += Math.max(-accel, Math.min(accel, wantedX - vx));
            vy += Math.max(-accel * 2, Math.min(accel * 2, wantedY - vy));
            p.velocity = Vector2.new(vx, vy); p.rotation = vx * .03; p.frame = 7;
            if (d < 100 && Math.abs(N(plr.velocity?.Y)) < .01) s.still = N(s.still) + 1; else s.still = 0;
            if (N(s.still) > 60) {
                let solid = false; try { solid = SolidCollision(p.position, N(p.width), N(p.height)) === true; } catch (_) { }
                if (!solid) { s.fly = false; s.still = 0; p.tileCollide = true; }
            }
        }
        if (N(p.velocity.X) > .25) p.spriteDirection = -1; else if (N(p.velocity.X) < -.25) p.spriteDirection = 1;
    }
    CanDamage() { return false; }
    CanCutTiles() { return false; }
    OnKill(p) { FusionEntityData.ClearProjectile(p); }
}
