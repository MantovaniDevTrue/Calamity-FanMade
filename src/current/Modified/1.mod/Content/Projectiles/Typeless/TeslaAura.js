import { Terraria } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModBuff } from './../../../TL/ModBuff.js';

let AccessoryRuntime = null;
let StaticDischargeType = 0;
let GalvanicCorrosionType = 0;

function Accessory() {
    if (!AccessoryRuntime) AccessoryRuntime = ModPlayer.getByName('AerialiteAccessoryPlayer');
    return AccessoryRuntime;
}
function StaticType() {
    if (!(StaticDischargeType > 0)) StaticDischargeType = Number(ModBuff.getTypeByName('StaticDischarge') || 0);
    return StaticDischargeType;
}
function GalvanicType() {
    if (!(GalvanicCorrosionType > 0)) GalvanicCorrosionType = Number(ModBuff.getTypeByName('GalvanicCorrosion') || 0);
    return GalvanicCorrosionType;
}
function Owner(p) {
    const i = Math.floor(Number(p?.owner));
    if (!(i >= 0 && i < 255)) return null;
    try {
        if (i === Math.floor(Number(Terraria.Main.myPlayer)) && Terraria.Main.LocalPlayer) return Terraria.Main.LocalPlayer;
    } catch (_) { }
    try { return Terraria.Main.player.get_Item(i); } catch (_) { try { return Terraria.Main.player[i]; } catch (__){ return null; } }
}

export class TeslaAura extends ModProjectile {
    constructor() {
        super();
        // Phase 13.13.0.1 repacks the exact official 3x6 frames into a vertical
        // 18-frame strip, letting Terraria's native projectile renderer draw it.
        this.Texture = 'Projectiles/Typeless/TeslaAura';
    }

    SetStaticDefaults() {
        try { Terraria.Main.projFrames[this.Type] = 18; } catch (_) { }
    }

    SetDefaults() {
        const p = this.Projectile;
        p.width = 218;
        p.height = 218;
        p.ignoreWater = true;
        p.timeLeft = 90000; // official 18000 * 5 lifetime; no per-tick refresh required
        p.tileCollide = false;
        p.friendly = true;
        p.hostile = false;
        p.penetrate = -1;
        p.usesLocalNPCImmunity = true;
        p.localNPCHitCooldown = 25;
    }

    AI(p) {
        const owner = Owner(p);
        const runtime = Accessory();
        if (!owner || !runtime || !runtime.IsTeslaEquipped(owner)) {
            try { p.Kill(); } catch (_) { p.active = false; }
            return;
        }

        // Exact 18-frame sequence from the official 3x6 atlas: row 0..5,
        // then the next column. Native rendering removes the old SpriteBatch
        // reflection/custom-draw hotpath that caused Android stutter.
        p.frameCounter = (Math.floor(Number(p.frameCounter) || 0) + 1);
        if (Number(p.frameCounter) > 3) {
            p.frameCounter = 0;
            p.frame = (Math.floor(Number(p.frame) || 0) + 1) % 18;
        }

        // Native alpha reproduces the official 25% hidden-accessory opacity.
        try { p.alpha = runtime.IsTeslaVisible(owner) ? 0 : 191; } catch (_) { }
        try { p.Center = Terraria.PlayerCenter(owner); } catch (_) { }

        // One light update every four ticks is visually indistinguishable on mobile
        // and avoids four JS->native lighting calls out of five.
        const tick = Math.floor(Number(Terraria.Main.GameUpdateCount) || 0);
        if ((tick & 3) === 0) {
            try { Terraria.Lighting.AddLight(p.Center, .15, .15, .01); } catch (_) { }
        }
    }

    Colliding(p, myRect, targetRect) {
        // Keep the original 98px circular hitbox. The native rectangle broadphase
        // already rejects distant NPCs before this callback is needed.
        let cx = 0, cy = 0;
        try { cx = Number(p.Center.X); cy = Number(p.Center.Y); } catch (_) { return null; }
        const x = Math.max(Number(targetRect.X), Math.min(cx, Number(targetRect.X) + Number(targetRect.Width)));
        const y = Math.max(Number(targetRect.Y), Math.min(cy, Number(targetRect.Y) + Number(targetRect.Height)));
        const dx = cx - x, dy = cy - y;
        return dx * dx + dy * dy <= 98 * 98;
    }

    OnHitNPC(p, npc) {
        const a = StaticType(), g = GalvanicType();
        if (a > 0) try { npc.AddBuff(a, 90, false); } catch (_) { }
        if (g > 0) try { npc.AddBuff(g, 6, false); } catch (_) { }
    }

    OnHitPlayer(p, player) {
        const a = StaticType(), g = GalvanicType();
        if (a > 0) try { player.AddBuff(a, 90, true); } catch (_) { }
        if (g > 0) try { player.AddBuff(g, 6, true); } catch (_) { }
    }
}
