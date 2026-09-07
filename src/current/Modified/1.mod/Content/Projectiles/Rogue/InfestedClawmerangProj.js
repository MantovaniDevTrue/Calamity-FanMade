import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { MarkRogueProjectile, IsStealthStrike, SpawnMarkedProjectile, Rotate } from './../../../Core/RogueRuntime.js';

const { Color } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class InfestedClawmerangProj extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Items/Weapons/Rogue/InfestedClawmerang';
        this.AIType = Number(Terraria.ID.ProjectileID.WoodenBoomerang);
    }

    SetDefaults() {
        this.Projectile.width = 30;
        this.Projectile.height = 30;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.ranged = false;
        this.Projectile.melee = false;
        this.Projectile.magic = false;
        this.Projectile.penetrate = -1;
        this.Projectile.aiStyle = 3; // Boomerang AI
        this.Projectile.timeLeft = 300;
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = false;
        this.Projectile.usesIDStaticNPCImmunity = true;
        this.Projectile.idStaticNPCHitCooldown = 10;
    }

    AI(proj) {
        MarkRogueProjectile(proj, 'InfestedClawmerang', false);
        if (IsStealthStrike(proj) && Number(proj.owner) === Number(Terraria.Main.myPlayer) && Number(proj.timeLeft) % 15 === 0) {
            const player = Terraria.Main.player[Number(proj.owner)];
            const type = Number(ModProjectile.getTypeByName('MycorootProj') || 0);
            if (player && type > 0) {
                let held = null;
                try {
                    held = player.inventory[Math.floor(Number(player.selectedItem))];
                } catch (e) { }
                const away = Rotate(proj.velocity, (Math.random() - 0.5) * Math.PI * 2, 0.35);
                SpawnMarkedProjectile(player, held, proj.Center, away, type, Number(proj.damage) * 0.5, 1, 'InfestedSpore', false, true, 1, 0, 0);
            }
        }
        try {
        } catch (e) { }
        if (Math.random() < 0.2) {
            try {
                const dustType = 59;
                const dust = NewDust(proj.position, proj.width, proj.height, dustType, Number(proj.velocity.X) * 0.5, Number(proj.velocity.Y) * 0.5, 0, Color.White, 1);
                if (dust >= 0) {
                    const instance = Terraria.Main.dust[dust];
                    if (instance)
                        instance.noGravity = true;
                }
            } catch (e) { }
        }
    }

    OnHitNPC(proj, npc) {
        if (!IsStealthStrike(proj))
            return;
        const owner = Terraria.Main.player[Math.floor(Number(proj.owner))];
        const mushy = Number(ModBuff.getTypeByName('Mushy') || 0);
        if (owner && mushy > 0) {
            try {
                owner.AddBuff(mushy, 720);
            } catch (e) { }
        }
    }
}
