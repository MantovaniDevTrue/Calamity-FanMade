import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { PlayMenuTickSound } from '../../Common/Snippets/LegacySoundCompat.js';

const Main = new NativeClass('Terraria', 'Main');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const FontAssets = new NativeClass('Terraria.GameContent', 'FontAssets');
const ChatManager = new NativeClass('Terraria.UI.Chat', 'ChatManager');
let TouchPanel = null;
try {
    TouchPanel = new NativeClass('Microsoft.Xna.Framework.Input.Touch', 'TouchPanel');
} catch (e) {
    TouchPanel = null;
}

const DrawText = ChatManager['void DrawColorCodedStringShadow(SpriteBatch spriteBatch, SpriteFont font, string text, Vector2 position, Color baseColor, float rotation, Vector2 origin, Vector2 baseScale, float maxWidth, float spread)'];
function Vec(x, y) {
    const v = Vector2.new();
    v.X = Number(x);
    v.Y = Number(y);
    return v;
}

function Rect(x, y, w, h) {
    const r = Rectangle.new();
    r.X = Math.round(x);
    r.Y = Math.round(y);
    r.Width = Math.max(1, Math.round(w));
    r.Height = Math.max(1, Math.round(h));
    return r;
}

function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
}

function Tint(color, amount) {
    try {
        return Color.op_Multiply(color, Number(amount));
    } catch (e) { }
    try {
        return Color.Multiply(color, Number(amount));
    } catch (e) { }
    return color;
}

function DrawRectangle(texture, x, y, width, height, color) {
    if (!texture)
        return;
    Main.spriteBatch['void Draw(Texture2D texture, Rectangle destinationRectangle, Color color)'](texture, Rect(x, y, width, height), color);
}

function DrawTexture(texture, x, y, scale, color) {
    if (!texture)
        return;
    Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](texture, Vec(x, y), null, color, 0, Vec(texture.Width / 2, texture.Height / 2), scale, SpriteEffects.None, 0);
}

function DrawCenteredText(text, x, y, scale, color) {
    try {
        const font = FontAssets.MouseText.Value;
        const value = String(text);
        const size = font['Vector2 MeasureString(string text)'](value);
        DrawText(Main.spriteBatch, font, value, Vec(x, y), color, 0, Vec(size.X / 2, size.Y / 2), Vec(scale, scale), -1, 0);
    } catch (e) { }
}

export class BrittleStarModeUIHooks extends GlobalHooks {
    constructor() {
        super();
        this.Pixel = null;
        this.StarTexture = null;
        this.TexturesLoaded = false;
        this.PreviousRawTouchIds = {};
        this.RawHeld = false;
        this.WorldTouchLocked = false;
        this.MouseTouchLocked = false;
        this.RawTouchAvailable = false;
        this.LastRawTouchCount = 0;
        this.WorldTouchAvailable = false;
        this.LastInputSource = 'none';
        this.LastTouchX = -1;
        this.LastTouchY = -1;
        this.LastTouchError = '';
        this.UnifiedTouchLocked = false;
        this.LastToggleTick = -1000;
        this.CachedPlayerState = null;
        this.CachedWorldState = null;
        this.CachedSaharaUI = null;
        this.SaharaDrawFailed = false;
        this.CachedWulfrumUI = null;
        this.WulfrumDrawFailed = false;
    }

    Initialize() {
        Main['void Initialize_AlmostEverything()'].hook((original, self) => {
            original(self);
            this.LoadTextures();
            try {
                const saharaUI = this.CachedSaharaUI || (this.CachedSaharaUI = GlobalHooks.getByName('SaharaSlicersUIHooks'));
                if (saharaUI && saharaUI.LoadTextures)
                    saharaUI.LoadTextures();
            } catch (e) {
                tl.log(`[CalamityPort] Shared Sahara UI texture load failed: ${e}`);
            }
            try {
                const wulfrumUI = this.CachedWulfrumUI || (this.CachedWulfrumUI = GlobalHooks.getByName('WulfrumBastionUIHooks'));
                if (wulfrumUI && wulfrumUI.LoadTextures)
                    wulfrumUI.LoadTextures();
            } catch (e) {
                tl.log(`[CalamityPort] Shared Wulfrum UI texture load failed: ${e}`);
            }
            try {
                const trophyDraw = GlobalHooks.getByName('DesertScourgeTrophyDrawHooks');
                if (trophyDraw && trophyDraw.EnsureTexture)
                    trophyDraw.EnsureTexture();
                if (trophyDraw && trophyDraw.EnsureRelicTexture)
                    trophyDraw.EnsureRelicTexture();
            } catch (e) {
                tl.log(`[CalamityPort] Shared Desert Scourge trophy texture load failed: ${e}`);
            }
        });
        Main.DrawInterface_14_EntityHealthBars.hook((original, self, ...args) => {
            const result = original(self, ...args);
            this.Draw();
            if (!this.SaharaDrawFailed) {
                try {
                    const saharaUI = this.CachedSaharaUI || (this.CachedSaharaUI = GlobalHooks.getByName('SaharaSlicersUIHooks'));
                    if (saharaUI && saharaUI.Draw)
                        saharaUI.Draw();
                } catch (e) {
                    this.SaharaDrawFailed = true;
                    tl.log(`[CalamityPort] Shared Sahara UI draw disabled after failure: ${e}`);
                }
            }
            if (!this.WulfrumDrawFailed) {
                try {
                    const wulfrumUI = this.CachedWulfrumUI || (this.CachedWulfrumUI = GlobalHooks.getByName('WulfrumBastionUIHooks'));
                    if (wulfrumUI && wulfrumUI.Draw)
                        wulfrumUI.Draw();
                } catch (e) {
                    this.WulfrumDrawFailed = true;
                    tl.log(`[CalamityPort] Shared Wulfrum UI draw disabled after failure: ${e}`);
                }
            }
            return result;
        });
    }

    OnWorldUnload() {
        this.PreviousRawTouchIds = {};
        this.RawHeld = false;
        this.WorldTouchLocked = false;
        this.MouseTouchLocked = false;
        this.LastInputSource = 'none';
        this.UnifiedTouchLocked = false;
        this.LastToggleTick = -1000;
        this.SaharaDrawFailed = false;
        this.WulfrumDrawFailed = false;
    }

    LoadTextures() {
        try {
            this.Pixel = tl.texture.load('Textures/Menus/BlankPixel.png');
            this.StarTexture = tl.texture.load('Textures/Projectiles/Summon/BrittleStarMinion.png');
            this.TexturesLoaded = !!this.Pixel;
        } catch (e) {
            this.TexturesLoaded = false;
            tl.log(`[CalamityPort] Brittle Star button texture load failed: ${e}`);
        }
    }

    PointInside(x, y, button) {
        return Number(x) >= button.x - button.width / 2 && Number(x) <= button.x + button.width / 2 &&
            Number(y) >= button.y - button.height / 2 && Number(y) <= button.y + button.height / 2;
    }

    BlockGameInput(player) {
        try {
            player.mouseInterface = true;
            player.controlUseItem = false;
            player.controlUseTile = false;
            player.releaseUseItem = true;
            player.releaseUseTile = true;
            Main.blockMouse = true;
        } catch (e) { }
    }

    GetTouchCollection() {
        if (!TouchPanel)
            return null;
        try {
            if (TouchPanel.GetState)
                return TouchPanel.GetState();
        } catch (e) { }
        try {
            const getState = TouchPanel['TouchCollection GetState()'];
            if (getState)
                return getState();
        } catch (e) { }
        return null;
    }

    GetTouchAt(collection, index) {
        try {
            if (collection.get_Item)
                return collection.get_Item(index);
        } catch (e) { }
        try {
            const getter = collection['TouchLocation get_Item(int index)'];
            if (getter)
                return getter(index);
        } catch (e) { }
        try {
            return collection[index];
        } catch (e) { }
        return null;
    }

    ReadRawTouches() {
        const points = [];
        this.LastRawTouchCount = 0;
        try {
            const collection = this.GetTouchCollection();
            if (!collection) {
                this.RawTouchAvailable = false;
                return points;
            }
            const count = Math.max(0, Math.floor(Number(collection.Count) || 0));
            this.RawTouchAvailable = true;
            this.LastRawTouchCount = count;
            this.LastTouchError = '';
            let displayWidth = Number(Main.screenWidth);
            let displayHeight = Number(Main.screenHeight);
            try {
                const rawWidth = Number(TouchPanel.DisplayWidth);
                const rawHeight = Number(TouchPanel.DisplayHeight);
                if (rawWidth > 0)
                    displayWidth = rawWidth;
                if (rawHeight > 0)
                    displayHeight = rawHeight;
            } catch (e) { }
            const scaleX = Number(Main.screenWidth) / Math.max(1, displayWidth);
            const scaleY = Number(Main.screenHeight) / Math.max(1, displayHeight);
            for (let i = 0; i < count; i++) {
                const touch = this.GetTouchAt(collection, i);
                if (!touch || !touch.Position)
                    continue;
                const stateNumber = Number(touch.State);
                const stateText = String(touch.State || '').toLowerCase();
                const activeByNumber = Number.isFinite(stateNumber) ? stateNumber >= 2 : true;
                const activeByText = !stateText.includes('released') && !stateText.includes('invalid');
                if (!(activeByNumber && activeByText))
                    continue;
                const x = Number(touch.Position.X) * scaleX;
                const y = Number(touch.Position.Y) * scaleY;
                if (!Number.isFinite(x) || !Number.isFinite(y))
                    continue;
                let id = Number(touch.Id);
                if (!Number.isFinite(id))
                    id = i;
                points.push({ id: String(id), x, y, pressed: stateNumber === 2 || stateText.includes('pressed') });
            }
        } catch (e) {
            this.RawTouchAvailable = false;
            this.LastTouchError = String(e);
        }
        return points;
    }

    Toggle(state, player, source, x, y) {
        const tick = Number(Main.GameUpdateCount || 0);
        if (tick - this.LastToggleTick < 8)
            return false;
        this.LastToggleTick = tick;
        this.BlockGameInput(player);
        this.LastInputSource = source;
        this.LastTouchX = Math.round(Number(x));
        this.LastTouchY = Math.round(Number(y));
        const changed = state.ToggleBrittleStarDefenseMode(player, true);
        if (changed) {
            try {
                PlayMenuTickSound(Terraria.PlayerCenter(player), state.BrittleStarDefenseMode ? 0.25 : -0.1, 0.8);
            } catch (e) { }
        }
        return changed;
    }

    ProcessInput(state, player, button) {
        const currentIds = {};
        const touches = this.ReadRawTouches();
        let rawInside = false;
        let rawTrigger = false;
        let rawX = -1;
        let rawY = -1;
        for (const touch of touches) {
            currentIds[touch.id] = true;
            if (!this.PointInside(touch.x, touch.y, button))
                continue;
            rawInside = true;
            rawX = touch.x;
            rawY = touch.y;
            const newTouch = touch.pressed || !this.PreviousRawTouchIds[touch.id] || !this.RawHeld;
            if (newTouch)
                rawTrigger = true;
        }
        this.PreviousRawTouchIds = currentIds;
        this.RawHeld = rawInside;
        let worldDown = false;
        let worldReleased = false;
        let worldX = -1;
        let worldY = -1;
        try {
            worldDown = Main.worldMouseLeft === true;
            worldReleased = Main.worldMouseLeftRelease === true;
            worldX = Number(Main.worldMouseX);
            worldY = Number(Main.worldMouseY);
            this.WorldTouchAvailable = Number.isFinite(worldX) && Number.isFinite(worldY);
        } catch (e) {
            this.WorldTouchAvailable = false;
        }
        const worldInside = worldDown && this.WorldTouchAvailable && this.PointInside(worldX, worldY, button);
        const mouseDown = Main.mouseLeft === true;
        const mouseInside = mouseDown && this.PointInside(Main.mouseX, Main.mouseY, button);
        const anyHeldInside = rawInside || worldInside || mouseInside;
        if (!anyHeldInside)
            this.UnifiedTouchLocked = false;
        if (anyHeldInside)
            this.BlockGameInput(player);
        if (this.UnifiedTouchLocked)
            return;
        if (rawTrigger) {
            this.UnifiedTouchLocked = true;
            this.Toggle(state, player, 'raw-touch', rawX, rawY);
            return;
        }
        if (worldInside && worldReleased) {
            this.UnifiedTouchLocked = true;
            try {
                Main.worldMouseLeftRelease = false;
            } catch (e) { }
            this.Toggle(state, player, 'world-touch', worldX, worldY);
            return;
        }
        if (mouseInside) {
            this.UnifiedTouchLocked = true;
            this.Toggle(state, player, 'mouse-fallback', Main.mouseX, Main.mouseY);
        }
    }

    DrawButton(state, count, button) {
        const defense = state.BrittleStarDefenseMode === true;
        const left = button.x - button.width / 2;
        const top = button.y - button.height / 2;
        const border = defense ? Color.Gold : Color.Cyan;
        const inner = defense ? Tint(Color.Gold, 0.30) : Tint(Color.Cyan, 0.22);
        DrawRectangle(this.Pixel, left, top, button.width, button.height, border);
        DrawRectangle(this.Pixel, left + 2, top + 2, button.width - 4, button.height - 4, Tint(Color.Black, 0.78));
        DrawRectangle(this.Pixel, left + 5, top + 5, button.width - 10, button.height - 10, inner);
        if (this.StarTexture)
            DrawTexture(this.StarTexture, left + 23 * button.scale, button.y, 0.72 * button.scale, Color.White);
        const textX = button.x + 12 * button.scale;
        DrawCenteredText(defense ? 'ESTRELAS: DEFESA' : 'ESTRELAS: ATAQUE', textX, button.y - 7 * button.scale, 0.36 * button.scale, Color.White);
        DrawCenteredText(defense ? `+${count * 3} DEFESA` : 'TOQUE PARA ALTERNAR', textX, button.y + 8 * button.scale, 0.29 * button.scale, defense ? Color.LightGoldenrodYellow : Color.LightCyan);
    }

    Draw() {
        if (!this.TexturesLoaded || Main.gameMenu || Main.hideUI)
            return;
        const player = Main.player[Main.myPlayer];
        const state = this.CachedPlayerState || (this.CachedPlayerState = ModPlayer.getByName('CalamityPlayerState'));
        if (!player || !player.active || player.dead || !state)
            return;
        const count = state.CountBrittleStars(player);
        if (count <= 0)
            return;
        const worldState = this.CachedWorldState || (this.CachedWorldState = ModSystem.getByName('CalamityWorldState'));
        const revengeance = !!(worldState && worldState.RevengeanceMode === true);
        const scale = Clamp(Number(Main.UIScale || 1), 0.90, 1.22);
        const button = {
            x: Math.round(Main.screenWidth * 0.50),
            y: Math.round((revengeance ? 150 : 88) * scale),
            width: 176 * scale,
            height: 44 * scale,
            scale
        };
        this.ProcessInput(state, player, button);
        this.DrawButton(state, count, button);
    }
}
