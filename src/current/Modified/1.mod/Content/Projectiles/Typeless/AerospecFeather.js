import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { PlayItemSound } from '../../../Common/Snippets/LegacySoundCompat.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
// Terraria DustID.UnusedWhiteBluePurple = 229. Use the numeric ID because TLPro's native enum wrapper throws when an unavailable member is accessed.
const DustType = 229;

function IsTarget(npc, projectile, maxRange) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.lifeMax) <= 5)
        return false;
    try { if (!npc.CanBeChasedBy(projectile, false)) return false; } catch (e) { }
    const dx = Number(npc.Center.X) - Number(projectile.Center.X);
    const dy = Number(npc.Center.Y) - Number(projectile.Center.Y);
    const extra = (Number(npc.width) + Number(npc.height)) * 0.5;
    return dx * dx + dy * dy <= (maxRange + extra) * (maxRange + extra);
}

export class AerospecFeather extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/AerospecFeather';
        // ProjectileID.NailFriendly = 498 in Terraria 1.4.4.
        // Using the numeric ID avoids native member lookup differences in TLPro.
        this.AIType = 498;
    }

    SetStaticDefaults() {
        try { Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type] = true; } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 10;
        p.height = 10;
        p.friendly = true;
        p.hostile = false;
        p.tileCollide = false;
        p.timeLeft = 360;
        p.penetrate = 3;
        p.alpha = 255;
        p.aiStyle = Terraria.ID.ProjAIStyleID.Nail;
        p.ignoreWater = false;
        p.usesIDStaticNPCImmunity = true;
        p.idStaticNPCHitCooldown = 10;
    }

    AI(projectile) {
        if (Number(projectile.timeLeft) < 320)
            projectile.tileCollide = true;

        let target = null;
        let nearest = 25000;
        ScanFrozenCubeNPCs(2);
        for (const i of FrozenCubeTrackedIndices()) {
            const npc = FrozenCubeNPC(i);
            if (!IsTarget(npc, projectile, 150))
                continue;
            const dx = Number(npc.Center.X) - Number(projectile.Center.X);
            const dy = Number(npc.Center.Y) - Number(projectile.Center.Y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < nearest) {
                nearest = distance;
                target = npc;
            }
        }

        if (target) {
            projectile.extraUpdates = 1;
            const dx = Number(target.Center.X) - Number(projectile.Center.X);
            const dy = Number(target.Center.Y) - Number(projectile.Center.Y);
            const length = Math.sqrt(dx * dx + dy * dy) || 1;
            const velocity = projectile.velocity;
            velocity.X = (Number(velocity.X) * 20 + dx / length * 12) / 21;
            velocity.Y = (Number(velocity.Y) * 20 + dy / length * 12) / 21;
            projectile.velocity = velocity;
        } else {
            projectile.extraUpdates = 0;
        }
    }

    OnKill(projectile) {
        try { PlayItemSound(14, projectile.position, 0, 1); } catch (e) { }
        const centerX = Number(projectile.position.X) + Number(projectile.width) * 0.5;
        const centerY = Number(projectile.position.Y) + Number(projectile.height) * 0.5;
        const position = Vector2.new(centerX - 25, centerY - 25);
        for (let i = 0; i < 15; i++) {
            const index = NewDust(position, 50, 50, DustType, 0, 0, 100, Color.White, 1.2);
            const dust = index >= 0 ? Terraria.Main.dust[index] : null;
            if (dust) {
                dust.velocity = Vector2.Multiply(dust.velocity, 3);
                if (Math.random() < 0.5) {
                    dust.scale = 0.5;
                    dust.fadeIn = 1 + Math.floor(Math.random() * 10) * 0.1;
                }
            }
        }
        for (let j = 0; j < 30; j++) {
            let index = NewDust(position, 50, 50, DustType, 0, 0, 100, Color.White, 1.7);
            let dust = index >= 0 ? Terraria.Main.dust[index] : null;
            if (dust) {
                dust.noGravity = true;
                dust.velocity = Vector2.Multiply(dust.velocity, 5);
            }
            index = NewDust(position, 50, 50, DustType, 0, 0, 100, Color.White, 1);
            dust = index >= 0 ? Terraria.Main.dust[index] : null;
            if (dust)
                dust.velocity = Vector2.Multiply(dust.velocity, 2);
        }
    }
}
