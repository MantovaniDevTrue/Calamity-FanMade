import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModTexture } from './../../TL/ModTexture.js';
import { Vector2 } from './../../TL/Modules/Vector2.js';

const { Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaledTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
let CircleTexture = null;
let Origin = null;
let Position = null;
let Scale = null;

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function NativeAt(collection, index) {
    if (!collection)
        return null;
    try {
        const direct = collection[index];
        if (direct != null)
            return direct;
    } catch (e) { }
    try {
        if (typeof collection.get_Item === 'function')
            return collection.get_Item(index);
    } catch (e) { }
    try {
        const getter = collection['Vector2 get_Item(int index)'];
        if (typeof getter === 'function')
            return getter(index);
    } catch (e) { }
    return null;
}

function EnsureTexture() {
    if (CircleTexture)
        return CircleTexture;
    const texture = new ModTexture('Textures/ExtraTextures/SmallGreyscaleCircle');
    if (!texture?.exists || !texture.asset?.Value)
        return null;
    CircleTexture = texture.asset.Value;
    Origin = Vector2.new(Number(CircleTexture.Width) * 0.5, Number(CircleTexture.Height) * 0.5);
    Position = Vector2.new(0, 0);
    Scale = Vector2.new(1, 1);
    return CircleTexture;
}

function MakeColor(a, b, amount, intensity, alpha) {
    const t = Clamp(amount, 0, 1);
    const strength = Clamp(intensity, 0, 1.5);
    return Color.new(
        Math.floor((Number(a[0]) + (Number(b[0]) - Number(a[0])) * t) * strength),
        Math.floor((Number(a[1]) + (Number(b[1]) - Number(a[1])) * t) * strength),
        Math.floor((Number(a[2]) + (Number(b[2]) - Number(a[2])) * t) * strength),
        Math.max(1, Math.min(255, Math.floor(Number(alpha))))
    );
}

function DrawCircle(texture, x, y, color, scale) {
    const spriteBatch = Terraria.Main.spriteBatch;
    const draw = spriteBatch && spriteBatch[DrawScaledTexture];
    if (!draw)
        return false;
    Position.X = Number(x);
    Position.Y = Number(y);
    Scale.X = Number(scale);
    Scale.Y = Number(scale);
    // Call through the native SpriteBatch instance. Detached native delegates can
    // silently fail on some TLPro Android builds.
    spriteBatch[DrawScaledTexture](texture, Position, null, color, 0, Origin, Scale, SpriteEffects.None, 0);
    return true;
}

function ReadNativeHistory(projectile, wanted) {
    const result = [];
    const oldPositions = projectile && projectile.oldPos;
    if (!oldPositions)
        return result;
    let available = Number(oldPositions.Length || oldPositions.length || 0);
    if (!(available > 0))
        available = wanted;
    const count = Math.min(wanted, Math.max(0, Math.floor(available)));
    const currentX = Number(projectile.position.X);
    const currentY = Number(projectile.position.Y);
    const awayFromOrigin = Math.abs(currentX) + Math.abs(currentY) > 64;
    for (let i = 0; i < count; i++) {
        const old = NativeAt(oldPositions, i);
        if (!old)
            continue;
        const x = Number(old.X);
        const y = Number(old.Y);
        if (!Number.isFinite(x) || !Number.isFinite(y))
            continue;
        // Uninitialized native trail slots are Vector2.Zero. Do not let a full
        // zero-filled buffer suppress the compatibility history.
        if (awayFromOrigin && Math.abs(x) < 0.001 && Math.abs(y) < 0.001)
            continue;
        result.push({ X: x, Y: y });
    }
    return result;
}

function ReadCompatHistory(history, wanted) {
    if (!Array.isArray(history))
        return [];
    const result = [];
    const count = Math.min(wanted, history.length);
    for (let i = 0; i < count; i++) {
        const old = history[i];
        if (!old)
            continue;
        const x = Number(old.X);
        const y = Number(old.Y);
        if (Number.isFinite(x) && Number.isFinite(y))
            result.push({ X: x, Y: y });
    }
    return result;
}

export function DrawGraniteLightTrail(projectile, mode, compatHistory = null) {
    try {
        const texture = EnsureTexture();
        if (!texture || !Terraria.Main.spriteBatch?.[DrawScaledTexture])
            return false;

        const wanted = mode === 'arc' ? 90 : 20;
        let points = ReadNativeHistory(projectile, wanted);
        // Native Vector2[] indexing is inconsistent on this TLPro build. Keep the
        // official native trail when available, otherwise use the JS history fed by
        // ArcZap and finally the current projectile position.
        if (points.length < 2)
            points = ReadCompatHistory(compatHistory, wanted);
        if (points.length === 0)
            points.push({ X: Number(projectile.position.X), Y: Number(projectile.position.Y) });

        const screenX = Number(Terraria.Main.screenPosition.X);
        const screenY = Number(Terraria.Main.screenPosition.Y);
        const time = Number(projectile.timeLeft) || 0;
        const globalTime = Number(Terraria.Main.GlobalTimeWrappedHourly) || 0;
        const first = mode === 'arc' ? [0, 255, 255] : [32, 178, 170];
        const second = mode === 'arc' ? [173, 216, 230] : [50, 205, 50];
        let draws = 0;

        for (let i = 0; i < points.length; i++) {
            const old = points[i];
            const interpolation = Math.cos((mode === 'arc' ? time / 13 : time / 32 + globalTime / 20) + i / Math.max(1, points.length) * Math.PI) * 0.5 + 0.5;
            let intensity = 0.9 + 0.15 * Math.cos((globalTime % 60) * Math.PI * 2);
            intensity *= 0.15 + 0.85 * (1 - i / Math.max(1, points.length));
            if (mode !== 'arc' && time <= 60)
                intensity *= time / 60;
            if (mode === 'arc' && time <= 15)
                continue;

            const x = Number(old.X) + Number(projectile.width) * 0.5 - screenX;
            const y = Number(old.Y) + Number(projectile.height) * 0.5 - screenY + Number(projectile.gfxOffY || 0);
            const projectileScale = mode === 'arc' ? 1 : Number(projectile.scale || 1);
            const outer = projectileScale * intensity * (mode === 'arc' ? 0.15 : 0.25);
            const inner = outer * 0.7;

            // The PC code uses A=0 for an additive-looking result. TLPro mobile's
            // SpriteBatch path discards those pixels, so retain the official cyan /
            // light-blue colors with a small real alpha instead.
            const outerColor = MakeColor(first, second, interpolation, 0.72 * intensity, 150 * intensity);
            const innerColor = MakeColor(first, second, interpolation, 0.55 * intensity, 105 * intensity);
            if (DrawCircle(texture, x, y, outerColor, outer)) draws++;
            if (DrawCircle(texture, x, y, innerColor, inner)) draws++;

            if (mode === 'arc') {
                const vx = Number(projectile.velocity.X);
                const vy = Number(projectile.velocity.Y);
                const length = Math.sqrt(vx * vx + vy * vy) || 1;
                const ox = -vy / length * 10;
                const oy = vx / length * 10;
                if (DrawCircle(texture, x + ox, y + oy, outerColor, inner * 0.8)) draws++;
                if (DrawCircle(texture, x - ox, y - oy, outerColor, inner * 0.8)) draws++;
            }
        }
        return draws > 0;
    } catch (e) {
        return false;
    }
}
