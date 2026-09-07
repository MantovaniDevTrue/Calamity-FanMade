import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function center(e) {
    try {
        const r = e['Rectangle getRect()']();
        return Vector2.new(N(r.X) + N(r.Width) * 0.5, N(r.Y) + N(r.Height) * 0.5);
    } catch (_) { try { return e.Center; } catch (_) { return Vector2.Zero; } }
}
function ownerOf(p) {
    const i = Math.floor(N(p.owner, -1));
    if (i < 0) return null;
    try { if (i === Math.floor(N(Terraria.Main.myPlayer, -2))) return Terraria.Main.LocalPlayer; } catch (_) { }
    try { return Terraria.Main.player.get_Item(i); } catch (_) { return null; }
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
    const tick = Math.floor(N(Terraria.Main.GameUpdateCount));
    if (tick < N(state.nextScan) && validTarget(state.target)) return state.target;
    state.nextScan = tick + 10;
    state.target = null;
    try {
        const found = resolveTarget(p.FindTargetWithinRange(range, true));
        if (validTarget(found)) state.target = found;
    } catch (_) { }
    return state.target;
}
function source(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { try { return p['IEntitySource GetProjectileSource_FromThis()'](); } catch (__) { return null; } } }

export class BelladonnaSpirit extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/BelladonnaSpirit'; this.BuffType = 0; this.PetalType = 0; }
    SetStaticDefaults() {
        try { Terraria.Main.projFrames[this.Type] = 5; } catch (_) { }
        try { Terraria.Main.projPet[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type] = true; } catch (_) { }
    }
    PostSetupContent() {
        this.BuffType = Number(ModBuff.getTypeByName('BelladonnaSpiritBuff') || 0);
        this.PetalType = Number(ModProjectile.getTypeByName('BelladonnaPetal') || 0);
    }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 28; p.height = 48; p.friendly = true; p.hostile = false;
        p.minion = true; p.minionSlots = 1; p.penetrate = -1; p.timeLeft = 18000;
        p.tileCollide = false; p.ignoreWater = true; p.aiStyle = -1; p.netImportant = true;
    }
    AI(p) {
        const pl = ownerOf(p);
        if (!pl || !pl.active || pl.dead) { try { p.Kill(); } catch (_) { p.active = false; } return; }
        if (!(this.BuffType > 0)) this.BuffType = Number(ModBuff.getTypeByName('BelladonnaSpiritBuff') || 0);
        let buffIndex = -1;
        try { buffIndex = this.BuffType > 0 ? pl.FindBuffIndex(this.BuffType) : -1; } catch (_) { }
        if (!(this.BuffType > 0) || buffIndex < 0) { try { p.Kill(); } catch (_) { p.active = false; } return; }
        p.timeLeft = 2;

        const st = FusionEntityData.GetProjectileBag(p, 'belladonnaSpirit', () => ({ shoot: 0, target: null, nextScan: 0 }));
        const pc = Terraria.PlayerCenter(pl), c = center(p);
        const dx = N(pc.X) - N(c.X), dy = N(pc.Y) - N(c.Y), dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1200) { p.Center = pc; p.velocity = Vector2.Zero; }
        else if (dist > 300) p.velocity = Vector2.new(dx / 30, dy / 30);
        else if (dist > 160) {
            const d = dist || 1;
            p.velocity = Vector2.new((N(p.velocity.X) * 37 + dx / d * 17) / 40, (N(p.velocity.Y) * 37 + dy / d * 17) / 40);
        }

        const target = acquireTarget(p, st, 1200);
        if (target) {
            st.shoot = N(st.shoot) + 1;
            p.velocity = Vector2.new(N(p.velocity.X), N(p.velocity.Y) - 0.005 * ((st.shoot % 75) / 75));
            if (st.shoot >= 75 && Math.floor(N(p.owner)) === Math.floor(N(Terraria.Main.myPlayer))) {
                st.shoot = 0;
                if (!(this.PetalType > 0)) this.PetalType = Number(ModProjectile.getTypeByName('BelladonnaPetal') || 0);
                if (this.PetalType > 0) {
                    const cc = center(p);
                    const v = Vector2.new(N(p.velocity.X) + (Math.random() * 2 - 1) * 0.35, -(7 + Math.random() * 1.5) + N(p.velocity.Y) * 0.35);
                    const petalIndex = NewProjectile(source(p), cc, v, this.PetalType, Math.max(1, N(p.damage)), N(p.knockBack), N(p.owner), 0, 0, 0, null);
                    if (petalIndex >= 0) {
                        let petal = null; try { petal = Terraria.Main.projectile.get_Item(Number(petalIndex)); } catch (_) { try { petal = Terraria.Main.projectile[petalIndex]; } catch (__) { } }
                        if (petal) { petal.originalDamage = Math.max(1, N(p.originalDamage, p.damage)); petal.friendly = true; petal.hostile = false; petal.netUpdate = true; }
                    }
                }
            }
            const tc = center(target);
            p.spriteDirection = N(tc.X) >= N(c.X) ? 1 : -1;
        } else p.spriteDirection = N(p.velocity.X) >= 0 ? 1 : -1;

        p.frameCounter = N(p.frameCounter) + 1;
        if (N(p.frameCounter) >= 7) { p.frameCounter = 0; p.frame = (N(p.frame) + 1) % 5; }
    }
    MinionContactDamage() { return false; }
}
