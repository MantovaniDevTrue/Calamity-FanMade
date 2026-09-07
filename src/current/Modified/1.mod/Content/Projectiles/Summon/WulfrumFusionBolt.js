import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function ResolveNativeTarget(found) {
    if (found === null || found === undefined)
        return null;
    try {
        if (found.active !== undefined && Number(found.whoAmI) >= 0)
            return found;
    } catch (e) { }
    const index = Number(found);
    if (Number.isFinite(index) && index >= 0 && index < 200) {
        try {
            return Terraria.Main.npc[Math.floor(index)];
        } catch (e) { }
    }
    return null;
}

function IsValidTarget(npc, projectile) {
    if (!npc || !npc.active || npc.friendly || npc.townNPC || npc.dontTakeDamage || Number(npc.life) <= 0 || Number(npc.lifeMax) <= 5)
        return false;
    const dx = Number(npc.Center.X) - Number(projectile.Center.X);
    const dy = Number(npc.Center.Y) - Number(projectile.Center.Y);
    if (dx * dx + dy * dy > 250 * 250)
        return false;
    try {
        if (!npc.CanBeChasedBy(projectile, false))
            return false;
    } catch (e) { }
    return true;
}

function AcquireTarget(projectile) {
    try {
        const found = ResolveNativeTarget(projectile.FindTargetWithinRange(250, true));
        if (IsValidTarget(found, projectile))
            return Number(found.whoAmI);
    } catch (e) { }
    return -1;
}

export class WulfrumFusionBolt extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/InvisibleProj';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.MinionShot[this.Type] = true;
        } catch (e) { }
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 8;
        projectile.height = 8;
        projectile.friendly = true;
        projectile.ignoreWater = true;
        projectile.penetrate = 1;
        projectile.timeLeft = 140;
        projectile.extraUpdates = 2;
        try {
            projectile.armorPenetration = 10;
        } catch (e) { }
    }

    AI(projectile) {
        const state = FusionEntityData.GetProjectileBag(projectile, 'wulfrumFusionBolt', () => ({ timer: 0, target: -1 }));
        state.timer += 1;
        let npc = state.target >= 0 ? Terraria.Main.npc[state.target] : null;
        if (!IsValidTarget(npc, projectile)) {
            state.target = -1;
            npc = null;
        }
        if (state.timer % 12 === 1) {
            state.target = AcquireTarget(projectile);
            npc = state.target >= 0 ? Terraria.Main.npc[state.target] : null;
        }
        let vx = Number(projectile.velocity.X);
        let vy = Number(projectile.velocity.Y);
        if (IsValidTarget(npc, projectile)) {
            const dx = Number(npc.Center.X) - Number(projectile.Center.X);
            const dy = Number(npc.Center.Y) - Number(projectile.Center.Y);
            const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const speed = Math.max(0.1, Math.sqrt(vx * vx + vy * vy));
            vx = vx * 0.93 + dx / length * speed * 0.07;
            vy = vy * 0.93 + dy / length * speed * 0.07;
        }
        vx *= 0.983;
        vy *= 0.983;
        projectile.velocity = Vector2.new(vx, vy);
        projectile.rotation = Math.atan2(vy, vx);
        if (state.timer % 6 === 0 && Terraria.Main.netMode !== 2) {
            try {
                const dustIndex = NewDust(projectile.position, projectile.width, projectile.height, 15, -vx * 0.06, -vy * 0.06, 0, Color.White, 0.9);
                if (dustIndex >= 0)
                    Terraria.Main.dust[dustIndex].noGravity = true;
            } catch (e) { }
        }
    }

    OnHitNPC(projectile, npc) {
        try {
            const owner = Terraria.Main.player[Number(projectile.owner)];
            if (owner)
                owner.MinionAttackTargetNPC = Number(npc.whoAmI);
        } catch (e) { }
    }
}
