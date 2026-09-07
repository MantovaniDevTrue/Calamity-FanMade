import { ModProjectile } from './../../../TL/ModProjectile.js';
import { Terraria, Modules } from './../../../TL/ModImports.js';
import { MarkRogueProjectile, IsStealthStrike, GetRogueProjectileData } from './../../../Core/RogueRuntime.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let CloudType = 0;
export class ToothBallProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/ToothBall';
        this.AIType = 48;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 30;
        p.height = 30;
        p.friendly = true;
        p.ranged = false;
        p.penetrate = 3;
        p.aiStyle = 2;
        p.timeLeft = 600;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 30;
    }

    OnHitNPC(p, npc) {
        MarkRogueProjectile(p, 'ToothBallProjectile', false);
        const b = Number(ModBuff.getTypeByName('BurningBlood') || 0);
        if (b > 0)
            try {
                npc.AddBuff(b, 90, false);
            } catch (e) { }
        const data = GetRogueProjectileData(p);
        if (IsStealthStrike(p) && data && data.procUsed !== true && Number(p.owner) === Number(Terraria.Main.myPlayer)) {
            data.procUsed = true;
            if (!(CloudType > 0))
                CloudType = Number(ModProjectile.getTypeByName('RogueStealthCloud') || 0);
            if (CloudType > 0) {
                let source = null;
                try {
                    source = p.GetProjectileSource_FromThis();
                } catch (e) { }
                NewProjectile(source, p.Center, Vector2.new(0, -2), CloudType, Math.max(1, Math.floor(Number(p.damage) * 0.5)), 0, p.owner, 1, 0, 0, null);
            }
        }
    }
}
