import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Color, Vector2 } = Modules;
export class FrostBoltProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/FrostBoltProjectile';
        this.previousVelocity = new Map();
        this.wallBounces = new Map();
    }

    SetDefaults() {
        this.Projectile.width = 16;
        this.Projectile.height = 16;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.magic = true;
        this.Projectile.penetrate = 3;
        this.Projectile.timeLeft = 480;
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = false;
        this.Projectile.light = 0.65;
        this.Projectile.alpha = 20;
        this.Projectile.scale = 1.0;
        this.Projectile.aiStyle = 0;
        this.Projectile.extraUpdates = 0;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = -1;
    }

    AI(proj) {
        const age = 480 - proj.timeLeft;
        if (proj.timeLeft < 260) {
            const newX = proj.velocity.X * 0.9711;
            const newY = Math.min(15, proj.velocity.Y + 0.19);
            proj.velocity = Vector2.new(newX, newY);
        }
        proj.rotation += 0.3 * (proj.direction === 0 ? 1 : proj.direction);
        const pulse = Math.sin(age * 0.2);
        proj.scale = 0.96 + pulse * 0.04;
        proj.alpha = Math.max(0, Math.min(60, 22 + Math.floor(pulse * 14)));
        this.previousVelocity.set(proj.whoAmI, {
            x: Number(proj.velocity.X),
            y: Number(proj.velocity.Y)
        });
    }

    OnTileCollide(proj, hitDirection) {
        const previous = this.previousVelocity.get(proj.whoAmI) || {
            x: Number(proj.velocity.X),
            y: Number(proj.velocity.Y)
        };
        const bounceCount = this.wallBounces.get(proj.whoAmI) || 0;
        if (bounceCount >= 2)
            return true;
        const stepX = previous.x === 0 ? 0 : Math.sign(previous.x) * 3;
        const stepY = previous.y === 0 ? 0 : Math.sign(previous.y) * 3;
        let hitX = false;
        let hitY = false;
        try {
            hitX = Terraria.Collision['bool SolidTiles(Vector2 position, int width, int height)'](Vector2.new(proj.position.X + stepX, proj.position.Y), proj.width, proj.height);
            hitY = Terraria.Collision['bool SolidTiles(Vector2 position, int width, int height)'](Vector2.new(proj.position.X, proj.position.Y + stepY), proj.width, proj.height);
        } catch (e) { }
        if (!hitX && !hitY) {
            hitX = true;
            hitY = true;
        }
        const bouncedX = hitX ? -previous.x * 0.9 : previous.x;
        const bouncedY = hitY ? -previous.y * 0.9 : previous.y;
        proj.velocity = Vector2.new(bouncedX, bouncedY);
        proj.position = Vector2.new(proj.position.X - Math.sign(previous.x || 1) * 4, proj.position.Y - Math.sign(previous.y || 1) * 4);
        proj.netUpdate = true;
        this.wallBounces.set(proj.whoAmI, bounceCount + 1);
        this.previousVelocity.set(proj.whoAmI, { x: bouncedX, y: bouncedY });
        return false;
    }

    OnHitNPC(proj, npc) {
        try {
            npc['void AddBuff(int type, int time, bool quiet)'](Terraria.ID.BuffID.Frostburn, 60, false);
        } catch (e) {
            try {
                npc.AddBuff(Terraria.ID.BuffID.Frostburn, 60, false);
            } catch (ignored) { }
        }
        if (proj.damage > 1)
            proj.damage = Math.max(1, Math.floor(proj.damage * 0.85));
    }

    OnKill(proj) {
        this.previousVelocity.delete(proj.whoAmI);
        this.wallBounces.delete(proj.whoAmI);
    }

    GetAlpha(proj, lightColor) {
        return Color.new(110, 220, 255, 255 - proj.alpha);
    }
}
