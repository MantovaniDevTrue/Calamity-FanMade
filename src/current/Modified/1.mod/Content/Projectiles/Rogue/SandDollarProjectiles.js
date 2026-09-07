import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { MarkRogueProjectile, IsStealthStrike } from './../../../Core/RogueRuntime.js';
import { ProjectileSource, SpawnProjectile } from './../../../Core/SeaKingArsenalRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
class SandDollarBase extends ModProjectile {
    constructor(stealth = false) {
        super();
        this.StealthVariant = stealth;
        this.Texture = 'Items/Weapons/Rogue/SandDollar';
        this.AIType = 272;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 30;
        p.height = 28;
        p.friendly = true;
        p.hostile = false;
        p.penetrate = -1;
        p.aiStyle = 3;
        p.timeLeft = 300;
        p.tileCollide = true;
        p.ignoreWater = false;
        if (this.StealthVariant) {
            p.usesLocalNPCImmunity = true;
            p.localNPCHitCooldown = 10;
        }
    }

    AI(p) {
        MarkRogueProjectile(p, 'SandDollar', false);
    }

    OnTileCollide(p, hitDirection) {
        const ai = new ProjAI(p, false);
        if (Number(hitDirection.X) !== 0)
            p.velocity = Vector2.new(-Number(p.velocity.X), Number(p.velocity.Y));
        if (Number(hitDirection.Y) !== 0)
            p.velocity = Vector2.new(Number(p.velocity.X), -Number(p.velocity.Y));
        ai[0] = Number(ai[0]) + 0.1;
        return false;
    }

    OnHitNPC(p, npc) {
        if (!this.StealthVariant && !IsStealthStrike(p))
            return;
        if (Number(p.owner) !== Number(Terraria.Main.myPlayer))
            return;
        const source = ProjectileSource(p, Terraria.Main.player[p.owner]);
        const variants = ['SandDollarFrag1', 'SandDollarFrag2', 'SandDollarFrag3'];
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const type = Number(ModProjectile.getTypeByName(variants[Math.floor(Math.random() * variants.length)]) || 0);
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            SpawnProjectile(source, p.Center, Vector2.new(Math.cos(angle) * speed, Math.sin(angle) * speed - 2), type, Math.max(1, Math.floor(Number(p.damage) / 3)), 0, p.owner);
        }
    }
}

export class SandDollarProj extends SandDollarBase {
    constructor() {
        super(false);
    }
}

export class SandDollarStealth extends SandDollarBase {
    constructor() {
        super(true);
    }
}

class SandDollarFragBase extends ModProjectile {
    constructor(textureName) {
        super();
        this.Texture = `Projectiles/Rogue/${textureName}`;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 16;
        p.height = 22;
        p.friendly = true;
        p.hostile = false;
        p.timeLeft = 180;
        p.tileCollide = true;
    }

    AI(p) {
        MarkRogueProjectile(p, 'SandDollarFrag', true);
        p.velocity = Vector2.new(Number(p.velocity.X), Math.min(16, Number(p.velocity.Y) + 0.11));
        p.rotation = Number(p.rotation) + Number(p.velocity.X) * 0.025;
    }

    OnKill(p) {
        for (let i = 0; i < 5; i++)
            try {
                const d = NewDust(p.position, p.width, p.height, 32, Number(p.oldVelocity.X) / 4, Number(p.oldVelocity.Y) / 4, 0, Color.new(234, 183, 100, 255), 1);
                const dust = Terraria.Main.dust[d];
                if (dust)
                    dust.noGravity = true;
            } catch (e) { }
    }
}

export class SandDollarFrag1 extends SandDollarFragBase {
    constructor() {
        super('SandDollarFrag1');
    }
}

export class SandDollarFrag2 extends SandDollarFragBase {
    constructor() {
        super('SandDollarFrag2');
    }
}

export class SandDollarFrag3 extends SandDollarFragBase {
    constructor() {
        super('SandDollarFrag3');
    }
}
