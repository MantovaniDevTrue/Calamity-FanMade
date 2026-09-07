import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { ApplyBurningBlood, ApplyIchor } from './../../../Core/PerforatorRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function setVelocity(proj, x, y) {
    proj.velocity = Vector2.new(Number(x), Number(y));
}

function dust(proj, type, scale = 0.5) {
    // Phase 12.74.11 benchmark: Perforator shots can remain alive for many seconds and
    // create Dust every AI update. Disable continuous projectile Dust to stop late-fight
    // particle accumulation; textures/animation remain visible.
    return;
}

class FallingShotBase extends ModProjectile {
    constructor(texture, ichor) {
        super();
        this.Texture = texture;
        this.ichor = ichor;
    }

    SetDefaults() {
        this.Projectile.width = 12;
        this.Projectile.height = 12;
        this.Projectile.hostile = true;
        this.Projectile.friendly = false;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.timeLeft = 240;
        this.Projectile.penetrate = 1;
    }

    OnSpawn(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        s.age = 0;
    }

    PreAI(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        const ai = new ProjAI(proj, false);
        s.age = Number(s.age || 0) + 1;
        if (Number(proj.position.Y) > Number(ai[1]))
            proj.tileCollide = true;
        proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) + Math.PI * 0.5;
        dust(proj, this.ichor ? 170 : 5, 0.5);
        const vy = Math.min(12, Number(proj.velocity.Y) + 0.06);
        setVelocity(proj, Number(proj.velocity.X) * 0.995, vy);
        return false;
    }

    OnHitPlayer(proj, player) {
        if (this.ichor)
            ApplyIchor(player, 240);
        else
            ApplyBurningBlood(player, 120);
    }

    OnKill(proj) {
        FusionEntityData.ClearProjectile(proj);
    }
}

export class IchorShot extends FallingShotBase {
    constructor() {
        super('Projectiles/Boss/IchorShot', true);
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 6;
    }

    PreAI(proj) {
        proj.frameCounter = Number(proj.frameCounter) + 1;
        if (Number(proj.frameCounter) > 4) {
            proj.frameCounter = 0;
            proj.frame = (Number(proj.frame) + 1) % 6;
        }
        return super.PreAI(proj);
    }
}

export class BloodGeyser extends FallingShotBase {
    constructor() {
        super('Projectiles/Boss/BloodGeyser', false);
    }
}

export class IchorBlob extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/IchorBlob';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 6;
    }

    SetDefaults() {
        this.Projectile.width = 52;
        this.Projectile.height = 56;
        this.Projectile.hostile = true;
        this.Projectile.friendly = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.tileCollide = false;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 360;
    }

    OnSpawn(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        s.age = 0;
        s.settled = false;
    }

    CanDamage(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        return Number(s.age || 0) > 45 && Number(s.age || 0) <= 300;
    }

    PreAI(proj) {
        const s = FusionEntityData.GetProjectile(proj);
        const ai = new ProjAI(proj, false);
        s.age = Number(s.age || 0) + 1;
        if (Number(proj.position.Y) > Number(ai[1]) - 48)
            proj.tileCollide = true;
        if (!s.settled) {
            proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) - Math.PI * 0.5;
            proj.frameCounter = Number(proj.frameCounter) + 1;
            if (Number(proj.frameCounter) > 6) {
                proj.frameCounter = 0;
                proj.frame = (Number(proj.frame) + 1) % 2;
            }
            setVelocity(proj, Number(proj.velocity.X) * 0.995, Math.min(6, Number(proj.velocity.Y) + 0.1));
        } else {
            setVelocity(proj, 0, 0);
            proj.rotation = 0;
            proj.frameCounter = Number(proj.frameCounter) + 1;
            if (Number(proj.frameCounter) > 6) {
                proj.frameCounter = 0;
                proj.frame = Math.min(5, Number(proj.frame) + 1);
            }
        }
        if (s.age > 300) {
            proj.damage = 0;
            proj.alpha = Math.min(255, Number(proj.alpha) + 18);
            if (Number(proj.alpha) >= 255)
                proj.Kill();
        }
        return false;
    }

    OnTileCollide(proj, hitDirection) {
        const s = FusionEntityData.GetProjectile(proj);
        s.settled = true;
        proj.tileCollide = false;
        proj.frame = Math.max(2, Number(proj.frame));
        setVelocity(proj, 0, 0);
        return false;
    }

    Colliding(proj, myRect, targetRect) {
        const cx = Number(proj.Center.X);
        const cy = Number(proj.frame) >= 2 ? Number(proj.Bottom.Y) - 16 : Number(proj.Center.Y);
        const left = Number(targetRect.X);
        const top = Number(targetRect.Y);
        const right = left + Number(targetRect.Width);
        const bottom = top + Number(targetRect.Height);
        const nearestX = Math.max(left, Math.min(cx, right));
        const nearestY = Math.max(top, Math.min(cy, bottom));
        const dx = cx - nearestX;
        const dy = cy - nearestY;
        return dx * dx + dy * dy <= 16 * 16;
    }

    OnHitPlayer(proj, player) {
        const s = FusionEntityData.GetProjectile(proj);
        if (Number(s.age || 0) > 45 && Number(s.age || 0) <= 300)
            ApplyIchor(player, 360);
    }

    OnKill(proj) {
        FusionEntityData.ClearProjectile(proj);
    }
}
