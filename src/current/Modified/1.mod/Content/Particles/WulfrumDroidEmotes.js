import { Terraria, Modules, Microsoft } from './../../TL/ModImports.js';
import { Rand } from '../../TL/Modules/Rand.js';
import { Particle } from './../../TL/Particle.js';

const { Vector2, Color } = Modules;
const SpriteEffects = Microsoft.Xna.Framework.Graphics.SpriteEffects;
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const SolidCollision = Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];

const Rectangle = Modules.Rectangle;

export class WulfrumDroidEmotes extends Particle {
    static BaseTexture = null;
    static GlowTexture = null;

    get Texture() {
        return "Textures/Particles/WulfrumDroidEmotes.png";
    }

    get UseCustomDraw() {
        return true;
    }

       CustomDraw(spriteBatch) {
    if (!WulfrumDroidEmotes.BaseTexture)
        WulfrumDroidEmotes.BaseTexture = tl.texture.load("Textures/Particles/WulfrumDroidEmotes.png");

    const draw = spriteBatch[DrawTexture];
    if (!draw || !WulfrumDroidEmotes.BaseTexture)
        return;

    const screen = Terraria.Main.screenPosition;

    const position = Vector2.new(
        Number(this.Position.X) - Number(screen.X),
        Number(this.Position.Y) - Number(screen.Y)
    );

    const origin = Vector2.new(
        this.Frame.Width * 0.5,
        this.Frame.Height
    );

    const opacity = 1 - Math.pow(this.LifetimeCompletion, 4);

    const color = Color.new(
        this.Color.R,
        this.Color.G,
        this.Color.B,
        Math.floor(this.Color.A * opacity)
    );

    draw(
        WulfrumDroidEmotes.BaseTexture,
        position,
        this.Frame,
        color,
        this.Rotation,
        origin,
        Vector2.new(this.Scale, this.Scale),
        SpriteEffects.None,
        0
    );
}

    get SetLifetime() {
        return true;
    }

    constructor(position, velocity, lifeTime, scale = 1, variant = -1) {
        super();

        this.Position = position;
        this.Velocity = velocity;
        this.Color = Color.White;
        this.Scale = scale;
        this.Lifetime = lifeTime;

        this.Rotation = Math.atan2(Number(velocity.Y), Number(velocity.X)) + Math.PI / 2;

        if (variant == -1)
            variant = Rand.Next(15);

        this.Frame = Rectangle.new(
        16 * (variant % 8),
        16 * Math.floor(variant / 8),
        16,
        16
    );
    }
    Update() {
    this.Velocity = Vector2.Multiply(this.Velocity, 0.96);
    this.Scale *= 0.97;

    if (this.Frame.Y > 0)
        Terraria.Lighting.AddLight(this.Position, 112 / 255, 244 / 255, 244 / 255);
    else
        Terraria.Lighting.AddLight(this.Position, 194 / 255, 1, 62 / 255);
}
}
