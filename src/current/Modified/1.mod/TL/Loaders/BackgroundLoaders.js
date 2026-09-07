import { Terraria, Microsoft, Modules } from './../ModImports.js';
import { ModTexture } from './../ModTexture.js';
import { SceneEffectLoader } from './../Loaders/SceneEffectLoader.js';
import { MenuLoader } from './../Loaders/MenuLoader.js';

const { Color, Vector2, Rectangle, MathHelper } = Modules;
const { SpriteEffects } = Microsoft.Xna.Framework.Graphics;

function cloneResizedSetLastGore(array, newSize, value) {
    const resized = array.cloneResized(newSize);
    if (value != null) resized[newSize - 1] = value;
    return resized;
}

function resizeArrayProperty(propertyHolder, propertyName, newSize, value) {
    propertyHolder[propertyName] = cloneResizedSetLastGore(propertyHolder[propertyName], newSize, value);
}

export class BackgroundTextureLoader {
    static Backgrounds = {};
    static TotalCount = 0;
    
    static GetBackgroundSlot(texture) {
        return this.Backgrounds[texture];
    }
    
    static AddBackgroundTexture(texture) {
        let backgroundTexture = new ModTexture('Textures/Backgrounds/' + texture);
        if (!backgroundTexture?.exists) return;
        backgroundTexture = backgroundTexture.asset.asset;
        
        const slot = this.TotalCount;
        this.TotalCount++;
        
        resizeArrayProperty(Terraria.GameContent.TextureAssets, 'Background', this.TotalCount, backgroundTexture);
        resizeArrayProperty(Terraria.Main, 'backgroundWidth', this.TotalCount, backgroundTexture.Value.Width);
        resizeArrayProperty(Terraria.Main, 'backgroundHeight', this.TotalCount, backgroundTexture.Value.Height);
        
        this.Backgrounds[texture] = slot;
    }
    
    static AutoloadBackgrounds() {
        let files = tl.directory.exists('Textures/Backgrounds/') ? tl.directory.listFiles('Textures/Backgrounds/') : [];
        if (!files || files.length === 0) return;
        files = files.filter(f => f.endsWith('.png')).map(f => f.replace('Textures/Backgrounds/', '').replace('.png', ''));
        for (const file of files) {
            this.AddBackgroundTexture(file);
        }
    }
    
    static SetupContent() {
        this.TotalCount = Terraria.GameContent.TextureAssets.Background.length;
        this.AutoloadBackgrounds();
    }
    
    static PostSetupContent() {
        this.TotalCount = Terraria.GameContent.TextureAssets.Background.length;
    }
}

export class UndergroundBackgroundLoader {
    static Backgrounds = [];
    static TotalCount = 0;
    
    static GetBackground(slot) {
        return this.Backgrounds.find(b => b.Slot === slot);
    }
    
    static SetupContent() {
        this.TotalCount = 22;
        for (const bg of this.Backgrounds) {
            bg.Slot = this.TotalCount;
            this.TotalCount++;
        }
    }
    
    static ChooseStyle() {
        return SceneEffectLoader.AnySceneActive ? (SceneEffectLoader.CurrentScene?.UndergroundBackground?.Slot ?? null) : null;
    }
    
    static FillTextureArray(slot, textureSlots) {
        const bg = this.GetBackground(slot);
        if (bg) {
            bg.FillTextureArray(textureSlots);
        }
    }
}

export class SurfaceBackgroundLoader {
    static Backgrounds = [];
    static TotalCount = 0;
    static MAX_VANILLA_ID = 16;
    
    static ModTypes = new Set();
    static VisibleModSurfaceBackground = false;
    static isModType(slot) {
        return this.ModTypes.has(slot);
    }
    
    static RefreshVisibleState() {
        let visible = false;
        for (const bg of this.Backgrounds) {
            const slot = bg.Slot;
            if (slot == null || slot < 0) continue;
            const far = Number(Terraria.Main.bgAlphaFarBackLayer[slot]) || 0;
            const front = Number(Terraria.Main.bgAlphaFrontLayer[slot]) || 0;
            if (far > 0.001 || front > 0.001) { visible = true; break; }
        }
        this.VisibleModSurfaceBackground = visible;
        return visible;
    }

    static GetBackground(slot) {
        return this.Backgrounds.find(b => b.Slot === slot);
    }
    
    static SetupContent() {
        this.VisibleModSurfaceBackground = false;
        this.TotalCount = Terraria.Main.bgAlphaFrontLayer.length;
        for (const bg of this.Backgrounds) {
            bg.Slot = this.TotalCount;
            this.ModTypes.add(bg.Slot);
            this.TotalCount++;
            resizeArrayProperty(Terraria.Main, 'bgAlphaFrontLayer', this.TotalCount, 0);
            resizeArrayProperty(Terraria.Main, 'bgAlphaFarBackLayer', this.TotalCount, 0);
            resizeArrayProperty(Terraria.Main, 'bgFrame', this.TotalCount, 0);
            resizeArrayProperty(Terraria.Main, 'bgFrameCounter', this.TotalCount, 0);
        }
    }
    
    static PostSetupContent() {
        this.TotalCount = Terraria.Main.bgAlphaFrontLayer.length;
    }
    
    static ChooseStyle() {
        if (SceneEffectLoader.AnySceneActive) {
            if (SceneEffectLoader.CurrentScene?.SurfaceBackground) {
                return SceneEffectLoader.CurrentScene.SurfaceBackground?.Slot ?? null;
            }
        }
        return null;
    }
    
    static ModifyFarFades() {
        if (!this.isModType(Terraria.Main.bgStyle)) return;
        if (SceneEffectLoader.AnySceneActive) {
            const bg = SceneEffectLoader.CurrentScene?.SurfaceBackground;
            if (bg) bg.ModifyFarFades();
        } else if (MenuLoader.CurrentMenu?.Background) {
            const bg = MenuLoader.CurrentMenu.Background;
            if (bg) bg.ModifyFarFades();
        }
    }
    
    static DrawFarTexture() {
        if (!this.VisibleModSurfaceBackground && !(Terraria.Main.gameMenu === true && MenuLoader.CurrentMenu?.Background)) return;
        if (this.TotalCount !== Terraria.Main.bgAlphaFarBackLayer.length) {
            return;
        }
        
        for (const bg of this.Backgrounds) {
            const alpha = Number(Terraria.Main.bgAlphaFarBackLayer[bg.Slot]) || 0;
            if (alpha <= 0.001) continue;
            Terraria.Main.ColorOfSurfaceBackgroundsModified = Color.op_Multiply(Terraria.Main.ColorOfSurfaceBackgroundsBase, alpha);
            
            const textureSlot = bg.ChooseFarTexture() ?? -1;
            if (textureSlot < 0 || textureSlot >= BackgroundTextureLoader.TotalCount) continue;
            
            if (bg.ScaleMultiplier !== 1.0) {
                Terraria.Main.bgScale *= Math.max(0, bg.ScaleMultiplier);
                Terraria.Main.bgWidthScaled = Terraria.Main.backgroundWidth[textureSlot] * Terraria.Main.bgScale;
                Terraria.Main.instance.bgStartX = -MathHelper.IEEERemainder(Terraria.Main.screenPosition.X * Terraria.Main.instance.bgParallax, Terraria.Main.bgWidthScaled) - (Terraria.Main.bgWidthScaled / 2);
                Terraria.Main.instance.bgLoops = Terraria.Main.screenWidth / Terraria.Main.bgWidthScaled + 2;
            }
            
            Terraria.Main.instance.LoadBackground(textureSlot);
            const position = Vector2.Zero;
            const frame = Rectangle.new(0, 0, Terraria.Main.backgroundWidth[textureSlot], Terraria.Main.backgroundHeight[textureSlot]);
            for (let k = 0; k < Terraria.Main.instance.bgLoops; k++) {
                position.X = Terraria.Main.instance.bgStartX + Terraria.Main.bgWidthScaled * k + (bg.DrawOffsetX || 0);
                position.Y = Terraria.Main.instance.bgTopY + bg.DrawOffsetY;
                Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](
                    Terraria.GameContent.TextureAssets.Background[textureSlot].Value,
                    position, frame,
                    Terraria.Main.ColorOfSurfaceBackgroundsModified,
                    0, Vector2.Zero, Terraria.Main.bgScale, SpriteEffects.None, 0
                );
            }
        }
    }
    
    static DrawMiddleTexture() {
        if (!this.VisibleModSurfaceBackground && !(Terraria.Main.gameMenu === true && MenuLoader.CurrentMenu?.Background)) return;
        if (this.TotalCount !== Terraria.Main.bgAlphaFarBackLayer.length) {
            return;
        }
        
        for (const bg of this.Backgrounds) {
            const alpha = Number(Terraria.Main.bgAlphaFarBackLayer[bg.Slot]) || 0;
            if (alpha <= 0.001) continue;
            Terraria.Main.ColorOfSurfaceBackgroundsModified = Color.op_Multiply(Terraria.Main.ColorOfSurfaceBackgroundsBase, alpha);
            
            const textureSlot = bg.ChooseMiddleTexture() ?? -1;
            if (textureSlot < 0 || textureSlot >= BackgroundTextureLoader.TotalCount) continue;
            
            if (bg.ScaleMultiplier !== 1.0) {
                Terraria.Main.bgScale *= Math.max(0, bg.ScaleMultiplier);
                Terraria.Main.bgWidthScaled = Terraria.Main.backgroundWidth[textureSlot] * Terraria.Main.bgScale;
                Terraria.Main.instance.bgStartX = -MathHelper.IEEERemainder(Terraria.Main.screenPosition.X * Terraria.Main.instance.bgParallax, Terraria.Main.bgWidthScaled) - (Terraria.Main.bgWidthScaled / 2);
                Terraria.Main.instance.bgLoops = Terraria.Main.screenWidth / Terraria.Main.bgWidthScaled + 2;
            }
            
            Terraria.Main.instance.LoadBackground(textureSlot);
            const position = Vector2.Zero;
            const frame = Rectangle.new(0, 0, Terraria.Main.backgroundWidth[textureSlot], Terraria.Main.backgroundHeight[textureSlot]);
            for (let k = 0; k < Terraria.Main.instance.bgLoops; k++) {
                position.X = Terraria.Main.instance.bgStartX + Terraria.Main.bgWidthScaled * k + (bg.DrawOffsetX || 0);
                position.Y = Terraria.Main.instance.bgTopY + bg.DrawOffsetY;
                Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](
                    Terraria.GameContent.TextureAssets.Background[textureSlot].Value,
                    position, frame,
                    Terraria.Main.ColorOfSurfaceBackgroundsModified,
                    0, Vector2.Zero, Terraria.Main.bgScale, SpriteEffects.None, 0
                );
            }
        }
    }
    
    static DrawCloseTexture(slot) {
        const bg = this.GetBackground(Terraria.Main.bgStyle); 
        if (!bg || Terraria.Main.bgAlphaFrontLayer[bg.Slot] <= 0) return;
        
        const alpha = Terraria.Main.bgAlphaFrontLayer[bg.Slot];
        const baseColor = bg.TintWithSurfaceColor === false ? Color.White : Terraria.Main.ColorOfSurfaceBackgroundsBase;
        Terraria.Main.ColorOfSurfaceBackgroundsModified = Color.op_Multiply(baseColor, alpha);
        
        if (!bg.PreDrawCloseBackground(Terraria.Main.spriteBatch)) return;
        
        Terraria.Main.bgScale = 1.25;
        Terraria.Main.instance.bgParallax = 0.37;
        
        let a = 1800;
        let b = 1750;
        
        const textureSlot = bg.ChooseCloseTexture() ?? -1;
        if (textureSlot < 0 || textureSlot >= BackgroundTextureLoader.TotalCount) return;
        
        const info = bg.ModifyCloseTexture({ scale: Terraria.Main.bgScale, parallax: Terraria.Main.instance.bgParallax, a, b });
        Terraria.Main.bgScale = info.scale;
        Terraria.Main.instance.bgParallax = info.parallax;
        a = info.a;
        b = info.b;
        
        Terraria.Main.instance.LoadBackground(textureSlot);
        
        Terraria.Main.bgScale *= 2 * Math.max(0, bg.ScaleMultiplier);
        Terraria.Main.bgWidthScaled = Terraria.Main.backgroundWidth[textureSlot] * Terraria.Main.bgScale;
        
        Terraria.Graphics.Effects.SkyManager.Instance.DrawToDepth(Terraria.Main.spriteBatch, 1 / Terraria.Main.instance.bgParallax);
        
        Terraria.Main.instance.bgStartX = -MathHelper.IEEERemainder(Terraria.Main.screenPosition.X * Terraria.Main.instance.bgParallax, Terraria.Main.bgWidthScaled) - (Terraria.Main.bgWidthScaled / 2);
        Terraria.Main.instance.bgTopY = Terraria.Main.gameMenu ? 320 : ((-Terraria.Main.screenPosition.Y + Terraria.Main.instance.screenOff / 2) / (Terraria.Main.worldSurface * 16.0) * a + b) + Terraria.Main.instance.scAdj;
        Terraria.Main.instance.bgLoops = Terraria.Main.screenWidth / Terraria.Main.bgWidthScaled + 2;
        
        const position = Vector2.Zero;
        const frame = Rectangle.new(0, 0, Terraria.Main.backgroundWidth[textureSlot], Terraria.Main.backgroundHeight[textureSlot]);
        if (Terraria.Main.screenPosition.Y < Terraria.Main.worldSurface * 16.0 + 16.0) {
            for (let k = 0; k < Terraria.Main.instance.bgLoops; k++) {
                position.X = Terraria.Main.instance.bgStartX + Terraria.Main.bgWidthScaled * k + (bg.DrawOffsetX || 0);
                position.Y = Terraria.Main.instance.bgTopY + bg.DrawOffsetY;
                Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](
                    Terraria.GameContent.TextureAssets.Background[textureSlot].Value,
                    position, frame,
                    Terraria.Main.ColorOfSurfaceBackgroundsModified,
                    0, Vector2.Zero, Terraria.Main.bgScale, SpriteEffects.None, 0
                );
            }
        }
    }
}

export class BackgroundLoaders {
    static _hasBackgrounds = false;
    
    static SetupContent() {
        BackgroundTextureLoader.SetupContent();
        SurfaceBackgroundLoader.SetupContent();
        UndergroundBackgroundLoader.SetupContent();
    }
    
    static PostSetupContent() {
        BackgroundTextureLoader.PostSetupContent();
        SurfaceBackgroundLoader.PostSetupContent();
    }
    
    static RegisterSurfaceBG(bg) {
        this._hasBackgrounds = true;
        SurfaceBackgroundLoader.Backgrounds.push(new bg());
    }
    static RegisterUndergroundBG(bg) {
        this._hasBackgrounds = true;
        UndergroundBackgroundLoader.Backgrounds.push(new bg());
    }
    static GetBackgroundSlot(name) {
        return BackgroundTextureLoader.GetBackgroundSlot(name) ?? -1;
    }
    static getByName(name, surface = true) {
        if (surface) {
            return SurfaceBackgroundLoader.Backgrounds.find(bg => bg.constructor.name === name) ?? null;
        } else {
            return UndergroundBackgroundLoader.Backgrounds.find(bg => bg.constructor.name === name) ?? null;
        }
    }
}