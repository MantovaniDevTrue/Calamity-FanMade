import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { FindTarget } from './../../../Core/PerforatorRewardRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
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

export class AortaYoyo extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/AortaYoyo';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.YoyosLifeTimeMultiplier[this.Type] = 48;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.YoyosMaximumRange[this.Type] = 330;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.YoyosTopSpeed[this.Type] = 12.5;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 4;
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0;
        } catch (e) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.aiStyle = 99;
        p.width = 16;
        p.height = 16;
        p.friendly = true;
        p.melee = true;
        p.penetrate = -1;
        p.extraUpdates = 1;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 30;
    }

    AI(p) {
        const owner = Terraria.Main.player[p.owner];
        if (!owner || !owner.active || owner.dead) {
            p.Kill();
            return;
        }
        const ownerX = Number(p.position.X) - Number(Terraria.PlayerPositionX(owner));
        const ownerY = Number(p.position.Y) - Number(Terraria.PlayerPositionY(owner));
        if (ownerX * ownerX + ownerY * ownerY > 3200 * 3200) {
            p.Kill();
            return;
        }
        const state = FusionEntityData.GetProjectileBag(p, 'aorta', () => ({ next: 0 }));
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        if (tick < Number(state.next) || Number(p.owner) !== Number(Terraria.Main.myPlayer))
            return;
        const target = FindTarget(p.Center, 240, p);
        if (!target)
            return;
        state.next = tick + 180;
        const blood = Number(ModProjectile.getTypeByName('Blood2') || 0);
        if (!(blood > 0))
            return;
        const source = ProjectileSource(p, owner);
        if (!source)
            return;
        const dx = Number(target.Center.X) - Number(p.Center.X);
        const dy = Number(target.Center.Y) - Number(p.Center.Y);
        const baseAngle = Math.atan2(dy, dx);
        for (let k = -1; k <= 1; k++) {
            const angle = baseAngle + k * 0.16;
            NewProjectile(source, p.Center, Vector2.new(Math.cos(angle) * 6, Math.sin(angle) * 6), blood, Math.max(1, Math.floor(Number(p.damage) * 0.25)), 0, p.owner, 0, 0, 0, null);
        }
    }

    OnHitNPC(p, npc) {
        const buff = Number(ModBuff.getTypeByName('BurningBlood') || 0);
        if (buff > 0) {
            try {
                npc.AddBuff(buff, 120, false);
            } catch (e) { }
        }
    }
}
