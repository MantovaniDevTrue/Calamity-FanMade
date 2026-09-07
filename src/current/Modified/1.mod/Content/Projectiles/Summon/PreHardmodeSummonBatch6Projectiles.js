import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { FrozenCubeTrackedIndices, FrozenCubeNPC, ScanFrozenCubeNPCs } from './../../../Core/FrozenCubeTargetRuntime.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';

const { Vector2, Color, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = -1) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function player(owner) {
    const i = I(owner, -1);
    if (i < 0) return null;
    try { if (i === I(Terraria.Main.myPlayer, -2) && Terraria.Main.LocalPlayer) return Terraria.Main.LocalPlayer; } catch (_) { }
    try { return Terraria.Main.player.get_Item(i); } catch (_) { return null; }
}
function validPlayer(p) { return !!(p && p.active !== false && p.dead !== true); }
function validNpc(n) { return !!(n && n.active && N(n.life) > 0 && n.friendly !== true && n.dontTakeDamage !== true); }
function source(p) { try { return p.GetProjectileSource_FromThis(); } catch (_) { return null; } }
function norm(v, speed = 1) {
    const x = N(v?.X), y = N(v?.Y), len = Math.sqrt(x * x + y * y) || 1;
    return Vector2.new(x / len * speed, y / len * speed);
}
function dust(p, id, count = 1, scale = 0.8) {
    for (let i = 0; i < count; i++) {
        try { NewDust(p.position, p.width, p.height, id, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 100, Color.White, scale); } catch (_) { }
    }
}
function target(p, range = 960) {
    ScanFrozenCubeNPCs(6);
    let best = null, bestDist = range * range;
    for (const index of FrozenCubeTrackedIndices()) {
        const n = FrozenCubeNPC(index);
        if (!validNpc(n)) continue;
        const dx = N(n.Center.X) - N(p.Center.X), dy = N(n.Center.Y) - N(p.Center.Y);
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; best = n; }
    }
    return best;
}
function setArray(holder, name, index, value) {
    try {
        let a = holder[name], need = I(index, 0) + 1, len = N(a?.Length, N(a?.length, 0));
        if (len < need) { a = a.cloneResized(need); holder[name] = a; }
        try { a['void SetValue(Object value, int index)'](value, I(index, 0)); return true; } catch (_) { }
        try { a.set_Item(I(index, 0), value); return true; } catch (_) { }
    } catch (_) { }
    return false;
}

const DirectTextureCache = new Map();
function directTexture(path) {
    if (DirectTextureCache.has(path)) return DirectTextureCache.get(path);
    let texture = null;
    try { texture = tl.texture.load(path); } catch (_) { }
    DirectTextureCache.set(path, texture || null);
    return texture;
}
function drawFrame(p, light, x, y, w, h, path) {
    try {
        const texture = directTexture(path);
        if (!texture) return true;
        const position = Vector2.new(N(p.Center.X) - N(Terraria.Main.screenPosition.X), N(p.Center.Y) - N(Terraria.Main.screenPosition.Y) + N(p.gfxOffY));
        const origin = Vector2.new(w * 0.5, h * 0.5);
        const sourceRect = Rectangle.new(x, y, w, h);
        let color = light;
        try { color = p.GetAlpha(light); } catch (_) { }
        const draw = Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
        if (!draw) return true;
        const effects = N(p.spriteDirection, 1) >= 0 ? SpriteEffects.None : SpriteEffects.FlipHorizontally;
        draw(texture, position, sourceRect, color, N(p.rotation), origin, N(p.scale, 1), effects, 0);
        return false;
    } catch (_) { return true; }
}

function solidAt(x, y, w, h) {
    try { return SolidCollision(Vector2.new(x, y), Math.max(1, I(w, 1)), Math.max(1, I(h, 1))) === true; }
    catch (_) { return false; }
}
function touchingFloor(p) {
    const x = N(p.position.X), y = N(p.position.Y), w = I(p.width, 20), h = I(p.height, 20);
    return solidAt(x, y, w, h) || solidAt(x + 2, y + h, Math.max(1, w - 4), 3);
}
function settleSentry(p, state) {
    let x = N(p.position.X), y = N(p.position.Y), w = I(p.width, 20), h = I(p.height, 20);
    for (let k = 0; k < 10 && solidAt(x, y, w, h); k++) y -= 1;
    try { p.position = Vector2.new(x, y); } catch (_) { }
    try { p.velocity = Vector2.Zero; } catch (_) { }
    p.tileCollide = false;
    state.grounded = true;
}
function sentryLandingPreKill(p, timeLeft, state) {
    if (state.allowKill === true || I(timeLeft, 0) <= 1) return true;
    if (touchingFloor(p)) { settleSentry(p, state); return false; }
    return true;
}


// TLPro does not reliably enforce UpdateMaxTurrets for custom projectile IDs.
// Projectile.whoAmI is inherited and unreliable on this bridge, so the cap uses
// owner + Projectile.identity, the same stable key used by FusionEntityData.
const Batch6SentrySlots = new Map();
let Batch6SentryOrder = 1;
const Batch6SentryLoggedOwners = new Set();
function sentryIdentity(p) { return I(p?.identity, -1); }
function batch6SentryList(owner) {
    const key = I(owner, -1);
    let list = Batch6SentrySlots.get(key) || [];
    list = list.filter(entry => {
        const q = entry && entry.projectile;
        return !!(q && q.active && I(q.owner, -2) === key && I(q.type, -2) === I(entry.type, -3) && sentryIdentity(q) === I(entry.identity, -4));
    });
    list.sort((a, b) => I(a.order, 0) - I(b.order, 0));
    if (list.length) Batch6SentrySlots.set(key, list); else Batch6SentrySlots.delete(key);
    return list;
}
function markSentryKillAllowed(q, replacementType = -1) {
    if (!q) return;
    const a = FusionEntityData.PeekProjectileBag(q, 'squirrel');
    const b = FusionEntityData.PeekProjectileBag(q, 'harvestSentry');
    if (a) { a.allowKill = true; a.replacementType = I(replacementType, -1); }
    if (b) { b.allowKill = true; b.replacementType = I(replacementType, -1); }
}
function registerBatch6Sentry(p) {
    const owner = I(p?.owner, -1), identity = sentryIdentity(p), type = I(p?.type, -1);
    if (owner < 0 || identity < 0 || type < 0) {
        try { tl.log(`[CalamityPort Batch6SentryCap] invalid identity; owner=${owner}; identity=${identity}; type=${type}.`); } catch (_) { }
        return;
    }
    const pl = player(owner);
    const max = Math.min(10, Math.max(1, I(pl?.maxTurrets, 1)));
    const list = batch6SentryList(owner);
    if (list.some(entry => I(entry.identity, -2) === identity && I(entry.type, -2) === type)) return;

    while (list.length >= max) {
        const old = list.shift();
        const q = old && old.projectile;
        if (q && q.active) {
            markSentryKillAllowed(q, type);
            try { tl.log(`[CalamityPort Batch6SentryCap] replace owner=${owner}; oldIdentity=${I(old.identity,-1)}; newIdentity=${identity}; max=${max}.`); } catch (_) { }
            try { q.Kill(); } catch (_) { try { q.active = false; } catch (_) { } }
        }
    }
    list.push({ identity, type, order: Batch6SentryOrder++, projectile: p });
    Batch6SentrySlots.set(owner, list);
    if (!Batch6SentryLoggedOwners.has(owner)) {
        Batch6SentryLoggedOwners.add(owner);
        try { tl.log(`[CalamityPort Batch6SentryCap] identity registry active; owner=${owner}; max=${max}.`); } catch (_) { }
    }
}
function unregisterBatch6Sentry(p) {
    const owner = I(p?.owner, -1), identity = sentryIdentity(p), type = I(p?.type, -1);
    const list = batch6SentryList(owner).filter(entry => !(I(entry.identity, -2) === identity && I(entry.type, -2) === type));
    if (list.length) Batch6SentrySlots.set(owner, list); else Batch6SentrySlots.delete(owner);
}
function hasBuff(pl, type) {
    if (!(type > 0) || !pl) return false;
    try { return I(pl.FindBuffIndex(type), -1) >= 0; } catch (_) { return false; }
}
function clearBuff(pl, type) { if (!(type > 0) || !pl) return; try { pl.ClearBuff(type); } catch (_) { } }

export class SquirrelSquireMinion extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/SquirrelSquireMinion'; }
    SetStaticDefaults() {
        setArray(Terraria.Main, 'projFrames', this.Type, 14);
        try { setArray(Terraria.ID.ProjectileID.Sets, 'MinionSacrificable', this.Type, false); } catch (_) { }
        try { setArray(Terraria.ID.ProjectileID.Sets, 'MinionTargetingFeature', this.Type, true); } catch (_) { }
    }
    SetDefaults() {
        const p = this.Projectile;
        p.timeLeft = 36000; p.penetrate = -1; p.width = 40; p.height = 32;
        p.friendly = true; p.hostile = false; p.netImportant = true;
        p.tileCollide = true; p.sentry = true; p.aiStyle = -1;
    }
    OnSpawn(p) {
        FusionEntityData.GetProjectileBag(p, 'squirrel', () => ({ age: 0, scan: 0, target: -1, cool: 25, frame: 0, fc: 0, attack: false, grounded: false, allowKill: false, replacementType: -1 }));
        registerBatch6Sentry(p);
    }
    CanDamage() { return false; }
    AI(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'squirrel', () => ({ age: 0, scan: 0, target: -1, cool: 25, frame: 0, fc: 0, attack: false, grounded: false, allowKill: false, replacementType: -1 }));
        const owner = player(p.owner);
        if (!owner) { if (I(p.timeLeft, 0) < 2) p.timeLeft = 2; return; }
        state.age = I(state.age, 0) + 1;
        if (state.age <= 3) registerBatch6Sentry(p);
        const controlBuff = Number(ModBuff.getTypeByName('SquirrelSquireSentryBuff') || 0);
        if (owner.dead || (state.age > 2 && controlBuff > 0 && !hasBuff(owner, controlBuff))) { state.allowKill = true; try { p.Kill(); } catch (_) { p.active = false; } return; }
        if (controlBuff > 0) try { owner.AddBuff(controlBuff, 2, true); } catch (_) { }

        if (!state.grounded)
            p.velocity = Vector2.new(N(p.velocity.X) * 0.8, Math.min(10, N(p.velocity.Y) + 0.5));
        else
            p.velocity = Vector2.Zero;

        if (state.scan-- <= 0) {
            const n = target(p, 960);
            state.target = n ? I(n.whoAmI, -1) : -1;
            state.scan = 10;
        }
        const n = state.target >= 0 ? FrozenCubeNPC(state.target) : null;
        state.attack = validNpc(n);
        if (state.attack) {
            p.spriteDirection = N(n.Center.X) >= N(p.Center.X) ? 1 : -1;
            state.cool--;
            if (state.cool <= 0 && I(p.owner) === I(Terraria.Main.myPlayer)) {
                const type = Number(ModProjectile.getTypeByName('SquirrelSquireAcorn') || 0);
                const velocity = norm(Vector2.new(N(n.Center.X) - N(p.Center.X), N(n.Center.Y) - N(p.Center.Y)), 10);
                if (type > 0) NewProjectile(source(p), Vector2.new(N(p.Center.X) + p.spriteDirection * 10, N(p.Center.Y) - 6), velocity, type, Math.max(1, I(p.damage, 8)), N(p.knockBack, 0.5), p.owner, 0, 0, 0, null);
                state.cool = 35;
                try { PlayItemSound(1, p.Center, 0, 0.15); } catch (_) { }
            }
        }
        state.fc++;
        if (state.fc >= 6) { state.fc = 0; state.frame = (state.frame + 1) % 7; }
    }
    OnTileCollide(p) { const state = FusionEntityData.GetProjectileBag(p, 'squirrel', () => ({ grounded: false, allowKill: false, replacementType: -1 })); settleSentry(p, state); return false; }
    PreKill(p, timeLeft) { const state = FusionEntityData.GetProjectileBag(p, 'squirrel', () => ({ grounded: false, allowKill: false, replacementType: -1 })); return sentryLandingPreKill(p, timeLeft, state); }
    PreDraw(p, light) {
        const state = FusionEntityData.GetProjectileBag(p, 'squirrel', () => ({ frame: 0, attack: false }));
        return drawFrame(p, light, state.attack ? 40 : 0, (N(state.frame) % 7) * 32, 40, 32, 'Textures/Projectiles/Summon/SquirrelSquireMinion.png');
    }
    OnKill(p) {
        const state = FusionEntityData.PeekProjectileBag(p, 'squirrel');
        unregisterBatch6Sentry(p);
        const owner = player(p.owner), controlBuff = Number(ModBuff.getTypeByName('SquirrelSquireSentryBuff') || 0);
        // Ao substituir uma Squirrel por outra por causa do limite, não apaga o buff
        // recém-adicionado pelo novo spawn. Isso evita a nova sentry nascer e morrer.
        if (I(state?.replacementType, -1) === I(p.type)) return;
        let same = false;
        for (const entry of batch6SentryList(p.owner)) if (I(entry.type) === I(p.type)) { same = true; break; }
        if (!same) clearBuff(owner, controlBuff);
    }
}

export class SquirrelSquireAcorn extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/SquirrelSquireAcorn'; }
    SetStaticDefaults() { setArray(Terraria.Main, 'projFrames', this.Type, 68); try { setArray(Terraria.ID.ProjectileID.Sets, 'SentryShot', this.Type, true); } catch (_) { } }
    SetDefaults() {
        const p = this.Projectile;
        p.timeLeft = 180; p.width = 16; p.height = 16; p.friendly = true; 
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 5; p.aiStyle = -1;
    }
    AI(p) { if (N(p.timeLeft) < 150) p.velocity = Vector2.new(N(p.velocity.X), Math.min(16, N(p.velocity.Y) + 0.35)); p.rotation = N(p.rotation) + N(p.velocity.X) * Math.PI / 60; if (N(p.timeLeft) % 4 === 0) dust(p, 7, 1, 0.55); }
    PreDraw(p, light) { return drawFrame(p, light, 0, 0, 16, 16, 'Textures/Projectiles/Summon/SquirrelSquireAcorn.png'); }
    PreKill(p) {
        const center = p.Center;
        try { p['void Resize(int newWidth, int newHeight)'](48, 48); } catch (_) { p.width = 48; p.height = 48; p.Center = center; }
        p.penetrate = -1; try { p.Damage(); } catch (_) { } dust(p, 7, 6, 0.8); return true;
    }
}

const HarvestOwnerCounts = new Map();
const HarvestSentryCounts = new Map();
const HarvestHeartbeat = new Map();
function ownerCount(owner) { return Math.max(0, N(HarvestOwnerCounts.get(Number(owner)), 0)); }
function addCount(owner, amount) { HarvestOwnerCounts.set(Number(owner), Math.max(0, ownerCount(owner) + amount)); }
function sentryCount(owner) { return Math.max(0, N(HarvestSentryCounts.get(Number(owner)), 0)); }
function addSentry(owner, amount) { HarvestSentryCounts.set(Number(owner), Math.max(0, sentryCount(owner) + amount)); }
function heartbeat(owner) { HarvestHeartbeat.set(Number(owner), I(Terraria.Main.GameUpdateCount, 0)); }
function parentAlive(owner, grace = 36) { return I(Terraria.Main.GameUpdateCount, 0) - I(HarvestHeartbeat.get(Number(owner)), -99999) <= grace; }

export class HarvestStaffSentry extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/HarvestStaffSentry'; }
    SetStaticDefaults() {
        setArray(Terraria.Main, 'projFrames', this.Type, 4);
        try { setArray(Terraria.ID.ProjectileID.Sets, 'MinionSacrificable', this.Type, false); } catch (_) { }
        try { setArray(Terraria.ID.ProjectileID.Sets, 'MinionTargetingFeature', this.Type, true); } catch (_) { }
    }
    SetDefaults() {
        const p = this.Projectile;
        p.sentry = true; p.netImportant = true; p.timeLeft = 36000; p.tileCollide = true;
        p.width = 68; p.height = 32; p.friendly = false; p.hostile = false; p.aiStyle = -1;
    }
    CanDamage() { return false; }
    OnSpawn(p) {
        FusionEntityData.GetProjectileBag(p, 'harvestSentry', () => ({ age: 0, timer: 0, fc: 0, counted: true, grounded: false, allowKill: false, replacementType: -1 }));
        if (sentryCount(p.owner) <= 0) HarvestOwnerCounts.set(Number(p.owner), 0);
        addSentry(p.owner, 1); heartbeat(p.owner); registerBatch6Sentry(p);
    }
    AI(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'harvestSentry', () => ({ age: 0, timer: 0, fc: 0, counted: true, grounded: false, allowKill: false, replacementType: -1 }));
        const owner = player(p.owner);
        heartbeat(p.owner);
        if (!owner) { if (I(p.timeLeft, 0) < 2) p.timeLeft = 2; return; }
        state.age = I(state.age, 0) + 1;
        if (state.age <= 3) registerBatch6Sentry(p);
        const controlBuff = Number(ModBuff.getTypeByName('HarvestSentryBuff') || 0);
        if (owner.dead || (state.age > 2 && controlBuff > 0 && !hasBuff(owner, controlBuff))) { state.allowKill = true; try { p.Kill(); } catch (_) { p.active = false; } return; }
        if (controlBuff > 0) try { owner.AddBuff(controlBuff, 2, true); } catch (_) { }

        if (!state.grounded) p.velocity = Vector2.new(N(p.velocity.X) * 0.8, Math.min(20, N(p.velocity.Y) + 0.8));
        else p.velocity = Vector2.Zero;

        state.timer++; state.fc++;
        if (state.fc > 10) { state.fc = 0; p.frame = (I(p.frame, 0) + 1) % 4; }

        if (state.timer >= 150 && ownerCount(p.owner) < 5 * Math.max(1, sentryCount(p.owner)) && I(p.owner) === I(Terraria.Main.myPlayer)) {
            const type = Number(ModProjectile.getTypeByName('HarvestStaffMinion') || 0);
            const x = N(p.Center.X) + (Math.random() * 320 - 160);
            const pos = Vector2.new(x, N(p.Center.Y) - 80);
            if (type > 0) {
                const pumpkinIndex = NewProjectile(source(p), pos, Vector2.Zero, type, Math.max(1, I(p.damage, 27)), N(p.knockBack, 5), p.owner, Math.floor(Math.random() * 3), 0, 0, null);
                if (pumpkinIndex >= 0) {
                    let pumpkin = null; try { pumpkin = Terraria.Main.projectile.get_Item(Number(pumpkinIndex)); } catch (_) { try { pumpkin = Terraria.Main.projectile[pumpkinIndex]; } catch (__) { } }
                    if (pumpkin) { pumpkin.damage = Math.max(1, I(p.damage, 27)); pumpkin.originalDamage = Math.max(1, I(p.originalDamage, p.damage)); pumpkin.friendly = true; pumpkin.hostile = false; pumpkin.netUpdate = true; }
                }
            }
            state.timer = 0;
        }
    }
    OnTileCollide(p) { const state = FusionEntityData.GetProjectileBag(p, 'harvestSentry', () => ({ grounded: false, allowKill: false, replacementType: -1 })); settleSentry(p, state); return false; }
    PreKill(p, timeLeft) { const state = FusionEntityData.GetProjectileBag(p, 'harvestSentry', () => ({ grounded: false, allowKill: false, replacementType: -1 })); return sentryLandingPreKill(p, timeLeft, state); }
    PreDraw(p, light) { return drawFrame(p, light, 0, (I(p.frame, 0) % 4) * 32, 68, 32, 'Textures/Projectiles/Summon/HarvestStaffSentry.png'); }
    OnKill(p) {
        const state = FusionEntityData.PeekProjectileBag(p, 'harvestSentry');
        if (state?.counted) { state.counted = false; addSentry(p.owner, -1); }
        unregisterBatch6Sentry(p);
        if (sentryCount(p.owner) <= 0) {
            HarvestHeartbeat.delete(Number(p.owner));
            // Mesma proteção do Squirrel: se outra Harvest acabou de substituir esta,
            // mantém o buff de controle da nova sentry.
            if (I(state?.replacementType, -1) !== I(p.type))
                clearBuff(player(p.owner), Number(ModBuff.getTypeByName('HarvestSentryBuff') || 0));
        }
    }
}

function manualPumpkinMove(p, state, vx, vy) {
    let x = N(p.position.X), y = N(p.position.Y), w = I(p.width, 48), h = I(p.height, 48);
    for (let k = 0; k < 18 && solidAt(x, y, w, h); k++) y -= 1;
    let grounded = solidAt(x + 4, y + h, Math.max(1, w - 8), 4);
    if (grounded && vy >= 0) vy = 0;

    if (Math.abs(vy) > 0.001 && solidAt(x, y + vy, w, h)) {
        const dir = vy > 0 ? 1 : -1, limit = Math.ceil(Math.abs(vy));
        let allowed = 0;
        for (let step = 1; step <= limit; step++) {
            const amount = Math.min(Math.abs(vy), step) * dir;
            if (solidAt(x, y + amount, w, h)) break;
            allowed = amount;
        }
        vy = allowed;
        if (dir > 0) grounded = true;
    }

    const nextY = y + vy;
    if (Math.abs(vx) > 0.001 && solidAt(x + vx, nextY, w, h)) {
        let stepped = false;
        if (grounded) {
            for (let up = 1; up <= 14; up++) {
                if (!solidAt(x + vx, nextY - up, w, h)) { y -= up; stepped = true; break; }
            }
        }
        if (!stepped) {
            if (grounded && state.jumpCd <= 0 && !solidAt(x + vx, y - 9, w, h)) { vy = -9; grounded = false; state.jumpCd = 30; }
            else vx = 0;
        }
    }

    try { p.position = Vector2.new(x, y); } catch (_) { }
    state.grounded = grounded;
    return { vx, vy };
}

export class HarvestStaffMinion extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/HarvestStaffMinion'; }
    SetStaticDefaults() { setArray(Terraria.Main, 'projFrames', this.Type, 68); try { setArray(Terraria.ID.ProjectileID.Sets, 'SentryShot', this.Type, true); } catch (_) { } }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 48; p.height = 48; p.friendly = true; p.hostile = false; 
        p.netImportant = true; p.penetrate = -1; p.timeLeft = 30; p.tileCollide = false;
        p.usesLocalNPCImmunity = true; p.localNPCHitCooldown = 20; p.aiStyle = -1;
    }
    OnSpawn(p) {
        FusionEntityData.GetProjectileBag(p, 'harvestPumpkin', () => ({ age: 0, scan: 0, target: -1, frame: 0, fc: 0, running: false, counted: true, jumpCd: 0, grounded: false }));
        addCount(p.owner, 1);
    }
    CanDamage(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'harvestPumpkin', () => ({ age: 0, running: false }));
        return state.age > 30 && state.running ? null : false;
    }
    AI(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'harvestPumpkin', () => ({ age: 0, scan: 0, target: -1, frame: 0, fc: 0, running: false, counted: true, jumpCd: 0, grounded: false }));
        const owner = player(p.owner);
        if (parentAlive(p.owner, 36)) p.timeLeft = 30;
        else if (I(p.timeLeft, 0) <= 2) { try { p.Kill(); } catch (_) { p.active = false; } return; }
        if (owner?.dead) { try { p.Kill(); } catch (_) { p.active = false; } return; }

        state.age++; if (state.jumpCd > 0) state.jumpCd--;
        if (state.scan-- <= 0) {
            const n = target(p, state.age < 30 ? 160 : 1200);
            state.target = n ? I(n.whoAmI, -1) : -1; state.scan = 10;
        }
        const n = state.target >= 0 ? FrozenCubeNPC(state.target) : null;
        state.running = validNpc(n) && state.age >= 30;

        let vx = N(p.velocity.X), vy = Math.min(20, N(p.velocity.Y) + 0.8);
        if (state.running) {
            const dx = N(n.Center.X) - N(p.Center.X);
            p.spriteDirection = dx >= 0 ? 1 : -1;
            vx = Math.max(-6, Math.min(6, vx * 0.85 + Math.sign(dx) * 0.7));
            if (Math.abs(dx) < 45) vx *= 0.7;
            if (state.jumpCd <= 0 && Math.abs(dx) > 60 && state.grounded && Math.random() < 0.04) { vy = -9; state.grounded = false; state.jumpCd = 35; }
        } else vx *= 0.85;

        const solved = manualPumpkinMove(p, state, vx, vy);
        p.velocity = Vector2.new(solved.vx, solved.vy);
        state.fc++;
        if (state.fc >= 5) { state.fc = 0; state.frame = state.running ? (state.frame + 1) % 6 : 0; }
    }
    OnTileCollide() { return false; }
    PreDraw(p, light) {
        const state = FusionEntityData.GetProjectileBag(p, 'harvestPumpkin', () => ({ frame: 0, running: false }));
        const variant = ((I(p.owner, 0) + I(p.identity, 0)) % 3 + 3) % 3;
        const column = variant * 5 + (state.running ? 3 : 2);
        const row = state.running ? I(state.frame, 0) % 6 : 0;
        return drawFrame(p, light, column * 48, row * 48, 48, 48, 'Textures/Projectiles/Summon/HarvestStaffMinion.png');
    }
    OnKill(p) {
        const state = FusionEntityData.PeekProjectileBag(p, 'harvestPumpkin');
        if (state?.counted) { state.counted = false; addCount(p.owner, -1); }
        dust(p, 7, 4, 0.75);
    }
}
