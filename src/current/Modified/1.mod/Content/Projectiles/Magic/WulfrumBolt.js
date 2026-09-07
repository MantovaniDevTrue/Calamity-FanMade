import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function target(p, max) {
    let best = -1, dist = max * max;
    ScanFrozenCubeNPCs(2);
    for (const i of FrozenCubeTrackedIndices()) {
        const n = FrozenCubeNPC(i);
        if (!n || !n.active || n.friendly || n.dontTakeDamage || n.life <= 0)
            continue;
        const dx = Number(n.Center.X) - Number(p.Center.X), dy = Number(n.Center.Y) - Number(p.Center.Y), d = dx * dx + dy * dy;
        if (d < dist) {
            dist = d;
            best = i;
        }
    }
    return best;
}

export class WulfrumBolt extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/WulfrumEnergyBurst';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 8;
        p.height = 8;
        p.magic = true;
        p.friendly = true;
        p.ignoreWater = true;
        p.penetrate = 1;
        p.timeLeft = 140;
        p.extraUpdates = 2;
    }

    AI(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'wbolt', () => ({ timer: 0, target: -1 }));
        s.timer++;
        if (s.timer % 30 === 1)
            s.target = target(p, 350);
        let vx = Number(p.velocity.X), vy = Number(p.velocity.Y);
        const n = s.target >= 0 ? Terraria.Main.npc[s.target] : null;
        if (n && n.active) {
            const dx = Number(n.Center.X) - Number(p.Center.X), dy = Number(n.Center.Y) - Number(p.Center.Y), l = Math.max(1, Math.sqrt(dx * dx + dy * dy)), speed = Math.sqrt(vx * vx + vy * vy);
            vx = vx * .93 + dx / l * speed * .07;
            vy = vy * .93 + dy / l * speed * .07;
        }
        vx *= .983;
        vy *= .983;
        p.velocity = Vector2.new(vx, vy);
        p.rotation = Math.atan2(vy, vx) + Math.PI / 2;
        if (s.timer % 4 === 0 && Terraria.Main.netMode !== 2) {
            const d = NewDust(p.position, p.width, p.height, Terraria.ID.DustID.GreenTorch, -vx * .06, -vy * .06, 0, Color.White, .75);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
    }
}
