import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2 } = Modules;
function Length(x, y) {
    return Math.sqrt(x * x + y * y);
}

export class MiniHiveMind extends ModProjectile {
    constructor() {
        super();
        this.Texture = 'Projectiles/Pets/MiniHiveMind';
        this.BuffType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 16;
        Terraria.Main.projPet[this.Type] = true;
        try {
            Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type] = 6;
        } catch (e) { }
        try {
            Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type] = 0;
        } catch (e) { }
    }

    SetDefaults() {
        this.Projectile.netImportant = true;
        this.Projectile.width = 38;
        this.Projectile.height = 44;
        this.Projectile.friendly = true;
        this.Projectile.hostile = false;
        this.Projectile.penetrate = -1;
        this.Projectile.timeLeft = 90000;
        this.Projectile.tileCollide = false;
        this.Projectile.ignoreWater = true;
        this.Projectile.aiStyle = -1;
    }

    State(proj) {
        return FusionEntityData.GetProjectileBag(proj, 'miniHiveMind', () => ({
            reelBackCooldown: 0,
            charging: 0
        }));
    }

    SetVelocity(proj, x, y) {
        proj.velocity = Vector2.new(Number(x) || 0, Number(y) || 0);
    }

    KeepAlive(proj, player) {
        if (!(this.BuffType > 0))
            this.BuffType = Number(ModBuff.getTypeByName('MiniMindBuff') || 0);
        if (!player || !player.active || player.dead) {
            try {
                proj.Kill();
            } catch (e) {
                proj.active = false;
            }
            return false;
        }
        let hasBuff = false;
        try {
            hasBuff = this.BuffType > 0 && player.FindBuffIndex(this.BuffType) >= 0;
        } catch (e) { }
        if (!hasBuff) {
            try {
                proj.Kill();
            } catch (e) {
                proj.active = false;
            }
            return false;
        }
        proj.timeLeft = 2;
        return true;
    }

    FloatingAI(proj, player) {
        const targetX = Number(Terraria.PlayerCenterX(player)) - Number(Terraria.PlayerDirection(player) || 1) * 52;
        const targetY = Number(Terraria.PlayerCenterY(player)) - 52;
        let dx = targetX - Number(proj.Center.X);
        let dy = targetY - Number(proj.Center.Y);
        const distance = Length(dx, dy);
        if (distance > 2000 && Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
            proj.position = Vector2.new(targetX - Number(proj.width) * 0.5, targetY - Number(proj.height) * 0.5);
            this.SetVelocity(proj, 0, 0);
            proj.netUpdate = true;
            return;
        }
        if (distance > 12) {
            const speed = distance > 300 ? 12 : (distance > 100 ? 8 : 5);
            dx = dx / Math.max(1, distance) * speed;
            dy = dy / Math.max(1, distance) * speed;
            this.SetVelocity(proj, (Number(proj.velocity.X) * 20 + dx) / 21, (Number(proj.velocity.Y) * 20 + dy) / 21);
        } else {
            this.SetVelocity(proj, Number(proj.velocity.X) * 0.94, Number(proj.velocity.Y) * 0.94);
        }
        if (Math.abs(Number(proj.velocity.X)) > 0.2) {
            proj.direction = Number(proj.velocity.X) < 0 ? -1 : 1;
            proj.spriteDirection = proj.direction;
        }
        proj.rotation = Number(proj.velocity.X) * 0.025;
    }

    AI(proj) {
        const player = Terraria.Main.player[proj.owner];
        if (!this.KeepAlive(proj, player))
            return;
        const state = this.State(proj);
        if (!state)
            return;
        if (Number(state.reelBackCooldown) > 0)
            state.reelBackCooldown--;
        if (Number(state.charging) > 0)
            state.charging--;
        const dx = Number(Terraria.PlayerCenterX(player)) - Number(proj.Center.X);
        const dy = Number(Terraria.PlayerCenterY(player)) - Number(proj.Center.Y);
        const distance = Length(dx, dy);
        if (Number(state.reelBackCooldown) <= 0 && Number(state.charging) <= 0 && distance < 100 && Math.random() < 1 / 500) {
            const divisor = Math.max(1, distance);
            state.reelBackCooldown = 300;
            state.charging = 50;
            this.SetVelocity(proj, dx / divisor * 8, dy / divisor * 8);
            try {
                Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](15, proj.Center, 1, 0);
            } catch (e) { }
            proj.netUpdate = true;
        }
        if (Number(state.charging) > 0) {
            if (Number(state.charging) < 22)
                proj.alpha = Math.min(255, Number(proj.alpha) + 12);
            if (Number(state.charging) === 1 && Number(proj.owner) === Number(Terraria.Main.myPlayer)) {
                const xOffset = (400 + Math.random() * 200) * (Math.random() < 0.5 ? -1 : 1);
                const yOffset = (400 + Math.random() * 200) * (Math.random() < 0.5 ? -1 : 1);
                proj.position = Vector2.new(Number(Terraria.PlayerCenterX(player)) + xOffset - Number(proj.width) * 0.5, Number(Terraria.PlayerCenterY(player)) + yOffset - Number(proj.height) * 0.5);
                proj.alpha = 255;
                proj.netUpdate = true;
            }
            proj.rotation *= 0.9;
        } else {
            if (Number(proj.alpha) > 0)
                proj.alpha = Math.max(0, Number(proj.alpha) - 12);
            this.FloatingAI(proj, player);
        }
        proj.frameCounter = Number(proj.frameCounter) + 1;
        if (Number(proj.frameCounter) >= 6) {
            proj.frameCounter = 0;
            proj.frame = (Number(proj.frame) + 1) % 16;
        }
    }

    CanDamage() {
        return false;
    }

    CanCutTiles() {
        return false;
    }

    OnTileCollide() {
        return false;
    }

    OnKill(proj) {
        FusionEntityData.ClearProjectile(proj);
    }
}
