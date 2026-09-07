import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile } from './../../../Core/RogueRuntime.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let RainType = 0;
export class RogueStealthCloud extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Magic/ShadeNimbusCloud';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 54;
        p.height = 28;
        p.friendly = false;
        p.hostile = false;
        p.tileCollide = false;
        p.ignoreWater = true;
        p.timeLeft = 240;
        p.penetrate = -1;
    }

    OnSpawn(p) {
        const ai = new ProjAI(p);
        const state = FusionEntityData.GetProjectileBag(p, 'rogueCloud', () => ({ timer: 0, variant: 0 }));
        state.timer = 0;
        state.variant = Math.floor(Number(ai[0]) || 0);
        MarkRogueProjectile(p, 'RogueStealthCloud', true);
    }

    AI(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'rogueCloud', () => ({ timer: 0, variant: 0 }));
        state.timer = Number(state.timer || 0) + 1;
        p.velocity = Vector2.Multiply(p.velocity, 0.94);
        p.rotation = Math.sin(state.timer * 0.08) * 0.04;
        try {
        } catch (e) { }
        if (Number(p.owner) !== Number(Terraria.Main.myPlayer) || state.timer % 18 !== 0)
            return;
        if (!(RainType > 0))
            RainType = Number(ModProjectile.getTypeByName('RogueStealthRain') || 0);
        if (!(RainType > 0))
            return;
        let source = null;
        try {
            source = p.GetProjectileSource_FromThis();
        } catch (e) { }
        const x = (Math.random() - 0.5) * 42;
        const spawn = Vector2.new(Number(p.Center.X) + x, Number(p.Center.Y) + 8);
        const velocity = Vector2.new((Math.random() - 0.5) * 1.2, 8 + Math.random() * 2);
        const index = NewProjectile(source, spawn, velocity, RainType, Math.max(1, Math.floor(Number(p.damage))), 0, p.owner, state.variant, 0, 0, null);
        if (index >= 0 && index < 1000)
            MarkRogueProjectile(Terraria.Main.projectile[index], 'RogueStealthRain', true);
    }

    CanDamage() {
        return false;
    }
}

export class RogueStealthRain extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Typeless/ShadeNimbusRain';
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 8;
        p.height = 18;
        p.friendly = true;
        p.hostile = false;
        p.tileCollide = true;
        p.timeLeft = 120;
        p.penetrate = 1;
        p.extraUpdates = 1;
    }

    AI(p) {
        p.rotation = Math.atan2(Number(p.velocity.Y), Number(p.velocity.X)) + Math.PI / 2;
    }

    OnHitNPC(p, npc) {
        const ai = new ProjAI(p);
        const variant = Math.floor(Number(ai[0]) || 0);
        const name = variant ? 'BurningBlood' : 'BrainRot';
        const buff = Number(ModBuff.getTypeByName(name) || 0);
        if (buff > 0) {
            try {
                npc.AddBuff(buff, 90, false);
            } catch (e) { }
        }
    }
}
