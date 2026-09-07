import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function SpawnDust(position, width, height, type, speedX, speedY, alpha, scale, noGravity = true) {
    try {
        const index = NewDust(position, width, height, type, speedX, speedY, alpha, Color.White, scale);
        const dust = Terraria.Main.dust[index];
        if (dust)
            dust.noGravity = noGravity;
    } catch (e) { }
}

export class Sandstream extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/Sandstream';
    }

    SetDefaults() {
        this.Projectile.width = 32;
        this.Projectile.height = 32;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.magic = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = -1;
        this.Projectile.extraUpdates = 2;
        this.Projectile.tileCollide = true;
        this.Projectile.timeLeft = 240;
        this.Projectile.aiStyle = 0;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = -1;
    }

    AI(proj) {
        const localAI = new ProjAI(proj, true);
        const time = Number(localAI[0] || 0) + 1;
        localAI[0] = time;
        const postHit = Number(localAI[1] || 0) >= 1;
        const dirt = 32;
        const sand = 32;
        if (time <= 1) {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.random() - 0.5) * 1.2;
                const base = Vector2.RotatedBy(proj.velocity, angle);
                const speed = 0.2 + Math.random();
                SpawnDust(proj.Center, 2, 2, dirt, Number(base.X) * speed, Number(base.Y) * speed, 0, 1.3 + Math.random() * 0.7, true);
            }
        }
        if (postHit) {
            proj.penetrate = 1;
            proj.extraUpdates = 3;
            if (time % 2 === 0) {
                for (let i = 0; i < 2; i++) {
                    SpawnDust(proj.position, proj.width, proj.height, Math.random() < 0.34 ? 216 : sand, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, 80, 0.45 + Math.random() * 0.7, true);
                }
            }
            const falloffTime = 15;
            let nextX = Number(proj.velocity.X);
            let nextY = Number(proj.velocity.Y);
            if (time > falloffTime)
                nextX *= 0.9711;
            if (time > falloffTime && nextY < 15)
                nextY += 0.16;
            if (nextY < 5)
                nextY *= 0.98;
            proj.velocity = Vector2.new(nextX, nextY);
        } else {
            if (time % 2 === 0) {
                const size = Math.max(0.9, 1.5 - time * 0.01);
                for (let i = 0; i < 2; i++) {
                    SpawnDust(proj.position, proj.width, proj.height, Math.random() < 0.34 ? 216 : sand, Number(proj.velocity.X) * 0.3 + (Math.random() - 0.5), Number(proj.velocity.Y) * 0.3 + (Math.random() - 0.5), 60, size + Math.random() * 0.35, true);
                }
            }
            proj.velocity = Vector2.new(Number(proj.velocity.X), Number(proj.velocity.Y) + 0.035);
        }
    }

    OnHitNPC(proj, npc) {
        const localAI = new ProjAI(proj, true);
        if (Number(localAI[1] || 0) < 1) {
            localAI[0] = 2;
            localAI[1] = 1;
            proj.timeLeft = 300;
        }
        const sand = 32;
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random();
            SpawnDust(npc.Center, 2, 2, Math.random() < 0.34 ? 216 : sand, Math.cos(angle) * speed, Math.sin(angle) * speed, 0, 0.5 + Math.random() * 0.35, false);
        }
    }

    OnKill(proj) {
        const explosion = ModProjectile.getTypeByName('SandstreamScepterExplosion');
        if (explosion > 0) {
            NewProjectile(proj.GetProjectileSource_FromThis(), proj.Center, Vector2.Zero, explosion, Math.max(1, Math.floor(Number(proj.damage) / 3)), Number(proj.knockBack) * 4, proj.owner, 0, 0, 0, null);
        }
        const dirt = 32;
        const sand = 32;
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4;
            SpawnDust(proj.Center, 2, 2, Math.random() < 0.5 ? dirt : sand, Math.cos(angle) * speed, Math.sin(angle) * speed, 0, 1.0 + Math.random() * 0.6, false);
        }
    }

    PreDraw() {
        return false;
    }
}
