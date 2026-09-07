import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class ShadeNimbusRain extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/ShadeNimbusRain';
    }

    SetDefaults() {
        this.Projectile.width = 4;
        this.Projectile.height = 40;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.penetrate = 3;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.timeLeft = 180;
        this.Projectile.alpha = 50;
        this.Projectile.aiStyle = -1;
        this.Projectile.usesIDStaticNPCImmunity = true;
        this.Projectile.idStaticNPCHitCooldown = 6;
    }

    AI(proj) {
        let owner = null;
        try {
            owner = Terraria.Main.player[proj.owner];
        } catch (e) { }
        if (owner && Number(proj.Center.Y) > Number(Terraria.PlayerCenterY(owner)))
            proj.tileCollide = true;
    }

    OnHitNPC(proj, npc) {
        const buff = Number(ModBuff.getTypeByName('BrainRot') || 0);
        if (buff > 0)
            try {
                npc.AddBuff(buff, 60, false);
            } catch (e) { }
        if (Number(proj.numHits) > 0)
            proj.damage = Math.max(1, Math.floor(Number(proj.damage) * 0.75));
    }

    GetAlpha(proj, lightColor) {
        try {
            return Color.new(100, 255, 100, Number(proj.alpha));
        } catch (e) {
            return lightColor;
        }
    }

    OnKill(proj) {
        if (Terraria.Main.netMode === 2)
            return;
        try {
            const dustIndex = NewDust(Vector2.new(Number(proj.position.X), Number(proj.position.Y) + Number(proj.height) - 2), 2, 2, 14, 0, 0, 38, Color.White, 0.95);
            if (dustIndex >= 0) {
                const dust = Terraria.Main.dust[dustIndex];
                dust.position = Vector2.new(Number(dust.position.X) - 2, Number(dust.position.Y));
                dust.velocity = Vector2.new(Number(dust.velocity.X) * 0.1 - Number(proj.oldVelocity.X) * 0.25, Number(dust.velocity.Y) * 0.1 - Number(proj.oldVelocity.Y) * 0.25);
            }
        } catch (e) { }
    }
}
