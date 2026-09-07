import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import {
    LuxorClass,
    AddClassLight,
    SpawnClassDust,
    ApplyHitFalloff,
    CircleIntersectsRect,
    DrawGlow,
    SetVelocity,
    UpdateFade
} from './../LuxorProjectileUtils.js';

export class LuxorsGiftRanged extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/LuxorsGiftRanged';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 38;
        projectile.height = 38;
        projectile.friendly = true;
        projectile.ranged = true;
        projectile.penetrate = 1;
        projectile.timeLeft = 300;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = -1;
        projectile.extraUpdates = 3;
        projectile.tileCollide = false;
    }

    OnSpawn(projectile) {
        SetVelocity(projectile, Number(projectile.velocity.X) * 0.5, Number(projectile.velocity.Y) * 0.5);
    }

    AI(projectile) {
        const local = new ProjAI(projectile, true);
        const age = Number(local[0]) || 0;
        local[0] = age + 1;
        if (age >= 12)
            projectile.tileCollide = true;
        projectile.rotation = Math.atan2(Number(projectile.velocity.Y), Number(projectile.velocity.X)) + Math.PI / 2;
        AddClassLight(projectile, LuxorClass.Ranged, 0.8);
        if (Number(projectile.timeLeft) > 30 && Number(projectile.timeLeft) % 3 === 0)
            SpawnClassDust(projectile, LuxorClass.Ranged, 1, 0.45, 0.4);
        UpdateFade(projectile, 45);
    }

    OnHitNPC(projectile, npc) {
        ApplyHitFalloff(projectile, 0.5, 3);
    }

    OnKill(projectile, timeLeft) {
        SpawnClassDust(projectile, LuxorClass.Ranged, 8, 0.95, 0.7);
    }

    Colliding(projectile, myRect, targetRect) {
        return CircleIntersectsRect(projectile.Center, 20, targetRect);
    }

    PreDraw(projectile, lightColor) {
        return DrawGlow(projectile, lightColor, LuxorClass.Ranged, 2, 4);
    }
}
