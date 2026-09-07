import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile, MarkStealthStrike, IsStealthStrike } from './../../../Core/RogueRuntime.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';

const { Vector2, Rectangle, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaledTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function src(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { return null; } }
function getSpawn(id) { try { return Terraria.Main.projectile.get_Item(Number(id)); } catch (_) { return null; } }
function playerAt(owner) { const i = Math.floor(N(owner, -1)); if (i < 0) return null; try { if (i === Math.floor(N(Terraria.Main.myPlayer, -2))) return Terraria.Main.LocalPlayer; } catch (_) { } try { return Terraria.Main.player.get_Item(i); } catch (_) { return null; } }
function npcAt(index) { const i = Math.floor(N(index, -1)); if (!(i >= 0 && i < 200)) return null; try { return Terraria.Main.npc.get_Item(i); } catch (_) { return null; } }
function validNpc(n) { return !!(n && n.active !== false && n.friendly !== true && N(n.life) > 0 && n.dontTakeDamage !== true); }
function dust(p, type, count = 1, scale = 1, alpha = 100) { for (let i = 0; i < count; i++) try { NewDust(p.position, p.width, p.height, type, N(p.velocity.X) * .2, N(p.velocity.Y) * .2, alpha, Color.White, scale); } catch (_) { } }
function norm(v, speed = 1) { const x = N(v && v.X), y = N(v && v.Y), d = Math.sqrt(x * x + y * y) || 1; return Vector2.new(x / d * speed, y / d * speed); }
function rotateTowards(current, target, maxDelta) { let d = target - current; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; d = Math.max(-maxDelta, Math.min(maxDelta, d)); return current + d; }

export class SludgeSplotchProj1 extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Rogue/SludgeSplotchProj1'; }
    SetDefaults() { const p = this.Projectile; p.width = 14; p.height = 14; p.friendly = true; p.hostile = false; p.penetrate = 1; p.timeLeft = 300; p.aiStyle = -1; }
    OnSpawn(p) { MarkRogueProjectile(p, 'SludgeSplotch', false); }
    AI(p) { p.velocity = Vector2.new(N(p.velocity.X), Math.min(16, N(p.velocity.Y) + .1)); p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)); dust(p, 191, 2, 3, 225); }
    OnHitNPC(p, npc) { try { npc.AddBuff(Number(Terraria.ID.BuffID.Slimed || 137), 120, false); } catch (_) { } }
    PreKill(p) {
        if (IsStealthStrike(p) && Number(p.owner) === Number(Terraria.Main.myPlayer)) {
            const t = Number(ModProjectile.getTypeByName('SludgeSplotchProj2') || 0);
            for (let i = 0; i < 3 && t > 0; i++) {
                const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 2;
                const id = NewProjectile(src(p), p.Center, Vector2.new(Math.cos(a) * s, Math.sin(a) * s), t, Math.max(1, Math.floor(N(p.damage))), 0, p.owner, 0, 0, 0, null);
                const q = getSpawn(id); if (q) MarkRogueProjectile(q, 'SludgeSplotch', true);
            }
        }
        dust(p, 191, 20, 3, 175); try { PlayItemSound(9, p.Center, 0, .28); } catch (_) { } return true;
    }
}

export class SludgeSplotchProj2 extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Rogue/SludgeSplotchProj2'; }
    SetDefaults() { const p = this.Projectile; p.width = 6; p.height = 6; p.friendly = true; p.hostile = false; p.penetrate = 2; p.timeLeft = 150; p.aiStyle = -1; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; }
    OnSpawn(p) { MarkRogueProjectile(p, 'SludgeSplotch', true); }
    AI(p) { p.velocity = Vector2.new(N(p.velocity.X), Math.min(16, N(p.velocity.Y) + .1)); p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)); dust(p, 191, 1, 2, 225); }
    OnHitNPC(p, npc) { try { npc.AddBuff(Number(Terraria.ID.BuffID.Slimed || 137), 60, false); } catch (_) { } }
    OnTileCollide() { return true; }
    PreKill(p) { dust(p, 191, 10, 2, 175); return true; }
}

function meteorBag(p) { return FusionEntityData.GetProjectileBag(p, 'meteorFist', () => ({ age: 0, hit: false, target: -1 })); }
function aimWorld(owner, fallback) {
    let result = fallback;
    if (Number(owner && Terraria.PlayerIndex(owner)) !== Number(Terraria.Main.myPlayer)) return result;
    try { const m = Terraria.Main.MouseWorld; if (Number.isFinite(Number(m.X)) && Number.isFinite(Number(m.Y))) result = m; } catch (_) { }
    return result;
}
function drawWire(p, owner) {
    try {
        const tex = Terraria.GameContent.TextureAssets.MagicPixel && Terraria.GameContent.TextureAssets.MagicPixel.Value; if (!tex) return;
        const draw = Terraria.Main.spriteBatch && Terraria.Main.spriteBatch[DrawScaledTexture]; if (!draw) return;
        const a = Terraria.PlayerCenter(owner), b = p.Center, dx = N(b.X) - N(a.X), dy = N(b.Y) - N(a.Y), len = Math.sqrt(dx * dx + dy * dy); if (!(len > 3)) return;
        const sx = N(Terraria.Main.screenPosition && Terraria.Main.screenPosition.X), sy = N(Terraria.Main.screenPosition && Terraria.Main.screenPosition.Y);
        draw(tex, Vector2.new(N(a.X) - sx, N(a.Y) - sy), Rectangle.new(0, 0, 1, 1), Color.White, Math.atan2(dy, dx), Vector2.new(0, .5), Vector2.new(len, .8), SpriteEffects.None, 0);
    } catch (_) { }
}

export class MeteorFistProj extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Rogue/MeteorFistProj'; }
    SetDefaults() { const p = this.Projectile; p.width = 20; p.height = 20; p.friendly = true; p.hostile = false; p.penetrate = 2; p.timeLeft = 210; p.aiStyle = -1; p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = -1; }
    OnSpawn(p) { MarkRogueProjectile(p, 'MeteorFist', false); meteorBag(p); }
    AI(p) {
        const s = meteorBag(p), owner = playerAt(p.owner); if (!owner || owner.active === false || owner.dead === true) { p.Kill(); return; }
        s.age++;
        if (!s.hit) {
            const target = aimWorld(owner, Vector2.Add(p.Center, Vector2.Multiply(p.velocity, 100)));
            const dx = N(target.X) - N(p.Center.X), dy = N(target.Y) - N(p.Center.Y), targetAngle = Math.atan2(dy, dx), current = Math.atan2(N(p.velocity.Y), N(p.velocity.X));
            let speed = (!IsStealthStrike(p) && s.age < 60) ? 4 : (s.age + (IsStealthStrike(p) ? 60 : 0)) / 7.5; speed = Math.min(22.5, Math.max(4, speed));
            const t = Math.min(1, s.age / 210), turn = .05 + ((IsStealthStrike(p) ? .32 : .18) - .05) * t, angle = rotateTowards(current, targetAngle, turn);
            p.velocity = Vector2.new(Math.cos(angle) * speed, Math.sin(angle) * speed);
            p.rotation = angle + Math.PI / 2;
            if (s.age >= 208) this.SetLeftover(p, s);
        } else {
            p.velocity = Vector2.new(N(p.velocity.X) * .9, Math.min(10, N(p.velocity.Y) + .2)); p.rotation = 0;
        }
        if (!s.hit) { dust(p, 6, 1, .7, 100); if (Math.sqrt(N(p.velocity.X) ** 2 + N(p.velocity.Y) ** 2) >= 7 && s.age % 3 === 0) dust(p, 31, 1, .6, 140); }
    }
    CanDamage(p) { return meteorBag(p).hit ? false : null; }
    OnTileCollide(p) { const s = meteorBag(p); if (!s.hit) this.SetLeftover(p, s); return false; }
    OnHitNPC(p, npc) {
        const s = meteorBag(p); if (s.hit) return;
        try { npc.AddBuff(Terraria.ID.BuffID.OnFire, 120, false); } catch (_) { }
        if (IsStealthStrike(p) && Number(p.owner) === Number(Terraria.Main.myPlayer)) this.SpawnMeteor(p, npc);
        this.SetLeftover(p, s);
    }
    SetLeftover(p, s) { if (s.hit) return; s.hit = true; p.timeLeft = 90; p.tileCollide = false; try { PlayItemSound(14, p.Center, 0, .26); } catch (_) { } dust(p, 6, 16, 1.3, 100); }
    SpawnMeteor(p, npc) {
        const t = Number(ModProjectile.getTypeByName('MeteorFistMeteorite') || 0); if (!(t > 0) || !npc) return;
        const spawn = Vector2.new(N(npc.Center.X) + Math.random() * 200 - 100, N(npc.Center.Y) - 650 - Math.random() * 100);
        const v = norm(Vector2.new(N(npc.Center.X) - N(spawn.X), N(npc.Center.Y) - N(spawn.Y)), 15);
        const id = NewProjectile(src(p), spawn, v, t, Math.max(1, Math.floor(N(p.damage))), N(p.knockBack) * 2, p.owner, 0, 0, 0, null), q = getSpawn(id);
        if (q) { MarkRogueProjectile(q, 'MeteorFist', true); MarkStealthStrike(q, 'MeteorFist', true); const b = FusionEntityData.GetProjectileBag(q, 'meteorFistMeteor', () => ({ age: 0, target: -1 })); b.target = Math.floor(N(npc.whoAmI, -1)); }
    }
    PreDraw(p) { const s = meteorBag(p), owner = playerAt(p.owner); if (owner) drawWire(p, owner); return !s.hit; }
}

export class MeteorFistMeteorite extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; this._meteorTexture = null; }
    PostSetupContent() { try { this._meteorTexture = Terraria.GameContent.TextureAssets.Projectile.get_Item(424).Value; } catch (_) { this._meteorTexture = null; } }
    SetDefaults() { const p = this.Projectile; p.width = 16; p.height = 16; p.friendly = true; p.hostile = false; p.penetrate = 1; p.timeLeft = 300; p.tileCollide = true; p.aiStyle = -1; }
    OnSpawn(p) { MarkRogueProjectile(p, 'MeteorFist', true); FusionEntityData.GetProjectileBag(p, 'meteorFistMeteor', () => ({ age: 0, target: -1 })); }
    AI(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'meteorFistMeteor', () => ({ age: 0, target: -1 })); s.age++;
        const target = npcAt(s.target);
        if (s.age <= 60 && validNpc(target)) {
            const desired = norm(Vector2.new(N(target.Center.X) - N(p.Center.X), N(target.Center.Y) - N(p.Center.Y)), 15);
            p.velocity = Vector2.new(N(p.velocity.X) * .88 + N(desired.X) * .12, N(p.velocity.Y) * .88 + N(desired.Y) * .12);
        } else p.velocity = Vector2.new(N(p.velocity.X), N(p.velocity.Y) + .135);
        p.rotation = N(p.rotation) + .04 * (N(p.velocity.X) >= 0 ? 1 : -1);
        dust(p, 23, 2, 1.1, 80);
    }
    CanDamage(p) { const s = FusionEntityData.GetProjectileBag(p, 'meteorFistMeteor', () => ({ age: 0 })); return s.age >= 5 ? null : false; }
    OnTileCollide() { return false; }
    OnHitNPC(p, npc) { try { npc.AddBuff(Terraria.ID.BuffID.OnFire, 180, false); } catch (_) { } p.damage = 0; p.timeLeft = 1; p.tileCollide = false; }
    PreDraw(p, lightColor) {
        try {
            const tex = this._meteorTexture; if (!tex) return false;
            const draw = Terraria.Main.spriteBatch && Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
            if (!draw) return false;
            const sx = N(Terraria.Main.screenPosition && Terraria.Main.screenPosition.X), sy = N(Terraria.Main.screenPosition && Terraria.Main.screenPosition.Y);
            draw(tex, Vector2.new(N(p.Center.X) - sx, N(p.Center.Y) - sy), null, lightColor, N(p.rotation), Vector2.new(N(tex.Width) / 2, N(tex.Height) / 2), N(p.scale, 1), SpriteEffects.None, 0); return false;
        } catch (_) { return false; }
    }
}
