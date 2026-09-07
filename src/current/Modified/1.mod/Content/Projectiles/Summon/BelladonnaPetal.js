import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
const { Vector2, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function center(e) {
    try { const r = e['Rectangle getRect()'](); return Vector2.new(N(r.X) + N(r.Width) * .5, N(r.Y) + N(r.Height) * .5); }
    catch (_) { try { return e.Center; } catch (_) { return Vector2.Zero; } }
}
function resolveTarget(found) {
    if (found === null || found === undefined) return null;
    try { if (found.active !== undefined) return found; } catch (_) { }
    const i = Math.floor(N(found, -1));
    if (i < 0 || i >= 200) return null;
    try { return Terraria.Main.npc.get_Item(i); } catch (_) { return null; }
}
function validTarget(n) {
    if (!n) return false;
    try { return !!n.active && !n.friendly && !n.townNPC && !n.dontTakeDamage && N(n.life) > 0; }
    catch (_) { return false; }
}
function acquireTarget(p, state, range = 1200) {
    if (state.fired) return state.target;
    const tick = Math.floor(N(Terraria.Main.GameUpdateCount));
    if (tick < N(state.nextScan) && validTarget(state.target)) return state.target;
    state.nextScan = tick + 12;
    state.target = null;
    try {
        const found = resolveTarget(p.FindTargetWithinRange(range, true));
        if (validTarget(found)) state.target = found;
    } catch (_) { }
    return state.target;
}
function getVanillaTexture276() {
    try {
        const assets = Terraria.GameContent.TextureAssets.Projectile;
        let asset = null;
        try { asset = assets.get_Item(276); } catch (_) { }
        if (!asset) try { asset = assets[276]; } catch (_) { }
        return asset?.Value || null;
    } catch (_) { return null; }
}

export class BelladonnaPetal extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; this.VanillaTexture = null; }
    SetStaticDefaults() {
        try { Terraria.Main.projFrames[this.Type] = 2; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionShot[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 5; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0; } catch (_) { }
    }
    PostSetupContent() { this.VanillaTexture = getVanillaTexture276(); }
    SetDefaults() {
        const p = this.Projectile;
        p.timeLeft = 130; p.width = 14; p.height = 14; p.friendly = true;
        p.ignoreWater = true; p.tileCollide = false; p.penetrate = 1;
    }
    AI(p) {
        const st = FusionEntityData.GetProjectileBag(p, 'belladonnaPetal', () => ({ age: 0, fired: false, target: null, nextScan: 0 }));
        st.age = N(st.age) + 1;
        const target = acquireTarget(p, st, 1200);
        if (target && st.age >= 60) {
            if (!st.fired) {
                const c = center(p), t = center(target), dx = N(t.X) - N(c.X), dy = N(t.Y) - N(c.Y), d = Math.sqrt(dx * dx + dy * dy) || 1;
                p.velocity = Vector2.new(dx / d * 20, dy / d * 20);
                p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + Math.PI / 2;
                st.fired = true; p.alpha = 0;
            }
        } else if (target) {
            const c = center(p), t = center(target);
            p.rotation = Math.atan2(N(t.Y) - N(c.Y), N(t.X) - N(c.X)) + Math.PI / 2;
            p.velocity = Vector2.new(N(p.velocity.X), N(p.velocity.Y) + 0.2);
        } else {
            if (st.age >= 60) st.age = 0;
            p.alpha = Math.min(255, N(p.alpha) + 2);
            p.velocity = Vector2.new(N(p.velocity.X), N(p.velocity.Y) + 0.2);
            p.rotation = N(p.rotation) + 0.05;
        }
        p.frameCounter = N(p.frameCounter) + 1;
        if (N(p.frameCounter) >= 8) { p.frameCounter = 0; p.frame = (N(p.frame) + 1) % 2; }
    }
    CanDamage(p) {
        const st = FusionEntityData.GetProjectileBag(p, 'belladonnaPetal', () => ({ age: 0, fired: false, target: null, nextScan: 0 }));
        return st.fired ? null : false;
    }
    OnHitNPC(p, npc) { try { npc.AddBuff(Terraria.ID.BuffID.Poisoned, 240, false); } catch (_) { } }
    OnTileCollide() { return false; }
    PreDraw(p, lightColor) {
        try {
            const tex = this.VanillaTexture || (this.VanillaTexture = getVanillaTexture276());
            const draw = Terraria.Main.spriteBatch && Terraria.Main.spriteBatch[DrawTexture];
            if (!tex || !draw) return false;
            const c = center(p), sx = N(Terraria.Main.screenPosition?.X), sy = N(Terraria.Main.screenPosition?.Y);
            const h = Math.max(1, Math.floor(N(tex.Height) / 2));
            const frame = Math.max(0, Math.min(1, Math.floor(N(p.frame))));
            const src = Rectangle.new(0, frame * h, N(tex.Width), h);
            const origin = Vector2.new(N(tex.Width) * .5, h * .5);
            draw(tex, Vector2.new(N(c.X) - sx, N(c.Y) - sy), src, lightColor, N(p.rotation), origin, N(p.scale, 1), SpriteEffects.None, 0);
            return false;
        } catch (_) { return false; }
    }
}
