import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { MarkRogueProjectile, IsStealthStrike } from './../../../Core/RogueRuntime.js';
import { NPCCenter, NPCIndex, IsValidTarget, RegisterAttachedClam } from './../../../Core/SeaKingArsenalRuntime.js';

const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
class SnapClamBase extends ModProjectile {
    constructor(stealth = false) {
        super();
        this.StealthVariant = stealth;
        this.Texture = 'Projectiles/Rogue/SnapClamProj';
    }

    SetStaticDefaults() {
        Terraria.Main.projFrames[this.Type] = 2;
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 20;
        p.height = 13;
        p.friendly = true;
        p.hostile = false;
        p.ignoreWater = true;
        p.penetrate = -1;
        p.timeLeft = this.StealthVariant ? 360 : 240;
        p.tileCollide = true;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 10;
    }

    OnSpawn(p) {
        const state = FusionEntityData.GetProjectileBag(p, 'snapClam', () => ({
            attached: false, target: -1, ox: 0, oy: 0, timer: 0, reduced: false
        }));
        state.attached = false;
        state.target = -1;
        state.timer = 0;
        state.reduced = false;
        MarkRogueProjectile(p, 'SnapClam', false);
    }

    AI(p) {
        MarkRogueProjectile(p, 'SnapClam', false);
        const state = FusionEntityData.GetProjectileBag(p, 'snapClam', () => ({
            attached: false, target: -1, ox: 0, oy: 0, timer: 0, reduced: false
        }));
        state.timer = Number(state.timer || 0) + 1;
        if (state.attached) {
            const index = Math.floor(Number(state.target));
            const npc = index >= 0 && index < 200 ? Terraria.Main.npc[index] : null;
            if (!IsValidTarget(npc, p)) {
                p.Kill();
                return;
            }
            const center = NPCCenter(npc);
            if (!center) {
                p.Kill();
                return;
            }
            p.velocity = Vector2.Zero;
            p.tileCollide = false;
            p.friendly = false;
            p.Center = Vector2.new(Number(center.X) + Number(state.ox || 0), Number(center.Y) + Number(state.oy || 0));
            p.rotation = Number(npc.rotation || 0) + Number(state.rotation || 0);
            p.frame = 0;
            RegisterAttachedClam(p, index, this.StealthVariant || IsStealthStrike(p) ? 1 : 2);
            return;
        }
        if (state.timer < 30)
            p.frame = 1;
        else
            p.frame = 0;
        if (state.timer >= 30 && !state.reduced) {
            p.damage = Math.max(1, Math.floor(Number(p.damage) * 0.8));
            state.reduced = true;
        }
        p.velocity = Vector2.new(Number(p.velocity.X) * 0.99, Number(p.velocity.Y) + 0.15);
        p.rotation = Number(p.rotation) + 0.4 * (Number(p.direction) || 1);
        p.spriteDirection = Number(p.direction) || 1;
    }

    OnHitNPC(p, npc) {
        const state = FusionEntityData.GetProjectileBag(p, 'snapClam', () => ({
            attached: false, target: -1, ox: 0, oy: 0, timer: 0, reduced: false
        }));
        if (state.attached || !IsValidTarget(npc, p))
            return;
        const index = NPCIndex(npc);
        const center = NPCCenter(npc);
        if (index < 0 || !center)
            return;
        state.attached = true;
        state.target = index;
        state.ox = Math.max(-18, Math.min(18, Number(p.Center.X) - Number(center.X)));
        state.oy = Math.max(-18, Math.min(18, Number(p.Center.Y) - Number(center.Y)));
        state.rotation = Number(p.rotation) - Number(npc.rotation || 0);
        p.velocity = Vector2.Zero;
        p.tileCollide = false;
        p.friendly = false;
        p.netUpdate = true;
        const buff = Number(ModBuff.getTypeByName('SnapClamDebuff') || 0);
        if (buff > 0)
            try {
                npc.AddBuff(buff, this.StealthVariant ? 360 : 240, false);
            } catch (e) { }
    }

    CanDamage(p) {
        const state = FusionEntityData.PeekProjectileBag(p, 'snapClam');
        return !(state && state.attached);
    }

    OnKill(p) {
        try {
            Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2, p.Center, 10, 0);
        } catch (e) { }
        for (let i = 0; i < 12; i++) {
            try {
                const d = NewDust(p.position, p.width, p.height, 14, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0, Color.new(115, 124, 124, 255), 1);
                const dust = Terraria.Main.dust[d];
                if (dust)
                    dust.noGravity = true;
            } catch (e) { }
        }
    }
}

export class SnapClamProj extends SnapClamBase {
    constructor() {
        super(false);
    }
}

export class SnapClamStealth extends SnapClamBase {
    constructor() {
        super(true);
    }
}
