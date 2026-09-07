import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function state(p) {
    return FusionEntityData.GetProjectileBag(p, 'slimeBolt', () => ({ time: 0, bounces: 0, empowered: false }));
}

export class SlimeBolt extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'ExtraTextures/TinyGreyscaleCircle';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 10;
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 2;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 20;
        p.height = 20;
        p.friendly = true;
        p.ranged = true;
        p.penetrate = -1;
        p.extraUpdates = 2;
        p.timeLeft = 270;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 45;
        p.light = 0.3;
    }

    AI(p) {
        const s = state(p);
        s.time++;
        if (s.time === 135) {
            s.empowered = true;
            p.penetrate = 1;
            p.damage = Math.max(1, Math.floor(Number(p.originalDamage || p.damage) * 1.6));
            p.velocity = Vector2.Zero;
            p.rotation = Math.random() * Math.PI * 2;
            for (let i = 0; i < 10; i++) {
                const a = i * Math.PI * 2 / 10, d = NewDust(p.position, p.width, p.height, Math.random() < 0.33 ? 59 : 20, Math.cos(a) * 3, Math.sin(a) * 3, 0, Color.White, 1.4);
                if (d >= 0)
                    Terraria.Main.dust[d].noGravity = true;
            }
        } else if (s.time >= 90 && !s.empowered)
            p.velocity = Vector2.new(Number(p.velocity.X) * 0.97, Number(p.velocity.Y) * 0.97);
        if (s.empowered)
            p.rotation = Number(p.rotation) + 0.035;
        else if (Math.random() < (s.bounces > 0 ? 0.5 : 0.14)) {
            const d = NewDust(p.position, p.width, p.height, Math.random() < 0.33 ? 16 : 20, -Number(p.velocity.X) * 0.3, -Number(p.velocity.Y) * 0.3, 0, Color.White, 0.6);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
    }

    OnTileCollide(p, hit) {
        const s = state(p), mult = s.bounces > 0 ? 1 / Math.max(1, s.bounces) : (1.5 + Math.min(1, s.time / 135) * 1.5);
        p.velocity = Vector2.new(-Number(p.velocity.X) * mult, -Number(p.velocity.Y) * mult);
        s.bounces++;
        return false;
    }

    OnHitNPC(p, npc) {
        try {
            npc.AddBuff(Number(Terraria.ID.BuffID.Slimed || 137), 1200, false);
        } catch (e) { }
        const s = state(p);
        if (!s.empowered)
            p.damage = Math.max(1, Math.floor(Number(p.damage) * 0.85));
    }

    OnKill(p) {
        for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2, d = NewDust(p.position, p.width, p.height, 59, Math.cos(a) * 3, Math.sin(a) * 3, 0, Color.White, 1.1);
            if (d >= 0)
                Terraria.Main.dust[d].noGravity = true;
        }
    }

    GetAlpha(p, c) {
        return Color.new(133, 133, 224, Math.max(80, 255 - Number(p.alpha)));
    }
}
