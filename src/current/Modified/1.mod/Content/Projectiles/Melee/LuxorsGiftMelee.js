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

export class LuxorsGiftMelee extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/LuxorsGiftMelee';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 30;
        projectile.height = 38;
        projectile.friendly = true;
        projectile.melee = true;
        projectile.penetrate = -1;
        projectile.timeLeft = 180;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = -1;
        projectile.extraUpdates = 2;
        projectile.tileCollide = false;
    }

    AI(projectile) {
        const visualOnly = Number(new ProjAI(projectile, false)[0]) === 5;
        projectile.scale = visualOnly ? 0.5 : 0.75;
        projectile.friendly = !visualOnly && Number(projectile.numHits) < 2;
        SetVelocity(projectile, Number(projectile.velocity.X) * 0.973, Number(projectile.velocity.Y) * 0.973);
        projectile.rotation = Math.atan2(Number(projectile.velocity.Y), Number(projectile.velocity.X)) + Math.PI / 2;
        AddClassLight(projectile, LuxorClass.Melee, visualOnly ? 0.35 : 0.8);
        const dustRate = visualOnly ? 9 : 4;
        if (Number(projectile.timeLeft) > 30 && Number(projectile.timeLeft) % dustRate === 0)
            SpawnClassDust(projectile, LuxorClass.Melee, 1, visualOnly ? 0.45 : 0.55, visualOnly ? 0.12 : 0.22);
        UpdateFade(projectile, 45);
    }

    OnHitNPC(projectile, npc) {
        ApplyHitFalloff(projectile, 0.5, 3);
        if (Number(projectile.numHits) >= 1 && Number(projectile.timeLeft) > 70)
            projectile.timeLeft = 70;
        SpawnClassDust(projectile, LuxorClass.Melee, 3, 0.85, 0.45);
    }

    CanDamage(projectile) {
        const visualOnly = Number(new ProjAI(projectile, false)[0]) === 5;
        return !visualOnly && Number(projectile.numHits) < 2;
    }

    Colliding(projectile, myRect, targetRect) {
        if (!this.CanDamage(projectile))
            return false;
        return CircleIntersectsRect(projectile.Center, 20, targetRect);
    }

    PreDraw(projectile, lightColor) {
        return DrawGlow(projectile, lightColor, LuxorClass.Melee, 2, 4);
    }
}
