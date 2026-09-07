import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

export class FeatherLarge extends ModProjectile {
    constructor() {
        super();
        // Calamity source intentionally reuses the vanilla Giant Harpy Feather item texture.
        this.Texture = 'Items/Weapons/Ranged/FeatherLarge';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 14;
        p.height = 14;
        p.friendly = true;
        p.ranged = true;
        p.penetrate = 1;
        p.timeLeft = 300;
    }

    AI(p) { p.rotation = Math.atan2(Number(p.velocity.Y), Number(p.velocity.X)) + Math.PI / 2; }

    OnTileCollide(p, oldVelocity) { return true; }

    OnKill(p) {
        for (let i = 0; i < 4; i++) {
            try { NewDust(p.position, p.width, p.height, 42, Number(p.velocity.X) * 0.1, Number(p.velocity.Y) * 0.1, 0, Color.White, 1); } catch (e) { }
        }
    }
}
