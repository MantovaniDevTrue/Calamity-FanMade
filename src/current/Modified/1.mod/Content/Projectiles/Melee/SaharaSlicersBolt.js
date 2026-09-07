import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { PlayItemSound } from '../../../Common/Snippets/LegacySoundCompat.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function SpawnDust(proj, count, impact) {
    const water = 288;
    const sand = 32;
    const smoke = 31;
    for (let i = 0; i < count; i++) {
        try {
            const angle = (Math.random() - 0.5) * (impact ? 1.4 : 0.55);
            const source = Vector2.RotatedBy(proj.velocity, angle);
            const multiplier = impact ? -(0.08 + Math.random() * 0.55) : -(0.12 + Math.random() * 0.25);
            const velocity = Vector2.Multiply(source, multiplier);
            const type = impact ? (Math.random() < 0.6 ? sand : smoke) : (Math.random() < 0.7 ? water : sand);
            const index = NewDust(proj.position, proj.width, proj.height, type, Number(velocity.X), Number(velocity.Y), impact ? 25 : 80, Color.White, impact ? 0.75 + Math.random() * 0.65 : 0.25 + Math.random() * 0.30);
            const dust = Terraria.Main.dust[index];
            if (dust)
                dust.noGravity = !impact;
        } catch (e) { }
    }
}

export class SaharaSlicersBolt extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Melee/SaharaSlicersBolt';
    }

    SetDefaults() {
        this.Projectile.width = 18;
        this.Projectile.height = 18;
        this.Projectile.timeLeft = 300;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.melee = true;
        this.Projectile.penetrate = 2;
        this.Projectile.tileCollide = true;
        this.Projectile.ignoreWater = true;
        this.Projectile.aiStyle = 0;
        this.Projectile.usesLocalNPCImmunity = true;
        this.Projectile.localNPCHitCooldown = -1;
    }

    AI(proj) {
        const ai = new ProjAI(proj);
        ai[2] = Number(ai[2]) + 1;
        const mode = Math.floor(Number(ai[0]) || 0);
        const player = Terraria.Main.player[proj.owner];
        if (!player || !player.active || player.dead) {
            proj.Kill();
            return;
        }
        if (mode === 1) {
            proj.friendly = true;
            proj.tileCollide = true;
            proj.extraUpdates = 6;
            proj.rotation = Math.atan2(Number(proj.velocity.Y), Number(proj.velocity.X)) + Math.PI / 2;
            if (Math.random() < 0.50)
                SpawnDust(proj, 1, false);
            return;
        }
        proj.friendly = false;
        proj.tileCollide = false;
        proj.extraUpdates = 0;
        proj.timeLeft = 4;
        const state = ModPlayer.getByName('CalamityPlayerState');
        const boltIndex = Math.max(1, Math.floor(Number(ai[1]) || 1));
        const stored = state ? Math.max(0, Math.floor(Number(state.SaharaSlicersBolts) || 0)) : 0;
        const itemType = ModItem.getTypeByName('SaharaSlicers');
        let heldType = 0;
        try {
            heldType = Number(player.HeldItem.type);
        } catch (e) { }
        if (stored < boltIndex || !(itemType > 0 && heldType === Number(itemType))) {
            proj.Kill();
            return;
        }
        const direction = Number(Terraria.PlayerDirection(player)) || 1;
        const center = player.MountedCenter;
        center.X = Number(center.X) + (10 + boltIndex * 2.5) * -direction;
        center.Y = Number(center.Y) + 3 - boltIndex + Number(player.gfxOffY || 0);
        proj.Center = center;
        proj.velocity = Vector2.new(0, 0);
        proj.rotation = (21.8 - boltIndex * 0.1) * -direction;
        proj.spriteDirection = direction;
    }

    CanDamage(proj) {
        const ai = new ProjAI(proj);
        return Math.floor(Number(ai[0]) || 0) === 1;
    }

    OnHitNPC(proj, npc) {
        SpawnDust(proj, 10, true);
    }

    OnKill(proj, timeLeft) {
        const ai = new ProjAI(proj);
        if (Math.floor(Number(ai[0]) || 0) !== 1)
            return;
        try {
            PlayItemSound(10, proj.Center, 0.15, 0.8);
        } catch (e) { }
        SpawnDust(proj, 12, true);
    }
}
