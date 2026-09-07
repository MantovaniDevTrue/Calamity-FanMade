import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class BloodBeam extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/BloodBeam';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 12;
        p.height = 12;
        p.friendly = true;
        p.tileCollide = false;
        p.magic = true;
        p.penetrate = 2;
        p.extraUpdates = 3;
        p.timeLeft = 120;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
    }

    AI(p) {
        const s = FusionEntityData.GetProjectileBag(p, 'bloodBeam', () => ({ ticks: 0 }));
        s.ticks++;
        try {
        } catch (e) { }
        const owner = Terraria.Main.player[p.owner];
        if (owner && Number(p.position.Y) > Number(Terraria.PlayerPositionY(owner)) - 160)
            p.tileCollide = true;
        if (s.ticks > 7) {
            const d = NewDust(p.position, p.width, p.height, 5, Number(p.velocity.X) * 0.2, Number(p.velocity.Y) * 0.2, 100, Color.White, 1);
            if (d >= 0 && Math.random() < 1 / 3) {
                Terraria.Main.dust[d].noGravity = true;
                Terraria.Main.dust[d].scale *= 2;
            }
        }
        p.rotation = Math.atan2(Number(p.velocity.Y), Number(p.velocity.X)) - Math.PI / 2;
    }

    OnHitNPC(p, npc) {
        const b = Number(ModBuff.getTypeByName('BurningBlood') || 0);
        if (b > 0)
            try {
                npc.AddBuff(b, 120, false);
            } catch (e) { }
    }
}
