import { Modules, GeneralDrawLayer, ReLogic } from './ModImports.js';
import { GeneralParticleHandler } from './GeneralParticleHandler.js';

const { Vector2, Color } = Modules;
const AssetRequestMode = ReLogic.Content.AssetRequestMode;

export class Particle {
    constructor() {
        this.Type = 0;
        this.Time = 0;
        this.Lifetime = 0;

        this.RelativeOffset = Vector2.new(0, 0);
        this.Position = Vector2.new(0, 0);
        this.Velocity = Vector2.new(0, 0);
        this.Origin = Vector2.new(0, 0);

        this.Color = Color.White;
        this.Rotation = 0;
        this.Scale = 1;
        this.Variant = 0;

        this.AffectedByLight = false;
        this.Pixelate = false;
        this.DrawLayer = GeneralDrawLayer.AfterDusts;
        this.Active = true;
    }

    get LifetimeCompletion() {
        if (this.Lifetime <= 0)
            return 0;
        return Math.max(0, Math.min(1, this.Time / this.Lifetime));
    }

    get Texture() {
        return '';
    }

    get TextureRequestMode() {
        return AssetRequestMode.AsyncLoad;
    }

    get FrameVariants() {
        return 1;
    }

    get Important() {
        return false;
    }

    get SetLifetime() {
        return false;
    }

    get UseAdditiveBlend() {
        return false;
    }

    get UseHalfTransparency() {
        return false;
    }

    get UseCustomDraw() {
        return false;
    }

    get CustomShader() {
        return null;
    }

    CustomDraw(spriteBatch) { }

    CustomDrawWithBase(spriteBatch, basePosition) { }

    PrepareCustomShader(shader) { }

    Update() { }

    Kill() {
        if (!this.Active)
            return;
        this.Active = false;
        GeneralParticleHandler.RemoveParticle(this);
    }
}
