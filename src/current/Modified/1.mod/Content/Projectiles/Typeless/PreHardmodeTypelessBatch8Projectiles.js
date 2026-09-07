import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2, Color } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function src(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { return null; } }
function getSpawn(id) { try { return Terraria.Main.projectile.get_Item(Number(id)); } catch (_) { return null; } }
function bag(p) { return FusionEntityData.GetProjectileBag(p, 'aeroExplosive', () => ({ age: 0, prevX: 0, prevY: 0, skipPreKill: false, exploded: false })); }
function dust(p, type, count, scale) { for (let i = 0; i < count; i++) try { NewDust(p.position, p.width, p.height, type, N(p.velocity.X) * .25, N(p.velocity.Y) * .25, 100, Color.White, scale); } catch (_) { } }

export class AeroExplosive extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Typeless/Skynamite'; }
    SetDefaults() { const p = this.Projectile; p.width = 15; p.height = 15; p.friendly = true; p.hostile = false; p.tileCollide = true; p.penetrate = -1; p.timeLeft = 300; p.aiStyle = -1; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 10; }
    OnSpawn(p) { bag(p); }
    AI(p) {
        const s = bag(p); s.age++; s.prevX = N(p.velocity.X); s.prevY = N(p.velocity.Y);
        const drag = Math.max(.96, .999 - Math.floor(s.age / 4) * .001); p.velocity = Vector2.new(N(p.velocity.X) * drag, N(p.velocity.Y) * drag); p.rotation = N(p.rotation) + Math.sqrt(N(p.velocity.X) ** 2 + N(p.velocity.Y) ** 2) * .09 * (N(p.velocity.X) >= 0 ? 1 : -1);
        if (Math.random() < .2) dust(p, 187, 1, 1); if (Math.random() < .2) dust(p, 31, 1, .8); if (Math.random() < .45) dust(p, 6, 1, .9);
    }
    CanDamage() { return false; }
    OnTileCollide(p) {
        const s = bag(p); s.skipPreKill = true;
        let vx = N(p.velocity.X), vy = N(p.velocity.Y), changed = false;
        if (Math.abs(vx - s.prevX) > .01) { vx = -s.prevX * .1; changed = true; }
        if (Math.abs(vy - s.prevY) > .01) { vy = -s.prevY * .1; changed = true; }
        if (!changed) { vx = -s.prevX * .1; vy = -s.prevY * .1; }
        p.velocity = Vector2.new(vx, vy); return false;
    }
    PreKill(p) {
        const s = bag(p); if (s.skipPreKill) { s.skipPreKill = false; return false; } if (s.exploded) return true; s.exploded = true;
        // Let Terraria's own Dynamite projectile perform the final blast. This keeps
        // vanilla explosion protection/radius rules instead of brute-force KillTile calls.
        if (Number(p.owner) === Number(Terraria.Main.myPlayer)) {
            const id = NewProjectile(src(p), p.Center, Vector2.Zero, 29, 250, 10, p.owner, 0, 0, 0, null), q = getSpawn(id);
            if (q) { try { q.damage = 250; q.originalDamage = 250; q.knockBack = 10; q.timeLeft = 3; q.friendly = true; q.netUpdate = true; } catch (_) { } }
        }
        dust(p, 187, 10, 1.4); dust(p, 31, 8, 1.2); return true;
    }
}
