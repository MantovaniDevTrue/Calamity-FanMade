import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ProjAI } from './../../../TL/ProjAI.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function playPop(position) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, position, 54, 0);
    } catch (e) { }
}

function applyIrradiated(player) {
    const buff = Number(ModBuff.getTypeByName('Irradiated') || 0);
    if (buff <= 0)
        return;
    try {
        player.AddBuff(buff, 120, true);
    } catch (e) {
        try {
            player.AddBuff(buff, 120, false);
        } catch (ignored) { }
    }
}

export class SulphuricAcidBubble extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Enemy/SulphuricAcidBubble';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 7;
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 1;
        projectile.height = 1;
        projectile.scale = 0.01;
        projectile.damage = 0;
        projectile.friendly = false;
        projectile.hostile = true;
        projectile.tileCollide = false;
        projectile.ignoreWater = true;
        projectile.penetrate = 1;
        projectile.timeLeft = 360;
        projectile.aiStyle = 0;
        projectile.alpha = 255;
    }

    AI(projectile) {
        const ai = new ProjAI(projectile, false);
        const localAI = new ProjAI(projectile, true);
        projectile.frameCounter = Number(projectile.frameCounter) + 1;
        if (Number(projectile.frameCounter) > 6) {
            projectile.frameCounter = 0;
            projectile.frame = (Number(projectile.frame) + 1) % 7;
        }
        let scale = Number(localAI[1]) || 0;
        if (scale < 1) {
            scale = Math.min(1, scale + 0.01);
            localAI[1] = scale;
            projectile.scale = Math.max(0.01, scale);
            projectile.width = Math.max(1, Math.floor(30 * projectile.scale));
            projectile.height = Math.max(1, Math.floor(30 * projectile.scale));
            projectile.damage = 0;
            projectile.tileCollide = false;
        } else {
            projectile.scale = 1;
            projectile.width = 30;
            projectile.height = 30;
            projectile.damage = 20;
            projectile.tileCollide = true;
        }
        const fadeTimer = Number(localAI[0]) || 0;
        if (fadeTimer > 2)
            projectile.alpha = Math.max(102, Number(projectile.alpha) - 20);
        else
            localAI[0] = fadeTimer + 1;
        const riseTimer = Number(ai[1]) || 0;
        const velocity = projectile.velocity;
        if (riseTimer > 30) {
            if (Number(velocity.Y) > -2)
                velocity.Y = Number(velocity.Y) - 0.05;
        } else {
            ai[1] = riseTimer + 1;
        }
        if (projectile.wet) {
            if (Number(velocity.Y) > 0)
                velocity.Y = Number(velocity.Y) * 0.98;
            if (Number(velocity.Y) > -1)
                velocity.Y = Number(velocity.Y) - 0.2;
        }
        projectile.velocity = velocity;
    }

    CanDamage(projectile) {
        return Number(new ProjAI(projectile, true)[1]) >= 1;
    }

    OnHitPlayer(projectile, player) {
        if (Number(new ProjAI(projectile, true)[1]) < 1)
            return;
        applyIrradiated(player);
        try {
            projectile.Kill();
        } catch (e) {
            projectile.active = false;
        }
    }

    OnKill(projectile) {
        const centerX = Number(projectile.position.X) + Number(projectile.width) * 0.5;
        const centerY = Number(projectile.position.Y) + Number(projectile.height) * 0.5;
        const opacity = Math.max(0, Math.min(1, (255 - Number(projectile.alpha)) / 255));
        playPop(Vector2.new(centerX, centerY));
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (1 + Math.floor(Math.random() * 29)) * 0.1;
            const dust = NewDust(Vector2.new(centerX - 30, centerY - 30), 60, 60, 31, Math.cos(angle) * speed, Math.sin(angle) * speed, 255 - Math.floor(opacity * 255), Color.White, 1);
            if (dust < 0)
                continue;
            const particle = Terraria.Main.dust[dust];
            if (particle)
                particle.noGravity = true;
        }
    }

    GetAlpha(projectile, lightColor) {
        return Color.new(255, 255, 255, Math.max(0, 255 - Number(projectile.alpha)));
    }
}
