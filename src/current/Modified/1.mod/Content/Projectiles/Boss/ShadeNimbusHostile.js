import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import {

    GetProjectileType,
    IsDeath,
    IsGoodWorld,
    ApplyBrainRot,
    SpawnProjectile
} from './../../../Core/HiveMindRuntime.js';
const { Vector2 } = Modules;
export class ShadeNimbusHostile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/ShadeNimbusHostile';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 6;
    }

    SetDefaults() {
        this.Projectile.width = 54;
        this.Projectile.height = 28;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.hostile = true;
        this.Projectile.friendly = false;
        this.Projectile.timeLeft = IsDeath() ? 480 : 360;
        this.Projectile.penetrate = -1;
        this.Projectile.aiStyle = 0;
    }

    AI(proj) {
        // Avoid creating ProjAI bridge wrappers every tick for every active cloud.
        const state = FusionEntityData.GetProjectileBag(proj, 'shadeNimbus', () => ({ age: 0, rainTimer: 0 }));
        state.age++;
        proj.frameCounter++;
        if (Number(proj.frameCounter) > 8) {
            proj.frameCounter = 0;
            proj.frame = (Number(proj.frame) + 1) % 6;
        }
        const fadeStart = IsDeath() ? 420 : 300;
        if (state.age >= fadeStart) {
            proj.alpha = Number(proj.alpha) + 5;
            if (Number(proj.alpha) > 255) {
                proj.alpha = 255;
                proj.Kill();
            }
            return;
        }
        state.rainTimer++;
        const interval = IsGoodWorld() ? 10 : 36;
        if (state.rainTimer >= interval) {
            state.rainTimer = 0;
            const rain = GetProjectileType('ShaderainHostile');
            if (rain > 0) {
                const x = Number(proj.position.X) + 14 + Math.random() * Math.max(1, Number(proj.width) - 28);
                const y = Number(proj.position.Y) + Number(proj.height) + 4;
                SpawnProjectile(rain, Vector2.new(x, y), Vector2.new(0, 8), Number(proj.damage));
            }
        }
    }

    OnHitPlayer(proj, player) {
        ApplyBrainRot(player, 240);
    }

    OnKill(proj) {
        FusionEntityData.ClearProjectile(proj);
    }
}
