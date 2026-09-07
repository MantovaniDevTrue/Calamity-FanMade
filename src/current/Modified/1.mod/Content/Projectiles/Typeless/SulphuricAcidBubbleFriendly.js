import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const states = new Array(1000);

function slot(projectile) {
    const value = Number(projectile && projectile.whoAmI);
    return Number.isFinite(value) ? value | 0 : -1;
}

function stateFor(projectile) {
    const index = slot(projectile);
    if (index < 0 || index >= states.length)
        return null;
    let state = states[index];
    if (!state) {
        state = { age: 0 };
        states[index] = state;
    }
    return state;
}

function applyIrradiated(target) {
    const buff = Number(ModBuff.getTypeByName('Irradiated') || 0);
    if (!(buff > 0) || !target)
        return;
    try {
        target.AddBuff(buff, 120, false);
    } catch (e) { }
}

function playPop(position) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, position, 54, 0);
    } catch (e) { }
}

export class SulphuricAcidBubbleFriendly extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Enemy/SulphuricAcidBubble';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 7;
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 30;
        projectile.height = 30;
        projectile.scale = .1;
        projectile.friendly = true;
        projectile.tileCollide = false;
        projectile.alpha = 255;
        projectile.timeLeft = 75;
        projectile.penetrate = 1;
    }

    OnSpawn(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = { age: 0 };
    }

    AI(projectile) {
        const state = stateFor(projectile);
        if (!state)
            return;
        state.age++;

        projectile.frameCounter++;
        if (Number(projectile.frameCounter) > 6) {
            projectile.frame = (Number(projectile.frame) + 1) % 7;
            projectile.frameCounter = 0;
        }

        projectile.scale = Math.min(1, Number(projectile.scale) + .03);
        projectile.alpha = Math.max(100, Number(projectile.alpha) - 20);
        projectile.tileCollide = state.age > 30;

        let vx = Number(projectile.velocity.X);
        let vy = Number(projectile.velocity.Y);
        if (state.age > 20)
            vy = Math.max(-2.8, vy - .05);
        if (projectile.wet === true) {
            if (vy > 0)
                vy *= .98;
            if (vy > -1.2)
                vy -= .18;
        }
        vx *= .995;
        projectile.velocity = Vector2.new(vx, vy);
    }

    CanDamage(projectile) {
        const state = stateFor(projectile);
        return state && state.age >= 24 ? null : false;
    }

    OnHitNPC(projectile, npc) {
        applyIrradiated(npc);
        projectile.Kill();
    }

    OnKill(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = null;
        playPop(projectile.Center);
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = .8 + Math.random() * 2.4;
            const dust = NewDust(projectile.position, projectile.width, projectile.height, 31, Math.cos(angle) * speed, Math.sin(angle) * speed, 0, Color.White, .8 + Math.random() * .25);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
    }
}
