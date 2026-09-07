import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile, IsStealthStrike } from './../../../Core/RogueRuntime.js';

const { Vector2 } = Modules;
function NPCCenter(npc) {
    if (!npc)
        return null;
    try {
        return Vector2.new(Number(npc.position.X) + Number(npc.width) * .5, Number(npc.position.Y) + Number(npc.height) * .5);
    } catch (e) {
        return null;
    }
}

export class WulfrumKnifeProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/WulfrumKnife';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 12;
        p.height = 12;
        p.friendly = true;
        p.ranged = false;
        p.melee = false;
        p.magic = false;
        p.penetrate = 1;
        p.timeLeft = 360;
        p.extraUpdates = 2;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 10;
    }

    OnSpawn(p) {
        MarkRogueProjectile(p, 'WulfrumKnife', false);
    }

    AI(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'wknife', () => ({ target: null, offsetX: 0, offsetY: 0 }));
        const target = state.target;
        if (target) {
            if (!target.active || Number(target.life) <= 0) {
                p.Kill();
                return;
            }
            const center = NPCCenter(target);
            if (!center) {
                p.Kill();
                return;
            }
            p.Center = Vector2.new(Number(center.X) + Number(state.offsetX), Number(center.Y) + Number(state.offsetY));
            p.velocity = Vector2.Zero;
            p.rotation = Number(p.rotation) + 0.03;
            return;
        }
        const velocity = p.velocity;
        velocity.X = Number(velocity.X) * 0.998;
        velocity.Y = Number(velocity.Y) + 0.015;
        p.velocity = velocity;
        p.rotation = Math.atan2(Number(velocity.Y), Number(velocity.X)) + Math.PI / 2;
        if (IsStealthStrike(p))
            p.penetrate = Math.max(2, Number(p.penetrate));
    }

    OnHitNPC(p, npc) {
        const center = NPCCenter(npc);
        if (!center)
            return;
        const state = FusionEntityData.GetProjectileBag(p, 'wknife', () => ({ target: null, offsetX: 0, offsetY: 0 }));
        state.target = npc;
        state.offsetX = Number(p.Center.X) - Number(center.X);
        state.offsetY = Number(p.Center.Y) - Number(center.Y);
        p.friendly = false;
        p.tileCollide = false;
        p.penetrate = -1;
        p.extraUpdates = 0;
        p.timeLeft = Math.max(Number(p.timeLeft), 150);
        p.velocity = Vector2.Zero;
    }

    OnTileCollide(p) {
        const old = p.oldVelocity;
        p.extraUpdates = 0;
        p.timeLeft = Math.min(Number(p.timeLeft), 120);
        p.velocity = Vector2.new(-Number(old && old.X || p.velocity.X) * .35, -Number(old && old.Y || p.velocity.Y) * .35);
        return false;
    }
}
