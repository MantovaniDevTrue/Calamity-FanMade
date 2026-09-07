import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const states = new Array(1000);

function slot(projectile) {
    const value = Number(projectile && projectile.whoAmI);
    return Number.isFinite(value) ? value | 0 : -1;
}

function validTarget(npc) {
    return npc && npc.active && !npc.friendly && !npc.townNPC && !npc.dontTakeDamage && Number(npc.life) > 0 && Number(npc.lifeMax) > 5;
}

function targetCenter(npc) {
    return Vector2.new(
        Number(npc.position.X) + Number(npc.width) * .5,
        Number(npc.position.Y) + Number(npc.height) * .5
    );
}

function findTarget(projectile, range) {
    const centerX = Number(projectile.position.X) + Number(projectile.width) * .5;
    const centerY = Number(projectile.position.Y) + Number(projectile.height) * .5;
    const rangeSq = range * range;

    ScanFrozenCubeNPCs(2);
    for (const i of FrozenCubeTrackedIndices()) {
        const npc = FrozenCubeNPC(i);
        if (!validTarget(npc))
            continue;

        const dx = Number(npc.position.X) + Number(npc.width) * .5 - centerX;
        const dy = Number(npc.position.Y) + Number(npc.height) * .5 - centerY;
        if (dx * dx + dy * dy <= rangeSq)
            return i;
    }
    return -1;
}

function stateFor(projectile) {
    const index = slot(projectile);
    if (index < 0 || index >= states.length)
        return null;

    let state = states[index];
    if (!state) {
        state = { timer: 0, targetIndex: -1, scannedAgain: false };
        states[index] = state;
    }
    return state;
}

export class AmidiasWhirlpool extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/AmidiasWhirlpool';
    }

    SetStaticDefaults() {
        try {
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 3;
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 2;
        } catch (e) { }
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 58;
        projectile.height = 58;
        projectile.friendly = true;
        projectile.hostile = false;
        projectile.penetrate = 1;
        projectile.extraUpdates = 0;
        projectile.alpha = 100;
        projectile.tileCollide = false;
        projectile.ignoreWater = true;
        projectile.melee = true;
        projectile.timeLeft = 70;
    }

    OnSpawn(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = { timer: 0, targetIndex: -1, scannedAgain: false };
    }

    AI(projectile) {
        const state = stateFor(projectile);
        if (!state)
            return;
        state.timer++;

        let vx = Number(projectile.velocity.X);
        let vy = Number(projectile.velocity.Y);
        const speed = Math.sqrt(vx * vx + vy * vy);
        projectile.rotation = Number(projectile.rotation) - .18;

        if (speed > 8) {
            if (state.timer >= 15) {
                vx *= .96;
                vy *= .96;
                projectile.velocity = Vector2.new(vx, vy);
            }
        } else {
            if (state.targetIndex < 0 && (state.timer === 1 || (!state.scannedAgain && state.timer >= 25))) {
                state.targetIndex = findTarget(projectile, 170);
                if (state.timer >= 25)
                    state.scannedAgain = true;
            }

            const target = state.targetIndex >= 0 ? Terraria.Main.npc[state.targetIndex] : null;
            if (validTarget(target)) {
                const center = targetCenter(target);
                const projectileX = Number(projectile.position.X) + Number(projectile.width) * .5;
                const projectileY = Number(projectile.position.Y) + Number(projectile.height) * .5;
                const dx = Number(center.X) - projectileX;
                const dy = Number(center.Y) - projectileY;
                const length = Math.sqrt(dx * dx + dy * dy);
                if (length > .001) {
                    const desiredX = dx / length * 14;
                    const desiredY = dy / length * 14;
                    projectile.velocity = Vector2.new((vx * 7 + desiredX) / 8, (vy * 7 + desiredY) / 8);
                }
            } else if (state.targetIndex >= 0) {
                state.targetIndex = -1;
            }
        }

        if (state.timer % 12 === 0) {
            try {
                const dustIndex = NewDust(
                    projectile.position,
                    projectile.width,
                    projectile.height,
                    33,
                    Number(projectile.velocity.X) * .08,
                    Number(projectile.velocity.Y) * .08,
                    0,
                    Color.new(0, 142, 255, 255),
                    1.1
                );
                const dust = Terraria.Main.dust[dustIndex];
                if (dust) {
                    dust.noGravity = true;
                    dust.velocity = Vector2.Multiply(dust.velocity, .1);
                }
            } catch (e) { }
        }

        if (state.timer >= 60)
            projectile.Kill();
    }

    GetAlpha(projectile, light) {
        return Color.new(30, 255, 253, 255);
    }

    OnKill(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = null;

        for (let i = 0; i < 2; i++) {
            try {
                NewDust(
                    projectile.position,
                    projectile.width,
                    projectile.height,
                    33,
                    Number(projectile.oldVelocity.X) * .35,
                    Number(projectile.oldVelocity.Y) * .35,
                    0,
                    Color.new(0, 142, 255, 255),
                    1
                );
            } catch (e) { }
        }
    }
}
