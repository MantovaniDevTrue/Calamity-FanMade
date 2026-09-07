import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js';
import { FusionCamera } from './../../../Core/FusionCamera.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SandDustType = Number.isFinite(Number(Terraria.ID.DustID.Sand)) ? Math.floor(Number(Terraria.ID.DustID.Sand)) : 32;
function PlayImpact(position) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, position, 14, -0.08);
    } catch (e) { }
}

export class GreatSandBlast extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/GreatSandBlast';
    }

    SetDefaults() {
        this.Projectile.width = 10;
        this.Projectile.height = 10;
        this.Projectile.friendly = false;
        this.Projectile.hostile = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.tileCollide = false;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 600;
        this.Projectile.aiStyle = 0;
        this.Projectile.alpha = 255;
        this.Projectile.scale = 1.35;
    }

    BeginExplosion(proj) {
        const local = new ProjAI(proj, true);
        if (Number(local[1] || 0) >= 1)
            return;
        local[1] = 1;
        const centerX = Number(proj.Center.X);
        const centerY = Number(proj.Center.Y);
        proj.width = 52;
        proj.height = 52;
        proj.position = Vector2.new(centerX - 26, centerY - 26);
        proj.velocity = Vector2.new(0, 0);
        proj.tileCollide = false;
        proj.timeLeft = Math.min(Number(proj.timeLeft), 3);
        proj.alpha = 120;
        if (Terraria.Main.netMode !== 2) {
            PlayImpact(Vector2.new(centerX, centerY));
            FusionCamera.ShakeAt({ x: centerX, y: centerY }, 8, 1.4, 850);
            for (let i = 0; i < 12; i++) {
                const angle = Math.PI * 2 * i / 12;
                const speed = 1.7 + (i % 3) * 0.55;
                FusionVFXSystem.SpawnDot({ x: centerX, y: centerY }, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, 3.0 + (i % 2) * 0.7, { r: 240, g: 201, b: 126, a: 195 }, 20, { drag: 0.93, gravity: 0.045 });
            }
        }
    }

    AI(proj) {
        const local = new ProjAI(proj, true);
        const age = Number(local[0] || 0) + 1;
        local[0] = age;
        const exploding = Number(local[1] || 0) >= 1;
        if (exploding) {
            proj.rotation += 0.18;
            proj.scale = Math.min(2.2, Number(proj.scale) + 0.22);
            proj.alpha = Math.min(245, Number(proj.alpha) + 42);
            return;
        }
        if (age > 60)
            proj.tileCollide = true;
        proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) + Math.PI * 0.5;
        proj.alpha = Math.max(0, 255 - Math.max(0, age - 4) * 48);
        if (Terraria.Main.netMode !== 2 && age % 3 === 0) {
            FusionVFXSystem.SpawnDot({ x: Number(proj.Center.X), y: Number(proj.Center.Y) }, { x: -Number(proj.velocity.X) * 0.045, y: -Number(proj.velocity.Y) * 0.045 }, 3.2, { r: 246, g: 207, b: 132, a: 160 }, 13, { drag: 0.92 });
        }
        if (Terraria.Main.netMode !== 2 && age % 18 === 0) {
            const dust = NewDust(proj.position, proj.width, proj.height, SandDustType, 0, 0, 100, Color.White, 0.9);
            if (dust >= 0) {
                Terraria.Main.dust[dust].noGravity = true;
                Terraria.Main.dust[dust].velocity = Vector2.new(0, 0);
            }
        }
    }

    OnTileCollide(proj, hitDirection) {
        this.BeginExplosion(proj);
        return false;
    }

    OnHitPlayer(proj, player) {
        this.BeginExplosion(proj);
    }

    OnKill(proj) {
        const local = new ProjAI(proj, true);
        if (Number(local[1] || 0) < 1 && Terraria.Main.netMode !== 2) {
            PlayImpact(proj.Center);
            for (let i = 0; i < 8; i++) {
                const angle = Math.PI * 2 * i / 8;
                FusionVFXSystem.SpawnDot({ x: Number(proj.Center.X), y: Number(proj.Center.Y) }, { x: Math.cos(angle) * 1.8, y: Math.sin(angle) * 1.8 }, 3.2, { r: 238, g: 199, b: 123, a: 175 }, 17, { drag: 0.93, gravity: 0.04 });
            }
        }
    }

    GetAlpha(proj, lightColor) {
        return Color.new(255, 252, 235, Math.max(0, 255 - Number(proj.alpha)));
    }
}
