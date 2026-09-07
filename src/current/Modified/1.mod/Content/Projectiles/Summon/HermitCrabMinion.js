import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { AcquireTargetIndex, NPCCenter } from './../../../Core/SeaKingArsenalRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
function Distance(a, b) {
    const dx = Number(a.X) - Number(b.X);
    const dy = Number(a.Y) - Number(b.Y);
    return Math.sqrt(dx * dx + dy * dy);
}

function SpawnDust(p, count) {
    if (Number(Terraria.Main.netMode) === 2)
        return;
    for (let i = 0; i < count; i++) {
        try {
            const index = NewDust(Vector2.new(Number(p.position.X), Number(p.position.Y) + 16), p.width, Math.max(1, Number(p.height) - 16), 33, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0, Color.White, 1.15);
            const dust = Terraria.Main.dust[index];
            if (dust)
                dust.velocity = Vector2.Multiply(dust.velocity, 2);
        } catch (e) { }
    }
}

export class HermitCrabMinion extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/HermitCrabMinion';
        this.BuffType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 9;
        Terraria.Main.projPet[this.Type] = true;
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 38;
        p.height = 36;
        p.netImportant = true;
        p.friendly = true;
        p.hostile = false;
        p.ignoreWater = false;
        p.minionSlots = 1;
        p.timeLeft = 90000;
        p.penetrate = -1;
        p.minion = true;
        p.tileCollide = true;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 10;
    }

    PostSetupContent() {
        this.BuffType = Number(ModBuff.getTypeByName('HermitCrab') || 0);
    }

    OnSpawn(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'hermitCrabMinion', () => ({
            fly: false,
            playerStill: 0,
            targetIndex: -1,
            nextTargetScan: 0,
            stuck: 0,
            lastX: Number(p.Center.X),
            spawned: false
        }));
        state.fly = false;
        state.playerStill = 0;
        state.targetIndex = -1;
        state.nextTargetScan = 0;
        state.stuck = 0;
        state.lastX = Number(p.Center.X);
        if (!state.spawned) {
            SpawnDust(p, 20);
            state.spawned = true;
        }
    }

    AI(p) {
        const player = Terraria.Main.player[Math.floor(Number(p.owner))];
        if (!player || !player.active || player.dead) {
            p.Kill();
            return;
        }
        if (!(this.BuffType > 0))
            this.BuffType = Number(ModBuff.getTypeByName('HermitCrab') || 0);
        let hasBuff = false;
        try {
            hasBuff = this.BuffType > 0 && Number(player.FindBuffIndex(this.BuffType)) >= 0;
        } catch (e) { }
        if (!hasBuff) {
            p.Kill();
            return;
        }
        p.timeLeft = 2;
        const state = FusionEntityData.GetProjectileBag(p, 'hermitCrabMinion', () => ({
            fly: false,
            playerStill: 0,
            targetIndex: -1,
            nextTargetScan: 0,
            stuck: 0,
            lastX: Number(p.Center.X),
            spawned: true
        }));
        const playerCenter = Terraria.PlayerCenter(player);
        const playerVelocity = Terraria.PlayerVelocity(player);
        const playerDistance = Distance(playerCenter, p.Center);
        const targetIndex = AcquireTargetIndex(p, player, 600, state, 10, false);
        const target = targetIndex >= 0 ? Terraria.Main.npc[targetIndex] : null;
        const targetCenter = NPCCenter(target);
        if (!state.fly) {
            p.tileCollide = true;
            p.rotation = 0;
            let vx = Number(p.velocity.X);
            let vy = Math.min(10, Number(p.velocity.Y) + 0.6);
            const desiredX = targetCenter ? Number(targetCenter.X) : Number(playerCenter.X);
            const deltaX = desiredX - Number(p.Center.X);
            const followDistance = targetCenter ? 0 : 200;
            if (Math.abs(deltaX) > followDistance) {
                const accel = targetCenter ? 0.12 : 0.08;
                vx += Math.sign(deltaX) * accel;
                vx = Math.max(-9, Math.min(9, vx));
            } else if (!targetCenter) {
                if (vx > 0.5)
                    vx -= 0.1;
                else if (vx < -0.5)
                    vx += 0.1;
                else
                    vx = 0;
            }
            const moved = Math.abs(Number(p.Center.X) - Number(state.lastX));
            state.lastX = Number(p.Center.X);
            if (Math.abs(vx) > 0.35 && moved < 0.08 && Math.abs(vy) < 0.2)
                state.stuck = Number(state.stuck || 0) + 1;
            else
                state.stuck = 0;
            let holeBelow = false;
            try {
                const ahead = Math.sign(vx || deltaX || 1) * 22;
                holeBelow = !SolidCollision(Vector2.new(Number(p.Center.X) + ahead - 8, Number(p.position.Y) + Number(p.height) + 2), 16, 32);
            } catch (e) { }
            if (Math.abs(vy) < 0.15 && (state.stuck > 10 || holeBelow)) {
                vy = -10;
                state.stuck = 0;
            }
            p.velocity = Vector2.new(vx, vy);
            if (Math.abs(vx) > 0.1) {
                p.frameCounter = Number(p.frameCounter) + 1;
                if (Number(p.frameCounter) > 4) {
                    p.frameCounter = 0;
                    p.frame = Number(p.frame) + 1;
                    if (Number(p.frame) >= 5)
                        p.frame = 1;
                }
            } else
                p.frame = 0;
            if ((targetCenter && playerDistance > 1000) || (!targetCenter && playerDistance > 600)) {
                state.fly = true;
                state.playerStill = 0;
                p.tileCollide = false;
                p.velocity = Vector2.Zero;
                p.netUpdate = true;
            }
        } else {
            p.tileCollide = false;
            const dx = Number(playerCenter.X) - Number(p.Center.X);
            const dy = Number(playerCenter.Y) - Number(p.Center.Y);
            const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const desired = Vector2.new(dx / length * 8, dy / length * 8);
            p.velocity = Vector2.new((Number(p.velocity.X) * 40 + Number(desired.X)) / 41, (Number(p.velocity.Y) * 40 + Number(desired.Y)) / 41);
            p.rotation = Number(p.velocity.X) * 0.03;
            p.frameCounter = Number(p.frameCounter) + 1;
            if (Number(p.frameCounter) > 3) {
                p.frameCounter = 0;
                p.frame = Number(p.frame) + 1;
                if (Number(p.frame) >= 9 || Number(p.frame) < 5)
                    p.frame = 5;
            }
            if (playerDistance > 2000) {
                p.Center = playerCenter;
                p.velocity = Vector2.Zero;
                p.netUpdate = true;
            }
            if (playerDistance < 100) {
                if (Math.abs(Number(playerVelocity.Y)) < 0.05)
                    state.playerStill = Number(state.playerStill || 0) + 1;
                else
                    state.playerStill = 0;
                let solid = false;
                try {
                    solid = !!SolidCollision(p.position, p.width, p.height);
                } catch (e) { }
                if (state.playerStill > 30 && !solid) {
                    state.fly = false;
                    state.playerStill = 0;
                    p.tileCollide = true;
                    p.rotation = 0;
                    p.netUpdate = true;
                }
            } else
                state.playerStill = 0;
        }
        if (Number(p.velocity.X) > 0.25)
            p.spriteDirection = 1;
        else if (Number(p.velocity.X) < -0.25)
            p.spriteDirection = -1;
    }

    MinionContactDamage() {
        return true;
    }

    OnTileCollide() {
        return false;
    }
}
