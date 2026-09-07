import { Terraria, Modules, Microsoft } from './../../TL/ModImports.js';
import { Particle } from './../../TL/Particle.js';

const { Vector2, Color } = Modules;

const SpriteEffects = Microsoft.Xna.Framework.Graphics.SpriteEffects;

const DrawTexture =
    'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';

export class WulfrumDroidSweatEmote extends Particle {
    static TextureAsset = null;

    get Texture() {
        return "Textures/Particles/WulfrumDroidSweatEmote.png";
    }

    get UseCustomDraw() {
        return true;
    }

    get SetLifetime() {
        return true;
    }

    constructor(position, velocity, lifeTime, scale = 1) {
        super();

        this.Position = position;
        this.Velocity = velocity;
        this.Color = Color.White;
        this.Scale = scale;
        this.Lifetime = lifeTime;

        this.Rotation = Math.atan2(Number(velocity.Y), Number(velocity.X)) + Math.PI / 2;
    }

    Update() {
        this.Velocity = Vector2.Multiply(this.Velocity, 0.96);
        this.Velocity.Y += 0.06;

        this.Scale *= 0.97;

        Terraria.Lighting.AddLight(this.Position, 194 / 255, 1, 62 / 255);
    }

    CustomDraw(spriteBatch) {
        if (!WulfrumDroidSweatEmote.TextureAsset)
            WulfrumDroidSweatEmote.TextureAsset = tl.texture.load("Textures/Particles/WulfrumDroidSweatEmote.png");

        const draw = spriteBatch[DrawTexture];
        if (!draw || !WulfrumDroidSweatEmote.TextureAsset)
            return;

        const screen = Terraria.Main.screenPosition;

        const position = Vector2.new(
            Number(this.Position.X) - Number(screen.X),
            Number(this.Position.Y) - Number(screen.Y)
        );

        const origin = Vector2.new(
            Number(WulfrumDroidSweatEmote.TextureAsset.Width) * 0.5,
            Number(WulfrumDroidSweatEmote.TextureAsset.Height) * 0.5
        );

        const opacity = 1 - Math.pow(this.LifetimeCompletion, 4);

        const color = Color.new(
            this.Color.R,
            this.Color.G,
            this.Color.B,
            Math.floor(this.Color.A * opacity)
        );

        const effect =
            this.Velocity.X > 0
                ? SpriteEffects.None
                : SpriteEffects.FlipHorizontally;

        draw(
            WulfrumDroidSweatEmote.TextureAsset,
            position,
            null,
            color,
            this.Rotation,
            origin,
            Vector2.new(this.Scale, this.Scale),
            effect,
            0
        );
    }
}