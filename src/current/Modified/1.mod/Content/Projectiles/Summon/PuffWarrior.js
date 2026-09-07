import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Color, Vector2 } = Modules;
const BabySlimeType = Number(Terraria.ID.ProjectileID.BabySlime) || 266;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function IsValidTarget(npc, proj, maxRange) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.lifeMax) <= 5)
        return false;
    try {
        if (!npc.CanBeChasedBy(proj, false))
            return false;
    } catch (e) { }
    return Vector2.Distance(proj.Center, npc.Center) <= maxRange;
}

function FindTarget(proj, player, maxRange) {
    try {
        if (player.HasMinionAttackTargetNPC) {
            const selected = Terraria.Main.npc[player.MinionAttackTargetNPC];
            if (IsValidTarget(selected, proj, maxRange * 1.5))
                return selected;
        }
    } catch (e) { }
    try {
        const found = proj.FindTargetWithinRange(maxRange, true);
        if (IsValidTarget(found, proj, maxRange))
            return found;
    } catch (e) { }
    let nearest = null;
    let nearestDistance = maxRange;
    ScanFrozenCubeNPCs(2);
    for (const i of FrozenCubeTrackedIndices()) {
        const npc = FrozenCubeNPC(i);
        if (!IsValidTarget(npc, proj, maxRange))
            continue;
        const distance = Vector2.Distance(proj.Center, npc.Center);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = npc;
        }
    }
    return nearest;
}

function NormalizeTo(x, y, speed) {
    const length = Math.sqrt(x * x + y * y);
    if (!(length > 0.001))
        return Vector2.new(0, -speed);
    return Vector2.new(x / length * speed, y / length * speed);
}

function SpawnCloudDust(proj, count) {
    const dustType = 59;
    for (let i = 0; i < count; i++) {
        try {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.4 + Math.random() * 2.2;
            const index = NewDust(proj.position, proj.width, proj.height, dustType, Math.cos(angle) * speed, Math.sin(angle) * speed, 40, Color.White, 0.75 + Math.random() * 0.35);
            const dust = Terraria.Main.dust[index];
            if (dust)
                dust.noGravity = true;
        } catch (e) { }
    }
}

export class PuffWarrior extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Summon/PuffWarrior';
        this.AIType = BabySlimeType;
        this.ShotTimers = new Map();
        this.AnimationCounters = new Map();
        this.MaxTargetRange = 660;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 10;
        try {
            Terraria.Main.projPet[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.CloneDefaults(BabySlimeType);
        this.Projectile.width = 36;
        this.Projectile.height = 36;
        this.Projectile.netImportant = true;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.minion = true;
        this.Projectile.minionSlots = 1;
        this.Projectile.timeLeft = 90000;
        this.Projectile.penetrate = -1;
        this.Projectile.ignoreWater = true;
        this.Projectile.tileCollide = true;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = 18;
    }

    OnSpawn(proj) {
        this.ShotTimers.set(proj.whoAmI, 18 + Math.floor(Math.random() * 18));
        this.AnimationCounters.set(proj.whoAmI, 0);
    }

    KeepAlive(proj, player) {
        const buffType = ModBuff.getTypeByName('PuffWarriorBuff');
        if (!player || !player.active || player.dead) {
            try {
                if (player && buffType > 0)
                    player.ClearBuff(buffType);
            } catch (e) { }
            proj.timeLeft = 0;
            return false;
        }
        try {
            if (buffType > 0 && player.FindBuffIndex(buffType) >= 0) {
                proj.timeLeft = 2;
                return true;
            }
        } catch (e) { }
        return false;
    }

    FireVolley(proj, player, target) {
        const cloudType = Number(ModProjectile.getTypeByName('PuffCloud') || 0);
        if (!(cloudType > 0) || Number(proj.owner) !== Number(Terraria.Main.myPlayer))
            return;
        let source = null;
        try {
            source = proj.GetProjectileSource_FromThis();
        } catch (e) { }
        if (!source) {
            try {
                source = player.GetProjectileSource_Item(player.HeldItem);
            } catch (e) { }
        }
        for (let i = 0; i < 3; i++) {
            const spawn = Vector2.new(Number(proj.Center.X), Number(proj.Top.Y) + 8 + i * 3);
            const dx = Number(target.Center.X) - Number(spawn.X);
            const dy = Number(target.Center.Y) - Number(spawn.Y);
            const velocity = NormalizeTo(dx, dy, 14);
            NewProjectile(source, spawn, velocity, cloudType, proj.damage, proj.knockBack, proj.owner, 0, 0, 0, null);
        }
        SpawnCloudDust(proj, 7);
    }

    Animate(proj) {
        const grounded = Math.abs(Number(proj.velocity.Y)) < 0.75;
        let counter = Number(this.AnimationCounters.get(proj.whoAmI) || 0) + 1;
        this.AnimationCounters.set(proj.whoAmI, counter);
        if (grounded) {
            proj.rotation = 0;
            if (counter % 6 === 0)
                proj.frame = (Number(proj.frame) + 1) % 6;
        } else {
            proj.frame = Number(proj.velocity.Y) < 0 ? 7 : 8;
            const direction = Number(proj.spriteDirection || proj.direction || 1) || 1;
            proj.rotation += Math.PI / 10 * direction;
        }
    }

    AI(proj) {
        const player = Terraria.Main.player[proj.owner];
        if (!this.KeepAlive(proj, player))
            return;
        const distanceToOwner = Vector2.Distance(proj.Center, Terraria.PlayerCenter(player));
        if (distanceToOwner > 1900 && Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
            proj.Center = Terraria.PlayerCenter(player);
            proj.velocity = Vector2.Zero;
            proj.netUpdate = true;
        }
        const target = FindTarget(proj, player, this.MaxTargetRange);
        let timer = Number(this.ShotTimers.get(proj.whoAmI) || 0) - 1;
        const grounded = Math.abs(Number(proj.velocity.Y)) < 0.85;
        if (target && grounded && timer <= 0) {
            this.FireVolley(proj, player, target);
            timer = 45;
        }
        this.ShotTimers.set(proj.whoAmI, timer);
        if (Math.abs(Number(proj.velocity.X)) > 0.02) {
            proj.direction = Number(proj.velocity.X) < 0 ? -1 : 1;
            proj.spriteDirection = -proj.direction;
        }
        this.Animate(proj);
    }

    OnTileCollide(proj, hitDirection) {
        const velocity = proj.velocity;
        if (Number(hitDirection && hitDirection.Y) > 0.15 && Number(velocity.Y) > 0)
            velocity.Y = 0;
        if (Math.abs(Number(hitDirection && hitDirection.X)) > 0.15)
            velocity.X *= -0.2;
        proj.velocity = velocity;
        return false;
    }

    CanCutTiles() {
        return false;
    }

    OnHitNPC(proj) {
        SpawnCloudDust(proj, 4);
    }

    OnKill(proj) {
        this.ShotTimers.delete(proj.whoAmI);
        this.AnimationCounters.delete(proj.whoAmI);
    }
}
