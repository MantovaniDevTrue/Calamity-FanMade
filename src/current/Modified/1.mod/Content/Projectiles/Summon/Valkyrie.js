import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const CanHit = Terraria.Collision['bool CanHit(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'];
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];

function Distance(ax, ay, bx, by) {
    const dx = Number(bx) - Number(ax), dy = Number(by) - Number(ay);
    return Math.sqrt(dx * dx + dy * dy);
}

function ValidTarget(npc, projectile) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.lifeMax) <= 5)
        return false;
    try { return npc.CanBeChasedBy(projectile, false); } catch (e) { return true; }
}

export class Valkyrie extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/Valkyrie'; }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 4;
        try { Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true; } catch (e) { }
        try { Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true; } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 90;
        p.height = 90;
        p.netImportant = true;
        p.friendly = true;
        p.hostile = false;
        p.ignoreWater = true;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 20;
        p.minionSlots = 0;
        p.timeLeft = 90000;
        p.penetrate = -1;
        p.tileCollide = false;
        p.minion = true;
        // This Terraria mobile build has no Projectile.summon member.
        // Summon scaling is applied when the Valkyrie is spawned, while
        // p.minion and MinionContactDamage preserve minion behavior.
        p.aiStyle = -1;
    }


    MinionContactDamage() {
        return true;
    }

    FindTarget(projectile, player) {
        let maxDist = 700;
        let target = null;
        if (player.HasMinionAttackTargetNPC) {
            const selected = Terraria.Main.npc[player.MinionAttackTargetNPC];
            if (ValidTarget(selected, projectile)) {
                const extra = (Number(selected.width) + Number(selected.height)) * 0.5;
                const dist = Distance(projectile.Center.X, projectile.Center.Y, selected.Center.X, selected.Center.Y);
                let visible = true;
                if (extra < maxDist) {
                    try { visible = CanHit(projectile.Center, 1, 1, selected.Center, 1, 1); } catch (e) { }
                }
                if (dist < maxDist + extra && visible) {
                    maxDist = dist;
                    target = selected;
                }
            }
        }
        if (!target) {
            ScanFrozenCubeNPCs(2);
            for (const i of FrozenCubeTrackedIndices()) {
                const npc = FrozenCubeNPC(i);
                if (!ValidTarget(npc, projectile))
                    continue;
                const extra = (Number(npc.width) + Number(npc.height)) * 0.5;
                const dist = Distance(projectile.Center.X, projectile.Center.Y, npc.Center.X, npc.Center.Y);
                let visible = true;
                if (extra < maxDist) {
                    try { visible = CanHit(projectile.Center, 1, 1, npc.Center, 1, 1); } catch (e) { }
                }
                if (dist < maxDist + extra && visible) {
                    maxDist = dist;
                    target = npc;
                    break;
                }
            }
        }
        return { target, distance: maxDist };
    }

    ChargingMinionAI(projectile, player) {
        const ai = new ProjAI(projectile, false);

        if (Number(ai[0]) === 2) {
            ai[1] = Number(ai[1]) + 1;
            projectile.extraUpdates = 1;
            if (Number(ai[1]) > 40) {
                ai[1] = 1;
                ai[0] = 0;
                projectile.extraUpdates = 0;
                projectile.netUpdate = true;
            } else {
                return;
            }
        }

        const result = this.FindTarget(projectile, player);
        const target = result.target;
        const targetDistance = Number(result.distance);
        const playerDistance = Distance(player.Center.X, player.Center.Y, projectile.Center.X, projectile.Center.Y);
        const returnDistance = target ? 1200 : 800;
        if (playerDistance > returnDistance) {
            ai[0] = 1;
            projectile.netUpdate = true;
        }

        if (target && Number(ai[0]) === 0) {
            projectile.tileCollide = false;
            let dx = Number(target.Center.X) - Number(projectile.Center.X);
            let dy = Number(target.Center.Y) - Number(projectile.Center.Y);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            dx /= distance; dy /= distance;
            const speed = distance > 200 ? 8 : -4;
            const velocity = projectile.velocity;
            velocity.X = (Number(velocity.X) * 40 + dx * speed) / 41;
            velocity.Y = (Number(velocity.Y) * 40 + dy * speed) / 41;
            projectile.velocity = velocity;
        } else {
            projectile.tileCollide = false;
            const returning = Number(ai[0]) === 1;
            let dx = Number(player.Center.X) - Number(projectile.Center.X);
            let dy = Number(player.Center.Y) - Number(projectile.Center.Y) - 60;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            let homeSpeed = returning ? 15 : 6;
            if (distance > 200 && homeSpeed < 8)
                homeSpeed = 8;
            if (distance < 150 && returning) {
                let solid = false;
                try { solid = SolidCollision(projectile.position, projectile.width, projectile.height); } catch (e) { }
                if (!solid) {
                    ai[0] = 0;
                    projectile.netUpdate = true;
                }
            }
            if (distance > 2000) {
                projectile.position.X = Number(player.Center.X) - Number(projectile.width) * 0.5;
                projectile.position.Y = Number(player.Center.Y) - Number(projectile.height) * 0.5;
                projectile.netUpdate = true;
            }
            if (distance > 70) {
                dx = dx / distance * homeSpeed;
                dy = dy / distance * homeSpeed;
                const velocity = projectile.velocity;
                velocity.X = (Number(velocity.X) * 40 + dx) / 41;
                velocity.Y = (Number(velocity.Y) * 40 + dy) / 41;
                projectile.velocity = velocity;
            } else if (Number(projectile.velocity.X) === 0 && Number(projectile.velocity.Y) === 0) {
                projectile.velocity.X = -0.15;
                projectile.velocity.Y = -0.05;
            }
        }

        if (Number(ai[1]) > 0)
            ai[1] = Number(ai[1]) + 1 + Math.floor(Math.random() * 3);
        if (Number(ai[1]) > 40) {
            ai[1] = 0;
            projectile.netUpdate = true;
        }

        if (Number(ai[0]) === 0 && Number(ai[1]) === 0 && target && targetDistance < 500) {
            ai[1] = 1;
            if (Number(Terraria.Main.myPlayer) === Number(projectile.owner)) {
                ai[0] = 2;
                let dx = Number(target.Center.X) - Number(projectile.Center.X);
                let dy = Number(target.Center.Y) - Number(projectile.Center.Y);
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                projectile.velocity.X = dx / distance * 8;
                projectile.velocity.Y = dy / distance * 8;
                projectile.netUpdate = true;
            }
        }
    }

    AI(projectile) {
        const player = Terraria.Main.player[projectile.owner];
        const state = ModPlayer.getByName('CalamityPlayerState');
        const activeSet = !!(state && state.AerospecSetActive === true && state.AerospecClass === 'summon');
        if (!player || !player.active || player.dead || !activeSet) {
            projectile.active = false;
            return;
        }
        projectile.timeLeft = 2;

        const localAI = new ProjAI(projectile, true);
        if (Number(localAI[0]) === 0) {
            for (let i = 0; i < 30; i++) {
                const index = NewDust(Vector2.new(Number(projectile.position.X), Number(projectile.position.Y) + 16), projectile.width, projectile.height - 16, Terraria.ID.DustID.BlueTorch, 0, 0, 0, Color.White, 1);
                const dust = index >= 0 ? Terraria.Main.dust[index] : null;
                if (dust) {
                    dust.velocity = Vector2.Multiply(dust.velocity, 2);
                    dust.scale = Number(dust.scale) * 1.15;
                }
            }
            localAI[0] = 1;
        }

        if (Math.abs(Number(projectile.velocity.X)) > 0.2) {
            projectile.direction = Number(projectile.velocity.X) > 0 ? 1 : -1;
            projectile.spriteDirection = -Number(projectile.direction);
        }

        this.ChargingMinionAI(projectile, player);

        const scalar = (90 + Math.floor(Math.random() * 21)) * 0.01 * Number(Terraria.Main.essScale || 1);

        projectile.frameCounter++;
        if (Number(projectile.frameCounter) > 7) {
            projectile.frame = Number(projectile.frame) + 1;
            projectile.frameCounter = 0;
        }
        if (Number(projectile.frame) > 3)
            projectile.frame = 0;
    }
}
