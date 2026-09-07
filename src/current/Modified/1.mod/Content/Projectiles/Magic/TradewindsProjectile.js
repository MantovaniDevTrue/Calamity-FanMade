import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const dustClock = new Int16Array(1000);
const lastVX = new Float32Array(1000);
const lastVY = new Float32Array(1000);
function idx(p) { const n = Number(p && p.whoAmI); return Number.isFinite(n) ? n | 0 : -1; }

export class TradewindsProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/TradewindsProjectile';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 14;
        p.height = 14;
        p.friendly = true;
        p.penetrate = 2;
        p.timeLeft = 600;
        p.magic = true;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
    }

    OnSpawn(p) { const s = idx(p); if (s >= 0 && s < dustClock.length) { dustClock[s] = s % 8; lastVX[s] = Number(p.velocity.X); lastVY[s] = Number(p.velocity.Y); } }

    AI(p) {
        p.rotation = Math.atan2(Number(p.velocity.Y), Number(p.velocity.X)) + Math.PI / 2;
        const s = idx(p);
        if (s >= 0 && s < dustClock.length) { lastVX[s] = Number(p.velocity.X); lastVY[s] = Number(p.velocity.Y); }
        if (s >= 0 && s < dustClock.length) {
            dustClock[s]++;
            if (dustClock[s] >= 8) {
                dustClock[s] = 0;
                try { NewDust(Vector2.new(Number(p.position.X) + Number(p.velocity.X), Number(p.position.Y) + Number(p.velocity.Y)), p.width, p.height, 64, 0, 0, 0, Color.White, 1); } catch (e) { }
            }
        }
    }

    OnTileCollide(p, hitDirection) {
        p.penetrate = Number(p.penetrate) - 1;
        if (Number(p.penetrate) <= 0) return true;
        const s = idx(p);
        const ovx = s >= 0 ? Number(lastVX[s]) : Number(p.velocity.X);
        const ovy = s >= 0 ? Number(lastVY[s]) : Number(p.velocity.Y);
        let vx = Number(p.velocity.X), vy = Number(p.velocity.Y);
        // TLPro exposes hitDirection instead of Terraria's oldVelocity callback, so use the cached pre-collision velocity.
        if (Math.abs(vx - ovx) > 0.001) vx = -ovx;
        if (Math.abs(vy - ovy) > 0.001) vy = -ovy;
        p.velocity = Vector2.new(vx * 0.75, vy * 0.75);
        if (s >= 0) { lastVX[s] = Number(p.velocity.X); lastVY[s] = Number(p.velocity.Y); }
        return false;
    }

    OnHitNPC(p, npc) { p.velocity = Vector2.new(Number(p.velocity.X) * 0.75, Number(p.velocity.Y) * 0.75); }

    OnKill(p) { const s = idx(p); if (s >= 0 && s < dustClock.length) { dustClock[s] = 0; lastVX[s] = 0; lastVY[s] = 0; } }
}
