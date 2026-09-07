import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { IsExpert, IsRevengeance, IsDeath } from './../../../Core/SlimeGodRuntime.js';
import { PlayItemSound } from '../../../Common/Snippets/LegacySoundCompat.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function setVelocity(proj, x, y) {
    proj.velocity = Vector2.new(Number(x), Number(y));
}

function timeLeftFor(crim) {
    if (crim)
        return IsDeath() ? 490 : (IsRevengeance() ? 440 : (IsExpert() ? 390 : 240));
    return IsDeath() ? 600 : (IsRevengeance() ? 540 : (IsExpert() ? 480 : 300));
}

class SlimeGlobBase extends ModProjectile {
    constructor(texture, crimson) {
        super();
        this.Texture = texture;
        this.crimson = crimson;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 6;
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 30;
        p.height = 30;
        p.hostile = true;
        p.friendly = false;
        p.penetrate = 1;
        p.tileCollide = false;
        p.ignoreWater = true;
        p.timeLeft = timeLeftFor(this.crimson);
        p.alpha = 51;
    }

    OnSpawn(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        s.age = 0;
    }

    CanDamage(proj) {
        return Number(proj.timeLeft) >= 60;
    }

    PreAI(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        const ai = new ProjAI(proj, false);
        s.age = Number(s.age || 0) + 1;
        let vx = Number(proj.velocity.X), vy = Number(proj.velocity.Y);
        const gravityMode = this.crimson && Number(ai[0]) === 1;
        if (gravityMode) {
            const gravityTimer = Number(ai[1]);
            if (gravityTimer < 60)
                ai[1] = gravityTimer + 1;
            else
                vy = Math.min(12, vy + 0.2);
        } else if (IsExpert() && Math.sqrt(vx * vx + vy * vy) < (this.crimson ? 15 : 12)) {
            const mult = IsDeath() ? 1.015 : (IsRevengeance() ? 1.0125 : 1.01);
            vx *= mult;
            vy *= mult;
        }
        setVelocity(proj, vx, vy);
        proj.rotation = Number(proj.rotation) + (Math.abs(vx) + Math.abs(vy)) * 0.05;
        if (Number(proj.timeLeft) < 60)
            proj.alpha = Math.min(255, Math.floor(255 - 204 * Number(proj.timeLeft) / 60));
        if ((Number(s.age) & 1) === 0) {
            const color = this.crimson ? Color.Crimson : Color.Lavender;
            const d = NewDust(proj.position, proj.width, proj.height, 4, 0, 0, proj.alpha, color, 1);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
        return false;
    }

    Colliding(proj, myRect, targetRect) {
        const cx = Number(proj.Center.X);
        const cy = Number(proj.Center.Y);
        const left = Number(targetRect.X);
        const top = Number(targetRect.Y);
        const right = left + Number(targetRect.Width);
        const bottom = top + Number(targetRect.Height);
        const nearestX = Math.max(left, Math.min(cx, right));
        const nearestY = Math.max(top, Math.min(cy, bottom));
        const dx = cx - nearestX;
        const dy = cy - nearestY;
        return dx * dx + dy * dy <= 12 * 12;
    }

    OnHitPlayer(proj, player) {
        try {
            const id = Number(Terraria.ID.BuffID.Slimed || 137);
            if (id > 0)
                player.AddBuff(id, 180, true);
        } catch (e) { }
    }

    OnKill(proj) {
        FusionEntityData.ClearProjectile(proj);
    }
}

export class CrimsonSpike extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Enemy/CrimsonSpike';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 6;
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 6;
        p.height = 6;
        p.hostile = true;
        p.friendly = false;
        p.penetrate = -1;
        p.tileCollide = true;
        p.ignoreWater = false;
        p.timeLeft = 300;
        p.alpha = 255;
        p.aiStyle = -1;
    }

    OnSpawn(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        s.age = 0;
        s.soundPlayed = false;
    }

    PreAI(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        s.age = Number(s.age || 0) + 1;
        if (!s.soundPlayed) {
            s.soundPlayed = true;
            try {
                PlayItemSound(17, proj.Center, 0, 0.65);
            } catch (e) { }
        }
        proj.alpha = Math.max(0, Number(proj.alpha) - 51);
        let vx = Number(proj.velocity.X), vy = Number(proj.velocity.Y);
        if (s.age >= 5)
            vy += 0.15;
        setVelocity(proj, vx, vy);
        proj.rotation = Math.atan2(vy, vx) + Math.PI * 0.5;
        if (Number(proj.alpha) <= 0 && (s.age % 3) === 0) {
            const d = NewDust(Vector2.new(Number(proj.position.X) - vx * 3, Number(proj.position.Y) - vy * 3), proj.width, proj.height, 260, 0, 0, 50, Color.Crimson, 1.2);
            if (d >= 0) {
                const dust = Terraria.Main.dust[d];
                dust.noGravity = true;
                dust.velocity = Vector2.new(Number(dust.velocity.X) * 0.3 + vx * 0.3, Number(dust.velocity.Y) * 0.3 + vy * 0.3);
            }
        }
        return false;
    }

    OnKill(proj) {
        if (Terraria.Main.netMode !== 2) {
            for (let i = 0; i < 5; i++)
                NewDust(proj.position, proj.width, proj.height, 260, Number(proj.velocity.X) * 0.5, Number(proj.velocity.Y) * 0.5, 50, Color.Crimson, 1);
        }
        FusionEntityData.ClearProjectile(proj);
    }
}

export class UnstableCrimulanGlob extends SlimeGlobBase {
    constructor() {
        super('Projectiles/Boss/UnstableCrimulanGlob', true);
    }
}

export class UnstableEbonianGlob extends SlimeGlobBase {
    constructor() {
        super('Projectiles/Boss/UnstableEbonianGlob', false);
    }
}
