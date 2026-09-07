import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModPlayer } from './../../TL/ModPlayer.js';

const Main = new NativeClass('Terraria', 'Main');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
function V(x, y) {
    const v = Vector2.new();
    v.X = Number(x);
    v.Y = Number(y);
    return v;
}

function R(x, y, w, h) {
    const r = Rectangle.new();
    r.X = Math.floor(x);
    r.Y = Math.floor(y);
    r.Width = Math.max(1, Math.floor(w));
    r.Height = Math.max(1, Math.floor(h));
    return r;
}

function Draw(texture, position, source, origin, scale, color) {
    Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](texture, position, source, color, 0, origin, scale, SpriteEffects.None, 0);
}

export class RogueStealthUIHooks extends GlobalHooks {
    constructor() {
        super();
        this.Loaded = false;
        this.Meter = null;
        this.Bar = null;
        this.BarFull = null;
        this.Indicator = null;
        this.CachedState = null;
    }

    Initialize() {
        Main['void Initialize_AlmostEverything()'].hook((original, self) => {
            original(self);
            this.LoadTextures();
        });
        Main.DrawInterface_14_EntityHealthBars.hook((original, self, ...args) => {
            const result = original(self, ...args);
            this.DrawMeter();
            return result;
        });
    }

    LoadTextures() {
        try {
            this.Meter = tl.texture.load('Textures/UI/Rogue/StealthMeter.png');
            this.Bar = tl.texture.load('Textures/UI/Rogue/StealthMeterBar.png');
            this.BarFull = tl.texture.load('Textures/UI/Rogue/StealthMeterBarFull.png');
            this.Indicator = tl.texture.load('Textures/UI/Rogue/StealthMeterStrikeIndicator.png');
            this.Loaded = !!(this.Meter && this.Bar && this.BarFull && this.Indicator);
        } catch (e) {
            this.Loaded = false;
        }
    }

    DrawMeter() {
        if (!this.Loaded || Main.gameMenu || Main.playerInventory || Main.hideUI)
            return;
        const player = Main.player[Main.myPlayer];
        if (!player || player.dead)
            return;
        const state = this.CachedState || (this.CachedState = ModPlayer.getByName('CalamityPlayerState'));
        if (!state || state.WearingRogueArmor !== true || !(Number(state.RogueStealthMax) > 0))
            return;
        const ratio = Math.max(0, Math.min(1, Number(state.RogueStealth) / Math.max(0.001, Number(state.RogueStealthMax))));
        const scale = 1.35;
        const x = Number(Main.screenWidth) * 0.5;
        const y = Number(Main.screenHeight) - 112;
        const origin = V(this.Meter.Width / 2, this.Meter.Height / 2);
        Draw(this.Meter, V(x, y), null, origin, scale, Color.White);
        const bar = ratio >= 0.999 ? this.BarFull : this.Bar;
        const cropW = Math.max(0, Math.floor(bar.Width * ratio));
        if (cropW > 0) {
            const src = R(0, 0, cropW, bar.Height);
            const bx = x - (this.Meter.Width * 0.5 - 8) * scale;
            Draw(bar, V(bx, y), src, V(0, bar.Height / 2), scale, Color.White);
        }
        if (ratio >= 0.999)
            Draw(this.Indicator, V(x, y), null, origin, scale, Color.White);
    }
}
