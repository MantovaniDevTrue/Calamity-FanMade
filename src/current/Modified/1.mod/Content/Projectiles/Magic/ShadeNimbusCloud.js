import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Color } = Modules;
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class ShadeNimbusCloud extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/ShadeNimbusCloud';
        this.StartFading = false;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 4;
    }

    SetDefaults() {
        this.Projectile.timeLeft = 300;
        this.Projectile.width = 28;
        this.Projectile.height = 28;
        this.Projectile.netImportant = true;
        this.Projectile.friendly = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.tileCollide = false;
        this.Projectile.magic = true;
    }

    OnSpawn() {
        this.StartFading = false;
    }

    AI(proj) {
        proj.velocity.X *= 0.95;
        proj.velocity.Y *= 0.95;
        proj.frameCounter++;
        proj.frame = Math.floor(Number(proj.frameCounter) / 8) % 4;
        let solid = false;
        try {
            solid = SolidCollision(proj.Center, proj.width, proj.height);
        } catch (e) { }
        if (solid || Number(proj.timeLeft) < 127)
            this.StartFading = true;
        if (this.StartFading)
            proj.alpha += 2;
    }

    OnHitNPC(proj, npc) {
        for (let i = 0; i < 40; i++)
            try {
                NewDust(proj.position, proj.width, proj.height, 14, 0, 0, 0, Color.White, 0.5);
            } catch (e) { }
        const buff = Number(ModBuff.getTypeByName('BrainRot') || 0);
        if (buff > 0)
            try {
                npc.AddBuff(buff, 120, false);
            } catch (e) { }
    }
}
