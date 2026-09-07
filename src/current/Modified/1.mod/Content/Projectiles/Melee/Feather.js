import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

export class Feather extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/TradewindsProjectile';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 14;
        p.height = 14;
        p.friendly = true;
        p.melee = true;
        p.penetrate = 1;
        // Source: timeLeft 150 + extraUpdates=1. Mobile version preserves total travel/lifetime
        // with one native update instead of invoking JS twice per game tick.
        p.timeLeft = 75;
        p.aiStyle = 1;
        p.extraUpdates = 0;
    }

    OnSpawn(p) {
        p.velocity = Vector2.new(Number(p.velocity.X) * 2, Number(p.velocity.Y) * 2);
    }

    // No AI callback on purpose. aiStyle=1 already handles native arrow-style movement/rotation.
    // 13.10.2 crossed JS/native once per tick per feather just to recalculate rotation.

    OnKill(p) {
        // Purely cosmetic mobile budget. The source uses ten dusts per feather.
        for (let i = 0; i < 2; i++) {
            try {
                const d = NewDust(p.position, p.width, p.height, 64,
                    Number(p.velocity.X) * 0.35, Number(p.velocity.Y) * 0.35, 100, Color.White, 1.1);
                if (d >= 0) Terraria.Main.dust[d].noGravity = true;
            } catch (e) { }
        }
    }
}
