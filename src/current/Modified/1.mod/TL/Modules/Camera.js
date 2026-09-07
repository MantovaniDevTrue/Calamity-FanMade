import { Terraria, Modules } from './../ModImports.js';
import { Color } from './Color.js';
import { Vector2 } from './Vector2.js';
import { Rectangle } from './Rectangle.js';

export class Camera {
    /**
     * Adds a fade to the camera for a few ticks.
     * ex: Camera.Fade(Color.White, 5, 30, 5);
     * 
     * @param {object} color - The color of the fade.
     * @param {number} fadeIn - The time to darken.
     * @param {number} holdTime - The time the fade will last, in ticks.
     * @param {number} fadeOut - The time to lighten.
     */
    static Fade(color = null, fadeIn = 5, holdTime = 60, fadeOut = 5) {
        FadeController.Start(color, fadeIn, holdTime, fadeOut);
    }
    
    /**
     * Adds a screen shake for a few ticks.
     * ex: Camera.Shake(60, 0.3);
     * 
     * @param {number} time - The shaking time in ticks.
     * @param {number} intensity - The shaking intensity.
     */
    static Shake(time, intensity) {
        CameraShake.Add(time, intensity);
    }
}

// The modules below are for internal use; use only the Camera module.

export class FadeController {
    static _active = false;
    static _color = null;
    static _alpha = 0;
    
    static fadeInSpeed = 5;
    static holdTime = 30;
    static fadeOutSpeed = 5;
    
    static _state = 0;
    static _timer = 0;
    
    static Start(color = null, fadeInSpeed = 5, holdTime = 30, fadeOutSpeed = 5) {
        if (this._active) return;
        
        this._color = color;
        this.fadeInSpeed = Math.floor(fadeInSpeed);
        this.fadeOutSpeed = Math.floor(fadeOutSpeed);
        this.holdTime = Math.floor(holdTime);
        
        this._alpha = 0;
        this._state = 0;
        this._timer = 0;
        this._active = true;
    }
    
    static Update() {
        if (!this._active || Terraria.Main.gameMenu) return;
        if (this._state === 0) {
            if (!Terraria.Main.gamePaused && !Terraria.Main.gameInactive)
                this._alpha += this.fadeInSpeed;
            if (this._alpha >= 255) {
                this._alpha = 255;
                this._state = 1;
            }
        } else if (this._state === 1) {
            if (!Terraria.Main.gamePaused && !Terraria.Main.gameInactive)
                this._timer++;
            if (this._timer >= this.holdTime) this._state = 2;
        } else if (this._state === 2) {
            if (!Terraria.Main.gamePaused && !Terraria.Main.gameInactive)
                this._alpha -= this.fadeOutSpeed;
            if (this._alpha <= 0) this.Clear();
        }
        if (this._alpha > 0) this.Draw();
    }
    
    static Draw() {
        if (!this._color) this._color = Color.getByName('Black');
        const px = Terraria.GameContent.TextureAssets.MagicPixel.Value;
        const w = Terraria.Main.screenWidth;
        const h = Terraria.Main.screenHeight;
        Terraria.Main.spriteBatch['void Draw(Texture2D texture, Rectangle destinationRectangle, Color color)'](
            px, Rectangle.new(-w * 0.15, -h * 0.15, w * 1.2, h * 1.2),
            Color.op_Multiply(this._color, this._alpha / 255)
        );
    }
    
    static Clear() {
        this._alpha = 0;
        this._state = 0;
        this._timer = 0;
        this._active = false;
    }
}

export class CameraShake {
    static _time = 0;
    static _intensity = 0;
    static _offsetX = 0;
    static _offsetY = 0;
    
    static Add(time, intensity) {
        this._time = Math.floor(time);
        this._intensity = intensity;
    }
    
    static Update() {
        if (Terraria.Main.gameMenu) return;
        if (this._time > 0) {
            if (!Terraria.Main.gamePaused && !Terraria.Main.gameInactive) {
                this._time--;
                this._offsetX = (Math.random() * 2 - 1) * this._intensity;
                this._offsetY = (Math.random() * 2 - 1) * this._intensity;
            }
            if (!Terraria.Main.DisableCameraShake) this.Apply(Terraria.Main.screenPosition);
        } else {
            this._offsetX = 0;
            this._offsetY = 0;
        }
    }
    
    static Apply(pos) {
        pos.X += this._offsetX;
        pos.Y += this._offsetY;
        Terraria.Main.screenPosition = pos;
    }
    
    static Clear() {
        this._color = null;
        this.fadeInSpeed = 5;
        this.holdTime = 30;
        this.fadeOutSpeed = 5;
        this._time = 0;
        this._intensity = 0;
        this._offsetX = 0;
        this._offsetY = 0;
    }
}