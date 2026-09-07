import { Terraria } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import {
    LuxorClass,
    AddClassLight,
    SpawnClassDust,
    ApplyHitFalloff,
    CircleIntersectsRect,
    DrawGlow,
    FindClosestNPC,
    CanChaseNPC,
    HomeTowards,
    SetVelocity,
    RotateVector,
    UpdateFade
} from './../LuxorProjectileUtils.js';

export class LuxorsGiftSummon extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/LuxorsGiftSummon';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 14;
        projectile.height = 46;
        projectile.friendly = true;
        projectile.penetrate = -1;
        projectile.timeLeft = 600;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = 10;
        projectile.extraUpdates = 2;
        projectile.tileCollide = false;
    }

    OnSpawn(projectile) {
        const ai = new ProjAI(projectile, false);
        ai[0] = -1;
        ai[1] = 0;
        ai[2] = 0;
    }

    AI(projectile) {
        const ai = new ProjAI(projectile, false);
        let targetIndex = Math.floor(Number(ai[0]) || -1);
        let attackTime = Math.max(0, Math.floor(Number(ai[1]) || 0));
        let scan = Math.max(0, Math.floor(Number(ai[2]) || 0));
        const target = targetIndex >= 0 && targetIndex < 200 ? Terraria.Main.npc[targetIndex] : null;
        if (!CanChaseNPC(target) || scan <= 0) {
            targetIndex = FindClosestNPC(projectile, 500);
            scan = 8;
        } else {
            scan--;
        }

        const activeTarget = targetIndex >= 0 && targetIndex < 200 ? Terraria.Main.npc[targetIndex] : null;
        if (attackTime <= 0 && CanChaseNPC(activeTarget)) {
            projectile.friendly = true;
            HomeTowards(projectile, activeTarget, 12, 12);
        } else {
            projectile.friendly = false;
            if (attackTime > 0) {
                attackTime--;
                const rotated = RotateVector(projectile.velocity, 0.09 * (Number(projectile.numHits) % 2 === 0 ? -1 : 1), 1);
                const speed = Math.sqrt(Number(rotated.X) ** 2 + Number(rotated.Y) ** 2);
                const scale = speed < 12 ? 1.025 : 1;
                SetVelocity(projectile, Number(rotated.X) * scale, Number(rotated.Y) * scale);
            }
        }

        projectile.rotation = Math.atan2(Number(projectile.velocity.Y), Number(projectile.velocity.X)) + Math.PI / 2;
        AddClassLight(projectile, LuxorClass.Summon, 0.8);
        if (Number(projectile.timeLeft) % 3 === 0)
            SpawnClassDust(projectile, LuxorClass.Summon, 1, 0.55, 0.45);
        UpdateFade(projectile, 45);
        ai[0] = targetIndex;
        ai[1] = attackTime;
        ai[2] = scan;
    }

    OnHitNPC(projectile, npc) {
        ApplyHitFalloff(projectile, 0.5, 3);
        const ai = new ProjAI(projectile, false);
        ai[1] = 45;
        projectile.friendly = false;
        SpawnClassDust(projectile, LuxorClass.Summon, 5, 0.9, 0.7);
        if (Number(projectile.numHits) >= 3)
            projectile.Kill();
    }

    Colliding(projectile, myRect, targetRect) {
        return CircleIntersectsRect(projectile.Center, 8, targetRect);
    }

    PreDraw(projectile, lightColor) {
        return DrawGlow(projectile, lightColor, LuxorClass.Summon, 1, 4);
    }
}
