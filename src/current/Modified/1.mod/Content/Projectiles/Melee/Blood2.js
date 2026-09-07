import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { FindTargetCached } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class Blood2 extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/InvisibleProj';
        this.BurningBloodType = 0;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 4;
        p.height = 4;
        p.friendly = false;
        p.melee = true;
        p.penetrate = 1;
        p.timeLeft = 150;
        p.tileCollide = true;
    }

    AI(p) {
        const ai = new ProjAI(p);
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        const seeded = Math.floor(Number(ai[0] || 0)) - 1;
        const state = FusionEntityData.GetProjectileBag(p, 'blood2Target', () => ({
            homingIndex: seeded >= 0 && seeded < 200 ? seeded : -1,
            homingNextScan: tick + 15,
            dustTimer: 0
        }));
        state.dustTimer = Number(state.dustTimer || 0) + 1;
        if (p.timeLeft < 120) {
            p.friendly = true;
            const n = FindTargetCached(p.Center, state, 450, p, 15, 'homing');
            if (n) {
                const dx = Number(n.Center.X) - Number(p.Center.X), dy = Number(n.Center.Y) - Number(p.Center.Y), len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                p.velocity = Vector2.new((Number(p.velocity.X) * 19 + dx / len * 6) / 20, (Number(p.velocity.Y) * 19 + dy / len * 6) / 20);
            }
        }
        if (state.dustTimer >= 8) {
            state.dustTimer = 0;
            try {
                const d = NewDust(p.position, p.width, p.height, 5, 0, 0, 100, Color.White, 1);
                if (d >= 0) {
                    Terraria.Main.dust[d].noGravity = true;
                    Terraria.Main.dust[d].velocity = Vector2.Zero;
                }
            } catch (e) { }
        }
    }

    OnHitNPC(p, npc) {
        if (!(this.BurningBloodType > 0))
            this.BurningBloodType = Number(ModBuff.getTypeByName('BurningBlood') || 0);
        if (this.BurningBloodType > 0)
            try {
                npc.AddBuff(this.BurningBloodType, 60, false);
            } catch (e) { }
    }
}
