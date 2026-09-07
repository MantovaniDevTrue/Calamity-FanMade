import { Terraria } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModProjectile as MP } from './../../../TL/ModProjectile.js';

export class WulfrumScrewdriverProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Melee/WulfrumScrewdriver';
        this.AIType = Terraria.ID.ProjectileID.Trident;
    }

    SetDefaults() {
        this.CloneDefaults(Terraria.ID.ProjectileID.Trident);
        const p = this.Projectile;
        p.width = 14;
        p.height = 50;
        p.melee = true;
        p.friendly = true;
        p.penetrate = -1;
        p.tileCollide = false;
        p.ownerHitCheck = true;
        p.aiStyle = 19;
        p.timeLeft = 90;
    }

    OnHitNPC(p, n) {
        if (Math.random() < .2) {
            const t = MP.getTypeByName('WulfrumScrew');
            if (t > 0) {
                let source = null;
                try {
                    source = p.GetProjectileSource_FromThis();
                } catch (e) { }
                if (!source) {
                    try {
                        source = Terraria.Main.player[p.owner].GetProjectileSource_FromThis();
                    } catch (e) { }
                }
                if (source) {
                    const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, float X, float Y, float SpeedX, float SpeedY, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
                    NewProjectile(source, Number(n.Center.X), Number(n.Center.Y), (Math.random() - .5) * 4, -3 - Math.random() * 2, t, Math.max(1, Math.floor(Number(p.damage) * .7)), 1, p.owner, 0, 0, 0, null);
                }
            }
        }
    }
}

export class WulfrumScrew extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/WulfrumScrew';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 12;
        p.height = 16;
        p.melee = true;
        p.friendly = true;
        p.penetrate = 2;
        p.timeLeft = 240;
        p.tileCollide = true;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 20;
    }

    AI(p) {
        const v = p.velocity;
        v.Y = Number(v.Y) + .12;
        p.velocity = v;
        p.rotation += Number(v.X) * .08;
    }

    OnTileCollide(p) {
        const v = p.velocity;
        v.X = -Number(v.X) * .55;
        v.Y = -Math.abs(Number(v.Y)) * .55;
        p.velocity = v;
        p.penetrate--;
        return p.penetrate <= 0;
    }
}
