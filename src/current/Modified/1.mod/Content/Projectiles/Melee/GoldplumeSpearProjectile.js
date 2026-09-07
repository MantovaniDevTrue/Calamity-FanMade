import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const states = new Array(1000);
let FeatherType = 0;

function idx(p) { const n = Number(p && p.whoAmI); return Number.isFinite(n) ? n | 0 : -1; }
function sourceFrom(p, owner) {
    let source = null;
    try { source = p.GetProjectileSource_FromThis(); } catch (e) { }
    if (!source && owner) try { source = owner.GetProjectileSource_Item(owner.HeldItem); } catch (e) { }
    return source;
}
function rotateRandom(v, maxRadians) {
    const a = (Math.random() * 2 - 1) * maxRadians;
    const c = Math.cos(a), s = Math.sin(a);
    const x = Number(v.X), y = Number(v.Y);
    return Vector2.new(x * c - y * s, x * s + y * c);
}

export class GoldplumeSpearProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/Spears/GoldplumeSpearProjectile';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 40;
        p.height = 40;
        p.melee = true;
        p.timeLeft = 90;
        p.friendly = true;
        p.hostile = false;
        p.tileCollide = false;
        p.ignoreWater = true;
        p.penetrate = -1;
        p.ownerHitCheck = true;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 10;
        p.aiStyle = -1;
        p.drawLayer = 7;
    }

    OnSpawn(p) {
        const s = idx(p);
        if (s < 0 || s >= states.length) return;
        const owner = Terraria.Main.player[p.owner];
        let vx = Number(p.velocity.X), vy = Number(p.velocity.Y);
        let speed = Math.sqrt(vx * vx + vy * vy);
        if (!(speed > 0.001)) {
            speed = 8;
            vx = (Number(Terraria.PlayerDirection(owner)) || 1) * speed;
            vy = 0;
            p.velocity = Vector2.new(vx, vy);
        }
        states[s] = { timer: 0, extension: 0, dx: vx / speed, dy: vy / speed, speed, burst: false };
    }

    AI(p) {
        const owner = Terraria.Main.player[p.owner];
        if (!owner || !owner.active || owner.dead) { p.Kill(); return; }
        const s = idx(p);
        if (s < 0 || s >= states.length) return;
        let st = states[s];
        if (!st) { this.OnSpawn(p); st = states[s]; if (!st) return; }
        st.timer++;
        const speed = Math.max(0.001, Number(st.speed) || 8);
        const vel = Vector2.new(Number(st.dx) * speed, Number(st.dy) * speed);
        p.velocity = vel;
        const dir = Number(st.dx) < 0 ? -1 : 1;
        p.direction = dir;
        p.spriteDirection = 1; // manual BaseSpear draw is never texture-flipped
        try { owner.ChangeDir(dir); } catch (e) { Terraria.SetPlayerDirection(owner, dir); }
        try { owner.heldProj = p.whoAmI; owner.itemTime = owner.itemAnimation; } catch (e) { }

        const maxAnim = Math.max(1, Number(owner.itemAnimationMax) || 25);
        let anim = Number(owner.itemAnimation);
        if (!(anim > 0)) anim = Math.max(0, maxAnim - st.timer + 1);
        let center = owner.MountedCenter;
        try { center = owner.RotatedRelativePoint(owner.MountedCenter, false, true); } catch (e) { }
        let ext = Number(st.extension || 0);
        p.Center = Vector2.new(Number(center.X) + Number(vel.X) * ext, Number(center.Y) + Number(vel.Y) * ext);
        if (ext === 0) ext = 3;
        if (anim < maxAnim / 3) {
            ext -= 1.1;
            if (!st.burst && Number(p.owner) === Number(Terraria.Main.myPlayer)) {
                st.burst = true;
                if (!(FeatherType > 0)) FeatherType = Number(ModProjectile.getTypeByName('Feather') || 0);
                if (FeatherType > 0) {
                    const source = sourceFrom(p, owner);
                    for (let k = 0; k < 3; k++) {
                        const m = 1.55 + Math.random() * 0.30;
                        const fv = rotateRandom(vel, Math.PI / 40);
                        const launch = Vector2.new(Number(fv.X) * m, Number(fv.Y) * m);
                        const spawn = Vector2.new(Number(p.Center.X) - Number(vel.X) * 4, Number(p.Center.Y) - Number(vel.Y) * 4);
                        NewProjectile(source, spawn, launch, FeatherType, Math.max(1, Math.floor(Number(p.damage) * 0.5)), 0, p.owner, 0, 0, 0, null);
                    }
                }
            }
        } else ext += 0.4;
        st.extension = ext;
        p.rotation = Math.atan2(Number(vel.Y), Number(vel.X)) + Math.PI * 0.75;

        if (anim <= 1 || st.timer > maxAnim + 6) p.Kill();
    }

    PreDraw(p, lightColor) {
        // BaseSpearProjectile on PC draws from the projectile Center with a zero
        // texture origin. TLPro's default projectile draw centers the texture,
        // which displaced these spears by roughly half their sprite size.
        try {
            const texture = Terraria.GameContent.TextureAssets.Projectile[this.Type]?.Value;
            if (!texture) return true;
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            if (!draw) return true;
            const screen = Terraria.Main.screenPosition;
            const pos = Vector2.new(Number(p.Center.X) - Number(screen.X), Number(p.Center.Y) - Number(screen.Y) + Number(p.gfxOffY || 0));
            let color = lightColor;
            try { color = p.GetAlpha(lightColor); } catch (_) { }
            draw(texture, pos, null, color, Number(p.rotation), Vector2.Zero, Number(p.scale || 1), SpriteEffects.None, 0);
            return false;
        } catch (_) { return true; }
    }

    OnKill(p) {
        const s = idx(p);
        if (s >= 0 && s < states.length) states[s] = null;
    }
}
