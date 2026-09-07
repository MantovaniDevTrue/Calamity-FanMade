import { Terraria, Modules, Microsoft } from './../../TL/ModImports.js';
import { Particle } from './../../TL/Particle.js';

const { Vector2, Color } = Modules;
const SpriteEffects = Microsoft.Xna.Framework.Graphics.SpriteEffects;
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];

export class PearlParticle extends Particle {
    static BaseTexture = null;
    static GlowTexture = null;

    constructor(position, velocity, affectedByGravity, lifetime, scale, color, shrinkSpeed = 0.95, rotationSpeed = 0, hitTiles = false) {
        super();
        this.Position = position;
        this.Velocity = velocity;
        this.AffectedByGravity = affectedByGravity;
        this.Lifetime = lifetime;
        this.Scale = scale;
        this.Color = color;
        this.InitialColor = color;
        this.ShrinkSpeed = shrinkSpeed;
        this.RotationSpeed = rotationSpeed;
        this.HitTiles = hitTiles;
        this.HasTileHit = false;
        this.PreviousVelocityX = 0;
        this.PreviousVelocityY = 0;
    }

    get Texture() {
        return 'Textures/Particles/PearlParticle.png';
    }

    get SetLifetime() {
        return true;
    }

    get UseCustomDraw() {
        return true;
    }

    Update() {
        let vx = Number(this.Velocity.X) || 0;
        let vy = Number(this.Velocity.Y) || 0;

        if (this.HitTiles) {
            if (this.HasTileHit) {
                if (Math.abs(vx - this.PreviousVelocityX) > 0.001)
                    vx = -this.PreviousVelocityX;
                if (Math.abs(vy - this.PreviousVelocityY) > 0.001)
                    vy = -this.PreviousVelocityY;
                this.HitTiles = false;
            }

            const size = Math.max(1, Math.floor(7 * this.Scale));
            try {
                if (SolidCollision(this.Position, size, size)) {
                    this.HasTileHit = true;
                    this.PreviousVelocityX = vx;
                    this.PreviousVelocityY = vy;
                }
            } catch (e) { }
        }

        this.Scale *= this.ShrinkSpeed;
        this.RotationSpeed *= this.ShrinkSpeed;

        const fade = Math.pow(this.LifetimeCompletion, 3);
        this.Color = Color.Lerp(this.InitialColor, Color.Transparent, fade);

        vx *= 0.95;
        vy *= 0.95;
        if (Math.sqrt(vx * vx + vy * vy) < 12 && this.AffectedByGravity) {
            vx *= 0.94;
            vy += 0.25;
        }

        this.Velocity = Vector2.new(vx, vy);
        this.Rotation += this.RotationSpeed;
    }

    CustomDraw(spriteBatch) {
        if (!PearlParticle.BaseTexture)
            PearlParticle.BaseTexture = tl.texture.load('Textures/Particles/PearlParticle.png');
        if (!PearlParticle.GlowTexture)
            PearlParticle.GlowTexture = tl.texture.load('Textures/Particles/PearlParticleGlow.png');

        const draw = spriteBatch[DrawTexture];
        if (!draw || !PearlParticle.BaseTexture || !PearlParticle.GlowTexture)
            return;

        const screen = Terraria.Main.screenPosition;
        const position = Vector2.new(Number(this.Position.X) - Number(screen.X), Number(this.Position.Y) - Number(screen.Y));
        const scale = Vector2.new(this.Scale, this.Scale);
        const glowOrigin = Vector2.new(Number(PearlParticle.GlowTexture.Width) * 0.5, Number(PearlParticle.GlowTexture.Height) * 0.5);
        const baseOrigin = Vector2.new(Number(PearlParticle.BaseTexture.Width) * 0.5, Number(PearlParticle.BaseTexture.Height) * 0.5);
        const coreColor = Color.Lerp(Color.White, Color.Transparent, Math.pow(this.LifetimeCompletion, 3));

        draw(PearlParticle.GlowTexture, position, null, this.Color, this.Rotation, glowOrigin, scale, SpriteEffects.None, 0);
        draw(PearlParticle.BaseTexture, position, null, coreColor, this.Rotation, baseOrigin, scale, SpriteEffects.None, 0);
    }
}
