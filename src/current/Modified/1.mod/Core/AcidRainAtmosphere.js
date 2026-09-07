import { Terraria, Modules } from './../TL/ModImports.js';
import { AcidRainTier1Runtime } from './AcidRainTier1Runtime.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';

const { Color, Rectangle } = Modules;

// Overlay leve da Acid Rain. No SpriteBatch do TLPro a cor precisa estar
// pre-multiplicada pelo alpha; sem isso o verde fica quase sólido no Android.
export class AcidRainAtmosphere {
    static Alpha = 0;
    static Pixel = null;
    static Rect = null;
    static Tint = null;
    static Width = -1;
    static Height = -1;

    static EnsureResources() {
        if (!this.Pixel) {
            try { this.Pixel = Terraria.GameContent.TextureAssets.MagicPixel.Value; }
            catch (_) { this.Pixel = null; }
        }
        if (!this.Rect)
            this.Rect = Rectangle.new(0, 0, 1, 1);
        if (!this.Tint)
            this.Tint = Color.new(0, 0, 0, 0);
    }

    static ShouldTint() {
        if (AcidRainTier1Runtime.Active !== true || Terraria.Main.gameMenu)
            return false;
        let player = null;
        try { player = Terraria.Main.LocalPlayer; } catch (_) { }
        if (!player || player.active !== true || player.dead === true)
            return false;
        try { return SulphurousSeaPreviewRuntime.ContainsPlayerVisual(player) === true; }
        catch (_) { return false; }
    }

    static Draw() {
        const active = this.ShouldTint();
        const tick = Math.max(0, Math.floor(Number(Terraria.Main.GameUpdateCount) || 0));
        const pulse = active ? (2 + Math.sin(tick * 0.025) * 2) : 0;
        const target = active ? 18 + pulse : 0;
        this.Alpha += (target - this.Alpha) * (active ? 0.10 : 0.14);
        if (Math.abs(target - this.Alpha) < 0.15)
            this.Alpha = target;
        if (this.Alpha < 0.5)
            return;

        this.EnsureResources();
        if (!this.Pixel || !this.Rect || !this.Tint)
            return;

        const w = Math.max(1, Math.floor(Number(Terraria.Main.screenWidth) || 1));
        const h = Math.max(1, Math.floor(Number(Terraria.Main.screenHeight) || 1));
        if (w !== this.Width || h !== this.Height) {
            this.Width = w;
            this.Height = h;
            this.Rect.X = 0;
            this.Rect.Y = 0;
            this.Rect.Width = w;
            this.Rect.Height = h;
        }

        const a = Math.max(0, Math.min(28, Math.floor(this.Alpha)));
        // AlphaBlend do XNA/TLPro usa cor pre-multiplicada. Mantemos um único Color
        // reutilizável por frame para não criar lixo no GC durante o evento.
        this.Tint.R = Math.floor(72 * a / 255);
        this.Tint.G = Math.floor(108 * a / 255);
        this.Tint.B = Math.floor(58 * a / 255);
        this.Tint.A = a;

        try {
            Terraria.Main.spriteBatch['void Draw(Texture2D texture, Rectangle destinationRectangle, Color color)'](
                this.Pixel, this.Rect, this.Tint
            );
        } catch (_) { }
    }

    static Clear() {
        this.Alpha = 0;
        if (this.Tint) {
            this.Tint.R = 0;
            this.Tint.G = 0;
            this.Tint.B = 0;
            this.Tint.A = 0;
        }
    }
}
