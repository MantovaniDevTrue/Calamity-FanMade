import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { IsStealthStrike } from './../../../Core/RogueRuntime.js';

const { Vector2, Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const states = new Array(1000);
const flyingByOwner = new Array(256);
const stuckByTarget = new Array(200);

function slot(entity) {
    const value = Number(entity && entity.whoAmI);
    return Number.isFinite(value) ? value | 0 : -1;
}

function removeFrom(list, value) {
    if (!list)
        return;
    const index = list.indexOf(value);
    if (index >= 0)
        list.splice(index, 1);
}

function stateFor(projectile) {
    const index = slot(projectile);
    if (index < 0 || index >= states.length)
        return null;

    let state = states[index];
    if (!state) {
        state = {
            age: 0,
            attached: false,
            target: null,
            targetSlot: -1,
            offsetX: 0,
            offsetY: 0,
            owner: Number(projectile.owner) | 0
        };
        states[index] = state;
    }
    return state;
}

function trackFlying(projectile) {
    const owner = Number(projectile.owner) | 0;
    if (owner < 0 || owner >= flyingByOwner.length)
        return;

    const index = slot(projectile);
    const list = flyingByOwner[owner] || (flyingByOwner[owner] = []);
    list.push(index);

    while (list.length > 36) {
        const old = list.shift();
        if (!(old >= 0 && old < 1000))
            continue;
        const other = Terraria.Main.projectile[old];
        const oldState = states[old];
        if (other && other.active && oldState && !oldState.attached)
            other.Kill();
    }
}

function trackStuck(projectile, target, state) {
    const targetIndex = slot(target);
    if (targetIndex < 0 || targetIndex >= stuckByTarget.length)
        return;

    state.targetSlot = targetIndex;
    const list = stuckByTarget[targetIndex] || (stuckByTarget[targetIndex] = []);
    list.push(slot(projectile));

    let cap = IsStealthStrike(projectile) ? 10 : 3;
    for (let i = 0; i < list.length && cap === 3; i++) {
        const otherState = states[list[i]];
        const other = list[i] >= 0 && list[i] < 1000 ? Terraria.Main.projectile[list[i]] : null;
        if (otherState && other && other.active && IsStealthStrike(other))
            cap = 10;
    }

    while (list.length > cap) {
        const old = list.shift();
        if (!(old >= 0 && old < 1000))
            continue;
        const other = Terraria.Main.projectile[old];
        if (other && other.active)
            other.Kill();
    }
}

function clearTracking(projectile) {
    const index = slot(projectile);
    const state = index >= 0 && index < states.length ? states[index] : null;
    if (!state)
        return;

    removeFrom(flyingByOwner[state.owner], index);
    if (state.targetSlot >= 0)
        removeFrom(stuckByTarget[state.targetSlot], index);
    states[index] = null;
}

export class UrchinStingerProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/UrchinStinger';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 10;
        projectile.height = 10;
        projectile.friendly = true;
        projectile.penetrate = 2;
        projectile.timeLeft = 600;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = 10;
    }

    OnSpawn(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = null;
        stateFor(projectile);
        trackFlying(projectile);
    }

    AI(projectile) {
        const state = stateFor(projectile);
        if (!state)
            return;

        state.age++;
        if (state.attached) {
            const target = state.target;
            if (!target || !target.active || Number(target.life) <= 0) {
                projectile.Kill();
                return;
            }

            projectile.position = Vector2.new(
                Number(target.position.X) + state.offsetX,
                Number(target.position.Y) + state.offsetY
            );
            projectile.velocity = Vector2.Zero;
            projectile.rotation += .015;
            return;
        }

        let vx = Number(projectile.velocity.X);
        let vy = Number(projectile.velocity.Y);
        const direction = vx >= 0 ? 1 : -1;
        projectile.direction = direction;
        projectile.spriteDirection = direction;
        projectile.rotation = Math.atan2(vy, vx) + (direction === 1 ? Math.PI / 2 : -Math.PI / 2);

        if (state.age <= 30)
            return;

        vy = Math.min(16, vy + .3);
        vx *= .98;
        projectile.velocity = Vector2.new(vx, vy);
        projectile.rotation += .2 * direction;
    }

    CanDamage(projectile) {
        const state = stateFor(projectile);
        return state && state.attached ? false : null;
    }

    OnHitNPC(projectile, npc) {
        try {
            npc.AddBuff(20, IsStealthStrike(projectile) ? 600 : 180, false);
        } catch (e) { }

        const state = stateFor(projectile);
        if (!state)
            return;

        state.attached = true;
        state.target = npc;
        state.offsetX = Number(projectile.position.X) - Number(npc.position.X);
        state.offsetY = Number(projectile.position.Y) - Number(npc.position.Y);

        removeFrom(flyingByOwner[state.owner], slot(projectile));
        trackStuck(projectile, npc, state);

        projectile.friendly = false;
        projectile.tileCollide = false;
        projectile.penetrate = -1;
        projectile.timeLeft = Math.min(Number(projectile.timeLeft), 180);
        projectile.velocity = Vector2.Zero;
    }

    OnTileCollide() {
        return true;
    }

    OnKill(projectile) {
        clearTracking(projectile);
        for (let i = 0; i < 2; i++) {
            const dust = NewDust(
                projectile.position,
                Number(projectile.width),
                Number(projectile.height),
                75,
                0,
                0,
                100,
                Color.White,
                1
            );
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }
    }
}
