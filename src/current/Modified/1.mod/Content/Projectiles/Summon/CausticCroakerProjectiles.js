import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { ProjectileSource, SpawnProjectile } from './../../../Core/SeaKingArsenalRuntime.js';

const { Vector2 } = Modules;
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = -1) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function validTarget(n) {
    try { return !!n && n.active && !n.friendly && !n.townNPC && !n.dontTakeDamage && N(n.life) > 0; }
    catch (_) { return false; }
}
function resolveTarget(found) {
    if (found === null || found === undefined) return null;
    try { if (found.active !== undefined) return found; } catch (_) { }
    const i = I(found);
    if (i < 0 || i >= 200) return null;
    try { return Terraria.Main.npc.get_Item(i); } catch (_) { return null; }
}
function centerXY(e) {
    try {
        const r = e['Rectangle getRect()']();
        return { x: N(r.X) + N(r.Width) * 0.5, y: N(r.Y) + N(r.Height) * 0.5 };
    } catch (_) {
        try { return { x: N(e.Center.X), y: N(e.Center.Y) }; } catch (_) { return { x: 0, y: 0 }; }
    }
}
function ownerOf(p) {
    const i = I(p.owner);
    if (i < 0 || i >= 255) return null;
    // Same access order used by the stable sentries in this port.
    try {
        const pl = Terraria.Main.player[i];
        if (pl) return pl;
    } catch (_) { }
    try {
        const pl = Terraria.Main.player.get_Item(i);
        if (pl) return pl;
    } catch (_) { }
    try { if (i === I(Terraria.Main.myPlayer)) return Terraria.Main.LocalPlayer; } catch (_) { }
    return null;
}
function rotate(x, y, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: x * c - y * s, y: x * s + y * c };
}
function applyIrradiated(target) {
    if (!target) return;
    const type = Number(ModBuff.getTypeByName('Irradiated') || 0);
    if (!(type > 0)) return;
    try { target.AddBuff(type, 720, false); } catch (_) {
        try { target['void AddBuff(int type, int time, bool quiet)'](type, 720, false); } catch (_) { }
    }
}

function frogState(p) {
    return FusionEntityData.GetProjectileBag(p, 'causticCroaker', () => ({
        charge: 75,
        nextTargetCheck: 0,
        grounded: false,
        allowKill: false,
        landingLogged: false
    }));
}
function solidAt(x, y, w, h) {
    try { return SolidCollision(Vector2.new(x, y), Math.max(1, I(w, 1)), Math.max(1, I(h, 1))) === true; }
    catch (_) { return false; }
}
function isLandingKill(p) {
    const x=N(p.position.X), y=N(p.position.Y), w=I(p.width,44), h=I(p.height,26);
    // TLPro can call Projectile.Kill after its native tile solver has already
    // changed velocity. Check the actual body and a tiny strip below instead
    // of relying on hitDirection/velocity from that late Kill hook.
    return solidAt(x, y, w, h) || solidAt(x + 2, y + h, Math.max(1, w - 4), 3);
}
function settleOnFloor(p, st) {
    // If the native collision step left the sentry a pixel inside a tile, lift
    // it a few pixels at most. This runs only when landing, never per-frame.
    let x=N(p.position.X), y=N(p.position.Y), w=I(p.width,44), h=I(p.height,26);
    for (let k=0; k<8 && solidAt(x,y,w,h); k++) y -= 1;
    try { p.position = Vector2.new(x,y); } catch (_) { }
    try { p.velocity = Vector2.new(0,0); } catch (_) { }
    p.tileCollide = false;
    st.grounded = true;
}

export class EXPLODINGFROG extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/EXPLODINGFROG';
        this.GoreTypes = null;
    }

    SetStaticDefaults() {
        try { Terraria.Main.projFrames[this.Type] = 5; } catch (_) { }
        // Sentry, not a buff-driven minion. Keeping MinionSacrificable enabled on
        // TLPro can route this projectile through vanilla minion cleanup.
        try { Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = false; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true; } catch (_) { }
    }

    PostSetupContent() {
        this.GoreTypes = [
            Number(ModProjectile.getTypeByName('FrogGore1') || 0),
            Number(ModProjectile.getTypeByName('FrogGore2') || 0),
            Number(ModProjectile.getTypeByName('FrogGore3') || 0),
            Number(ModProjectile.getTypeByName('FrogGore4') || 0),
            Number(ModProjectile.getTypeByName('FrogGore5') || 0)
        ];
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 44;
        p.height = 26;
        p.ignoreWater = true;
        p.tileCollide = true;
        p.sentry = true;
        p.timeLeft = 36000;
        p.penetrate = -1;
        p.friendly = false;
        p.hostile = false;
        p.aiStyle = -1;
    }

    OnSpawn(p) {
        try {
            const pl = ownerOf(p);
            tl.log(`[CalamityPort Croaker] spawned; who=${I(p.whoAmI)}; owner=${I(p.owner)}; active=${p.active===true}; timeLeft=${I(p.timeLeft)}; sentry=${p.sentry===true}; ownerActive=${!!pl && pl.active===true}; maxTurrets=${pl ? N(pl.maxTurrets,-1) : -1}.`);
        } catch (_) { }
    }

    AI(p) {
        const pl = ownerOf(p);
        // A sentry does not need a buff lease. If TLPro briefly fails to expose
        // the owner NativeObject, keep the projectile alive instead of deleting it.
        if (!pl) {
            if (I(p.timeLeft,0) < 2) p.timeLeft = 2;
            return;
        }
        if (pl.dead) {
            const deadState = frogState(p);
            deadState.allowKill = true;
            try { p.Kill(); } catch (_) { p.active = false; }
            return;
        }

        const st = frogState(p);

        // Five-frame idle animation, matching the official sentry.
        p.frameCounter = N(p.frameCounter) + 1;
        if (N(p.frameCounter) > 5) {
            p.frameCounter = 0;
            p.frame = (I(p.frame, 0) + 1) % 5;
        }

        st.charge = Math.min(120, N(st.charge, 75) + 1);

        // Once TLPro reports the first floor collision through Kill/PreKill,
        // the sentry is detached from the native tile-kill path and stays put.
        if (!st.grounded) {
            try { p.velocity = Vector2.new(N(p.velocity.X), Math.min(10, N(p.velocity.Y) + 0.5)); }
            catch (_) { }
        } else {
            try { p.velocity = Vector2.new(0, 0); } catch (_) { }
        }

        if (st.charge < 120)
            return;

        const tick = I(Terraria.Main.GameUpdateCount, 0);
        if (tick < I(st.nextTargetCheck, 0))
            return;
        st.nextTargetCheck = tick + 8;

        let target = null;
        try { target = resolveTarget(p.FindTargetWithinRange(128, true)); } catch (_) { }
        if (!validTarget(target))
            return;

        const pc = centerXY(p), tc = centerXY(target);
        const dx = tc.x - pc.x, dy = tc.y - pc.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Official attack blends mostly-upward with 25% target direction.
        let bx = (dx / len) * 0.25;
        let by = -0.75 + (dy / len) * 0.25;
        const bl = Math.sqrt(bx * bx + by * by) || 1;
        bx /= bl; by /= bl;

        if (I(p.owner) === I(Terraria.Main.myPlayer)) {
            if (!this.GoreTypes)
                this.PostSetupContent();
            const types = this.GoreTypes || [];
            const src = ProjectileSource(p, pl);
            const pattern = [0, 0, 0, 1, 1, 1, 2, 3, 4];
            for (let k = 0; k < pattern.length; k++) {
                const type = Number(types[pattern[k]] || 0);
                if (!(type > 0)) continue;
                const speed = 6 + Math.random() * 4;
                const r = rotate(bx * speed, by * speed, (Math.random() * 2 - 1) * 0.8);
                SpawnProjectile(src, p.Center, Vector2.new(r.x, r.y), type, N(p.damage, 8), N(p.knockBack, 0.25), I(p.owner, 0));
            }
        }

        st.charge = 0;
        try {
            if (st.grounded) {
                st.grounded = false;
                p.tileCollide = true;
                p.velocity = Vector2.new(0, -5);
            }
        } catch (_) { }
        p.netUpdate = true;
    }

    CanDamage() { return false; }

    OnTileCollide(p, hitDirection) {
        const st = frogState(p);
        settleOnFloor(p, st);
        if (!st.landingLogged) {
            st.landingLogged = true;
            try { tl.log(`[CalamityPort Croaker] landed through OnTileCollide; who=${I(p.whoAmI)}; timeLeft=${I(p.timeLeft)}.`); } catch (_) { }
        }
        return false;
    }

    PreKill(p, timeLeft) {
        const st = frogState(p);
        if (st.allowKill === true || I(timeLeft, 0) <= 1)
            return true;

        // TLPro Android can reach Projectile.Kill on the first tile impact
        // without exposing a usable late hitDirection to OnTileCollide. Treat
        // only a high-timeLeft kill while touching floor as a landing event.
        if (isLandingKill(p)) {
            settleOnFloor(p, st);
            if (!st.landingLogged) {
                st.landingLogged = true;
                try { tl.log(`[CalamityPort Croaker] landing Kill intercepted; who=${I(p.whoAmI)}; timeLeft=${I(timeLeft)}.`); } catch (_) { }
            }
            return false;
        }
        return true;
    }

    OnKill(p, timeLeft) {
        try {
            tl.log(`[CalamityPort Croaker] killed; who=${I(p.whoAmI)}; owner=${I(p.owner)}; timeLeft=${I(timeLeft,I(p.timeLeft))}; sentry=${p.sentry===true}.`);
        } catch (_) { }
    }
}

class FrogGoreBase extends ModProjectile {
    constructor(texture, width = 14, height = 14) {
        super();
        this.Texture = `Projectiles/Summon/${texture}`;
        this.W = width;
        this.H = height;
    }

    SetStaticDefaults() {
        try { Terraria.ID.ProjectileID.Sets.SentryShot[this.Type] = true; } catch (_) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.friendly = true;
        p.hostile = false;
        p.width = this.W;
        p.height = this.H;
        p.ignoreWater = true;
        p.tileCollide = true;
        p.timeLeft = 360;
        p.alpha = 255;
        p.penetrate = 1;
        p.aiStyle = -1;
    }

    AI(p) {
        const st = FusionEntityData.GetProjectileBag(p, 'causticCroakerGore', () => ({ age: 0 }));
        st.age = N(st.age) + 1;
        if (st.age < 10)
            p.alpha = Math.max(0, 255 - Math.floor(255 * st.age / 10));
        try { p.velocity = Vector2.new(N(p.velocity.X), Math.min(16, N(p.velocity.Y) + 0.2)); } catch (_) { }
        p.rotation = N(p.rotation) + N(p.velocity.X) * 0.03;
    }

    OnHitNPC(p, target) { applyIrradiated(target); }
}

export class FrogGore1 extends FrogGoreBase { constructor() { super('FrogGore1', 14, 14); } }
export class FrogGore2 extends FrogGoreBase { constructor() { super('FrogGore2', 14, 14); } }
export class FrogGore3 extends FrogGoreBase { constructor() { super('FrogGore3', 14, 16); } }
export class FrogGore4 extends FrogGoreBase { constructor() { super('FrogGore4', 14, 16); } }
export class FrogGore5 extends FrogGoreBase { constructor() { super('FrogGore5', 14, 16); } }
