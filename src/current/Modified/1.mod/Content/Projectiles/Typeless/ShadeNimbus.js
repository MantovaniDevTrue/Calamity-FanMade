import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const ActiveNimbusSlots = new Set();
export class ShadeNimbus extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Boss/ShadeNimbusHostile';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 6;
    }

    SetDefaults() {
        this.Projectile.width = 54;
        this.Projectile.height = 24;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 300;
        this.Projectile.friendly = false;
        this.Projectile.hostile = false;
        this.Projectile.aiStyle = -1;
    }

    State(proj) {
        return FusionEntityData.GetProjectileBag(proj, 'shadeNimbus', () => ({ age: 0, rainTimer: 0 }));
    }

    OnSpawn(proj) {
        const slot = Math.floor(Number(proj?.whoAmI));
        if (slot >= 0 && slot < 1000)
            ActiveNimbusSlots.add(slot);
    }

    SetVelocity(proj, x, y) {
        proj.velocity = Vector2.new(Number(x) || 0, Number(y) || 0);
    }

    AI(proj) {
        const state = this.State(proj);
        if (!state)
            return;
        state.age = Number(state.age) + 1;
        proj.frameCounter = Number(proj.frameCounter) + 1;
        if (Number(proj.frameCounter) > 8) {
            proj.frameCounter = 0;
            proj.frame = (Number(proj.frame) + 1) % 6;
        }
        const speed = Math.sqrt(Number(proj.velocity.X) ** 2 + Number(proj.velocity.Y) ** 2);
        if (speed > 0.5)
            this.SetVelocity(proj, Number(proj.velocity.X) * 0.9765, Number(proj.velocity.Y) * 0.9765);
        else
            this.SetVelocity(proj, 0, 0);
        const selfSlot = Math.floor(Number(proj.whoAmI));
        if (selfSlot >= 0 && selfSlot < 1000)
            ActiveNimbusSlots.add(selfSlot);
        for (const slot of ActiveNimbusSlots) {
            let other = null;
            try {
                other = Terraria.Main.projectile[slot];
            } catch (e) { }
            if (!other || !other.active || Number(other.type) !== Number(proj.type)) {
                ActiveNimbusSlots.delete(slot);
                continue;
            }
            if (Number(other.whoAmI) === Number(proj.whoAmI))
                continue;
            const dx = Number(proj.Center.X) - Number(other.Center.X);
            const dy = Number(proj.Center.Y) - Number(other.Center.Y);
            if (dx * dx + dy * dy < 400) {
                this.SetVelocity(proj, Number(proj.velocity.X) + (Number(proj.position.X) < Number(other.position.X) ? -0.02 : 0.02), Number(proj.velocity.Y));
            }
        }
        if (Number(state.age) >= 210) {
            proj.alpha = Math.min(255, Number(proj.alpha) + 5);
            if (Number(proj.alpha) >= 255) {
                try {
                    proj.Kill();
                } catch (e) {
                    proj.active = false;
                }
            }
            return;
        }
        if (Number(state.age) >= 15) {
            state.rainTimer = Number(state.rainTimer) + 1;
            if (Number(state.rainTimer) > 8 && Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
                state.rainTimer = 0;
                const rainType = Number(ModProjectile.getTypeByName('ShadeNimbusRain') || 0);
                if (rainType > 0) {
                    const rainX = Number(proj.position.X) + 14 + Math.random() * Math.max(1, Number(proj.width) - 28);
                    const rainY = Number(proj.position.Y) + Number(proj.height) + 4;
                    let source = null;
                    try {
                        source = proj.GetProjectileSource_FromThis();
                    } catch (e) { }
                    try {
                        NewProjectile(source, Vector2.new(rainX, rainY), Vector2.new(0, 10), rainType, Math.max(1, Number(proj.damage)), 0, proj.owner, 0, 0, 0, null);
                    } catch (e) { }
                }
            }
        }
    }

    CanDamage() {
        return false;
    }

    OnTileCollide() {
        return false;
    }

    OnKill(proj) {
        const slot = Math.floor(Number(proj?.whoAmI));
        if (slot >= 0)
            ActiveNimbusSlots.delete(slot);
        FusionEntityData.ClearProjectile(proj);
    }
}
