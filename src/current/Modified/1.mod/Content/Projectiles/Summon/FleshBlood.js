import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { FindTargetCached } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class FleshBlood extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/InvisibleProj';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.MinionShot[this.Type] = true;
            Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 4;
        p.height = 4;
        p.friendly = false;
        p.minion = true;
        p.penetrate = 1;
        p.timeLeft = 300;
        p.extraUpdates = 1;
    }

    AI(p) {
        if (p.timeLeft < 270) {
            p.friendly = true;
            const state = FusionEntityData.GetProjectileBag(p, 'fleshBloodTarget', () => ({ homingIndex: -1, homingNextScan: 0 }));
            const n = FindTargetCached(p.Center, state, 450, p, 6, 'homing');
            if (n) {
                const dx = Number(n.Center.X) - Number(p.Center.X), dy = Number(n.Center.Y) - Number(p.Center.Y), len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                p.velocity = Vector2.new((Number(p.velocity.X) * 19 + dx / len * 6) / 20, (Number(p.velocity.Y) * 19 + dy / len * 6) / 20);
            }
        }
        if (Math.random() < 0.25) {
            const d = NewDust(p.position, p.width, p.height, 5, 0, 0, 100, Color.White, 1);
            if (d >= 0) {
                Terraria.Main.dust[d].noGravity = true;
                Terraria.Main.dust[d].velocity = Vector2.Zero;
            }
        }
    }
}
