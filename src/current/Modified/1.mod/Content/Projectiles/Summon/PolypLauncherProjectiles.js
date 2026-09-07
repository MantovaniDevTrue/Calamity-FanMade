import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import {

    AcquireTargetIndex,
    NPCCenter,
    ProjectileSource,
    SpawnProjectile
} from './../../../Core/SeaKingArsenalRuntime.js';
const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function DustBurst(p, count, scale = 1) {
    if (Number(Terraria.Main.netMode) === 2)
        return;
    for (let i = 0; i < count; i++) {
        try {
            NewDust(p.position, p.width, p.height, 225, -Number(p.velocity.X) * 0.15 + (Math.random() - 0.5) * 2, -Number(p.velocity.Y) * 0.15 + (Math.random() - 0.5) * 2, 120, Color.White, scale);
        } catch (e) { }
    }
}

export class PolypLauncherSentry extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/PolypLauncherSentry';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 4;
        try {
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 42;
        p.height = 25;
        p.ignoreWater = true;
        p.tileCollide = true;
        p.sentry = true;
        p.timeLeft = 36000;
        p.penetrate = -1;
        p.friendly = false;
        p.hostile = false;
    }

    AI(p) {
        const player = Terraria.Main.player[Math.floor(Number(p.owner))];
        if (!player || !player.active || player.dead) {
            p.Kill();
            return;
        }
        const state = FusionEntityData.GetProjectileBag(p, 'polypLauncherSentry', () => ({ charge: 20, targetIndex: -1, nextTargetScan: 0 }));
        p.frameCounter = Number(p.frameCounter) + 1;
        if (Number(p.frameCounter) > 4) {
            p.frameCounter = 0;
            p.frame = (Number(p.frame) + 1) % 4;
        }
        p.velocity = Vector2.new(Number(p.velocity.X), Math.min(10, Number(p.velocity.Y) + 0.5));
        state.charge = Number(state.charge || 0) + 1 + Math.floor(Math.random() * 2);
        const targetIndex = AcquireTargetIndex(p, player, 800, state, 10, false);
        const target = targetIndex >= 0 ? Terraria.Main.npc[targetIndex] : null;
        const center = NPCCenter(target);
        if (center && state.charge > 40 && Number(p.owner) === Number(Terraria.Main.myPlayer)) {
            const source = ProjectileSource(p, player);
            const type = Number(ModProjectile.getTypeByName('PolypLauncherProjectile') || 0);
            const distance = Math.max(1, Math.abs(Number(center.X) - Number(p.Center.X)));
            const angle = 0.25 * Math.asin(Math.max(-1, Math.min(1, -0.4 * distance * 1.5 / (16 * 16))));
            const side = Number(center.X) < Number(p.Center.X) ? -1 : 1;
            const jitter = (Math.random() - 0.5) * 0.2;
            const finalAngle = angle + jitter;
            const velocity = Vector2.new(Math.sin(finalAngle) * 16 * side, -Math.cos(finalAngle) * 16);
            SpawnProjectile(source, p.Center, velocity, type, p.damage, p.knockBack, p.owner);
            state.charge = 0;
            p.netUpdate = true;
        }
    }

    CanDamage() {
        return false;
    }

    OnTileCollide(p, hitDirection) {
        let vx = Number(p.velocity.X), vy = Number(p.velocity.Y);
        if (Number(hitDirection.X) !== 0)
            vx = 0;
        if (Number(hitDirection.Y) !== 0)
            vy = 0;
        p.velocity = Vector2.new(vx, vy);
        return false;
    }
}

export class PolypLauncherProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/PolypLauncherProjectile';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.SentryShot[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 18;
        p.height = 18;
        p.friendly = true;
        p.hostile = false;
        p.tileCollide = true;
        p.ignoreWater = true;
        p.timeLeft = 300;
        p.alpha = 255;
    }

    AI(p) {
        const ai = new ProjAI(p, false);
        p.velocity = Vector2.new(Number(p.velocity.X), Math.min(10.4, Number(p.velocity.Y) + 0.4));
        ai[0] = Number(ai[0]) + 1;
        const age = Number(ai[0]);
        if (age < 10)
            p.alpha = Math.max(0, Math.floor(255 * (1 - age / 10)));
        p.rotation = Number(p.rotation) + (Math.abs(Number(p.velocity.X)) + Math.abs(Number(p.velocity.Y))) * 0.1 * (Number(p.direction) || 1);
    }

    OnKill(p) {
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, p.Center, 10, 0);
        } catch (e) { }
        DustBurst(p, 9, 1);
        if (Number(p.owner) !== Number(Terraria.Main.myPlayer))
            return;
        const source = ProjectileSource(p, Terraria.Main.player[p.owner]);
        const variants = ['PolypLauncherShrapnel1', 'PolypLauncherShrapnel2', 'PolypLauncherShrapnel3'];
        const amount = 1 + Math.floor(Math.random() * 4);
        for (let i = 0; i < amount; i++) {
            let vx = -Number(p.velocity.X) * (0.5 + Math.random() * 0.2) + (Math.random() * 6 - 3);
            let vy = -Number(p.velocity.Y) * (0.5 + Math.random() * 0.2) + (Math.floor(Math.random() * 17) - 8) * 0.2;
            if (vx > -2 && vx < 2)
                vx += -Number(p.velocity.X);
            if (vy > -2 && vy < 2)
                vy += -Number(p.velocity.Y);
            const type = Number(ModProjectile.getTypeByName(variants[Math.floor(Math.random() * variants.length)]) || 0);
            SpawnProjectile(source, Vector2.new(Number(p.Center.X) + vx, Number(p.Center.Y) + vy), Vector2.new(vx, vy), type, Math.max(1, Math.floor(Number(p.damage) * 0.5)), Number(p.knockBack) * 0.5, p.owner);
        }
    }
}

class PolypLauncherShrapnelBase extends ModProjectile {
    constructor(texture) {
        super();
        this.Texture = `Projectiles/Summon/${texture}`;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.SentryShot[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.friendly = true;
        p.hostile = false;
        p.width = 13;
        p.height = 13;
        p.ignoreWater = true;
        p.timeLeft = 120;
        p.tileCollide = true;
    }

    AI(p) {
        p.rotation = Number(p.rotation) + 0.6 * (Number(p.direction) || 1);
        p.velocity = Vector2.new(Number(p.velocity.X), Math.min(16, Number(p.velocity.Y) + 0.27));
    }

    OnKill(p) {
        DustBurst(p, 4, 0.7);
    }
}

export class PolypLauncherShrapnel1 extends PolypLauncherShrapnelBase {
    constructor() {
        super('PolypLauncherShrapnel1');
    }
}

export class PolypLauncherShrapnel2 extends PolypLauncherShrapnelBase {
    constructor() {
        super('PolypLauncherShrapnel2');
    }
}

export class PolypLauncherShrapnel3 extends PolypLauncherShrapnelBase {
    constructor() {
        super('PolypLauncherShrapnel3');
    }
}
