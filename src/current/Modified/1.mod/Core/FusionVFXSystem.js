import { Terraria, Modules } from './../TL/ModImports.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawScaledSignature = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';

function NumberOr(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function Channel(value, fallback = 255) {
    return Math.max(0, Math.min(255, Math.floor(NumberOr(value, fallback))));
}
const SharedColorParts = { r: 255, g: 255, b: 255, a: 255 };
function ColorParts(value) {
    const out = SharedColorParts;
    if (!value) {
        out.r = 255; out.g = 255; out.b = 255; out.a = 255;
        return out;
    }
    out.r = Channel(value.r ?? value.R, 255);
    out.g = Channel(value.g ?? value.G, 255);
    out.b = Channel(value.b ?? value.B, 255);
    out.a = Channel(value.a ?? value.A, 255);
    return out;
}
function CoordX(value, fallback = 0) { return NumberOr(value && (value.X ?? value.x), fallback); }
function CoordY(value, fallback = 0) { return NumberOr(value && (value.Y ?? value.y), fallback); }
function Clamp01(value) { return Math.max(0, Math.min(1, NumberOr(value, 0))); }

export class FusionVFXSystem {
    static DefaultBudget = 96;
    static MaxEffects = 96;
    static Effects = new Array(96);
    static NextSlot = 0;
    static ActiveCount = 0;
    static SpawnedTotal = 0;
    static DroppedTotal = 0;
    static DrawnLastFrame = 0;
    static DrawCallsLastFrame = 0;
    static CulledLastFrame = 0;
    static UpdatedLastTick = 0;
    static OffscreenMargin = 180;
    static Enabled = true;
    static DrawPosition = null;
    static DrawOrigin = null;
    static DrawScale = null;
    static DrawColor = null;
    static MagicPixelMeta = null;

    // Phase 13.23: cached sprite VFX inspired by the cheap layered draw model
    // proven by AFTER MOON. These are Calamity-owned textures already in this port.
    static TextureCache = {};
    static TextureCacheReady = false;
    static TextureLoadFailures = 0;
    static BenchmarkMode = 'off';
    static BenchmarkCount = 0;
    static BenchmarkExpectedDrawCalls = 0;

    // Phase 13.23.1: gameplay budget derived from the device benchmark.
    // mixed 50 stayed at 59-60 FPS while mixed 100 reached ~50 FPS, so
    // normal gameplay stays in full fidelity and only sheds secondary layers
    // if the live JS-effect pool approaches the measured stress ceiling.
    static AdaptiveQuality = 0; // 0=full, 1=balanced, 2=guard
    static AdaptiveQualityName = 'full';
    static AdaptiveReason = 'normal';
    static AdaptiveTick = 0;
    static QualityChanges = 0;
    static QualityFull = Object.freeze({ level: 0, name: 'full', trailStride: 1, layeredLayers: 3, arcTrailPoints: 7, reason: 'normal' });
    static QualityBalanced = Object.freeze({ level: 1, name: 'balanced', trailStride: 1, layeredLayers: 2, arcTrailPoints: 6, reason: 'above-mixed50-budget' });
    static QualityGuard = Object.freeze({ level: 2, name: 'guard', trailStride: 2, layeredLayers: 2, arcTrailPoints: 4, reason: 'near-mixed100-ceiling' });

    static ReserveSlot(priority = 1) {
        priority = Math.max(0, Math.min(3, Math.floor(NumberOr(priority, 1))));
        if (!this.Enabled) {
            this.DroppedTotal++;
            return -1;
        }
        if (this.ActiveCount >= this.MaxEffects) {
            // Boss/Ripper/impact effects can replace one lower-priority cosmetic
            // object instead of disappearing when the pool is full.
            if (priority >= 2) {
                let replacement = -1;
                let lowest = priority;
                for (let i = 0; i < this.MaxEffects; i++) {
                    const effect = this.Effects[i];
                    if (!effect) continue;
                    const p = Math.max(0, Math.floor(NumberOr(effect.priority, 1)));
                    if (p < lowest) {
                        lowest = p;
                        replacement = i;
                        if (p <= 0) break;
                    }
                }
                if (replacement >= 0) {
                    this.Effects[replacement] = null;
                    this.ActiveCount = Math.max(0, this.ActiveCount - 1);
                } else {
                    this.DroppedTotal++;
                    return -1;
                }
            } else {
                this.DroppedTotal++;
                return -1;
            }
        }
        for (let attempt = 0; attempt < this.MaxEffects; attempt++) {
            const index = (this.NextSlot + attempt) % this.MaxEffects;
            if (!this.Effects[index]) {
                this.NextSlot = (index + 1) % this.MaxEffects;
                this.ActiveCount++;
                this.SpawnedTotal++;
                return index;
            }
        }
        this.DroppedTotal++;
        return -1;
    }

    static BuildTextureMeta(texture) {
        if (!texture)
            return null;
        const width = Math.max(1, NumberOr(texture.Width, 1));
        const height = Math.max(1, NumberOr(texture.Height, 1));
        return { texture, width, height, originX: width * 0.5, originY: height * 0.5 };
    }

    static LoadTextureCache() {
        if (this.TextureCacheReady && this.TextureLoadFailures === 0)
            return this.GetTextureStatus();
        const definitions = {
            bloom: 'Textures/ExtraTextures/SmallGreyscaleCircle.png',
            tiny: 'Textures/ExtraTextures/TinyGreyscaleCircle.png',
            ring: 'Textures/Particles/HollowCircleHardEdge.png',
            flare: 'Textures/Particles/HalfStar.png',
            smoke: 'Textures/Projectiles/Typeless/SmokePuff1.png',
            slash: 'Textures/Projectiles/DraedonsArsenal/AugerSlash.png'
        };
        this.TextureCache = {};
        this.TextureLoadFailures = 0;
        for (const key of Object.keys(definitions)) {
            try {
                const texture = tl.texture.load(definitions[key]);
                const meta = this.BuildTextureMeta(texture);
                if (meta)
                    this.TextureCache[key] = meta;
                else
                    this.TextureLoadFailures++;
            } catch (e) {
                this.TextureLoadFailures++;
            }
        }
        this.TextureCacheReady = this.TextureLoadFailures === 0;
        const status = this.GetTextureStatus();
        tl.log(`[CalamityPort FusionVFX2] texture cache ready ${status.loaded}/${status.total}; failures=${status.failures}; no draw-time texture loads.`);
        return status;
    }

    static GetTextureStatus() {
        return {
            ready: this.TextureCacheReady,
            loaded: Object.keys(this.TextureCache).length,
            total: 6,
            failures: this.TextureLoadFailures
        };
    }

    static SpawnDot(position, velocity = null, size = 5, color = null, life = 30, options = null) {
        const opts = options || {};
        const slot = this.ReserveSlot(opts.priority);
        if (slot < 0)
            return -1;
        const c = ColorParts(color);
        this.Effects[slot] = {
            kind: 'dot',
            x: CoordX(position), y: CoordY(position), vx: CoordX(velocity), vy: CoordY(velocity),
            size: Math.max(1, NumberOr(size, 5)), r: c.r, g: c.g, b: c.b, a: c.a,
            age: 0, life: Math.max(1, Math.floor(NumberOr(life, 30))), priority: Math.max(0, Math.min(3, Math.floor(NumberOr(opts.priority, 1)))),
            gravity: NumberOr(opts.gravity, 0), drag: Math.max(0, Math.min(1, NumberOr(opts.drag, 1))),
            fadeIn: Math.max(0, Math.floor(NumberOr(opts.fadeIn, 0)))
        };
        return slot;
    }

    static SpawnLine(start, end, width = 3, color = null, life = 20, options = null) {
        const opts = options || {};
        const slot = this.ReserveSlot(opts.priority);
        if (slot < 0)
            return -1;
        const c = ColorParts(color);
        this.Effects[slot] = {
            kind: 'line',
            x: CoordX(start), y: CoordY(start), x2: CoordX(end), y2: CoordY(end),
            vx: NumberOr(opts.vx, 0), vy: NumberOr(opts.vy, 0),
            width: Math.max(1, NumberOr(width, 3)), r: c.r, g: c.g, b: c.b, a: c.a,
            age: 0, life: Math.max(1, Math.floor(NumberOr(life, 20))), priority: Math.max(0, Math.min(3, Math.floor(NumberOr(opts.priority, 1)))),
            fadeIn: Math.max(0, Math.floor(NumberOr(opts.fadeIn, 0)))
        };
        return slot;
    }

    static SpawnSprite(position, textureKey = 'bloom', size = 32, color = null, life = 30, options = null) {
        const opts = options || {};
        const slot = this.ReserveSlot(opts.priority);
        if (slot < 0)
            return -1;
        const c = ColorParts(color);
        this.Effects[slot] = {
            kind: 'sprite', textureKey: String(textureKey || 'bloom'),
            x: CoordX(position), y: CoordY(position), vx: NumberOr(opts.vx, 0), vy: NumberOr(opts.vy, 0),
            size: Math.max(1, NumberOr(size, 32)), sizeY: Math.max(1, NumberOr(opts.sizeY, size)),
            rotation: NumberOr(opts.rotation, 0), rotVel: NumberOr(opts.rotVel, 0),
            r: c.r, g: c.g, b: c.b, a: c.a,
            age: 0, life: Math.max(1, Math.floor(NumberOr(life, 30))), priority: Math.max(0, Math.min(3, Math.floor(NumberOr(opts.priority, 1)))),
            gravity: NumberOr(opts.gravity, 0), drag: Math.max(0, Math.min(1, NumberOr(opts.drag, 1))),
            fadeIn: Math.max(0, Math.floor(NumberOr(opts.fadeIn, 0))),
            fadeOut: Math.max(0, Math.floor(NumberOr(opts.fadeOut, 0))), opacityMode: 'ends',
            fakeAdditive: opts.fakeAdditive !== false,
            pulseAmp: Math.max(0, NumberOr(opts.pulseAmp, 0)), pulseSpeed: NumberOr(opts.pulseSpeed, 0.10), phase: NumberOr(opts.phase, 0)
        };
        return slot;
    }

    // One lightweight object, three sprite submissions. This is the main
    // AFTER-MOON-style building block for bloom / shockwave / flare effects.
    static SpawnLayeredBurst(position, size = 42, color = null, life = 90, options = null) {
        const opts = options || {};
        const slot = this.ReserveSlot(opts.priority);
        if (slot < 0)
            return -1;
        const c = ColorParts(color);
        this.Effects[slot] = {
            kind: 'layered', variant: Math.abs(Math.floor(NumberOr(opts.variant, 0))) % 4,
            x: CoordX(position), y: CoordY(position), vx: NumberOr(opts.vx, 0), vy: NumberOr(opts.vy, 0),
            size: Math.max(4, NumberOr(size, 42)), sizeEnd: Math.max(4, NumberOr(opts.sizeEnd, size)),
            rotation: NumberOr(opts.rotation, 0), rotVel: NumberOr(opts.rotVel, 0.015),
            r: c.r, g: c.g, b: c.b, a: c.a,
            age: 0, life: Math.max(1, Math.floor(NumberOr(life, 90))), priority: Math.max(0, Math.min(3, Math.floor(NumberOr(opts.priority, 1)))),
            fadeIn: Math.max(0, Math.floor(NumberOr(opts.fadeIn, 4))),
            fadeOut: Math.max(0, Math.floor(NumberOr(opts.fadeOut, 24))), opacityMode: 'ends',
            pulseAmp: Math.max(0, NumberOr(opts.pulseAmp, 0.08)), pulseSpeed: NumberOr(opts.pulseSpeed, 0.11), phase: NumberOr(opts.phase, 0)
        };
        return slot;
    }

    // Fixed JS ring buffer: no Projectile.oldPos and no NativeObject indexed
    // reads in the draw path. Current head + history gives a real trail test.
    static SpawnTrailOrb(anchor, color = null, life = 600, options = null) {
        const opts = options || {};
        const slot = this.ReserveSlot(opts.priority);
        if (slot < 0)
            return -1;
        const c = ColorParts(color);
        const trailLength = Math.max(4, Math.min(12, Math.floor(NumberOr(opts.trailLength, 8))));
        const x = CoordX(anchor), y = CoordY(anchor);
        const hx = new Array(trailLength);
        const hy = new Array(trailLength);
        for (let i = 0; i < trailLength; i++) { hx[i] = x; hy[i] = y; }
        this.Effects[slot] = {
            kind: 'trail', x, y, anchorX: x, anchorY: y,
            radiusX: Math.max(2, NumberOr(opts.radiusX, 16)), radiusY: Math.max(2, NumberOr(opts.radiusY, 10)),
            angularSpeed: NumberOr(opts.angularSpeed, 0.055), phase: NumberOr(opts.phase, 0),
            size: Math.max(4, NumberOr(opts.size, 18)),
            r: c.r, g: c.g, b: c.b, a: c.a,
            age: 0, life: Math.max(1, Math.floor(NumberOr(life, 600))), priority: Math.max(0, Math.min(3, Math.floor(NumberOr(opts.priority, 1)))),
            fadeIn: Math.max(0, Math.floor(NumberOr(opts.fadeIn, 8))),
            fadeOut: Math.max(0, Math.floor(NumberOr(opts.fadeOut, 40))), opacityMode: 'ends',
            trailLength, hx, hy, trailRate: Math.max(1, Math.floor(NumberOr(opts.trailRate, 1)))
        };
        return slot;
    }

    static Remove(index) {
        if (index < 0 || index >= this.MaxEffects || !this.Effects[index])
            return;
        this.Effects[index] = null;
        this.ActiveCount = Math.max(0, this.ActiveCount - 1);
    }

    static UpdateAdaptiveQuality() {
        this.AdaptiveTick++;
        if (this.BenchmarkMode !== 'off') {
            this.AdaptiveQuality = 0;
            this.AdaptiveQualityName = 'full';
            this.AdaptiveReason = 'benchmark';
            return this.GetQualityProfile();
        }
        if (this.AdaptiveTick % 15 !== 0)
            return this.GetQualityProfile();

        const active = this.ActiveCount;
        let next = 0;
        let reason = 'normal';
        if (active > 84) { next = 2; reason = 'near-mixed100-ceiling'; }
        else if (active > 60) { next = 1; reason = 'above-mixed50-budget'; }

        if (next !== this.AdaptiveQuality)
            this.QualityChanges++;
        this.AdaptiveQuality = next;
        this.AdaptiveQualityName = next === 0 ? 'full' : (next === 1 ? 'balanced' : 'guard');
        this.AdaptiveReason = reason;
        return this.GetQualityProfile();
    }

    static GetQualityProfile() {
        if (this.AdaptiveQuality >= 2)
            return this.QualityGuard;
        if (this.AdaptiveQuality === 1)
            return this.QualityBalanced;
        return this.QualityFull;
    }

    static Update() {
        this.UpdateAdaptiveQuality();
        if (!this.Enabled || this.ActiveCount <= 0 || Terraria.Main.gameMenu || Terraria.Main.gamePaused || Terraria.Main.gameInactive) {
            this.UpdatedLastTick = 0;
            return;
        }
        let updated = 0;
        for (let i = 0; i < this.MaxEffects; i++) {
            const effect = this.Effects[i];
            if (!effect)
                continue;
            effect.age++;
            if (effect.age >= effect.life) {
                this.Remove(i);
                continue;
            }
            if (effect.kind === 'dot' || effect.kind === 'sprite') {
                effect.vy += effect.gravity || 0;
                effect.x += effect.vx || 0;
                effect.y += effect.vy || 0;
                effect.vx *= effect.drag ?? 1;
                effect.vy *= effect.drag ?? 1;
                if (effect.kind === 'sprite')
                    effect.rotation += effect.rotVel;
            } else if (effect.kind === 'line' && (effect.vx !== 0 || effect.vy !== 0)) {
                effect.x += effect.vx;
                effect.y += effect.vy;
                effect.x2 += effect.vx;
                effect.y2 += effect.vy;
            } else if (effect.kind === 'layered') {
                effect.x += effect.vx || 0;
                effect.y += effect.vy || 0;
                effect.rotation += effect.rotVel;
            } else if (effect.kind === 'trail') {
                if (effect.age % effect.trailRate === 0) {
                    for (let h = effect.trailLength - 1; h > 0; h--) {
                        effect.hx[h] = effect.hx[h - 1];
                        effect.hy[h] = effect.hy[h - 1];
                    }
                }
                const angle = effect.phase + effect.age * effect.angularSpeed;
                effect.x = effect.anchorX + Math.cos(angle) * effect.radiusX;
                effect.y = effect.anchorY + Math.sin(angle) * effect.radiusY;
                effect.hx[0] = effect.x;
                effect.hy[0] = effect.y;
            }
            updated++;
        }
        this.UpdatedLastTick = updated;
    }

    static Opacity(effect) {
        if (effect.opacityMode === 'ends') {
            let alpha = 1;
            if (effect.fadeIn > 0 && effect.age < effect.fadeIn)
                alpha *= effect.age / effect.fadeIn;
            if (effect.fadeOut > 0 && effect.age > effect.life - effect.fadeOut)
                alpha *= Math.max(0, (effect.life - effect.age) / effect.fadeOut);
            return Clamp01(alpha);
        }
        let alpha = 1 - effect.age / Math.max(1, effect.life);
        if (effect.fadeIn > 0 && effect.age < effect.fadeIn)
            alpha *= effect.age / effect.fadeIn;
        return Clamp01(alpha);
    }

    static IsOffscreen(effect, screenX, screenY, screenW, screenH) {
        const margin = this.OffscreenMargin;
        let minX = effect.x, maxX = effect.x, minY = effect.y, maxY = effect.y;
        if (effect.kind === 'line') {
            minX = Math.min(effect.x, effect.x2);
            maxX = Math.max(effect.x, effect.x2);
            minY = Math.min(effect.y, effect.y2);
            maxY = Math.max(effect.y, effect.y2);
        } else if (effect.kind === 'trail') {
            minX = effect.anchorX - effect.radiusX - effect.size;
            maxX = effect.anchorX + effect.radiusX + effect.size;
            minY = effect.anchorY - effect.radiusY - effect.size;
            maxY = effect.anchorY + effect.radiusY + effect.size;
        } else if (effect.size) {
            const radius = Math.max(effect.size, effect.sizeEnd || 0);
            minX -= radius;
            maxX += radius;
            minY -= radius;
            maxY += radius;
        }
        return maxX < screenX - margin || minX > screenX + screenW + margin ||
            maxY < screenY - margin || minY > screenY + screenH + margin;
    }

    static EnsureDrawTemps() {
        if (!this.DrawPosition) this.DrawPosition = Vector2.new();
        if (!this.DrawOrigin) this.DrawOrigin = Vector2.new();
        if (!this.DrawScale) this.DrawScale = Vector2.new(1, 1);
        if (!this.DrawColor) this.DrawColor = Color.new(255, 255, 255, 255);
    }

    static SetDrawColor(color, r, g, b, a, opacity, fakeAdditive = false, extra = 1) {
        const strength = Clamp01(opacity * Math.max(0, NumberOr(extra, 1)));
        color.R = Channel(r * strength, 0);
        color.G = Channel(g * strength, 0);
        color.B = Channel(b * strength, 0);
        color.A = fakeAdditive ? 0 : Channel(a * opacity, 0);
    }

    static DrawTexture(drawScaled, meta, x, y, pixelWidth, pixelHeight, rotation, r, g, b, a, opacity, fakeAdditive, screenX, screenY) {
        if (!meta || !meta.texture)
            return false;
        const position = this.DrawPosition;
        const origin = this.DrawOrigin;
        const scale = this.DrawScale;
        const color = this.DrawColor;
        position.X = x - screenX;
        position.Y = y - screenY;
        origin.X = meta.originX;
        origin.Y = meta.originY;
        scale.X = Math.max(0.0001, pixelWidth / meta.width);
        scale.Y = Math.max(0.0001, pixelHeight / meta.height);
        this.SetDrawColor(color, r, g, b, a, opacity, fakeAdditive);
        drawScaled(meta.texture, position, null, color, rotation, origin, scale, SpriteEffects.None, 0);
        this.DrawCallsLastFrame++;
        return true;
    }

    static DrawImmediateSprite(textureKey, x, y, pixelWidth, pixelHeight, color = null, opacity = 1, rotation = 0, fakeAdditive = true) {
        if (!this.TextureCacheReady)
            return false;
        const meta = this.TextureCache[String(textureKey || 'bloom')];
        if (!meta)
            return false;
        const drawScaled = Terraria.Main.spriteBatch && Terraria.Main.spriteBatch[DrawScaledSignature];
        if (!drawScaled)
            return false;
        this.EnsureDrawTemps();
        const c = ColorParts(color);
        return this.DrawTexture(
            drawScaled, meta, NumberOr(x), NumberOr(y),
            Math.max(0.01, NumberOr(pixelWidth, meta.width)), Math.max(0.01, NumberOr(pixelHeight, pixelWidth)),
            NumberOr(rotation), c.r, c.g, c.b, c.a, Clamp01(opacity), fakeAdditive === true,
            NumberOr(Terraria.Main.screenPosition.X), NumberOr(Terraria.Main.screenPosition.Y)
        );
    }

    static DrawImmediateTextureScale(textureKey, x, y, scaleX, scaleY, color = null, opacity = 1, rotation = 0, fakeAdditive = true) {
        const meta = this.TextureCache[String(textureKey || 'bloom')];
        if (!meta)
            return false;
        return this.DrawImmediateSprite(textureKey, x, y, meta.width * NumberOr(scaleX, 1), meta.height * NumberOr(scaleY, scaleX), color, opacity, rotation, fakeAdditive);
    }

    static DrawImmediateBeam(x1, y1, x2, y2, width, color = null, opacity = 1, fakeAdditive = true) {
        const pixel = Terraria.GameContent.TextureAssets.MagicPixel?.Value;
        const drawScaled = Terraria.Main.spriteBatch && Terraria.Main.spriteBatch[DrawScaledSignature];
        if (!pixel || !drawScaled)
            return false;
        const dx = NumberOr(x2) - NumberOr(x1);
        const dy = NumberOr(y2) - NumberOr(y1);
        const length = Math.sqrt(dx * dx + dy * dy);
        if (!(length > 0.01))
            return false;
        this.EnsureDrawTemps();
        if (!this.MagicPixelMeta || this.MagicPixelMeta.texture !== pixel) {
            const pw = Math.max(1, NumberOr(pixel.Width, 1));
            const ph = Math.max(1, NumberOr(pixel.Height, 1));
            this.MagicPixelMeta = { texture: pixel, width: pw, height: ph, originX: 0, originY: ph * 0.5 };
        }
        const c = ColorParts(color);
        return this.DrawTexture(
            drawScaled, this.MagicPixelMeta, NumberOr(x1), NumberOr(y1), length, Math.max(0.1, NumberOr(width, 1)), Math.atan2(dy, dx),
            c.r, c.g, c.b, c.a, Clamp01(opacity), fakeAdditive === true,
            NumberOr(Terraria.Main.screenPosition.X), NumberOr(Terraria.Main.screenPosition.Y)
        );
    }

    static DrawLayered(effect, drawScaled, screenX, screenY, opacity) {
        const t = this.TextureCache;
        const progress = Clamp01(effect.age / Math.max(1, effect.life));
        let size = effect.size + (effect.sizeEnd - effect.size) * progress;
        if (effect.pulseAmp > 0)
            size *= 1 + Math.sin(effect.phase + effect.age * effect.pulseSpeed) * effect.pulseAmp;
        const rot = effect.rotation;
        const layerLimit = this.GetQualityProfile().layeredLayers;
        let calls = 0;

        if (effect.variant === 0) {
            calls += this.DrawTexture(drawScaled, t.bloom, effect.x, effect.y, size * 1.55, size * 1.55, 0, effect.r, effect.g, effect.b, effect.a, opacity * 0.58, true, screenX, screenY) ? 1 : 0;
            calls += this.DrawTexture(drawScaled, t.ring, effect.x, effect.y, size * 1.25, size * 1.25, rot, effect.r, effect.g, effect.b, effect.a, opacity * 0.82, true, screenX, screenY) ? 1 : 0;
            if (layerLimit >= 3) calls += this.DrawTexture(drawScaled, t.flare, effect.x, effect.y, size * 0.72, size * 0.72, -rot * 1.3, 255, 255, 255, 210, opacity, true, screenX, screenY) ? 1 : 0;
        } else if (effect.variant === 1) {
            calls += this.DrawTexture(drawScaled, t.bloom, effect.x, effect.y, size * 1.35, size * 1.35, 0, effect.r, effect.g, effect.b, effect.a, opacity * 0.52, true, screenX, screenY) ? 1 : 0;
            calls += this.DrawTexture(drawScaled, t.slash, effect.x, effect.y, size * 1.55, size * 0.78, rot, effect.r, effect.g, effect.b, effect.a, opacity * 0.92, true, screenX, screenY) ? 1 : 0;
            if (layerLimit >= 3) calls += this.DrawTexture(drawScaled, t.flare, effect.x, effect.y, size * 0.52, size * 0.52, rot * 0.7, 255, 255, 255, 220, opacity, true, screenX, screenY) ? 1 : 0;
        } else if (effect.variant === 2) {
            calls += this.DrawTexture(drawScaled, t.smoke, effect.x, effect.y, size * 1.10, size * 1.10, rot * 0.4, effect.r, effect.g, effect.b, 95, opacity * 0.60, false, screenX, screenY) ? 1 : 0;
            calls += this.DrawTexture(drawScaled, t.bloom, effect.x, effect.y, size * 1.30, size * 1.30, 0, effect.r, effect.g, effect.b, effect.a, opacity * 0.52, true, screenX, screenY) ? 1 : 0;
            if (layerLimit >= 3) calls += this.DrawTexture(drawScaled, t.ring, effect.x, effect.y, size * 0.95, size * 0.95, -rot, 255, 255, 255, 180, opacity * 0.76, true, screenX, screenY) ? 1 : 0;
        } else {
            calls += this.DrawTexture(drawScaled, t.bloom, effect.x, effect.y, size * 1.45, size * 1.45, 0, effect.r, effect.g, effect.b, effect.a, opacity * 0.48, true, screenX, screenY) ? 1 : 0;
            calls += this.DrawTexture(drawScaled, t.ring, effect.x, effect.y, size * 1.05, size * 1.05, rot, effect.r, effect.g, effect.b, effect.a, opacity * 0.88, true, screenX, screenY) ? 1 : 0;
            if (layerLimit >= 3) calls += this.DrawTexture(drawScaled, t.tiny, effect.x, effect.y, size * 0.44, size * 0.44, 0, 255, 255, 255, 230, opacity, true, screenX, screenY) ? 1 : 0;
        }
        return calls;
    }

    static DrawTrail(effect, drawScaled, screenX, screenY, opacity) {
        const t = this.TextureCache;
        let calls = 0;
        const stride = this.GetQualityProfile().trailStride;
        for (let h = effect.trailLength - 1; h >= 0; h -= stride) {
            const f = 1 - h / effect.trailLength;
            const size = effect.size * (0.28 + f * 0.72);
            const trailOpacity = opacity * f * f * 0.72;
            calls += this.DrawTexture(drawScaled, t.bloom, effect.hx[h], effect.hy[h], size, size, 0, effect.r, effect.g, effect.b, effect.a, trailOpacity, true, screenX, screenY) ? 1 : 0;
        }
        calls += this.DrawTexture(drawScaled, t.ring, effect.x, effect.y, effect.size * 1.15, effect.size * 1.15, effect.age * 0.035, effect.r, effect.g, effect.b, effect.a, opacity * 0.9, true, screenX, screenY) ? 1 : 0;
        calls += this.DrawTexture(drawScaled, t.flare, effect.x, effect.y, effect.size * 0.68, effect.size * 0.68, -effect.age * 0.05, 255, 255, 255, 220, opacity, true, screenX, screenY) ? 1 : 0;
        return calls;
    }

    static DrawWorld() {
        this.DrawnLastFrame = 0;
        this.DrawCallsLastFrame = 0;
        this.CulledLastFrame = 0;
        if (!this.Enabled || this.ActiveCount <= 0 || Terraria.Main.gameMenu || Terraria.Main.mapFullscreen)
            return;
        const pixel = Terraria.GameContent.TextureAssets.MagicPixel.Value;
        const drawScaled = Terraria.Main.spriteBatch[DrawScaledSignature];
        if (!drawScaled || !pixel)
            return;
        this.EnsureDrawTemps();
        const pixelWidth = Math.max(1, NumberOr(pixel.Width, 1));
        const pixelHeight = Math.max(1, NumberOr(pixel.Height, 1));
        const screenX = NumberOr(Terraria.Main.screenPosition.X, 0);
        const screenY = NumberOr(Terraria.Main.screenPosition.Y, 0);
        const screenW = NumberOr(Terraria.Main.screenWidth, 1920);
        const screenH = NumberOr(Terraria.Main.screenHeight, 1080);
        const position = this.DrawPosition;
        const origin = this.DrawOrigin;
        const scale = this.DrawScale;
        const color = this.DrawColor;

        for (let i = 0; i < this.MaxEffects; i++) {
            const effect = this.Effects[i];
            if (!effect)
                continue;
            if (this.IsOffscreen(effect, screenX, screenY, screenW, screenH)) {
                this.CulledLastFrame++;
                continue;
            }
            const opacity = this.Opacity(effect);
            if (opacity <= 0)
                continue;

            if (effect.kind === 'layered') {
                this.DrawLayered(effect, drawScaled, screenX, screenY, opacity);
                this.DrawnLastFrame++;
                continue;
            }
            if (effect.kind === 'trail') {
                this.DrawTrail(effect, drawScaled, screenX, screenY, opacity);
                this.DrawnLastFrame++;
                continue;
            }
            if (effect.kind === 'sprite') {
                const meta = this.TextureCache[effect.textureKey];
                let pulse = 1;
                if (effect.pulseAmp > 0)
                    pulse += Math.sin(effect.phase + effect.age * effect.pulseSpeed) * effect.pulseAmp;
                const ok = this.DrawTexture(drawScaled, meta, effect.x, effect.y, effect.size * pulse, effect.sizeY * pulse, effect.rotation, effect.r, effect.g, effect.b, effect.a, opacity, effect.fakeAdditive, screenX, screenY);
                if (ok)
                    this.DrawnLastFrame++;
                continue;
            }

            color.R = effect.r;
            color.G = effect.g;
            color.B = effect.b;
            color.A = Math.max(0, Math.min(255, Math.floor(effect.a * opacity)));
            position.X = effect.x - screenX;
            position.Y = effect.y - screenY;

            if (effect.kind === 'line') {
                const dx = effect.x2 - effect.x;
                const dy = effect.y2 - effect.y;
                const length2 = dx * dx + dy * dy;
                if (length2 <= 0.0001)
                    continue;
                const length = Math.sqrt(length2);
                origin.X = 0;
                origin.Y = pixelHeight * 0.5;
                scale.X = length / pixelWidth;
                scale.Y = effect.width / pixelHeight;
                drawScaled(pixel, position, null, color, Math.atan2(dy, dx), origin, scale, SpriteEffects.None, 0);
            } else {
                origin.X = pixelWidth * 0.5;
                origin.Y = pixelHeight * 0.5;
                scale.X = effect.size / pixelWidth;
                scale.Y = effect.size / pixelHeight;
                drawScaled(pixel, position, null, color, 0, origin, scale, SpriteEffects.None, 0);
            }
            this.DrawnLastFrame++;
            this.DrawCallsLastFrame++;
        }
    }

    static SetBudget(value) {
        const next = Math.max(32, Math.min(192, Math.floor(NumberOr(value, this.MaxEffects))));
        if (next === this.MaxEffects)
            return next;
        const old = this.Effects;
        this.MaxEffects = next;
        this.Effects = new Array(next);
        this.NextSlot = 0;
        this.ActiveCount = 0;
        for (let i = 0; i < old.length && this.ActiveCount < next; i++) {
            if (!old[i])
                continue;
            this.Effects[this.ActiveCount++] = old[i];
        }
        this.NextSlot = this.ActiveCount % next;
        return next;
    }

    static RunBenchmark(center, count = 25, mode = 'layered') {
        this.LoadTextureCache();
        count = Math.max(1, Math.min(150, Math.floor(NumberOr(count, 25))));
        mode = String(mode || 'layered').toLowerCase();
        if (mode !== 'layered' && mode !== 'trail' && mode !== 'mixed' && mode !== 'simple')
            mode = 'layered';

        this.Clear();
        this.SetBudget(Math.max(this.DefaultBudget, count));
        this.BenchmarkMode = mode;
        this.BenchmarkCount = count;
        this.BenchmarkExpectedDrawCalls = 0;

        const cx = CoordX(center);
        const cy = CoordY(center);
        const cols = Math.min(15, Math.max(5, Math.ceil(Math.sqrt(count * 1.5))));
        const rows = Math.ceil(count / cols);
        const spacingX = cols >= 13 ? 58 : (cols >= 10 ? 66 : 78);
        const spacingY = rows >= 9 ? 44 : (rows >= 6 ? 52 : 64);
        const startX = cx - (cols - 1) * spacingX * 0.5;
        const startY = cy - (rows - 1) * spacingY * 0.5;

        let spawned = 0;
        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;
            const hue = i % 6;
            const palette = [
                { r: 90, g: 225, b: 255, a: 220 },
                { r: 255, g: 105, b: 225, a: 220 },
                { r: 255, g: 170, b: 80, a: 220 },
                { r: 125, g: 255, b: 145, a: 220 },
                { r: 175, g: 120, b: 255, a: 220 },
                { r: 255, g: 235, b: 125, a: 220 }
            ];
            const c = palette[hue];
            let result = -1;
            const useTrail = mode === 'trail' || (mode === 'mixed' && i % 4 === 0);
            if (mode === 'simple') {
                result = this.SpawnDot({ x, y }, null, 16, c, 900, { fadeIn: 8 });
                this.BenchmarkExpectedDrawCalls += 1;
            } else if (useTrail) {
                result = this.SpawnTrailOrb({ x, y }, c, 900, {
                    trailLength: 8,
                    radiusX: 14 + (i % 3) * 3,
                    radiusY: 8 + (i % 2) * 3,
                    angularSpeed: 0.045 + (i % 5) * 0.004,
                    phase: i * 0.61,
                    size: 16 + (i % 3) * 2,
                    fadeIn: 8,
                    fadeOut: 45
                });
                this.BenchmarkExpectedDrawCalls += 10;
            } else {
                result = this.SpawnLayeredBurst({ x, y }, 28 + (i % 4) * 3, c, 900, {
                    variant: i % 4,
                    rotation: i * 0.17,
                    rotVel: (i % 2 === 0 ? 1 : -1) * (0.010 + (i % 5) * 0.002),
                    pulseAmp: 0.10,
                    pulseSpeed: 0.085 + (i % 4) * 0.007,
                    phase: i * 0.37,
                    fadeIn: 8,
                    fadeOut: 45
                });
                this.BenchmarkExpectedDrawCalls += 3;
            }
            if (result >= 0)
                spawned++;
        }
        return {
            mode,
            requested: count,
            spawned,
            budget: this.MaxEffects,
            expectedDrawCalls: this.BenchmarkExpectedDrawCalls,
            textureStatus: this.GetTextureStatus()
        };
    }

    static ClearBenchmark() {
        this.Clear();
        this.SetBudget(this.DefaultBudget);
        this.BenchmarkMode = 'off';
        this.BenchmarkCount = 0;
        this.BenchmarkExpectedDrawCalls = 0;
        this.AdaptiveQuality = 0;
        this.AdaptiveQualityName = 'full';
        this.AdaptiveReason = 'normal';
    }

    static Clear() {
        this.Effects = new Array(this.MaxEffects);
        this.NextSlot = 0;
        this.ActiveCount = 0;
        this.DrawnLastFrame = 0;
        this.DrawCallsLastFrame = 0;
        this.CulledLastFrame = 0;
        this.UpdatedLastTick = 0;
    }

    static GetStats() {
        return {
            enabled: this.Enabled,
            active: this.ActiveCount,
            budget: this.MaxEffects,
            drawn: this.DrawnLastFrame,
            drawCalls: this.DrawCallsLastFrame,
            culled: this.CulledLastFrame,
            updated: this.UpdatedLastTick,
            spawned: this.SpawnedTotal,
            dropped: this.DroppedTotal,
            margin: this.OffscreenMargin,
            textures: this.GetTextureStatus(),
            benchmarkMode: this.BenchmarkMode,
            benchmarkCount: this.BenchmarkCount,
            benchmarkExpectedDrawCalls: this.BenchmarkExpectedDrawCalls,
            quality: this.GetQualityProfile(),
            qualityChanges: this.QualityChanges
        };
    }
}
