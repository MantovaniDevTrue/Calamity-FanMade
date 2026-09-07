import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { MarkRogueProjectile } from './../../../Core/RogueRuntime.js';
import {
    LuxorClass,
    AddClassLight,
    SpawnClassDust,
    ApplyHitFalloff,
    CircleIntersectsRect,
    DrawGlow,
    DirectionVector,
    RotateVector,
    SetVelocity,
    BounceFromOldVelocity,
    UpdateFade
} from './../LuxorProjectileUtils.js';

export class LuxorsGiftRogue extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Rogue/LuxorsGiftRogue';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 34;
        projectile.height = 48;
        projectile.friendly = true;
        projectile.penetrate = 3;
        projectile.timeLeft = 600;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = -1;
        projectile.extraUpdates = 2;
        projectile.tileCollide = false;
    }

    OnSpawn(projectile) {
        MarkRogueProjectile(projectile, 'LuxorsGift', true);
    }

    AI(projectile) {
        const local = new ProjAI(projectile, true);
        const age = Number(local[0]) || 0;
        local[0] = age + 1;
        if (age >= 25)
            projectile.tileCollide = true;
        const gravity = Number(projectile.numHits) === 0 ? 0.04 : 0.06;
        let vx = Number(projectile.velocity.X);
        let vy = Number(projectile.velocity.Y) + gravity;
        if (vy > 0)
            vx *= 0.99;
        SetVelocity(projectile, vx, vy);
        projectile.rotation = Math.atan2(vy, vx) + Math.PI / 2;
        AddClassLight(projectile, LuxorClass.Rogue, 0.8);
        if (Number(projectile.timeLeft) > 60 && Number(projectile.timeLeft) % 3 === 0)
            SpawnClassDust(projectile, LuxorClass.Rogue, 1, 0.5, 0.15);
        UpdateFade(projectile, 60);
    }

    OnHitNPC(projectile, npc) {
        ApplyHitFalloff(projectile, 0.4, 3);
        const away = DirectionVector(npc.Center, projectile.Center, 7, 0, -1);
        const bounced = RotateVector(away, (Math.random() * 2 - 1) * 0.2, 1);
        SetVelocity(projectile, Number(bounced.X) * 0.25, Number(bounced.Y) * 1.2);
        SpawnClassDust(projectile, LuxorClass.Rogue, 8, 1.0, 0.65);
    }

    OnTileCollide(projectile, hitDirection) {
        if (Number(projectile.numHits) === 0)
            projectile.numHits = 1;
        BounceFromOldVelocity(projectile, 0.92);
        return false;
    }

    Colliding(projectile, myRect, targetRect) {
        return CircleIntersectsRect(projectile.Center, 30, targetRect);
    }

    PreDraw(projectile, lightColor) {
        return DrawGlow(projectile, lightColor, LuxorClass.Rogue, 1, 4);
    }
}
