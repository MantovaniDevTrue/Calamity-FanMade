import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModTexture } from './../../TL/ModTexture.js';
import { CalamityFastVFX } from './CalamityFastVFX.js';

const { Color, Vector2 } = Modules;

let GlowTexture = null;
let GlowOrigin = null;
let GlowTextureChecked = false;
let TempTint = null;
let AdrenalineTeal = null;
let AdrenalinePale = null;

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function Tint(color, amount) {
    const alpha = Clamp(Number(amount), 0, 1);
    if (!TempTint)
        TempTint = Color.new(255, 255, 255, 255);
    try {
        TempTint.R = Number(color.R) || 0;
        TempTint.G = Number(color.G) || 0;
        TempTint.B = Number(color.B) || 0;
        TempTint.A = Math.max(0, Math.min(255, Math.floor((Number(color.A) || 255) * alpha)));
        return TempTint;
    } catch (_) {
        return color;
    }
}

function EnsureGlowTexture() {
    if (GlowTexture)
        return GlowTexture;
    if (GlowTextureChecked)
        return null;
    GlowTextureChecked = true;
    try {
        const texture = new ModTexture('Textures/ExtraTextures/SmallGreyscaleCircle');
        if (!texture?.exists || !texture.asset?.Value)
            return null;
        GlowTexture = texture.asset.Value;
        GlowOrigin = Vector2.new(Number(GlowTexture.Width) * 0.5, Number(GlowTexture.Height) * 0.5);
        return GlowTexture;
    } catch (e) {
        return null;
    }
}

export class RipperFastVFX {
    static DrawnLastFrame = 0;
    static CachedState = null;

    static DrawRing(cx, cy, radius, segments, width, color, angleOffset = 0) {
        const count = Math.max(3, Math.floor(Number(segments)));
        let draws = 0;
        let previousX = Number(cx) + Math.cos(Number(angleOffset)) * Number(radius);
        let previousY = Number(cy) + Math.sin(Number(angleOffset)) * Number(radius);
        for (let i = 1; i <= count; i++) {
            const angle = Number(angleOffset) + Math.PI * 2 * i / count;
            const nextX = Number(cx) + Math.cos(angle) * Number(radius);
            const nextY = Number(cy) + Math.sin(angle) * Number(radius);
            if (CalamityFastVFX.DrawBeam(previousX, previousY, nextX, nextY, width, color))
                draws++;
            previousX = nextX;
            previousY = nextY;
        }
        return draws;
    }

    static DrawGlow(center, scale, color, rotation = 0) {
        const texture = EnsureGlowTexture();
        if (!texture || !GlowOrigin)
            return 0;
        return CalamityFastVFX.DrawGlow(texture, center.X, center.Y, GlowOrigin, scale, color, rotation) ? 1 : 0;
    }

    static DrawAdrenalineSigil(center, scale, width, color) {
        const s = Number(scale);
        const cx = Number(center.X), cy = Number(center.Y);
        const x0 = cx, y0 = cy - 120 * s;
        const x1 = cx - 48 * s, y1 = cy + 24 * s;
        const x2 = cx + 48 * s, y2 = cy - 24 * s;
        const x3 = cx, y3 = cy + 120 * s;
        let draws = 0;
        if (CalamityFastVFX.DrawBeam(x0, y0, x1, y1, width, color)) draws++;
        if (CalamityFastVFX.DrawBeam(x1, y1, x2, y2, width, color)) draws++;
        if (CalamityFastVFX.DrawBeam(x2, y2, x3, y3, width, color)) draws++;
        return draws;
    }

    static DrawRage(center, timer) {
        const t = Math.max(0, Number(timer) || 0);
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.15);
        const red = Color.Red;
        let draws = 0;

        draws += this.DrawGlow(center, 0.72 + pulse * 0.055, Tint(red, 0.16 + pulse * 0.07));
        draws += this.DrawGlow(center, 1.02 + pulse * 0.075, Tint(red, 0.065 + pulse * 0.035), t * 0.006);

        const pulsePhase = t % 30;
        if (t > 14 && pulsePhase < 7) {
            const progress = pulsePhase / 7;
            const radius = 24 + progress * 24;
            const opacity = (1 - progress) * 0.32;
            draws += this.DrawRing(center.X, center.Y, radius, 12, 1.6 + (1 - progress) * 0.7, Tint(red, opacity), t * 0.015);
        }

        if (t > 0 && t <= 14) {
            const progress = t / 14;
            const radius = 26 + progress * 48;
            draws += this.DrawRing(center.X, center.Y, radius, 12, 2.9 - progress * 1.1, Tint(red, 0.48 * (1 - progress)), -t * 0.03);
        }
        return draws;
    }

    static DrawAdrenaline(center, timer) {
        const t = Math.max(0, Number(timer) || 0);
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.19);
        if (!AdrenalineTeal) AdrenalineTeal = Color.new(100, 255, 210, 255);
        if (!AdrenalinePale) AdrenalinePale = Color.new(205, 255, 238, 255);
        const teal = AdrenalineTeal;
        const pale = AdrenalinePale;
        let draws = 0;

        draws += this.DrawGlow(center, 0.76 + pulse * 0.045, Tint(teal, 0.13 + pulse * 0.06));
        draws += this.DrawGlow(center, 1.07 + pulse * 0.065, Tint(teal, 0.055 + pulse * 0.03), -t * 0.005);

        const sigilHold = 18;
        const sigilDuration = 120;
        if (t > 0 && t <= sigilDuration) {
            const fade = t <= sigilHold ? 1 : 1 - (t - sigilHold) / (sigilDuration - sigilHold);
            const progress = Math.min(1, t / sigilDuration);
            const sigilScale = 0.44 + progress * 0.025;
            draws += this.DrawAdrenalineSigil(center, sigilScale, 4.2, Tint(teal, 0.34 * fade));
            draws += this.DrawAdrenalineSigil(center, sigilScale, 1.35, Tint(pale, 0.72 * fade));
        }

        const phase = t % 30;
        if (t > sigilDuration && phase < 7) {
            const progress = phase / 7;
            const radius = 25 + progress * 22;
            draws += this.DrawRing(center.X, center.Y, radius, 12, 1.45 + (1 - progress) * 0.65, Tint(teal, 0.28 * (1 - progress)), -t * 0.012);
        }
        return draws;
    }

    static DrawWorld() {
        this.DrawnLastFrame = 0;
        if (Terraria.Main.gameMenu || Terraria.Main.mapFullscreen || Terraria.Main.gamePaused)
            return 0;

        const state = this.CachedState || (this.CachedState = ModPlayer.getByName('CalamityPlayerState'));
        if (!state || (state.RageModeActive !== true && state.AdrenalineModeActive !== true))
            return 0;

        const player = Terraria.Main.LocalPlayer;
        if (!player || !player.active || player.dead)
            return 0;

        const center = Terraria.PlayerCenter(player);
        if (state.RageModeActive === true)
            this.DrawnLastFrame += this.DrawRage(center, state.RageVisualTimer);
        if (state.AdrenalineModeActive === true)
            this.DrawnLastFrame += this.DrawAdrenaline(center, state.AdrenalineVisualTimer);
        return this.DrawnLastFrame;
    }

    static Clear() {
        this.DrawnLastFrame = 0;
        this.CachedState = null;
        GlowTexture = null;
        GlowOrigin = null;
        GlowTextureChecked = false;
        TempTint = null;
        AdrenalineTeal = null;
        AdrenalinePale = null;
    }
}
