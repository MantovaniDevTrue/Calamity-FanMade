import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { MarkRogueProjectile, MarkStealthStrike, IsStealthStrike } from './../../../Core/RogueRuntime.js';

const { Vector2, Color } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const states = new Array(1000);
let bubbleType = 0;

function slot(projectile) {
    const value = Number(projectile && projectile.whoAmI);
    return Number.isFinite(value) ? value | 0 : -1;
}

function stateFor(projectile) {
    const index = slot(projectile);
    if (index < 0 || index >= states.length)
        return null;
    let state = states[index];
    if (!state) {
        state = { age: 0, checkedStealth: false, stealth: false, bubbles: 0 };
        states[index] = state;
    }
    return state;
}

function resolveBubbleType() {
    if (!(bubbleType > 0))
        bubbleType = Number(ModProjectile.getTypeByName('SulphuricAcidBubbleFriendly') || 0);
    return bubbleType;
}

function spawnBubble(projectile, state) {
    const type = resolveBubbleType();
    if (!(type > 0) || state.bubbles >= 6)
        return;
    let source = null;
    try {
        source = projectile.GetProjectileSource_FromThis();
    } catch (e) { }
    const angle = Math.random() * Math.PI * 2;
    const radius = 15 + Math.random() * 55;
    const position = Vector2.new(
        Number(projectile.Center.X) + Math.cos(angle) * radius,
        Number(projectile.Center.Y) + Math.sin(angle) * radius * .7
    );
    const velocity = Vector2.new((Math.random() - .5) * .7, -2.4 - Math.random() * 1.6);
    const index = NewProjectile(
        source,
        position,
        velocity,
        type,
        Math.max(1, Math.floor(Number(projectile.damage) * .5)),
        Number(projectile.knockBack) || 0,
        Number(projectile.owner) || 0,
        0,
        0,
        1,
        null
    );
    if (!(index >= 0 && index < 1000))
        return;
    state.bubbles++;
    const bubble = Terraria.Main.projectile[index];
    MarkRogueProjectile(bubble, 'ContaminatedBile', true);
    MarkStealthStrike(bubble, 'ContaminatedBile', true);
}

function applyIrradiated(target, duration) {
    const buff = Number(ModBuff.getTypeByName('Irradiated') || 0);
    if (!(buff > 0) || !target)
        return;
    try {
        target.AddBuff(buff, duration, false);
    } catch (e) {
        try {
            target.AddBuff(buff, duration, true);
        } catch (ignored) { }
    }
}

export class BileExplosion extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/InvisibleProj';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 150;
        projectile.height = 150;
        projectile.friendly = true;
        projectile.ignoreWater = true;
        projectile.tileCollide = false;
        projectile.penetrate = -1;
        projectile.timeLeft = 180;
        projectile.usesLocalNPCImmunity = true;
        projectile.localNPCHitCooldown = 25;
    }

    OnSpawn(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = { age: 0, checkedStealth: false, stealth: false, bubbles: 0 };
    }

    AI(projectile) {
        const state = stateFor(projectile);
        if (!state)
            return;
        state.age++;
        if (!state.checkedStealth) {
            state.checkedStealth = true;
            state.stealth = IsStealthStrike(projectile);
        }

        if (state.age % 6 === 0) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 65;
            const x = Number(projectile.Center.X) + Math.cos(angle) * radius;
            const y = Number(projectile.Center.Y) + Math.sin(angle) * radius;
            const dust = NewDust(Vector2.new(x, y), 2, 2, 75, (Math.random() - .5) * 1.5, -1 - Math.random() * 1.5, 40, Color.White, .8 + Math.random() * .5);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }

        if (state.stealth && state.age >= 12 && state.age % 24 === 0)
            spawnBubble(projectile, state);
    }

    Colliding(projectile, myRect, targetRect) {
        const centerX = Number(projectile.Center.X);
        const centerY = Number(projectile.Center.Y);
        const left = Number(targetRect.X);
        const top = Number(targetRect.Y);
        const right = left + Number(targetRect.Width);
        const bottom = top + Number(targetRect.Height);
        const nearestX = Math.max(left, Math.min(centerX, right));
        const nearestY = Math.max(top, Math.min(centerY, bottom));
        const dx = centerX - nearestX;
        const dy = centerY - nearestY;
        return dx * dx + dy * dy <= 75 * 75;
    }

    OnHitNPC(projectile, npc) {
        applyIrradiated(npc, 60);
    }

    PreDraw() {
        return false;
    }

    OnKill(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = null;
    }
}
