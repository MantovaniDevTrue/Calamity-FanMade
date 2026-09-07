import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2 } = Modules;
const MaxNPCs = 200;
const AttackRange = 1300;
function Length(x, y) {
    return Math.sqrt(x * x + y * y);
}

function Manhattan(a, b) {
    return Math.abs(Number(a.X) - Number(b.X)) + Math.abs(Number(a.Y) - Number(b.Y));
}

function CanSee(proj, npc) {
    try {
        return Terraria.Collision.CanHitLine(proj.position, proj.width, proj.height, npc.position, npc.width, npc.height);
    } catch (e) {
        return true;
    }
}

function ValidTarget(npc, proj, maxRange = AttackRange) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.lifeMax) <= 5 || Number(npc.life) <= 0)
        return false;
    try {
        if (!npc.CanBeChasedBy(proj, false))
            return false;
    } catch (e) { }
    if (Manhattan(npc.Center, proj.Center) >= maxRange)
        return false;
    return CanSee(proj, npc);
}

export class DankCreeperMinion extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/DankCreeperMinion';
        this.BuffType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.projPet[this.Type] = true;
        try {
            Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.Projectile.width = 30;
        this.Projectile.height = 30;
        this.Projectile.aiStyle = -1;
        this.Projectile.netImportant = true;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.minionSlots = 1;
        this.Projectile.timeLeft = 90000;
        this.Projectile.penetrate = -1;
        this.Projectile.minion = true;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.extraUpdates = 2;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = 90;
    }

    GetState(proj) {
        return FusionEntityData.GetProjectileBag(proj, 'dankCreeperRuntime', () => ({
            targetIndex: -1,
            nextRefreshTick: -1,
            returning: false,
            hitDelay: 0,
            keepAliveTick: -1,
            keepAliveResult: true,
            targetValidationTick: -1,
            targetValidationResult: false
        }));
    }

    ReadNPC(index) {
        const i = Math.floor(Number(index));
        if (!Number.isFinite(i) || i < 0 || i >= MaxNPCs)
            return null;
        try {
            return Terraria.Main.npc[i];
        } catch (e) {
            return null;
        }
    }

    FindTarget(proj, player, state) {
        try {
            if (player.HasMinionAttackTargetNPC) {
                const manual = this.ReadNPC(player.MinionAttackTargetNPC);
                if (ValidTarget(manual, proj, AttackRange)) {
                    state.targetIndex = Number(manual.whoAmI);
                    return manual;
                }
            }
        } catch (e) { }
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        const cached = this.ReadNPC(state.targetIndex);
        if (tick < Number(state.nextRefreshTick)) {
            if (Number(state.targetValidationTick) !== tick) {
                state.targetValidationTick = tick;
                state.targetValidationResult = ValidTarget(cached, proj, AttackRange);
            }
            return state.targetValidationResult ? cached : null;
        }
        // A busca nativa já filtra o mundo em C#; não preciso varrer 200 NPCs em JS.
        let best = null;
        try {
            const found = proj.FindTargetWithinRange(AttackRange, true);
            if (found && found.active !== undefined)
                best = found;
            else {
                const index = Math.floor(Number(found));
                if (Number.isFinite(index))
                    best = this.ReadNPC(index);
            }
        } catch (e) { }
        if (!ValidTarget(best, proj, AttackRange))
            best = null;
        state.targetIndex = best ? Number(best.whoAmI) : -1;
        state.nextRefreshTick = tick + 20;
        state.targetValidationTick = tick;
        state.targetValidationResult = !!best;
        return best;
    }

    KeepAlive(proj, player, state) {
        if (!(this.BuffType > 0))
            this.BuffType = Number(ModBuff.getTypeByName('DankCreeperBuff') || 0);
        if (!player || !player.active || player.dead) {
            try {
                if (player && this.BuffType > 0)
                    player.ClearBuff(this.BuffType);
            } catch (e) { }
            proj.timeLeft = 0;
            return false;
        }
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        if (Number(state.keepAliveTick) !== tick) {
            state.keepAliveTick = tick;
            let hasBuff = false;
            try { hasBuff = this.BuffType > 0 && player.FindBuffIndex(this.BuffType) >= 0; } catch (e) { }
            state.keepAliveResult = hasBuff;
        }
        if (!state.keepAliveResult) {
            try { proj.Kill(); } catch (e) { proj.active = false; }
            return false;
        }
        proj.timeLeft = 2;
        return true;
    }

    SetVelocity(proj, x, y) {
        proj.velocity = Vector2.new(Number(x) || 0, Number(y) || 0);
    }

    ScaleVelocity(proj, scale) {
        this.SetVelocity(proj, Number(proj.velocity.X) * Number(scale), Number(proj.velocity.Y) * Number(scale));
    }

    MoveToward(proj, x, y, speed, inertia) {
        let dx = Number(x) - Number(proj.Center.X);
        let dy = Number(y) - Number(proj.Center.Y);
        const distance = Length(dx, dy);
        if (!(distance > 0.001))
            return distance;
        dx = dx / distance * speed;
        dy = dy / distance * speed;
        const nextX = (Number(proj.velocity.X) * inertia + dx) / (inertia + 1);
        const nextY = (Number(proj.velocity.Y) * inertia + dy) / (inertia + 1);
        this.SetVelocity(proj, nextX, nextY);
        return distance;
    }

    OnSpawn(proj) {
        if (Math.abs(Number(proj.velocity.X)) + Math.abs(Number(proj.velocity.Y)) < 0.001) {
            this.SetVelocity(proj, -0.15, -0.05);
        }
        proj.friendly = true;
        this.GetState(proj);
    }

    AI(proj) {
        const player = Terraria.Main.player[proj.owner];
        const state = this.GetState(proj);
        if (!state || !this.KeepAlive(proj, player, state))
            return;
        proj.friendly = true;
        const ownerDistance = Manhattan(proj.Center, Terraria.PlayerCenter(player));
        const separationDistance = Number(state.hitDelay) > 0 ? 1800 : 1100;
        if (ownerDistance > separationDistance)
            state.returning = true;
        const target = state.returning ? null : this.FindTarget(proj, player, state);
        if (target) {
            if (Number(state.hitDelay) > 0) {
                state.hitDelay = Number(state.hitDelay) - 1;
                if (Math.abs(Number(proj.velocity.X)) + Math.abs(Number(proj.velocity.Y)) < 10) {
                    this.ScaleVelocity(proj, 1.05);
                }
            } else {
                const distance = Length(Number(target.Center.X) - Number(proj.Center.X), Number(target.Center.Y) - Number(proj.Center.Y));
                this.MoveToward(proj, target.Center.X, target.Center.Y, distance < 100 ? 10 : 8, 40);
            }
        } else {
            const idleX = Number(Terraria.PlayerCenterX(player));
            const idleY = Number(Terraria.PlayerCenterY(player)) - 60;
            const distance = Length(idleX - Number(proj.Center.X), idleY - Number(proj.Center.Y));
            if (state.returning && distance < 100) {
                let solid = false;
                try {
                    solid = Terraria.Collision.SolidCollision(proj.position, proj.width, proj.height);
                } catch (e) { }
                if (!solid)
                    state.returning = false;
            }
            if (distance > 2000 && Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
                proj.position = Vector2.new(Number(Terraria.PlayerCenterX(player)) - Number(proj.width) * 0.5, Number(Terraria.PlayerCenterY(player)) - Number(proj.height) * 0.5);
                this.SetVelocity(proj, 0, 0);
                proj.netUpdate = true;
                state.returning = false;
                state.targetIndex = -1;
            } else if (distance > 70) {
                this.MoveToward(proj, idleX, idleY, state.returning ? 12 : 8, 20);
            } else if (Math.abs(Number(proj.velocity.X)) + Math.abs(Number(proj.velocity.Y)) < 0.001) {
                this.SetVelocity(proj, -0.15, -0.05);
            } else {
                this.ScaleVelocity(proj, 1.01);
            }
        }
        proj.rotation = Number(proj.velocity.X) * 0.05;
        if (Math.abs(Number(proj.velocity.X)) > 0.2) {
            proj.direction = Number(proj.velocity.X) < 0 ? -1 : 1;
            proj.spriteDirection = -proj.direction;
        }
    }

    OnHitNPC(proj, npc) {
        const state = this.GetState(proj);
        if (state)
            state.hitDelay = 11;
        if (Number(proj.owner) === Number(Terraria.Main.myPlayer))
            proj.netUpdate = true;
        const buff = Number(ModBuff.getTypeByName('BrainRot') || 0);
        if (buff > 0)
            try {
                npc.AddBuff(buff, 90, false);
            } catch (e) { }
    }

    CanDamage(proj) {
        return !!(proj && proj.active && proj.friendly && Number(proj.damage) > 0);
    }

    MinionContactDamage(proj) {
        return !!(proj && proj.active && proj.friendly && Number(proj.damage) > 0);
    }

    CanCutTiles() {
        return false;
    }

    OnTileCollide() {
        return false;
    }

    OnKill(proj) {
        FusionEntityData.ClearProjectile(proj);
    }
}
