import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { PlayNPCDeathSound } from '../../../Common/Snippets/LegacySoundCompat.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Color, Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const FungalDust = 59;
function SpawnTrail(proj, scale = 0.9) {
    try {
        const index = NewDust(proj.position, Math.max(1, Number(proj.width) || 1), Math.max(1, Number(proj.height) || 1), FungalDust, -Number(proj.velocity.X) * 0.5, -Number(proj.velocity.Y) * 0.5, 100, Color.White, scale);
        const dust = Terraria.Main.dust[index];
        if (dust)
            dust.noGravity = true;
    } catch (e) { }
}

function SpawnImpactDust(proj, count) {
    for (let i = 0; i < count; i++) {
        try {
            const index = NewDust(Vector2.Add(proj.position, proj.velocity), Math.max(1, Number(proj.width) || 1), Math.max(1, Number(proj.height) || 1), FungalDust, Number(proj.oldVelocity.X) * 0.5, Number(proj.oldVelocity.Y) * 0.5, 70, Color.White, 0.85 + Math.random() * 0.25);
            const dust = Terraria.Main.dust[index];
            if (dust && Math.random() < 0.7)
                dust.noGravity = true;
        } catch (e) { }
    }
}

function RandomVelocity() {
    let x = Math.random() * 200 - 100;
    let y = Math.random() * 200 - 100;
    let length = Math.sqrt(x * x + y * y);
    if (length <= 0.001) {
        x = 1;
        y = 0;
        length = 1;
    }
    const speed = 6 + Math.random() * 2.5;
    return Vector2.new(x / length * speed, y / length * speed);
}

export class FungiOrb extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/FungiOrb';
    }

    SetDefaults() {
        this.Projectile.width = 12;
        this.Projectile.height = 12;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ranged = true;
        this.Projectile.penetrate = 1;
        this.Projectile.aiStyle = 1;
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = false;
        this.Projectile.timeLeft = 600;
    }

    AI(proj) {
        const local = new ProjAI(proj, true);
        local[0] = Number(local[0]) + 1;
        const direction = Number(proj.velocity.X) >= 0 ? 1 : -1;
        proj.spriteDirection = direction;
        proj.direction = direction;
        proj.rotation = Vector2.ToRotation(proj.velocity) + (direction === 1 ? 0 : Math.PI) + Math.PI / 2 * direction;
        if (Number(local[0]) > 4 && Number(proj.timeLeft) % 8 === 0)
            SpawnTrail(proj, 0.85);
    }

    OnKill(proj) {
        const splitType = Number(ModProjectile.getTypeByName('FungiOrb2') || 0);
        if (splitType > 0 && Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
            let source = null;
            try {
                source = proj.GetProjectileSource_FromThis();
            } catch (e) { }
            if (!source) {
                try {
                    const owner = Terraria.Main.player[proj.owner];
                    if (owner)
                        source = owner.GetProjectileSource_Item(owner.HeldItem);
                } catch (e) { }
            }
            const splitDamage = Math.max(1, Math.floor(Number(proj.damage) * 0.4));
            for (let i = 0; i < 3; i++) {
                NewProjectile(source, proj.Center, RandomVelocity(), splitType, splitDamage, 0, proj.owner, 0, 0, 0, null);
            }
        }
        try {
            PlayNPCDeathSound(1, proj.position, 0, 0.75);
        } catch (e) { }
        SpawnImpactDust(proj, 5);
    }
}

export class FungiOrb2 extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Ranged/FungiOrb';
        this.HomingRange = 450;
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        this.Projectile.width = 12;
        this.Projectile.height = 12;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ranged = true;
        this.Projectile.penetrate = 1;
        this.Projectile.timeLeft = 180;
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = false;
        this.Projectile.aiStyle = 0;
    }

    IsValidTarget(npc, proj) {
        if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.lifeMax) <= 5)
            return false;
        try {
            if (!npc.CanBeChasedBy(proj, false))
                return false;
        } catch (e) { }
        return Vector2.Distance(proj.Center, npc.Center) <= this.HomingRange;
    }

    FindTarget(proj) {
        try {
            const found = proj.FindTargetWithinRange(this.HomingRange, true);
            if (this.IsValidTarget(found, proj))
                return found;
        } catch (e) { }
        let nearest = null;
        let nearestDistance = this.HomingRange;
        ScanFrozenCubeNPCs(2);
        for (const i of FrozenCubeTrackedIndices()) {
            const npc = FrozenCubeNPC(i);
            if (!this.IsValidTarget(npc, proj))
                continue;
            const distance = Vector2.Distance(proj.Center, npc.Center);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = npc;
            }
        }
        return nearest;
    }

    GetCachedTarget(proj, ai) {
        let target = null;
        const cachedIndex = Math.floor(Number(ai[0]) || 0) - 1;
        if (cachedIndex >= 0 && cachedIndex < 200) {
            const cached = Terraria.Main.npc[cachedIndex];
            if (this.IsValidTarget(cached, proj))
                target = cached;
        }
        let cooldown = Math.max(0, Math.floor(Number(ai[1]) || 0));
        if (!target || cooldown <= 0) {
            target = this.FindTarget(proj);
            ai[0] = target ? Number(target.whoAmI) + 1 : 0;
            cooldown = 30;
        }
        ai[1] = cooldown - 1;
        return target;
    }

    Home(proj, target) {
        if (!target)
            return false;
        const toTarget = Vector2.Subtract(target.Center, proj.Center);
        const distance = toTarget.Length();
        if (distance <= 0.001)
            return false;
        const desired = Vector2.Multiply(Vector2.Divide(toTarget, distance), 6.5);
        proj.velocity = Vector2.Divide(Vector2.Add(Vector2.Multiply(proj.velocity, 20), desired), 21);
        return true;
    }

    CanDamage(proj) {
        return Number(proj.timeLeft) < 150;
    }

    AI(proj) {
        const ai = new ProjAI(proj);
        const local = new ProjAI(proj, true);
        local[0] = Number(local[0]) + 1;
        const direction = Number(proj.velocity.X) >= 0 ? 1 : -1;
        proj.spriteDirection = direction;
        proj.direction = direction;
        proj.rotation = Vector2.ToRotation(proj.velocity) + (direction === 1 ? 0 : Math.PI) + Math.PI / 2 * direction;
        if (Number(local[0]) > 4 && Number(proj.timeLeft) % 10 === 0)
            SpawnTrail(proj, 0.8);
        if (Number(proj.timeLeft) < 150) {
            this.Home(proj, this.GetCachedTarget(proj, ai));
        } else {
            const velocity = proj.velocity;
            velocity.Y = Number(velocity.Y) + 0.14;
            proj.velocity = velocity;
        }
    }

    OnKill(proj) {
        SpawnImpactDust(proj, 1);
    }
}
