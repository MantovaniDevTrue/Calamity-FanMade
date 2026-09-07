import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { GeneralParticleHandler } from './../../../TL/GeneralParticleHandler.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { PearlParticle } from './../../Particles/PearlParticle.js';

const { Vector2, Color } = Modules;

function RectOf(entity) {
    try {
        return entity['Rectangle getRect()']();
    } catch (e) {
        return null;
    }
}

function CenterOf(entity) {
    const rect = RectOf(entity);
    if (!rect)
        return null;
    return {
        x: Number(rect.X) + Number(rect.Width) * 0.5,
        y: Number(rect.Y) + Number(rect.Height) * 0.5
    };
}

function ResolveTarget(found) {
    if (found == null)
        return null;

    const index = Number(found);
    if (Number.isFinite(index) && index >= 0 && index < 200) {
        try {
            return Terraria.Main.npc[Math.floor(index)];
        } catch (e) { }
    }

    try {
        if (Number(found.whoAmI) >= 0)
            return found;
    } catch (e) { }
    return null;
}

function ValidTarget(npc, center) {
    if (!npc || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.life) <= 0 || Number(npc.lifeMax) <= 5 || !center)
        return false;

    const targetCenter = CenterOf(npc);
    if (!targetCenter)
        return false;

    const dx = targetCenter.x - center.x;
    const dy = targetCenter.y - center.y;
    return dx * dx + dy * dy <= 200 * 200;
}

function SpawnTrail(center, vx, vy) {
    if (!center || Terraria.Main.netMode === 2)
        return;

    const velocity = Vector2.new(
        -vx * 0.035 + (Math.random() - 0.5) * 0.35,
        -vy * 0.035 + (Math.random() - 0.5) * 0.35
    );
    const color = Color.new(145, 225 + Math.floor(Math.random() * 25), 255, 230);
    const particle = new PearlParticle(
        Vector2.new(center.x, center.y),
        velocity,
        false,
        28,
        0.5 + Math.random() * 0.18,
        color,
        0.955,
        (Math.random() - 0.5) * 0.12
    );
    GeneralParticleHandler.SpawnParticle(particle);
}

function SpawnBurst(center) {
    if (!center || Terraria.Main.netMode === 2)
        return;

    for (let i = 0; i < 7; i++) {
        const angle = Math.PI * 2 * i / 7 + Math.random() * 0.35;
        const speed = 1.4 + Math.random() * 2.2;
        const velocity = Vector2.new(Math.cos(angle) * speed, Math.sin(angle) * speed);
        const color = Color.new(165, 225 + Math.floor(Math.random() * 30), 255, 245);
        const particle = new PearlParticle(
            Vector2.new(center.x, center.y),
            velocity,
            true,
            38 + Math.floor(Math.random() * 12),
            0.58 + Math.random() * 0.25,
            color,
            0.96,
            (Math.random() - 0.5) * 0.2
        );
        GeneralParticleHandler.SpawnParticle(particle);
    }
}

export class PearlAuraShard extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/PearlAuraShard';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 14;
        projectile.height = 14;
        projectile.friendly = true;
        projectile.ignoreWater = true;
        projectile.timeLeft = 150;
        projectile.tileCollide = false;
        projectile.penetrate = 1;
        projectile.aiStyle = -1;
    }

    AI(projectile) {
        const state = FusionEntityData.GetProjectileBag(projectile, 'pearlAuraShard', () => ({ age: 0, target: -1 }));
        state.age++;

        const center = CenterOf(projectile);
        let target = state.target >= 0 ? Terraria.Main.npc[state.target] : null;
        if (!ValidTarget(target, center)) {
            state.target = -1;
            target = null;
        }

        if (state.age > 10 && state.age % 10 === 1) {
            try {
                target = ResolveTarget(projectile.FindTargetWithinRange(200, true));
                if (ValidTarget(target, center))
                    state.target = Number(target.whoAmI);
                else
                    target = null;
            } catch (e) {
                target = null;
                state.target = -1;
            }
        }

        let vx = Number(projectile.velocity.X) || 0;
        let vy = Number(projectile.velocity.Y) || 0;
        if (target && center) {
            const targetCenter = CenterOf(target);
            if (targetCenter) {
                const dx = targetCenter.x - center.x;
                const dy = targetCenter.y - center.y;
                const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const speed = Math.max(6, Math.sqrt(vx * vx + vy * vy));
                vx = vx * 0.9 + dx / distance * speed * 0.1;
                vy = vy * 0.9 + dy / distance * speed * 0.1;
            }
        }

        projectile.velocity = Vector2.new(vx, vy);
        projectile.rotation = Math.atan2(vy, vx) - Math.PI / 2;

        if (state.age % 5 === 0)
            SpawnTrail(center, vx, vy);
    }

    OnKill(projectile) {
        SpawnBurst(CenterOf(projectile));
        FusionEntityData.ClearProjectile(projectile);
    }
}
