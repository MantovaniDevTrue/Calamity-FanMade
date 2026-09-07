import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { FindTargetCached } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function Distance(a, b) {
    const dx = Number(a.X) - Number(b.X);
    const dy = Number(a.Y) - Number(b.Y);
    return Math.sqrt(dx * dx + dy * dy);
}

function Direction(from, to, speed) {
    const dx = Number(to.X) - Number(from.X);
    const dy = Number(to.Y) - Number(from.Y);
    const length = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
    return Vector2.new(dx / length * speed, dy / length * speed);
}

function ProjectileSource(projectile, owner) {
    let source = null;
    try {
        source = projectile.GetProjectileSource_FromThis();
    } catch (e) { }
    if (!source && owner) {
        try {
            source = owner.GetProjectileSource_Item(owner.HeldItem);
        } catch (e) { }
    }
    return source;
}

export class FleshBallMinion extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/FleshBallMinion';
        this.BuffType = 0;
        this.FleshBloodType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 6;
        Terraria.Main.projPet[this.Type] = true;
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 46;
        p.height = 38;
        p.aiStyle = -1;
        p.extraUpdates = 1;
        p.netImportant = true;
        p.friendly = true;
        p.hostile = false;
        p.minion = true;
        p.minionSlots = 1;
        p.penetrate = -1;
        p.timeLeft = 90000;
        p.tileCollide = true;
        p.ignoreWater = false;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 30;
    }

    State(p) {
        return FusionEntityData.GetProjectileBag(p, 'fleshBall', () => ({
            hopTimer: 0,
            hopAmount: 0,
            grounded: false,
            airTimer: 0,
            returnTimer: 0,
            combatIndex: -1,
            combatNextScan: 0
        }));
    }

    Keep(p, owner) {
        if (!(this.BuffType > 0))
            this.BuffType = Number(ModBuff.getTypeByName('FleshBallBuff') || 0);
        if (!owner || !owner.active || owner.dead) {
            p.Kill();
            return false;
        }
        let hasBuff = false;
        try {
            hasBuff = this.BuffType > 0 && owner.FindBuffIndex(this.BuffType) >= 0;
        } catch (e) { }
        if (!hasBuff) {
            p.Kill();
            return false;
        }
        p.timeLeft = 2;
        return true;
    }

    IsGrounded(p, state) {
        if (state.grounded && Math.abs(Number(p.velocity.Y)) < 0.8)
            return true;
        try {
            const testPosition = Vector2.new(Number(p.position.X), Number(p.position.Y) + 2);
            if (Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'](testPosition, p.width, p.height))
                return true;
        } catch (e) {
            try {
                const testPosition = Vector2.new(Number(p.position.X), Number(p.position.Y) + 2);
                if (Terraria.Collision.SolidCollision(testPosition, p.width, p.height))
                    return true;
            } catch (ignored) { }
        }
        return false;
    }

    TeleportIfSeparated(p, owner) {
        let canSee = true;
        try {
            canSee = Terraria.Collision.CanHitLine(p.Center, 1, 1, Terraria.PlayerCenter(owner), 1, 1);
        } catch (e) { }
        const limit = canSee ? 1900 : 805;
        if (Distance(p.Center, Terraria.PlayerCenter(owner)) <= limit || Number(p.owner) !== Number(Terraria.Main.myPlayer))
            return false;
        p.Center = Terraria.PlayerCenter(owner);
        p.velocity = Vector2.Zero;
        p.netUpdate = true;
        return true;
    }

    Hop(p, state, destination, speed, verticalBoost, targetHop) {
        const desired = Direction(p.Center, destination, speed);
        const horizontalSign = Math.sign(Number(desired.X)) || Math.sign(Number(p.velocity.X)) || 1;
        p.velocity = Vector2.new(Number(desired.X) + horizontalSign * 2, Math.min(-5, Number(desired.Y) - verticalBoost));
        p.tileCollide = false;
        state.grounded = false;
        state.airTimer = 0;
        state.hopTimer = 0;
        if (targetHop)
            state.hopAmount = Number(state.hopAmount) + 1;
        p.netUpdate = true;
    }

    FireBlood(p, owner, state) {
        if (Number(p.owner) !== Number(Terraria.Main.myPlayer) || Number(state.hopAmount) % 3 !== 2)
            return;
        if (!(this.FleshBloodType > 0))
            this.FleshBloodType = Number(ModProjectile.getTypeByName('FleshBlood') || 0);
        const shot = this.FleshBloodType;
        if (!(shot > 0))
            return;
        const source = ProjectileSource(p, owner);
        if (!source)
            return;
        for (let i = 0; i < 2; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
            const speed = 6 + Math.random() * 5;
            const index = NewProjectile(source, p.Top, Vector2.new(Math.cos(angle) * speed, Math.sin(angle) * speed), shot, p.damage, p.knockBack, p.owner, 0, 0, 0, null);
            if (Number(index) >= 0) {
                try {
                    Terraria.Main.projectile[index].originalDamage = p.originalDamage;
                } catch (e) { }
            }
        }
    }

    AI(p) {
        const owner = Terraria.Main.player[p.owner];
        if (!this.Keep(p, owner))
            return;
        const state = this.State(p);
        state.hopTimer = Number(state.hopTimer) + 1;
        state.airTimer = Number(state.airTimer) + 1;
        if (this.TeleportIfSeparated(p, owner)) {
            state.grounded = false;
            state.airTimer = 0;
            return;
        }
        const target = FindTargetCached(p.Center, state, 850, p, 8, 'combat');
        const grounded = this.IsGrounded(p, state);
        state.grounded = grounded;
        p.tileCollide = grounded || Number(p.velocity.Y) >= 0;
        if (grounded) {
            state.airTimer = 0;
            if (Math.abs(Number(p.velocity.Y)) < 1) {
                p.velocity = Vector2.new(Number(p.velocity.X) * 0.9, 0);
            }
        }
        if (target) {
            if (grounded && Number(state.hopTimer) >= 20) {
                this.Hop(p, state, target.Center, 6, 7, true);
                this.FireBlood(p, owner, state);
            }
        } else {
            const ownerDistance = Distance(p.Center, Terraria.PlayerCenter(owner));
            if (ownerDistance > 150 && grounded && Number(state.hopTimer) >= 30) {
                this.Hop(p, state, Terraria.PlayerCenter(owner), 9, 9, false);
            } else if (ownerDistance > 350 && !grounded) {
                const desired = Direction(p.Center, Terraria.PlayerCenter(owner), 9);
                p.velocity = Vector2.new((Number(p.velocity.X) * 11 + Number(desired.X)) / 12, Number(p.velocity.Y));
                state.returnTimer = Number(state.returnTimer) + 1;
            } else {
                state.returnTimer = 0;
            }
        }
        p.velocity = Vector2.new(Number(p.velocity.X) * 0.995, Math.min(12, Number(p.velocity.Y) + 0.25));
        p.rotation = Number(p.rotation) + Number(p.velocity.X) * 0.05;
        if (Math.abs(Number(p.velocity.X)) > 0.1) {
            p.direction = Number(p.velocity.X) < 0 ? -1 : 1;
            p.spriteDirection = p.direction;
        }
        p.frameCounter = Number(p.frameCounter) + 1;
        if (Number(p.frameCounter) > 6) {
            p.frame = (Number(p.frame) + 1) % 6;
            p.frameCounter = 0;
        }
    }

    OnTileCollide(p, hitDirection) {
        const state = this.State(p);
        if (Number(hitDirection.Y) > 0) {
            state.grounded = true;
            state.airTimer = 0;
            p.velocity = Vector2.new(Number(p.velocity.X) * 0.9, 0);
        } else {
            p.velocity = Vector2.new(Number(p.velocity.X) * 0.9, Number(p.velocity.Y));
        }
        return false;
    }

    CanDamage(p) {
        return !!(p && p.active && p.friendly && Number(p.damage) > 0);
    }

    MinionContactDamage(p) {
        return !!(p && p.active && p.friendly && Number(p.damage) > 0);
    }
}
