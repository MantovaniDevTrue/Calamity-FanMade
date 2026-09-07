import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { M1GarandRuntime } from './../../../Core/M1GarandRuntime.js';
import { PlayItemSound, PlayDigSound } from '../../../Common/Snippets/LegacySoundCompat.js';

const { Color, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function BeginCalamityLeftFacingDraw(proj) {
    if (Number(proj && proj.spriteDirection) !== -1)
        return false;
    proj.rotation = Number(proj.rotation) + Math.PI;
    return true;
}

function EndCalamityLeftFacingDraw(proj, adjusted) {
    if (!adjusted || !proj)
        return;
    proj.rotation = Number(proj.rotation) - Math.PI;
}

function NormalizeOr(vector, fallbackX = 1, fallbackY = 0) {
    const x = Number(vector && vector.X) || 0;
    const y = Number(vector && vector.Y) || 0;
    const length = Math.sqrt(x * x + y * y);
    if (length <= 0.001)
        return Vector2.new(fallbackX, fallbackY);
    return Vector2.new(x / length, y / length);
}

function Rotate(vector, angle) {
    const x = Number(vector.X) || 0;
    const y = Number(vector.Y) || 0;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return Vector2.new(x * c - y * s, x * s + y * c);
}

function ResolveAim(player, currentVelocity) {
    let desired = null;
    try {
        if (Number(Terraria.PlayerIndex(player)) === Number(Terraria.Main.myPlayer)) {
            const mouse = Terraria.Main.MouseWorld;
            const dx = Number(mouse.X) - Number(player.MountedCenter.X);
            const dy = Number(mouse.Y) - Number(player.MountedCenter.Y);
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 12)
                desired = Vector2.new(dx / length, dy / length);
        }
    } catch (e) { }
    if (!desired)
        desired = NormalizeOr(currentVelocity, Number(Terraria.PlayerDirection(player)) || 1, 0);
    const current = NormalizeOr(currentVelocity, Number(Terraria.PlayerDirection(player)) || 1, 0);
    return NormalizeOr(Vector2.Add(Vector2.Multiply(current, 4), desired), Number(Terraria.PlayerDirection(player)) || 1, 0);
}

function PickAmmo(player, ammoId) {
    const inventory = player.inventory;
    for (let i = 54; i < 58; i++) {
        const candidate = inventory[i];
        if (candidate && Number(candidate.ammo) === Number(ammoId) && Number(candidate.stack) > 0)
            return candidate;
    }

    for (let i = 0; i < 54; i++) {
        const candidate = inventory[i];
        if (candidate && Number(candidate.ammo) === Number(ammoId) && Number(candidate.stack) > 0)
            return candidate;
    }
    return null;
}

function CanConsumeAmmo(player) {
    if (player.ammoBox && Math.random() < 0.20)
        return false;
    if (player.ammoPotion && Math.random() < 0.20)
        return false;
    if (player.chloroAmmoCost80 && Math.random() < 0.20)
        return false;
    if (player.ammoCost80 && Math.random() < 0.20)
        return false;
    if (player.ammoCost75 && Math.random() < 0.25)
        return false;
    return true;
}

function ConsumeAmmo(player, ammo) {
    if (!ammo || !ammo.consumable || !CanConsumeAmmo(player))
        return;
    ammo.stack--;
    if (ammo.stack <= 0)
        ammo.TurnToAir(true);
}

function SourceFrom(proj, player) {
    try {
        return proj.GetProjectileSource_FromThis();
    } catch (e) { }
    try {
        return player.GetProjectileSource_Item(player.HeldItem);
    } catch (e) { }
    return null;
}

function PlayItem(style, position, pitch = 0, volume = 1) {
    PlayItemSound(style, position, pitch, volume);
}

function SpawnSmoke(position, direction) {
    let dustType = 31;
    try {
        dustType = Number(Terraria.ID.DustID.Smoke) || 31;
    } catch (e) { }
    for (let i = 0; i < 3; i++) {
        try {
            const spread = (Math.random() - 0.5) * 0.5;
            const velocity = Rotate(direction, spread);
            const speed = 1.5 + Math.random() * 3.5;
            const index = NewDust(position, 2, 2, dustType, Number(velocity.X) * speed, Number(velocity.Y) * speed, 70, Color.White, 0.7 + Math.random() * 0.4);
            const dust = Terraria.Main.dust[index];
            if (dust)
                dust.noGravity = true;
        } catch (e) { }
    }
}

export class M1GarandHoldout extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/M1GarandHoldout';
    }

    SetStaticDefaults() {
        try {
            Terraria.Main.projFrames[this.Type] = 6;
        } catch (e) { }
    }

    SetDefaults() {
        this.Projectile.width = 102;
        this.Projectile.height = 26;
        this.Projectile.friendly = false;
        this.Projectile.hostile = false;
        this.Projectile.ranged = true;
        this.Projectile.penetrate = -1;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.timeLeft = 2;
        this.Projectile.aiStyle = 0;
        this.Projectile.netImportant = true;
    }

    OnSpawn(proj) {
        proj.frame = 5;
        const player = Terraria.Main.player[proj.owner];
        if (player)
            M1GarandRuntime.SetHoldout(player, proj.whoAmI);
    }

    UpdatePose(proj, player, local) {
        const aim = ResolveAim(player, proj.velocity);
        proj.velocity = aim;
        const horizontal = Number(aim.X) || 0;
        const direction = Math.abs(horizontal) > 0.04 ? (horizontal < 0 ? -1 : 1) : (Number(Terraria.PlayerDirection(player)) || 1);
        Terraria.SetPlayerDirection(player, direction);
        proj.direction = direction;
        proj.spriteDirection = direction;
        proj.rotation = Math.atan2(Number(aim.Y), Number(aim.X));
        let recoil = Number(local[0]) || 0;
        recoil += (0 - recoil) * 0.13;
        if (Math.abs(recoil) < 0.02)
            recoil = 0;
        local[0] = recoil;
        const base = player.MountedCenter;
        const offset = Vector2.Multiply(aim, 28 + recoil);
        const vertical = Vector2.new(0, -4 * (Number(player.gravDir) || 1));
        proj.Center = Vector2.Add(Vector2.Add(base, offset), vertical);
        proj.timeLeft = 2;
        player.heldProj = proj.whoAmI;
        player.itemTime = Math.max(2, Number(player.itemTime) || 0);
        player.itemAnimation = Math.max(2, Number(player.itemAnimation) || 0);
        player.itemRotation = proj.rotation * direction;
        try {
            const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
            const armRotation = (proj.rotation - Math.PI / 2) * (Number(player.gravDir) || 1) + ((Number(player.gravDir) || 1) === -1 ? Math.PI : 0);
            player.SetCompositeArmFront(true, stretch, armRotation);
            player.SetCompositeArmBack(true, stretch, armRotation);
        } catch (e) { }
    }

    GunTip(proj) {
        const direction = NormalizeOr(proj.velocity, Number(proj.direction) || 1, 0);
        return Vector2.Add(Vector2.Add(proj.Center, Vector2.new(1.5, -2.5)), Vector2.Multiply(direction, Number(proj.width) * 0.425));
    }

    Fire(proj, player, local) {
        const item = player.HeldItem;
        const ammo = PickAmmo(player, Terraria.ID.AmmoID.Bullet);
        if (!ammo)
            return false;
        const shotType = ModProjectile.getTypeByName('M1GarandShot');
        const casingType = ModProjectile.getTypeByName('M1GarandBulletCasing');
        const clipType = ModProjectile.getTypeByName('M1GarandEmptyClip');
        const flashType = ModProjectile.getTypeByName('M1GarandMuzzleFlash');
        const pingType = ModProjectile.getTypeByName('M1GarandPingText');
        if (!(shotType > 0))
            return false;
        const direction = NormalizeOr(proj.velocity, Number(Terraria.PlayerDirection(player)) || 1, 0);
        const baseSpeed = Math.max(0.1, Number(item.shootSpeed) || 12);
        const ammoSpeed = Math.max(0, Number(ammo.shootSpeed) || 0);
        const shotVelocity = Vector2.Multiply(direction, baseSpeed + ammoSpeed);
        const rangedMultiplier = Math.max(0, Number(player.rangedDamage) || 1);
        const damage = Math.max(1, Math.floor(Number(proj.damage) + (Number(ammo.damage) || 0) * rangedMultiplier));
        const knockback = Number(proj.knockBack) + (Number(ammo.knockBack) || 0);
        const source = SourceFrom(proj, player);
        const tip = this.GunTip(proj);
        const shotPosition = Vector2.Subtract(tip, Vector2.Multiply(direction, 18));
        NewProjectile(source, shotPosition, shotVelocity, shotType, damage, knockback, proj.owner, 0, 0, 0, null);
        if (casingType > 0) {
            const casingVelocity = Vector2.Multiply(Rotate(direction, (2.5 + Math.random() * 0.15) * -Number(proj.direction || 1)), (baseSpeed + ammoSpeed) * 0.5);
            NewProjectile(source, proj.Center, casingVelocity, casingType, 0, 0, proj.owner, 0, 0, 0, null);
        }
        if (flashType > 0) {
            const flashCenter = Vector2.Add(tip, Vector2.Multiply(direction, 42));
            NewProjectile(source, flashCenter, direction, flashType, damage, knockback, proj.owner, Math.floor(Math.random() * 3), 0, 0, null);
        }
        PlayItem(137, tip, (Math.random() - 0.5) * 0.2, 1);
        SpawnSmoke(tip, direction);
        local[0] = -3.5;
        ConsumeAmmo(player, ammo);
        const remaining = M1GarandRuntime.ConsumeShot(player);
        if (remaining <= 0) {
            PlayItem(138, tip, 0, 1);
            if (clipType > 0) {
                const clipVelocity = Vector2.Multiply(Rotate(direction, (1.175 + Math.random() * 0.075) * -Number(proj.direction || 1)), baseSpeed * 0.285);
                NewProjectile(source, proj.Center, clipVelocity, clipType, 0, 0, proj.owner, 0, 0, 0, null);
            }
            if (pingType > 0)
                NewProjectile(source, Terraria.PlayerCenter(player), Vector2.Zero, pingType, 0, 0, proj.owner, Number(Terraria.PlayerDirection(player)) || 1, 0, 0, null);
        }
        return true;
    }

    AI(proj) {
        const player = Terraria.Main.player[proj.owner];
        if (!player || !player.active || player.dead) {
            if (player)
                M1GarandRuntime.ClearHoldout(player, proj.whoAmI);
            proj.Kill();
            return;
        }
        const ai = new ProjAI(proj);
        const local = new ProjAI(proj, true);
        this.UpdatePose(proj, player, local);
        let state = Math.floor(Number(ai[0]) || 0);
        let timer = Number(ai[1]) || 0;
        let animation = Number(ai[2]) || 0;
        if (state === 0 && M1GarandRuntime.GetShots(player) <= 0) {
            state = 1;
            timer = 120;
            animation = 0;
            proj.frame = 3;
        }
        if (state === 0) {
            if (timer <= 0) {
                if (!this.Fire(proj, player, local)) {
                    M1GarandRuntime.ClearHoldout(player, proj.whoAmI);
                    proj.Kill();
                    return;
                }
                timer = 40;
                animation = 18;
            } else {
                timer--;
            }
            if (animation > 0) {
                const elapsed = 18 - animation;
                proj.frame = Math.max(0, Math.min(5, Math.floor(elapsed / 3)));
                animation--;
            } else {
                proj.frame = 5;
            }
            if (timer <= 0 && M1GarandRuntime.GetShots(player) <= 0) {
                state = 1;
                timer = 120;
                proj.frame = 3;
            } else if (timer <= 0 && !(player.channel === true || player.controlUseItem === true)) {
                M1GarandRuntime.ClearHoldout(player, proj.whoAmI);
                proj.Kill();
                return;
            }
        } else {
            timer--;
            const downPhase = timer > 75 ? 0.15 : (timer >= 64 ? 0.15 * ((timer - 64) / 11) : 0);
            proj.rotation += downPhase * Number(proj.spriteDirection || 1);
            if (timer > 40)
                proj.frame = 3;
            else if (timer > 34)
                proj.frame = 4;
            else
                proj.frame = 5;
            if (Math.floor(timer) === 110)
                PlayItem(140, proj.Center, 0, 1);
            if (timer <= 0) {
                M1GarandRuntime.Reload(player);
                M1GarandRuntime.ClearHoldout(player, proj.whoAmI);
                proj.Kill();
                return;
            }
        }
        ai[0] = state;
        ai[1] = timer;
        ai[2] = animation;
    }

    OnKill(proj) {
        const player = Terraria.Main.player[proj.owner];
        if (player)
            M1GarandRuntime.ClearHoldout(player, proj.whoAmI);
    }

    PreDraw(proj) {
        this._leftDrawAdjusted = BeginCalamityLeftFacingDraw(proj);
        return true;
    }

    PostDraw(proj) {
        EndCalamityLeftFacingDraw(proj, this._leftDrawAdjusted === true);
        this._leftDrawAdjusted = false;
    }

    CanDamage() {
        return false;
    }
}

export class M1GarandShot extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/AMRShot';
    }

    SetDefaults() {
        this.Projectile.width = 4;
        this.Projectile.height = 4;
        this.Projectile.light = 0.5;
        this.Projectile.alpha = 255;
        this.Projectile.extraUpdates = 10;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ranged = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = 2;
        this.Projectile.timeLeft = 600;
        this.Projectile.tileCollide = true;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = -1;
    }

    AI(proj) {
        const local = new ProjAI(proj, true);
        local[0] = Number(local[0]) + 1;
        const speed = Math.sqrt(Number(proj.velocity.X) ** 2 + Number(proj.velocity.Y) ** 2);
        proj.alpha = Math.max(0, Number(proj.alpha) - Math.max(1, speed * 0.9));
        proj.scale = 1.38;
        proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) + Math.PI / 2;
        if (Number(local[0]) === 3)
            this.SpawnDust(proj, 8, 0.8);
        else if (Number(local[0]) > 3 && Number(local[0]) < 150 && Math.random() < 0.04)
            this.SpawnDust(proj, 1, 0.45);
    }

    SpawnDust(proj, count, scale) {
        let type = 87;
        try {
            type = Number(Terraria.ID.DustID.GemTopaz) || 87;
        } catch (e) { }
        const dir = NormalizeOr(proj.velocity, 1, 0);
        for (let i = 0; i < count; i++) {
            try {
                const velocity = Vector2.Multiply(Rotate(dir, (Math.random() - 0.5) * 0.52), (0.1 + Math.random() * 0.7) * Math.max(1, proj.velocity.Length ? proj.velocity.Length() : 12));
                const index = NewDust(proj.position, 2, 2, type, Number(velocity.X), Number(velocity.Y), 0, Color.White, scale * (0.75 + Math.random() * 0.5));
                const dust = Terraria.Main.dust[index];
                if (dust)
                    dust.noGravity = true;
            } catch (e) { }
        }
    }

    OnHitNPC(proj) {
        this.SpawnDust(proj, 6, 0.75);
    }

    OnTileCollide(proj) {
        try {
            PlayDigSound(proj.Center, 0, 0.8);
        } catch (e) { }
        return true;
    }
}

export class M1GarandBulletCasing extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/M1GarandBulletCasing';
    }

    SetDefaults() {
        this.Projectile.width = 6;
        this.Projectile.height = 12;
        this.Projectile.friendly = false;
        this.Projectile.hostile = false;
        this.Projectile.ignoreWater = false;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 300;
        this.Projectile.tileCollide = false;
        this.Projectile.aiStyle = 0;
    }

    AI(proj) {
        const local = new ProjAI(proj, true);
        local[0] = Number(local[0]) + 1;
        proj.rotation += 0.04 * (Number(proj.direction) || 1);
        proj.velocity = Vector2.new(Number(proj.velocity.X) * 0.99, Number(proj.velocity.Y) + 0.087);
        if (Number(local[0]) > 8)
            proj.tileCollide = true;
        if (Number(proj.timeLeft) < 60)
            proj.alpha = Math.floor(255 * (1 - Number(proj.timeLeft) / 60));
    }

    OnTileCollide(proj) {
        proj.velocity = Vector2.Zero;
        proj.tileCollide = false;
        return false;
    }

    CanDamage() {
        return false;
    }
}

export class M1GarandEmptyClip extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/M1GarandEmptyClip';
    }

    SetDefaults() {
        this.Projectile.width = 12;
        this.Projectile.height = 14;
        this.Projectile.friendly = false;
        this.Projectile.hostile = false;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 420;
        this.Projectile.tileCollide = true;
        this.Projectile.scale = 1.5;
        this.Projectile.aiStyle = 0;
    }

    AI(proj) {
        proj.rotation += 0.05 + Number(proj.velocity.X) * 0.04;
        proj.velocity = Vector2.new(Number(proj.velocity.X) * 0.992, Number(proj.velocity.Y) + 0.11);
        if (Number(proj.timeLeft) < 60)
            proj.alpha = Math.floor(255 * (1 - Number(proj.timeLeft) / 60));
    }

    OnTileCollide(proj) {
        proj.velocity = Vector2.new(Number(proj.velocity.X) * 0.4, -Math.abs(Number(proj.velocity.Y)) * 0.25);
        if (Math.abs(Number(proj.velocity.X)) + Math.abs(Number(proj.velocity.Y)) < 0.5)
            proj.velocity = Vector2.Zero;
        return false;
    }

    CanDamage() {
        return false;
    }
}

export class M1GarandMuzzleFlash extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/M1GarandMuzzleFlash';
    }

    SetStaticDefaults() {
        try {
            Terraria.Main.projFrames[this.Type] = 3;
        } catch (e) { }
    }

    SetDefaults() {
        this.Projectile.width = 88;
        this.Projectile.height = 66;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ranged = true;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 2;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = 10;
    }

    OnSpawn(proj) {
        const ai = new ProjAI(proj);
        proj.frame = Math.max(0, Math.min(2, Math.floor(Number(ai[0]) || 0)));
        const dir = NormalizeOr(proj.velocity, 1, 0);
        proj.rotation = Math.atan2(Number(dir.Y), Number(dir.X));
        proj.direction = Number(dir.X) < 0 ? -1 : 1;
        proj.spriteDirection = proj.direction;
        proj.velocity = Vector2.Zero;
        proj.scale = 0.8;
    }

    PreDraw(proj) {
        this._leftDrawAdjusted = BeginCalamityLeftFacingDraw(proj);
        return true;
    }

    PostDraw(proj) {
        EndCalamityLeftFacingDraw(proj, this._leftDrawAdjusted === true);
        this._leftDrawAdjusted = false;
    }

    Colliding(proj, myRect, targetRect) {
        const cx = Number(proj.Center.X), cy = Number(proj.Center.Y);
        const left = Number(targetRect.X), top = Number(targetRect.Y);
        const right = left + Number(targetRect.Width), bottom = top + Number(targetRect.Height);
        const nx = Math.max(left, Math.min(cx, right));
        const ny = Math.max(top, Math.min(cy, bottom));
        const dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy <= 64 * 64;
    }
}

export class M1GarandPingText extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/M1GarandPingText';
    }

    SetDefaults() {
        this.Projectile.width = 102;
        this.Projectile.height = 44;
        this.Projectile.friendly = false;
        this.Projectile.hostile = false;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 40;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.aiStyle = 0;
    }

    AI(proj) {
        const player = Terraria.Main.player[proj.owner];
        if (!player || !player.active) {
            proj.Kill();
            return;
        }
        const ai = new ProjAI(proj);
        const direction = Number(ai[0]) < 0 ? -1 : 1;
        const age = 40 - Number(proj.timeLeft);
        const pop = Clamp(age / 5, 0, 1);
        proj.Center = Vector2.Add(Terraria.PlayerCenter(player), Vector2.new(40 * -direction * pop, -40 * (Number(player.gravDir) || 1) * pop));
        proj.rotation = direction === 1 ? -0.25 : 0.25;
        proj.scale = age < 10 ? 0.5 + pop * 0.5 : 1;
        if (Number(proj.timeLeft) < 10)
            proj.alpha = Math.floor(255 * (1 - Number(proj.timeLeft) / 10));
    }

    CanDamage() {
        return false;
    }
}
