import { Terraria, Modules } from './../TL/ModImports.js';
import { ModTexture } from './../TL/ModTexture.js';
import { ModProjectile } from './../TL/ModProjectile.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaledTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const MAX_PROJECTILES = 1000;
const ARC_TRAIL_LENGTH = 90;
const HEAL_TRAIL_LENGTH = 20;
const States = new Array(MAX_PROJECTILES);
let CircleTexture = null;
let CircleOrigin = null;
let CachedArcZapType = 0;
let CachedHealOrbType = 0;
let LoggedSuccessfulDraw = false;
let LoggedDrawFailure = false;
let ActiveCount = 0;

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function Slot(projectile) {
    const value = Math.floor(Number(projectile && projectile.whoAmI));
    return value >= 0 && value < MAX_PROJECTILES ? value : -1;
}

function MaxTrail(mode) {
    return mode === 'arc' ? ARC_TRAIL_LENGTH : HEAL_TRAIL_LENGTH;
}

function CreateState(projectile, mode) {
    return {
        identity: Math.floor(Number(projectile && projectile.identity)),
        mode: mode === 'heal' ? 'heal' : 'arc',
        trail: []
    };
}

function State(projectile, mode, create = true) {
    const slot = Slot(projectile);
    if (slot < 0)
        return null;
    const identity = Math.floor(Number(projectile.identity));
    const normalizedMode = mode === 'heal' ? 'heal' : 'arc';
    let state = States[slot];
    if (!state || state.identity !== identity || state.mode !== normalizedMode) {
        if (!create)
            return null;
        if (!state)
            ActiveCount++;
        state = CreateState(projectile, normalizedMode);
        States[slot] = state;
    }
    return state;
}

function EnsureTexture() {
    if (CircleTexture)
        return CircleTexture;
    const texture = new ModTexture('Textures/ExtraTextures/SmallGreyscaleCircle');
    if (!texture?.exists || !texture.asset?.Value)
        return null;
    CircleTexture = texture.asset.Value;
    CircleOrigin = Vector2.new(Number(CircleTexture.Width) * 0.5, Number(CircleTexture.Height) * 0.5);
    return CircleTexture;
}

function ResolveTypes() {
    if (!(CachedArcZapType > 0))
        CachedArcZapType = Number(ModProjectile.getTypeByName('ArcZap') || 0);
    if (!(CachedHealOrbType > 0))
        CachedHealOrbType = Number(ModProjectile.getTypeByName('GladiatorHealOrb') || 0);
}

function ModeForType(type) {
    const numericType = Number(type);
    if (CachedArcZapType > 0 && numericType === CachedArcZapType)
        return 'arc';
    if (CachedHealOrbType > 0 && numericType === CachedHealOrbType)
        return 'heal';
    return null;
}

function MakeColor(first, second, amount, intensity, alpha) {
    const t = Clamp(amount, 0, 1);
    const strength = Clamp(intensity, 0, 1.5);
    return Color.new(
        Math.floor((first[0] + (second[0] - first[0]) * t) * strength),
        Math.floor((first[1] + (second[1] - first[1]) * t) * strength),
        Math.floor((first[2] + (second[2] - first[2]) * t) * strength),
        Math.max(1, Math.min(255, Math.floor(alpha)))
    );
}

function DrawCircle(draw, texture, x, y, color, scale) {
    draw(
        texture,
        Vector2.new(Number(x), Number(y)),
        null,
        color,
        0,
        CircleOrigin,
        Vector2.new(Number(scale), Number(scale)),
        SpriteEffects.None,
        0
    );
}

function DrawProjectileTrail(draw, texture, projectile, state, mode) {
    const points = state && Array.isArray(state.trail) && state.trail.length > 0
        ? state.trail
        : [{ X: Number(projectile.position.X), Y: Number(projectile.position.Y) }];
    const wanted = MaxTrail(mode);
    const screenX = Number(Terraria.Main.screenPosition.X);
    const screenY = Number(Terraria.Main.screenPosition.Y);
    const time = Number(projectile.timeLeft) || 0;
    const globalTime = Number(Terraria.Main.GlobalTimeWrappedHourly) || 0;
    let draws = 0;

    if (mode === 'arc' && time <= 15)
        return draws;

    for (let i = 0; i < points.length && i < wanted; i++) {
        const old = points[i];
        if (!old)
            continue;
        const oldX = Number(old.X);
        const oldY = Number(old.Y);
        if (!Number.isFinite(oldX) || !Number.isFinite(oldY))
            continue;

        const interpolation = mode === 'arc'
            ? Math.cos(time / 13 + i / Math.max(1, points.length) * Math.PI) * 0.5 + 0.5
            : Math.cos(time / 32 + globalTime / 20 + i / Math.max(1, points.length) * Math.PI) * 0.5 + 0.5;
        let intensity = 0.9 + 0.15 * Math.cos((globalTime % 60) * Math.PI * 2);
        intensity *= 0.15 + 0.85 * (1 - i / Math.max(1, points.length));
        if (mode === 'heal' && time <= 60)
            intensity *= time / 60;

        // Official SmallGreyscaleCircle is 72x72. The original C# adds half of
        // the texture and then (-32.5, -32.5), centering it on the small hitbox.
        const drawX = oldX + Number(texture.Width) * 0.5 - screenX - 32.5;
        const drawY = oldY + Number(texture.Height) * 0.5 - screenY + Number(projectile.gfxOffY || 0) - 32.5;
        const first = mode === 'arc' ? [0, 255, 255] : [32, 178, 170];
        const second = mode === 'arc' ? [173, 216, 230] : [50, 205, 50];
        // GladiatorHealOrb stores its compatibility scale at one quarter of the
        // official Projectile.scale so the native fallback circle has the same
        // size as the official custom draw. Restore the official scale here.
        const projectileScale = mode === 'arc' ? 1 : Number(projectile.scale || 0.25) * 4;
        const outerScale = projectileScale * intensity * (mode === 'arc' ? 0.15 : 0.25);
        const innerScale = outerScale * 0.7;
        const outerColor = MakeColor(first, second, interpolation, 0.4 * intensity, 145 * intensity);
        const innerColor = MakeColor(first, second, interpolation, 0.2 * intensity, 95 * intensity);

        DrawCircle(draw, texture, drawX, drawY, outerColor, outerScale);
        DrawCircle(draw, texture, drawX, drawY, innerColor, innerScale);
        draws += 2;

        if (mode === 'arc') {
            // Exact direction used by the official SafeNormalize(drawPosition)
            // orbit points, with one dot on each side of the main circle.
            const length = Math.sqrt(drawX * drawX + drawY * drawY) || 1;
            const orbitX = drawX / length * 10;
            const orbitY = drawY / length * 10;
            DrawCircle(draw, texture, drawX - orbitX, drawY - orbitY, outerColor, intensity * 0.12);
            DrawCircle(draw, texture, drawX + orbitX, drawY + orbitY, outerColor, intensity * 0.12);
            draws += 2;
        }
    }
    return draws;
}

export class GraniteShrineProjectileVisualSystem {
    static LastError = '';
    static LastDrawCount = 0;

    static Begin(projectile, mode) {
        const slot = Slot(projectile);
        if (slot < 0)
            return;
        const existing = States[slot];
        if (!existing)
            ActiveCount++;
        States[slot] = CreateState(projectile, mode);
    }

    static Record(projectile, mode) {
        const state = State(projectile, mode, true);
        if (!state)
            return;
        const x = Number(projectile.position.X);
        const y = Number(projectile.position.Y);
        if (!Number.isFinite(x) || !Number.isFinite(y))
            return;
        const last = state.trail[0];
        if (!last || Math.abs(Number(last.X) - x) > 0.01 || Math.abs(Number(last.Y) - y) > 0.01)
            state.trail.unshift({ X: x, Y: y });
        const maximum = MaxTrail(state.mode);
        if (state.trail.length > maximum)
            state.trail.length = maximum;
    }

    static End(projectile) {
        const slot = Slot(projectile);
        if (slot >= 0 && States[slot]) {
            States[slot] = null;
            ActiveCount = Math.max(0, ActiveCount - 1);
        }
    }

    static DrawWorld() {
        this.LastDrawCount = 0;
        if (ActiveCount <= 0 || Terraria.Main.gameMenu || Terraria.Main.mapFullscreen)
            return 0;

        ResolveTypes();
        const texture = EnsureTexture();
        const spriteBatch = Terraria.Main.spriteBatch;
        const draw = spriteBatch && spriteBatch[DrawScaledTexture];
        if (!texture || !draw) {
            this.LastError = !texture
                ? 'SmallGreyscaleCircle unavailable'
                : 'SpriteBatch Vector2-scale Draw overload unavailable';
            if (!LoggedDrawFailure) {
                LoggedDrawFailure = true;
                try { tl.log(`[CalamityPort GraniteProjectileVisual] ${this.LastError}. Native projectile fallbacks remain enabled.`); } catch (e) { }
            }
            return 0;
        }

        try {
            let draws = 0;
            for (let i = 0; i < MAX_PROJECTILES; i++) {
                const projectile = Terraria.Main.projectile[i];
                if (!projectile || !projectile.active)
                    continue;
                const mode = ModeForType(projectile.type);
                if (!mode)
                    continue;
                const state = State(projectile, mode, false);
                draws += DrawProjectileTrail(draw, texture, projectile, state, mode);
            }
            this.LastDrawCount = draws;
            this.LastError = '';
            if (draws > 0 && !LoggedSuccessfulDraw) {
                LoggedSuccessfulDraw = true;
                try { tl.log(`[CalamityPort GraniteProjectileVisual] global renderer active; drawCalls=${draws}.`); } catch (e) { }
            }
            return draws;
        } catch (e) {
            this.LastError = String(e && e.message ? e.message : e);
            if (!LoggedDrawFailure) {
                LoggedDrawFailure = true;
                try { tl.log(`[CalamityPort GraniteProjectileVisual] global renderer failed: ${this.LastError}. Native projectile fallbacks remain enabled.`); } catch (ignored) { }
            }
            return 0;
        }
    }

    static Clear() {
        for (let i = 0; i < States.length; i++)
            States[i] = null;
        this.LastError = '';
        this.LastDrawCount = 0;
        LoggedSuccessfulDraw = false;
        LoggedDrawFailure = false;
        ActiveCount = 0;
    }
}
