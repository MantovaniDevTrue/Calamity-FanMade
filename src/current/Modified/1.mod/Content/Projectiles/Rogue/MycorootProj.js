import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { MarkRogueProjectile, GetRogueProjectileData } from './../../../Core/RogueRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class MycorootProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/Mycoroot';
    }

    SetDefaults() {
        this.Projectile.width = 12;
        this.Projectile.height = 12;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ranged = false;
        this.Projectile.melee = false;
        this.Projectile.magic = false;
        this.Projectile.penetrate = 1;
        this.Projectile.aiStyle = 0;
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = false;
        this.Projectile.timeLeft = 120;
    }

    AI(proj) {
        const ai = new ProjAI(proj);
        MarkRogueProjectile(proj, 'Mycoroot', Number(ai[0]) === 1);
        const rogueData = GetRogueProjectileData(proj);
        if (rogueData?.subProjectile === true)
            proj.alpha = Math.min(255, Number(proj.alpha || 0) + 8);
        if (Math.random() < 0.25) {
            try {
                const dustPosition = Vector2.new(Number(proj.position.X) + Number(proj.velocity.X), Number(proj.position.Y) + Number(proj.velocity.Y));
                NewDust(dustPosition, proj.width, proj.height, 59, 0, 0, 0, Color.White, 1);
            } catch (e) { }
        }
        proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) + Math.PI / 4;
        proj.alpha = Math.min(255, Number(proj.alpha || 0) + 20);
        const remaining = Math.max(0, 255 - Number(proj.alpha || 0)) / 255;
        try {
        } catch (e) { }
        if (Number(proj.alpha) >= 255) {
            proj.Kill();
        }
    }
}
