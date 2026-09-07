import { ModProjectile } from './../../../TL/ModProjectile.js';
import {
    LuxorClass,
    Clamp,
    AddClassLight,
    SpawnClassDust,
    ApplyHitFalloff,
    CircleIntersectsRect,
    DrawGlow,
    Length,
    SetVelocity,
    UpdateFade
} from './../LuxorProjectileUtils.js';

export class LuxorsGiftMagic extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/LuxorsGiftMagic';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 18;
        projectile.height = 36;
        projectile.friendly = true;
        projectile.magic = true;
        projectile.penetrate = 2;
        projectile.timeLeft = 360;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = -1;
        projectile.extraUpdates = 2;
        projectile.tileCollide = false;
    }

    OnSpawn(projectile) {
        SetVelocity(projectile, Number(projectile.velocity.X) * 0.1, Number(projectile.velocity.Y) * 0.1);
    }

    VelocityLerp(projectile) {
        return Clamp((Length(projectile.velocity.X, projectile.velocity.Y) - 1) / 7, 0, 1);
    }

    AI(projectile) {
        const speed = Length(projectile.velocity.X, projectile.velocity.Y);
        if (speed < 8)
            SetVelocity(projectile, Number(projectile.velocity.X) * 1.01, Number(projectile.velocity.Y) * 1.01);
        projectile.rotation = Math.atan2(Number(projectile.velocity.Y), Number(projectile.velocity.X)) + Math.PI / 2;
        AddClassLight(projectile, LuxorClass.Magic, 0.8);
        if (Number(projectile.timeLeft) > 30 && Number(projectile.timeLeft) % 3 === 0)
            SpawnClassDust(projectile, LuxorClass.Magic, 2, 0.5, 0.55);
        UpdateFade(projectile, 45);
    }

    OnHitNPC(projectile, npc) {
        ApplyHitFalloff(projectile, 0.5, 3);
        SpawnClassDust(projectile, LuxorClass.Magic, 8, 1.1, 0.7);
    }

    OnTileCollide(projectile, hitDirection) {
        return false;
    }

    Colliding(projectile, myRect, targetRect) {
        return CircleIntersectsRect(projectile.Center, 10 + 65 * this.VelocityLerp(projectile), targetRect);
    }

    PreDraw(projectile, lightColor) {
        const stretch = this.VelocityLerp(projectile);
        return DrawGlow(
            projectile,
            lightColor,
            LuxorClass.Magic,
            3 + stretch * 2,
            4,
            Number(projectile.scale) * (1 - 0.3 * stretch),
            Number(projectile.scale) * (1 + 0.8 * stretch)
        );
    }
}
