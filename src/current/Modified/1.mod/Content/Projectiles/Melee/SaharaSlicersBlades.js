import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ProjAI } from './../../../TL/ProjAI.js';

const { Color, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function NormalizeOr(vector, fallbackX = 1, fallbackY = 0) {
    const x = Number(vector && vector.X) || 0;
    const y = Number(vector && vector.Y) || 0;
    const length = Math.sqrt(x * x + y * y);
    if (length <= 0.001)
        return Vector2.new(fallbackX, fallbackY);
    return Vector2.new(x / length, y / length);
}

function Clamp01(value) {
    return Math.max(0, Math.min(1, Number(value)));
}

function EaseOutCubic(value) {
    const t = Clamp01(value);
    return 1 - Math.pow(1 - t, 3);
}

function SmoothStep(value) {
    const t = Clamp01(value);
    return t * t * (3 - 2 * t);
}

function ReachFactor(progress) {
    const p = Clamp01(progress);
    if (p < 0.24)
        return EaseOutCubic(p / 0.24);
    if (p < 0.72)
        return 1 + Math.sin((p - 0.24) / 0.48 * Math.PI) * 0.04;
    return 1 - SmoothStep((p - 0.72) / 0.28) * 0.80;
}

function SpawnHitDust(target) {
    const waterDust = 288;
    const sandDust = 32;
    for (let i = 0; i < 8; i++) {
        try {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2.2;
            const velocity = Vector2.new(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const type = Math.random() < 0.65 ? waterDust : sandDust;
            NewDust(target.position, target.width, target.height, type, Number(velocity.X), Number(velocity.Y), 40, Color.White, 0.65 + Math.random() * 0.55);
        } catch (e) { }
    }
}

class SaharaSlicersBladeBase extends ModProjectile {
    constructor(texture, alternate) {
        super();
        this.Texture = texture;
        this.Alternate = alternate === true;
    }

    SetDefaults() {
        this.Projectile.width = 15;
        this.Projectile.height = 15;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.melee = true;
        this.Projectile.penetrate = -1;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.ownerHitCheck = true;
        this.Projectile.timeLeft = 30;
        this.Projectile.aiStyle = 0;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = -1;
    }

    AI(proj) {
        const ai = new ProjAI(proj);
        const player = Terraria.Main.player[proj.owner];
        if (!player || !player.active || player.dead) {
            proj.Kill();
            return;
        }
        const timer = Math.floor(Number(ai[0]) || 0) + 1;
        ai[0] = timer;
        const total = 12;
        if (timer >= total) {
            proj.Kill();
            return;
        }
        const velocityX = Number(proj.velocity.X) || 0;
        const velocityY = Number(proj.velocity.Y) || 0;
        const speed = Math.max(0.1, Math.sqrt(velocityX * velocityX + velocityY * velocityY));
        const direction = NormalizeOr(proj.velocity, Number(Terraria.PlayerDirection(player)) || 1, 0);
        const progress = timer / total;
        const distance = speed * 12 * ReachFactor(progress);
        const verticalOffset = (this.Alternate ? -6 : 1.5) * Number(player.gravDir || 1);
        const center = Vector2.Add(player.MountedCenter, Vector2.Multiply(direction, distance));
        center.Y = Number(center.Y) + verticalOffset;
        proj.Center = center;
        const horizontal = Number(direction.X);
        if (Math.abs(horizontal) > 0.04)
            Terraria.SetPlayerDirection(player, horizontal < 0 ? -1 : 1);
        const spriteDirection = Math.abs(horizontal) > 0.04 ? (horizontal < 0 ? -1 : 1) : (Number(Terraria.PlayerDirection(player)) || 1);
        player.heldProj = proj.whoAmI;
        player.itemTime = Math.max(Number(player.itemTime) || 0, 2);
        player.itemAnimation = Math.max(Number(player.itemAnimation) || 0, 2);
        const angle = Math.atan2(Number(direction.Y), Number(direction.X));
        proj.direction = spriteDirection;
        proj.spriteDirection = spriteDirection;
        proj.rotation = angle + Math.PI / 2 - Math.PI / 4 * spriteDirection;
        proj.scale = 1 + Math.sin((timer / 14) * Math.PI) * 0.20;
        try {
            proj.Opacity = Math.min(1, timer / 8);
        } catch (e) { }
        try {
            const stretch = Terraria.Player.CompositeArmStretchAmount.Full;
            const armRotation = angle - Math.PI / 2;
            if (this.Alternate) {
                player.SetCompositeArmBack(true, stretch, armRotation);
                player.SetCompositeArmFront(true, stretch, 0);
            } else {
                player.SetCompositeArmFront(true, stretch, armRotation);
            }
        } catch (e) { }
        if (Math.random() < 0.48) {
            try {
                const type = 288;
                NewDust(proj.position, proj.width, proj.height, type, -Number(direction.X) * 0.6, -Number(direction.Y) * 0.6, 70, Color.White, 0.3 + Math.random() * 0.35);
            } catch (e) { }
        }
    }

    OnHitNPC(proj, npc) {
        const player = Terraria.Main.player[proj.owner];
        const state = ModPlayer.getByName('CalamityPlayerState');
        const boltType = ModProjectile.getTypeByName('SaharaSlicersBolt');
        if (player && state) {
            if (state.SetSaharaSlicersAim)
                state.SetSaharaSlicersAim(player, proj.velocity);
            if (state.AddSaharaSlicersBolts && boltType > 0) {
                const result = state.AddSaharaSlicersBolts(player, 2);
                if (result && result.added > 0) {
                    let source = null;
                    try {
                        source = player.GetProjectileSource_Item(player.HeldItem);
                    } catch (e) { }
                    if (!source) {
                        try {
                            source = proj.GetProjectileSource_FromThis();
                        } catch (e) { }
                    }
                    for (let index = result.before + 1; index <= result.after; index++) {
                        NewProjectile(source, Terraria.PlayerCenter(player), Vector2.new(0, 0), boltType, proj.damage, proj.knockBack, Terraria.PlayerIndex(player), 0, index, 0, null);
                    }
                }
            }
        }
        SpawnHitDust(npc);
    }
}

export class SaharaSlicersBlade extends SaharaSlicersBladeBase {
    constructor() {
        super('Projectiles/Melee/SaharaSlicersBlade', false);
    }
}

export class SaharaSlicersBladeAlt extends SaharaSlicersBladeBase {
    constructor() {
        super('Projectiles/Melee/SaharaSlicersBladeAlt', true);
    }
}
