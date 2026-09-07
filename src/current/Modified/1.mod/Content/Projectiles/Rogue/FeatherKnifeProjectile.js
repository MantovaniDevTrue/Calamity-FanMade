import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let StickyType = 0;
let SharedSource = null;
let SharedSourceResolved = false;

function source() {
    if (!SharedSourceResolved) {
        SharedSourceResolved = true;
        try { SharedSource = null; } catch (e) { SharedSource = null; }
    }
    return SharedSource;
}

function spawnFeather(projectile, multiplier) {
    if (Number(projectile.owner) !== Number(Terraria.Main.myPlayer)) return;
    if (!(StickyType > 0)) StickyType = Number(ModProjectile.getTypeByName('StickyFeatherAero') || 0);
    if (!(StickyType > 0)) return;
    const velocity = Vector2.new(Number(projectile.velocity.X) / 20, 2);

    // StickyFeatherAero is already registered as a Rogue projectile type globally, so the
    // previous per-feather FusionEntityData marker allocation was redundant. A single cached
    // Reusing the null source avoids a native entity-source bridge call for every feather.
    NewProjectile(source(), projectile.position, velocity, StickyType,
        Math.max(1, Math.floor(Number(projectile.damage) * multiplier)), Number(projectile.knockBack) || 0,
        projectile.owner, 0, 0, 0, null);
}

export class FeatherKnifeProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/FeatherKnife';
        this.AIType = 48;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 12;
        p.height = 12;
        p.friendly = true;
        p.aiStyle = 2;
        p.timeLeft = 600;
        p.penetrate = 1;
    }

    AI(p) {
        if ((Number(p.timeLeft) % 15) === 0) spawnFeather(p, 0.4);
    }

    OnHitNPC(p, npc) {
        spawnFeather(p, 0.69);
    }
}
