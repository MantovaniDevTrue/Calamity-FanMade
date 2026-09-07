import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { MarkRogueProjectile, IsStealthStrike } from './../../../Core/RogueRuntime.js';

const { Vector2, Color } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
let SlashType = 0;

function sourceFrom(p, owner) {
    let source = null;
    try { source = p.GetProjectileSource_FromThis(); } catch (e) { }
    if (!source && owner) try { source = owner.GetProjectileSource_Item(owner.HeldItem); } catch (e) { }
    return source;
}

function spawnSlash(p, velocity, damage, knockback, ai0, ai1) {
    if (!(SlashType > 0)) SlashType = Number(ModProjectile.getTypeByName('TurbulanceWindSlash') || 0);
    if (!(SlashType > 0)) return;
    const owner = Terraria.Main.player[p.owner];
    const id = NewProjectile(sourceFrom(p, owner), p.Center, velocity, SlashType,
        Math.max(1, Math.floor(damage)), Number(knockback) || 0, p.owner, ai0, ai1, 0, null);
    if (id >= 0 && id < 1000) {
        let child = null;
        try { child = Terraria.Main.projectile.get_Item(id); } catch (e) { }
        if (child) MarkRogueProjectile(child, 'Turbulance', true);
    }
}

function randomVelocity() {
    const angle = Math.random() * Math.PI * 2;
    const speed = 7 + Math.random() * 3;
    return Vector2.new(Math.cos(angle) * speed, Math.sin(angle) * speed);
}

export class TurbulanceProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/Turbulance';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 20;
        p.height = 20;
        p.friendly = true;
        p.ignoreWater = true;
        p.tileCollide = false;

        // Restore the source's native substeps. 13.10.2 multiplied velocity by 3 and removed
        // extraUpdates, which preserved distance but allowed the 20px dart to tunnel through
        // small NPC hitboxes without ever executing a native collision step.
        p.timeLeft = 600;
        p.extraUpdates = 2;
    }

    AI(p) {
        // Source: collision begins after two sub-updates.
        if (!p.tileCollide && Number(p.timeLeft) <= 598) p.tileCollide = true;
        p.rotation = Math.atan2(Number(p.velocity.Y), Number(p.velocity.X)) + Math.PI / 4;

        // Keep VFX sparse. With extraUpdates=2 this callback runs three times per game tick.
        if ((Number(p.timeLeft) % 15) === 0) {
            try {
                NewDust(Vector2.new(Number(p.position.X) + Number(p.velocity.X), Number(p.position.Y) + Number(p.velocity.Y)),
                    p.width, p.height, 187, Number(p.velocity.X) * 0.15, Number(p.velocity.Y) * 0.15, 100, Color.White, 0.9);
            } catch (e) { }
        }

        // Preserve exact source cadence: every 14 sub-updates during a stealth strike.
        if (IsStealthStrike(p) && (Number(p.timeLeft) % 14) === 0 && Number(p.owner) === Number(Terraria.Main.myPlayer)) {
            spawnSlash(p, Vector2.Zero, Number(p.damage) * 0.75, Number(p.knockBack) * 0.5, 1, 1);
        }
    }

    Burst(p, homeIn) {
        if (Number(p.owner) !== Number(Terraria.Main.myPlayer)) return;
        for (let i = 0; i < 3; i++) {
            spawnSlash(p, randomVelocity(), Number(p.damage) / 3, Number(p.knockBack) / 3, 0, homeIn ? 1 : 0);
        }
    }

    OnHitNPC(p, npc) {
        // The dart itself now reaches the NPC and deals its native hit before this callback.
        this.Burst(p, Math.random() < 1 / 3);
    }

    OnTileCollide(p, oldVelocity) {
        this.Burst(p, false);
        return true;
    }

    OnKill(p) {
        for (let i = 0; i < 3; i++) {
            try { NewDust(p.position, p.width, p.height, 187, Number(p.velocity.X) * 0.15, Number(p.velocity.Y) * 0.15, 50, Color.White, 1); }
            catch (e) { }
        }
    }
}
