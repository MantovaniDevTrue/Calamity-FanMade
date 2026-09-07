import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile, IsStealthStrike, MarkStealthStrike } from './../../../Core/RogueRuntime.js';

const { Vector2, Color } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function src(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { return null; } }
function getSpawn(id) { try { return Terraria.Main.projectile.get_Item(Number(id)); } catch (_) { return null; } }
function playerAt(owner) { const i = Math.floor(N(owner, -1)); if (i < 0) return null; try { if (i === Math.floor(N(Terraria.Main.myPlayer, -2))) return Terraria.Main.LocalPlayer; } catch (_) { } try { return Terraria.Main.player.get_Item(i); } catch (_) { return null; } }
function norm(v, speed = 1) { const x = N(v?.X), y = N(v?.Y), d = Math.sqrt(x * x + y * y) || 1; return Vector2.new(x / d * speed, y / d * speed); }
function randVelocity(min = 3, max = 6) { const a = Math.random() * Math.PI * 2, s = min + Math.random() * (max - min); return Vector2.new(Math.cos(a) * s, Math.sin(a) * s); }
function dust(p, type, count = 1, scale = 1) { for (let i = 0; i < count; i++) try { NewDust(p.position, p.width, p.height, type, N(p.velocity.X) * .2, N(p.velocity.Y) * .2, 100, Color.White, scale); } catch (_) { } }

export class WebBallBol extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/WebBall'; }
    SetDefaults() { const p = this.Projectile; p.width = 18; p.height = 18; p.friendly = true; p.hostile = false; p.penetrate = 3; p.timeLeft = 300; p.aiStyle = 14; p.usesIDStaticNPCImmunity = true; p.idStaticNPCHitCooldown = 10; }
    OnSpawn(p) { MarkRogueProjectile(p, 'WebBall', false); }
    AI(p) { if (Math.random() < 1 / 12) dust(p, 30, 1, 1); }
    OnHitNPC(p, npc) { try { npc.AddBuff(Terraria.ID.BuffID.Webbed, IsStealthStrike(p) ? 60 : 30, false); } catch (_) { } }
}

export class Honeycomb extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/HardenedHoneycomb'; }
    SetDefaults() { const p = this.Projectile; p.width = 30; p.height = 30; p.friendly = true; p.hostile = false; p.penetrate = 1; p.timeLeft = 300; p.aiStyle = -1; }
    OnSpawn(p) { MarkRogueProjectile(p, 'HardenedHoneycomb', false); FusionEntityData.GetProjectileBag(p, 'honeycomb', () => ({ age: 0, spawned: false })); }
    AI(p) { const s = FusionEntityData.GetProjectileBag(p, 'honeycomb', () => ({ age: 0, spawned: false })); s.age++; p.rotation = N(p.rotation) + N(p.velocity.X) * 1.25 * Math.PI / 180; if (s.age > 45) p.velocity = Vector2.new(N(p.velocity.X) * .97, Math.min(18, N(p.velocity.Y) + .28)); }
    OnHitNPC(p) { if (IsStealthStrike(p)) { const owner = playerAt(p.owner); try { owner?.AddBuff(Terraria.ID.BuffID.Honey, 600, false); } catch (_) { } } this.SpawnChildren(p); }
    PreKill(p) { this.SpawnChildren(p); return true; }
    SpawnChildren(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'honeycomb', () => ({ spawned: false })); if (s.spawned) return; s.spawned = true;
        if (Number(p.owner) !== Number(Terraria.Main.myPlayer)) return;
        const fragNames = ['HoneycombFragment', 'HoneycombFragment2', 'HoneycombFragment3'], fd = Math.max(1, Math.floor(N(p.damage) * .8));
        for (let i = 0; i < 2; i++) { const ft = Number(ModProjectile.getTypeByName(fragNames[Math.floor(Math.random() * fragNames.length)]) || 0); if (!(ft > 0)) continue; const id = NewProjectile(src(p), p.Center, randVelocity(3.5, 5.5), ft, fd, 0, p.owner, i, 0, 0, null), q = getSpawn(id); if (q) MarkRogueProjectile(q, 'HardenedHoneycomb', true); }
        if (IsStealthStrike(p)) {
            const owner = playerAt(p.owner); let bee = Number(Terraria.ID.ProjectileID.Bee || 181), beeDamage = fd, beeKB = .25;
            try { const bt = owner?.['int beeType()']; if (typeof bt === 'function') bee = Number(bt()) || bee; } catch (_) { }
            try { const bd = owner?.['int beeDamage(int damage)']; if (typeof bd === 'function') beeDamage = Math.max(1, Math.floor(Number(bd(fd)) || fd)); } catch (_) { }
            try { const bk = owner?.['float beeKB(float knockback)']; if (typeof bk === 'function') beeKB = Number(bk(.25)) || .25; } catch (_) { }
            for (let i = 0; i < 4; i++) { const id = NewProjectile(src(p), p.Center, randVelocity(3.5, 5.5), bee, beeDamage, beeKB, p.owner, 0, 0, 0, null), q = getSpawn(id); if (q) MarkRogueProjectile(q, 'HardenedHoneycomb', true); }
        }
        dust(p, 9, 9, 1.2);
    }
}

export class HoneycombFragment extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Rogue/HoneycombFragment'; }
    SetDefaults() { const p = this.Projectile; p.width = 14; p.height = 14; p.friendly = true; p.hostile = false; p.penetrate = 1; p.aiStyle = -1; }
    OnSpawn(p) { MarkRogueProjectile(p, 'HardenedHoneycomb', true); }
    AI(p) { p.rotation = N(p.rotation) + .6 * (N(p.velocity.X) >= 0 ? 1 : -1); p.velocity = Vector2.new(N(p.velocity.X), Math.min(16, N(p.velocity.Y) + .27)); }
    PreKill(p) { dust(p, 9, 4, .9); return true; }
}


export class HoneycombFragment2 extends HoneycombFragment { constructor() { super(); this.Texture = 'Projectiles/Rogue/HoneycombFragment2'; } }
export class HoneycombFragment3 extends HoneycombFragment { constructor() { super(); this.Texture = 'Projectiles/Rogue/HoneycombFragment3'; } }

export class ShinobiBladeProjectile extends ModProjectile {
    constructor() { super(); this.Texture = 'Items/Weapons/Rogue/ShinobiBlade'; }
    SetDefaults() { const p = this.Projectile; p.width = 16; p.height = 16; p.friendly = true; p.hostile = false; p.penetrate = 1; p.timeLeft = 300; p.extraUpdates = 4; p.aiStyle = -1; }
    OnSpawn(p) { MarkRogueProjectile(p, 'ShinobiBlade', false); FusionEntityData.GetProjectileBag(p, 'shinobi', () => ({ chain: 0, target: null })); }
    AI(p) { const right = N(p.velocity.X) >= 0; p.direction = right ? 1 : -1; p.spriteDirection = p.direction; p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + (right ? 0 : Math.PI) + Math.PI / 2 * p.spriteDirection; if (Math.random() < .2) dust(p, 15, 1, .8); }
    OnHitNPC(p, npc) {
        if (npc && N(npc.life) <= 0) this.SpawnHeal(p);
        if (!IsStealthStrike(p) || !npc) return;
        const s = FusionEntityData.GetProjectileBag(p, 'shinobi', () => ({ chain: 0, target: null }));
        if (s.chain >= 7 || Number(p.owner) !== Number(Terraria.Main.myPlayer)) return;
        const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 40;
        const target = s.target && s.target.active !== false ? s.target : npc;
        let tc = null; try { tc = target.Center; } catch (_) { tc = npc.Center; }
        const pos = Vector2.new(N(tc.X) + Math.cos(a) * r, N(tc.Y) + Math.sin(a) * r);
        const vel = norm(Vector2.new(N(tc.X) - N(pos.X), N(tc.Y) - N(pos.Y)), 4);
        const id = NewProjectile(src(p), pos, vel, p.type, Math.max(1, Math.floor(N(p.damage))), N(p.knockBack), p.owner, 0, 0, 0, null), q = getSpawn(id);
        if (q) { MarkRogueProjectile(q, 'ShinobiBlade', true); MarkStealthStrike(q, 'ShinobiBlade', true); q.tileCollide = false; const ns = FusionEntityData.GetProjectileBag(q, 'shinobi', () => ({ chain: 0, target: null })); ns.chain = s.chain + 1; ns.target = target; }
    }
    SpawnHeal(p) {
        if (Number(p.owner) !== Number(Terraria.Main.myPlayer)) return;
        const type = Number(ModProjectile.getTypeByName('ShinobiHealOrb') || 0); if (!(type > 0)) return;
        NewProjectile(src(p), p.Center, Vector2.Zero, type, 0, 0, p.owner, 5, 0, 0, null);
    }
    PreKill(p) { dust(p, 42, 5, 1.5); return true; }
}

export class ShinobiHealOrb extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/InvisibleProj'; }
    SetDefaults() { const p = this.Projectile; p.width = 20; p.height = 20; p.friendly = false; p.hostile = false; p.tileCollide = false; p.ignoreWater = true; p.penetrate = -1; p.timeLeft = 600; p.extraUpdates = 4; p.aiStyle = -1; }
    CanDamage() { return false; }
    AI(p) {
        const owner = playerAt(p.owner); if (!owner || owner.active === false || owner.dead === true) { p.Kill(); return; }
        const pc = Terraria.PlayerCenter(owner), dx = N(pc.X) - N(p.Center.X), dy = N(pc.Y) - N(p.Center.Y), d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < 24) {
            if (Number(p.owner) === Number(Terraria.Main.myPlayer)) { let blocked = false; try { blocked = owner.moonLeech === true; } catch (_) { } if (!blocked) { const before = N(owner.statLife), max = Math.max(before, N(owner.statLifeMax2, before)), heal = Math.min(5, Math.max(0, max - before)); if (heal > 0) { owner.statLife = before + heal; try { owner['void HealEffect(int healAmount, bool broadcast)'](heal, true); } catch (_) { try { owner.HealEffect(heal, true); } catch (__) { } } } } }
            p.Kill(); return;
        }
        const desired = Vector2.new(dx / d * 6, dy / d * 6); p.velocity = Vector2.Divide(Vector2.Add(Vector2.Multiply(p.velocity, 14), desired), 15);
        if (N(p.timeLeft) % 4 === 0) dust(p, 15, 1, .7);
    }
}
