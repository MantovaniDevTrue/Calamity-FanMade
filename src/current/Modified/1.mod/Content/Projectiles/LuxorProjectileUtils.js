import { Terraria, Modules } from './../../TL/ModImports.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../Core/FrozenCubeTargetRuntime.js';

const { Color, Vector2 } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaled = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];

const DrawCache = new Map();
const UnitCircleCache = new Map();

function GetUnitCircle(count) {
    const c = Math.max(0, Math.floor(Number(count) || 0));
    if (UnitCircleCache.has(c))
        return UnitCircleCache.get(c);
    const offsets = [];
    for (let i = 0; i < c; i++) {
        const angle = Math.PI * 2 * i / Math.max(1, c);
        offsets.push([Math.cos(angle), Math.sin(angle)]);
    }
    UnitCircleCache.set(c, offsets);
    return offsets;
}

function GetProjectileDrawData(type) {
    const key = Math.floor(Number(type) || 0);
    const cached = DrawCache.get(key);
    if (cached && cached.texture)
        return cached;
    try {
        const texture = Terraria.GameContent.TextureAssets.Projectile[key]?.Value;
        if (!texture)
            return null;
        const data = {
            texture,
            origin: Vector2.new(Number(texture.Width) * 0.5, Number(texture.Height) * 0.5)
        };
        DrawCache.set(key, data);
        return data;
    } catch (e) {
        return null;
    }
}

export const LuxorClass = Object.freeze({
    Classless: 0,
    Melee: 1,
    Ranged: 2,
    Magic: 3,
    Summon: 4,
    Rogue: 5
});

const ClassData = [
    { color: Color.new(170, 170, 170), light: [0.22, 0.22, 0.22] },
    { color: Color.new(255, 75, 75), light: [0.35, 0.04, 0.04] },
    { color: Color.new(70, 235, 255), light: [0.04, 0.30, 0.35] },
    { color: Color.new(255, 205, 45), light: [0.35, 0.24, 0.03] },
    { color: Color.new(95, 255, 70), light: [0.08, 0.35, 0.05] },
    { color: Color.new(255, 65, 235), light: [0.35, 0.04, 0.30] }
];

export function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
}

export function Lerp(a, b, t) {
    return Number(a) + (Number(b) - Number(a)) * Clamp(t, 0, 1);
}

export function GetLerpValue(from, to, value, clamped = true) {
    const denominator = Number(to) - Number(from);
    let result = Math.abs(denominator) < 0.000001 ? 0 : (Number(value) - Number(from)) / denominator;
    if (clamped)
        result = Clamp(result, 0, 1);
    return result;
}

export function ClassColor(classType) {
    return ClassData[Math.max(0, Math.min(ClassData.length - 1, Math.floor(Number(classType) || 0)))].color;
}

export function AddClassLight(projectile, classType, multiplier = 1) {
    // Phase 12.74.10 mobile benchmark: dynamic projectile lighting disabled.
}

export function Length(x, y) {
    return Math.sqrt(Number(x) * Number(x) + Number(y) * Number(y));
}

export function DirectionVector(from, to, speed = 1, fallbackX = 1, fallbackY = 0) {
    const dx = Number(to.X) - Number(from.X);
    const dy = Number(to.Y) - Number(from.Y);
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!(length > 0.001))
        return Vector2.new(Number(fallbackX) * Number(speed), Number(fallbackY) * Number(speed));
    return Vector2.new(dx / length * Number(speed), dy / length * Number(speed));
}

export function RotateVector(vector, radians, scale = 1) {
    const x = Number(vector.X) || 0;
    const y = Number(vector.Y) || 0;
    const c = Math.cos(Number(radians) || 0);
    const s = Math.sin(Number(radians) || 0);
    return Vector2.new((x * c - y * s) * Number(scale), (x * s + y * c) * Number(scale));
}

export function SetVelocity(projectile, x, y) {
    projectile.velocity = Vector2.new(Number(x) || 0, Number(y) || 0);
}

export function CanChaseNPC(npc) {
    return !!(
        npc &&
        npc.active &&
        Number(npc.life) > 0 &&
        npc.friendly !== true &&
        npc.dontTakeDamage !== true &&
        Number(npc.damage) >= 0
    );
}

export function FindClosestNPC(projectile, maxDistance = 500) {
    let target = -1;
    let bestDistanceSq = Number(maxDistance) * Number(maxDistance);
    const cx = Number(projectile.Center.X);
    const cy = Number(projectile.Center.Y);
    ScanFrozenCubeNPCs(2);
    for (const i of FrozenCubeTrackedIndices()) {
        const npc = FrozenCubeNPC(i);
        if (!CanChaseNPC(npc))
            continue;
        const dx = Number(npc.Center.X) - cx;
        const dy = Number(npc.Center.Y) - cy;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < bestDistanceSq) {
            bestDistanceSq = distanceSq;
            target = i;
        }
    }
    return target;
}

export function HomeTowards(projectile, target, inertia = 12, speed = 12) {
    if (!CanChaseNPC(target))
        return false;
    const desired = DirectionVector(projectile.Center, target.Center, speed);
    const vx = (Number(projectile.velocity.X) * (Number(inertia) - 1) + Number(desired.X)) / Number(inertia);
    const vy = (Number(projectile.velocity.Y) * (Number(inertia) - 1) + Number(desired.Y)) / Number(inertia);
    SetVelocity(projectile, vx, vy);
    return true;
}

export function SpawnClassDust(projectile, classType, count = 1, scale = 0.75, speedMultiplier = 0.3) {
    const color = ClassColor(classType);
    const baseX = Number(projectile.velocity.X) || 0;
    const baseY = Number(projectile.velocity.Y) || 0;
    for (let i = 0; i < Math.max(0, Math.floor(Number(count) || 0)); i++) {
        try {
            const angle = (Math.random() * 2 - 1) * 0.55;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const randomSpeed = (0.5 + Math.random() * 0.8) * Number(speedMultiplier);
            const vx = -(baseX * cos - baseY * sin) * randomSpeed;
            const vy = -(baseX * sin + baseY * cos) * randomSpeed;
            const index = NewDust(
                projectile.Center,
                2,
                2,
                278,
                vx,
                vy,
                80,
                color,
                Number(scale) * (0.8 + Math.random() * 0.4)
            );
            if (index >= 0) {
                const dust = Terraria.Main.dust[index];
                if (dust) {
                    dust.noGravity = true;
                    dust.noLight = true;
                }
            }
        } catch (e) { }
    }
}

export function ApplyHitFalloff(projectile, minimumMultiplier, hitsToMinimum) {
    const original = Math.max(1, Number(projectile.originalDamage) || Number(projectile.damage) || 1);
    if (!(Number(projectile.originalDamage) > 0))
        projectile.originalDamage = original;
    const hits = Math.max(0, Number(projectile.numHits) || 0);
    const t = Clamp(hits / Math.max(1, Number(hitsToMinimum)), 0, 1);
    projectile.damage = Math.max(1, Math.floor(original * Lerp(1, Number(minimumMultiplier), t)));
}


export function CircleIntersectsRect(center, radius, rectangle) {
    if (!center || !rectangle)
        return false;
    const left = Number(rectangle.X);
    const top = Number(rectangle.Y);
    const right = left + Number(rectangle.Width);
    const bottom = top + Number(rectangle.Height);
    const closestX = Clamp(Number(center.X), left, right);
    const closestY = Clamp(Number(center.Y), top, bottom);
    const dx = Number(center.X) - closestX;
    const dy = Number(center.Y) - closestY;
    return dx * dx + dy * dy <= Number(radius) * Number(radius);
}

export function BounceFromOldVelocity(projectile, damping = 1) {
    const old = projectile.oldVelocity;
    const vx = Number(projectile.velocity.X);
    const vy = Number(projectile.velocity.Y);
    let nextX = vx;
    let nextY = vy;
    if (old) {
        if (Math.abs(vx - Number(old.X)) > 0.001)
            nextX = -Number(old.X) * Number(damping);
        if (Math.abs(vy - Number(old.Y)) > 0.001)
            nextY = -Number(old.Y) * Number(damping);
    } else {
        nextX = -vx * Number(damping);
        nextY = -vy * Number(damping);
    }
    SetVelocity(projectile, nextX, nextY);
}

export function UpdateFade(projectile, fadeTicks = 30) {
    if (Number(projectile.timeLeft) >= Number(fadeTicks)) {
        projectile.alpha = 0;
        return;
    }
    projectile.alpha = Math.floor(255 * (1 - Clamp(Number(projectile.timeLeft) / Math.max(1, Number(fadeTicks)), 0, 1)));
}

export function DrawGlow(projectile, lightColor, classType, radius = 2, copies = 4, scaleX = null, scaleY = null, rotationOffset = 0) {
    try {
        const drawData = GetProjectileDrawData(projectile.type);
        const spriteBatch = Terraria.Main.spriteBatch;
        const draw = spriteBatch && spriteBatch[DrawScaled];
        if (!drawData || !draw)
            return true;
        const texture = drawData.texture;
        const origin = drawData.origin;
        const screenX = Number(Terraria.Main.screenPosition.X);
        const screenY = Number(Terraria.Main.screenPosition.Y);
        const center = projectile.Center;
        const positionX = Number(center.X) - screenX;
        const positionY = Number(center.Y) - screenY + Number(projectile.gfxOffY || 0);
        const effects = Number(projectile.spriteDirection) < 0 ? SpriteEffects.FlipHorizontally : SpriteEffects.None;
        const alphaMultiplier = 1 - Clamp(Number(projectile.alpha) / 255, 0, 1);
        const glowBase = ClassColor(classType);
        const glow = Color.new(Number(glowBase.R), Number(glowBase.G), Number(glowBase.B), Math.floor(90 * alphaMultiplier));
        const count = Math.max(0, Math.floor(Number(copies) || 0));
        const offsets = GetUnitCircle(count);
        const scaleVector = Vector2.new(Number(scaleX ?? projectile.scale ?? 1), Number(scaleY ?? projectile.scale ?? 1));
        for (let i = 0; i < count; i++) {
            const offset = offsets[i];
            draw(
                texture,
                Vector2.new(positionX + offset[0] * Number(radius), positionY + offset[1] * Number(radius)),
                null,
                glow,
                Number(projectile.rotation) + Number(rotationOffset),
                origin,
                scaleVector,
                effects,
                0
            );
        }
        draw(
            texture,
            Vector2.new(positionX, positionY),
            null,
            lightColor,
            Number(projectile.rotation) + Number(rotationOffset),
            origin,
            Vector2.new(Number(scaleX ?? projectile.scale ?? 1), Number(scaleY ?? projectile.scale ?? 1)),
            effects,
            0
        );
        return false;
    } catch (e) {
        return true;
    }
}
