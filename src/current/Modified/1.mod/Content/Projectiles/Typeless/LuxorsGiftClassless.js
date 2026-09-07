import { Terraria } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import {
    LuxorClass,
    AddClassLight,
    SpawnClassDust,
    ApplyHitFalloff,
    CircleIntersectsRect,
    DrawGlow,
    UpdateFade
} from './../LuxorProjectileUtils.js';

export class LuxorsGiftClassless extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/LuxorsGiftClassless';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 30;
        projectile.height = 38;
        projectile.friendly = true;
        projectile.melee = false;
        projectile.ranged = false;
        projectile.magic = false;
        projectile.penetrate = -1;
        projectile.timeLeft = 300;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = -1;
        projectile.extraUpdates = 2;
        projectile.tileCollide = false;
    }

    AI(projectile) {
        projectile.rotation = Math.atan2(Number(projectile.velocity.Y), Number(projectile.velocity.X)) + Math.PI / 2;
        AddClassLight(projectile, LuxorClass.Classless, 0.8);
        if (Number(projectile.timeLeft) % 4 === 0)
            SpawnClassDust(projectile, LuxorClass.Classless, 1, 0.45, 0.2);
        UpdateFade(projectile, 45);
    }

    OnHitNPC(projectile, npc) {
        ApplyHitFalloff(projectile, 0.1, 7);
        SpawnClassDust(projectile, LuxorClass.Classless, Math.max(1, 6 - Math.floor(Number(projectile.numHits) || 0)), 0.8, 0.45);
    }

    Colliding(projectile, myRect, targetRect) {
        return CircleIntersectsRect(projectile.Center, 20, targetRect);
    }

    PreDraw(projectile, lightColor) {
        return DrawGlow(projectile, lightColor, LuxorClass.Classless, 2, 4);
    }
}
