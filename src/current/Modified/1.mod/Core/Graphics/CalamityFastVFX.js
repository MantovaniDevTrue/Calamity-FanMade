import { Terraria, Modules } from './../../TL/ModImports.js';

const { Vector2 } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaled = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';

let Draw = null;
let PixelTexture = null;
let PixelOrigin = null;

function Renderer() {
    if (Draw)
        return Draw;
    const batch = Terraria.Main.spriteBatch;
    Draw = batch && batch[DrawScaled] ? batch[DrawScaled] : null;
    return Draw;
}

function Pixel() {
    if (!PixelTexture) {
        PixelTexture = Terraria.GameContent.TextureAssets.MagicPixel?.Value || null;
        if (PixelTexture)
            PixelOrigin = Vector2.new(0, Math.max(1, Number(PixelTexture.Height)) * 0.5);
    }
    return PixelTexture;
}

function ScreenX() {
    return Number(Terraria.Main.screenPosition?.X) || 0;
}

function ScreenY() {
    return Number(Terraria.Main.screenPosition?.Y) || 0;
}

export class CalamityFastVFX {
    static DrawBeam(x1, y1, x2, y2, width, color) {
        const draw = Renderer();
        const texture = Pixel();
        if (!draw || !texture || !PixelOrigin)
            return false;

        const dx = Number(x2) - Number(x1);
        const dy = Number(y2) - Number(y1);
        const length = Math.sqrt(dx * dx + dy * dy);
        if (!(length > 0.01))
            return false;

        const textureWidth = Math.max(1, Number(texture.Width));
        const textureHeight = Math.max(1, Number(texture.Height));
        const scale = Vector2.new(length / textureWidth, Math.max(0.1, Number(width)) / textureHeight);
        const position = Vector2.new(Number(x1) - ScreenX(), Number(y1) - ScreenY());

        draw(
            texture,
            position,
            null,
            color,
            Math.atan2(dy, dx),
            PixelOrigin,
            scale,
            SpriteEffects.None,
            0
        );

        return true;
    }

    static DrawGlow(texture, x, y, origin, scale, color, rotation = 0) {
        const draw = Renderer();
        if (!draw || !texture || !origin)
            return false;

        const value = Math.max(0.001, Number(scale) || 0.001);
        draw(
            texture,
            Vector2.new(Number(x) - ScreenX(), Number(y) - ScreenY()),
            null,
            color,
            Number(rotation) || 0,
            origin,
            Vector2.new(value, value),
            SpriteEffects.None,
            0
        );

        return true;
    }
}
