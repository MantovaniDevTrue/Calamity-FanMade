import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = -1) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function player(o) {
    const i = I(o, -1); if (i < 0) return null;
    try { if (i === I(Terraria.Main.myPlayer, -2) && Terraria.Main.LocalPlayer) return Terraria.Main.LocalPlayer; } catch (_) { }
    try { return Terraria.Main.player.get_Item(i); } catch (_) { return null; }
}
function validPlayer(p) { return !!(p && p.active !== false && p.dead !== true); }
function src(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { return null; } }
function norm(v, s = 1) { const x = N(v?.X), y = N(v?.Y), l = Math.sqrt(x * x + y * y) || 1; return Vector2.new(x / l * s, y / l * s); }
function setArray(h, n, i, v) { try { let a = h[n], need = N(i) + 1, len = N(a?.Length, N(a?.length, 0)); if (len < need) { a = a.cloneResized(need); h[n] = a; } try { a['void SetValue(Object value, int index)'](v, N(i)); return true; } catch (_) { } try { a.set_Item(N(i), v); return true; } catch (_) { } return false; } catch (_) { return false; } }
function dust(p, id, c = 1, s = .8) { for (let i = 0; i < c; i++) try { NewDust(p.position, p.width, p.height, id, (Math.random() - .5) * 4, (Math.random() - .5) * 4, 100, Color.White, s); } catch (_) { } }
function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

const BasherHB = new Map(), BasherAim = new Map(), BasherSwingParity = new Map();
export function RegisterBasherAim(o, a) { BasherAim.set(Number(o), norm(a)); }
export function BasherHoldoutActive(o) {
    const now = N(Terraria.Main.GameUpdateCount), t = N(BasherHB.get(Number(o)), -9999);
    if (now - t <= 3) return true;
    BasherHB.delete(Number(o)); return false;
}
let BasherTexture = null;
function basherTexture() { if (BasherTexture) return BasherTexture; try { BasherTexture = tl.texture.load('Textures/Items/Weapons/Melee/Basher.png'); } catch (_) { } return BasherTexture; }

export class BasherHoldout extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Melee/Basher'; }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 100; p.height = 100; p.friendly = true; p.melee = true; p.penetrate = -1;
        p.timeLeft = 40; p.tileCollide = false; p.ignoreWater = true; p.scale = 1.1;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; p.aiStyle = -1;
    }
    OnSpawn(p) {
        const key = Number(p.owner);
        const parity = I(BasherSwingParity.get(key), 0) & 1;
        BasherSwingParity.set(key, parity ^ 1);
        FusionEntityData.GetProjectileBag(p, 'basher', () => ({ age: 0, baseDamage: Math.max(1, I(p.damage, 65)), parity, local: 0, hit: 0, recoil: null, recoilTicks: 0 }));
        BasherHB.set(key, N(Terraria.Main.GameUpdateCount));
    }
    AI(p) {
        const pl = player(p.owner);
        const s = FusionEntityData.GetProjectileBag(p, 'basher', () => ({ age: 0, baseDamage: Math.max(1, I(p.damage, 65)), parity: 0, local: 0, hit: 0, recoil: null, recoilTicks: 0 }));
        if (!validPlayer(pl)) { try { p.Kill(); } catch (_) { p.active = false; } return; }

        // Um holdout = um uso de 30 ticks. Isso mantém a arma sincronizada com a
        // animação real do item no TLPro e evita o holdout ficar preso depois do toque.
        s.age = I(s.age, 0) + 1;
        s.local = s.age - 1;
        if (s.age > 30) { try { p.Kill(); } catch (_) { p.active = false; } return; }
        BasherHB.set(Number(p.owner), N(Terraria.Main.GameUpdateCount));

        let aim = BasherAim.get(Number(p.owner)) || norm(p.velocity);
        try {
            if (I(p.owner) === I(Terraria.Main.myPlayer)) {
                const m = Terraria.Main.MouseWorld, c = pl.MountedCenter;
                const dx = N(m.X) - N(c.X), dy = N(m.Y) - N(c.Y);
                if (dx * dx + dy * dy > 4) aim = norm(Vector2.new(dx, dy));
            }
        } catch (_) { }
        BasherAim.set(Number(p.owner), aim);

        const dir = N(aim.X) >= 0 ? 1 : -1;
        const base = Math.atan2(N(aim.Y), N(aim.X));
        const progress = smooth(Math.min(1, s.local / 29));
        const swingSign = I(s.parity, 0) === 0 ? 1 : -1;
        // Arco amplo, mas o cabo continua preso na mão. Alterna o lado a cada uso.
        const relative = (-1.95 + 3.9 * progress) * swingSign * dir;
        const bladeAngle = base + relative;

        try { Terraria.SetPlayerDirection(pl, dir); } catch (_) { }
        p.direction = p.spriteDirection = dir;
        const grav = N(pl.gravDir, 1) < 0 ? -1 : 1;
        const bladeDir = Vector2.new(Math.cos(bladeAngle), Math.sin(bladeAngle));
        const hand = Vector2.Add(pl.MountedCenter, Vector2.new(N(bladeDir.X) * 10, N(bladeDir.Y) * 10 - 2 * grav));
        p.Center = hand;
        p.velocity = bladeDir;
        p.rotation = bladeAngle;
        p.timeLeft = 40;

        try {
            pl.heldProj = p.whoAmI;
            pl.itemRotation = base * dir;
            const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
            const arm = (bladeAngle - Math.PI / 2) * grav + (grav < 0 ? Math.PI : 0);
            const back = (base - Math.PI / 2) * grav + (grav < 0 ? Math.PI : 0);
            pl.SetCompositeArmFront(true, stretch, arm);
            pl.SetCompositeArmBack(true, stretch, back);
        } catch (_) { }
        if (s.recoilTicks > 0 && s.recoil) { try { pl.velocity = s.recoil; } catch (_) { } s.recoilTicks--; }
    }
    CanDamage(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'basher', () => ({ local: 0 }));
        return I(s.local, 0) >= 8 && I(s.local, 0) <= 22 ? null : false;
    }
    OnHitNPC(p, npc) {
        const s = FusionEntityData.GetProjectileBag(p, 'basher', () => ({ hit: 0, recoil: null, recoilTicks: 0, baseDamage: Math.max(1, I(p.damage, 65)) }));
        const b = Number(ModBuff.getTypeByName('Irradiated') || 0);
        if (b > 0) try { npc.AddBuff(b, 300, false); } catch (_) { }
        if (s.hit === 0) {
            const pl = player(p.owner), a = BasherAim.get(Number(p.owner)) || norm(p.velocity);
            if (pl) { s.recoil = Vector2.Multiply(a, -10); s.recoilTicks = 2; }
            try { npc.velocity = Vector2.Multiply(a, 10); } catch (_) { }
            try { PlayItemSound(1, p.Center, -0.35, 0.22); } catch (_) { }
        }
        s.hit++;
        p.damage = Math.max(1, Math.floor(I(s.baseDamage, 65) * Math.max(0.3, 1 - s.hit * 0.14)));
        dust(p, 75, Math.max(2, 5 - s.hit), .9);
    }
    PreDraw(p, lightColor) {
        const texture = basherTexture(); if (!texture) return true;
        try {
            const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            if (!draw) return true;
            const dir = I(p.spriteDirection, 1) < 0 ? -1 : 1;
            const pos = Vector2.new(N(p.Center.X) - N(Terraria.Main.screenPosition.X), N(p.Center.Y) - N(Terraria.Main.screenPosition.Y) + N(p.gfxOffY));
            const origin = dir < 0 ? Vector2.new(N(texture.Width), N(texture.Height)) : Vector2.new(0, N(texture.Height));
            const rotation = N(p.rotation) + (dir < 0 ? Math.PI - Math.PI / 4 : Math.PI / 4);
            const effects = dir < 0 ? SpriteEffects.FlipHorizontally : SpriteEffects.None;
            let color = lightColor; try { color = p.GetAlpha(lightColor); } catch (_) { }
            draw(texture, pos, null, color, rotation, origin, N(p.scale, 1.1), effects, 0);
            return false;
        } catch (_) { return true; }
    }
    OnKill(p) { BasherHB.delete(Number(p.owner)); BasherAim.delete(Number(p.owner)); }
}

export class SmokingCometYoyo extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Melee/Yoyos/SmokingCometYoyo'; }
    SetStaticDefaults() {
        setArray(Terraria.ID.ProjectileID.Sets, 'YoyosLifeTimeMultiplier', this.Type, 21);
        setArray(Terraria.ID.ProjectileID.Sets, 'YoyosMaximumRange', this.Type, 320);
        setArray(Terraria.ID.ProjectileID.Sets, 'YoyosTopSpeed', this.Type, 20);
    }
    SetDefaults() { const p = this.Projectile; p.aiStyle = 99; p.width = 16; p.height = 16; p.friendly = true; p.melee = true; p.penetrate = -1; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 15; }
    OnSpawn(p) { FusionEntityData.GetProjectileBag(p, 'smokingComet', () => ({ tick: 0 })); }
    AI(p) {
        const pl = player(p.owner); if (!validPlayer(pl)) { p.Kill(); return; }
        const s = FusionEntityData.GetProjectileBag(p, 'smokingComet', () => ({ tick: 0 })); s.tick++;
        if (s.tick % 27 === 0 && I(p.owner) === I(Terraria.Main.myPlayer)) {
            const t = 9, spawn = Vector2.new(N(p.Center.X) + Math.floor(Math.random() * 401) - 200, N(p.Center.Y) - 600), v = norm(Vector2.new(N(p.Center.X) - N(spawn.X), N(p.Center.Y) - N(spawn.Y)), 12);
            NewProjectile(src(p), spawn, v, t, Math.max(1, Math.floor(N(p.damage, 17))), N(p.knockBack, 1.5), p.owner, 0, 0, 0, null);
        }
        if (s.tick % 5 === 0) dust(p, 86, 1, .85);
    }
}
