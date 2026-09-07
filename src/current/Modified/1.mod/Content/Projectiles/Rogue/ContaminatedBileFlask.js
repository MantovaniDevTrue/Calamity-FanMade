import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { MarkRogueProjectile, MarkStealthStrike, IsStealthStrike } from './../../../Core/RogueRuntime.js';

const { Vector2, Color } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
const states = new Array(1000);

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
        state = { checkedStealth: false, stealth: false };
        states[index] = state;
    }
    return state;
}

function playBreakSound(position) {
    try {
        Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, position, 107, 0);
    } catch (e) { }
}

export class ContaminatedBileFlask extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/ContaminatedBile';
    }

    SetDefaults() {
        const projectile = this.Projectile;
        projectile.width = 28;
        projectile.height = 28;
        projectile.friendly = true;
        projectile.penetrate = 1;
        projectile.timeLeft = 300;
        projectile.tileCollide = true;
        projectile.aiStyle = 2;
        projectile.alpha = 0;
    }

    OnSpawn(projectile) {
        const index = slot(projectile);
        if (index >= 0 && index < states.length)
            states[index] = { checkedStealth: false, stealth: false };
    }

    AI(projectile) {
        const state = stateFor(projectile);
        if (state && !state.checkedStealth) {
            state.checkedStealth = true;
            state.stealth = IsStealthStrike(projectile);
        }
        const vx = Number(projectile.velocity.X);
        const vy = Number(projectile.velocity.Y);
        projectile.rotation += (Math.abs(vx) + Math.abs(vy)) * .002 * (Number(projectile.direction) || 1);
    }

    OnKill(projectile) {
        const index = slot(projectile);
        const state = stateFor(projectile);
        const stealth = state ? state.stealth === true || IsStealthStrike(projectile) : IsStealthStrike(projectile);
        if (index >= 0 && index < states.length)
            states[index] = null;

        playBreakSound(projectile.Center);
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.2 + Math.random() * 2.8;
            const dust = NewDust(projectile.position, projectile.width, projectile.height, 75, Math.cos(angle) * speed, Math.sin(angle) * speed, 0, Color.White, .9 + Math.random() * .3);
            if (dust >= 0)
                Terraria.Main.dust[dust].noGravity = true;
        }

        const type = Number(ModProjectile.getTypeByName('BileExplosion') || 0);
        if (!(type > 0))
            return;
        let source = null;
        try {
            source = projectile.GetProjectileSource_FromThis();
        } catch (e) { }
        const explosionIndex = NewProjectile(
            source,
            projectile.Center,
            Vector2.Zero,
            type,
            Math.max(1, Math.floor(Number(projectile.damage) * .4)),
            Number(projectile.knockBack) || 0,
            Number(projectile.owner) || 0,
            0,
            0,
            0,
            null
        );
        if (!(explosionIndex >= 0 && explosionIndex < 1000))
            return;
        const explosion = Terraria.Main.projectile[explosionIndex];
        MarkRogueProjectile(explosion, 'ContaminatedBile', true);
        if (stealth)
            MarkStealthStrike(explosion, 'ContaminatedBile', true);
    }
}
