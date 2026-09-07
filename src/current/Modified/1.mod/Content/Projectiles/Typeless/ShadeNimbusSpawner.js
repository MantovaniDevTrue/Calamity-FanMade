import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModGore } from './../../../TL/ModGore.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2, Color, Effects } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
export class ShadeNimbusSpawner extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'NPCs/Bosses/HiveMind/DankCreeper';
    }

    SetDefaults() {
        this.Projectile.width = 70;
        this.Projectile.height = 70;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.timeLeft = 35;
        this.Projectile.friendly = false;
        this.Projectile.hostile = false;
        this.Projectile.aiStyle = -1;
    }

    AI(proj) {
        proj.rotation = Number(proj.velocity.X) * 0.05;
    }

    CanDamage() {
        return false;
    }

    OnKill(proj) {
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](4, proj.Center, 1, 0);
        } catch (e) { }
        if (Terraria.Main.netMode !== 2) {
            for (let k = 0; k < 20; k++) {
                try {
                    NewDust(proj.position, proj.width, proj.height, 13, Number(proj.velocity.X) > 0 ? 1 : -1, -1, 0, Color.White, 1);
                } catch (e) { }
            }
            for (const name of ['DankCreeperGore', 'DankCreeperGore2', 'DankCreeperGore3']) {
                const type = Number(ModGore.getTypeByName(name) || 0);
                if (!(type > 0))
                    continue;
                try {
                    Effects.NewGoreFromNPC(proj, type, false);
                } catch (e) { }
            }
        }
        FusionEntityData.ClearProjectile(proj);
        if (Number(proj.owner) !== Number(Terraria.Main.myPlayer))
            return;
        const cloudType = Number(ModProjectile.getTypeByName('ShadeNimbus') || 0);
        if (!(cloudType > 0))
            return;
        let source = null;
        try {
            source = proj.GetProjectileSource_FromThis();
        } catch (e) { }
        for (const sign of [-1, 1]) {
            const speed = 3 + Math.random() * 6.5;
            const angle = (Math.random() - 0.5) * Math.PI / 36;
            const velocity = Vector2.new(Math.cos(angle) * speed * sign, Math.sin(angle) * speed * sign);
            try {
                NewProjectile(source, proj.Center, velocity, cloudType, Math.max(1, Number(proj.damage)), 0, proj.owner, 0, 0, 0, null);
            } catch (e) { }
        }
    }
}
