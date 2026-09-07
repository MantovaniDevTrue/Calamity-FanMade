import { ModProjectile } from './../../../TL/ModProjectile.js';
import { Terraria, Modules } from './../../../TL/ModImports.js';
import { MarkRogueProjectile, IsStealthStrike, GetRogueProjectileData } from './../../../Core/RogueRuntime.js';
import { ModBuff } from './../../../TL/ModBuff.js';

const { Vector2 } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
let CloudType = 0;
export class RotBallProjectile extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/RotBall';
    }

    SetDefaults() {
        this.Projectile.width = 30;
        this.Projectile.height = 30;
        this.Projectile.friendly = true;
        this.Projectile.ranged = false;
        this.Projectile.penetrate = 3;
        this.Projectile.aiStyle = 2;
        this.Projectile.timeLeft = 600;
        this.AIType = 48;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = 30;
    }

    OnHitNPC(proj, npc) {
        MarkRogueProjectile(proj, 'RotBallProjectile', false);
        const b = Number(ModBuff.getTypeByName('BrainRot') || 0);
        if (b > 0)
            try {
                npc.AddBuff(b, 90, false);
            } catch (e) { }
        const data = GetRogueProjectileData(proj);
        if (IsStealthStrike(proj) && data && data.procUsed !== true && Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
            data.procUsed = true;
            if (!(CloudType > 0))
                CloudType = Number(ModProjectile.getTypeByName('RogueStealthCloud') || 0);
            if (CloudType > 0) {
                let source = null;
                try {
                    source = proj.GetProjectileSource_FromThis();
                } catch (e) { }
                NewProjectile(source, proj.Center, Vector2.new(0, -2), CloudType, Math.max(1, Math.floor(Number(proj.damage) * 0.5)), 0, proj.owner, 0, 0, 0, null);
            }
        }
    }
}
