import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FindTarget } from './../../../Core/PerforatorRewardRuntime.js';
const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }

export class Herring extends ModProjectile {
    constructor() { super(); this.Texture = 'Projectiles/Summon/Herring'; }
    SetStaticDefaults() {
        try { Terraria.Main.projFrames[this.Type] = 8; } catch (_) { }
        try { Terraria.Main.projPet[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type] = true; } catch (_) { }
        try { Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type] = true; } catch (_) { }
    }
    SetDefaults() {
        const p = this.Projectile;
        p.width = 42; p.height = 14; p.friendly = true; p.hostile = false; p.minion = true; p.minionSlots = 1;
        p.penetrate = -1; p.timeLeft = 18000; p.tileCollide = false; p.ignoreWater = true; p.aiStyle = -1;
        p.netImportant = true; p.usesIDStaticNPCImmunity = true; p.idStaticNPCHitCooldown = 10;
    }
    CheckActive(p, pl) {
        if (!pl || !pl.active || pl.dead) { try { p.Kill(); } catch (_) { p.active = false; } return false; }
        const b = Number(ModBuff.getTypeByName('HerringBuff') || 0);
        let active = false;
        try { active = b > 0 && pl.FindBuffIndex(b) >= 0; } catch (_) { }
        if (!active) { try { p.Kill(); } catch (_) { p.active = false; } return false; }
        p.timeLeft = 2; return true;
    }
    AI(p) {
        let pl = null;
        const owner = Math.floor(N(p.owner, -1));
        try { if (owner === Math.floor(N(Terraria.Main.myPlayer, -2))) pl = Terraria.Main.LocalPlayer; } catch (_) { }
        if (!pl && owner >= 0 && owner < 255) try { pl = Terraria.Main.player.get_Item(owner); } catch (_) { }
        if (!this.CheckActive(p, pl)) return;
        const target = FindTarget(p.Center, 1200, p);
        const pc = Terraria.PlayerCenter(pl);
        let tx, ty, speed, inertia;
        if (target) {
            tx = N(target.Center.X); ty = N(target.Center.Y); speed = 24; inertia = 12;
        } else {
            const index = Math.max(0, N(p.whoAmI));
            const phase = (index % 3) * (Math.PI * 2 / 3) + N(Terraria.Main.GameUpdateCount) * 0.025;
            tx = N(pc.X) + Math.cos(phase) * 65; ty = N(pc.Y) - 45 + Math.sin(phase) * 24; speed = 9; inertia = 22;
        }
        let dx = tx - N(p.Center.X), dy = ty - N(p.Center.Y), d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1200) { p.Center = pc; p.velocity = Vector2.Zero; }
        else if (d > 0.001) {
            const vx=(N(p.velocity.X)*(inertia-1)+dx/d*speed)/inertia;
            const vy=(N(p.velocity.Y)*(inertia-1)+dy/d*speed)/inertia;
            p.velocity=Vector2.new(vx,vy);
        }
        p.spriteDirection = N(p.velocity.X) >= 0 ? 1 : -1;
        p.rotation = Math.atan2(N(p.velocity.Y), N(p.velocity.X)) + (p.spriteDirection < 0 ? Math.PI : 0);
        p.frameCounter = N(p.frameCounter) + 1;
        p.frame = Math.floor(N(p.frameCounter) / 8) % 8;
    }
    MinionContactDamage() { return true; }
}
