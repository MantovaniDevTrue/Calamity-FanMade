import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModSystem } from './../../TL/ModSystem.js';

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
const TextSizeCache = new Map();
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
    } catch (e) {
        try {
            return Color.Multiply(color, Number(amount));
        } catch (e2) {
            return color;
        }
    }
}

function DrawTexture(texture, position, source, origin, scale, color = Color.White) {
    if (!texture)
        return;
    Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](texture, position, source, color, 0, origin, scale, SpriteEffects.None, 0);
}

function DrawRectangle(texture, x, y, width, height, color) {
    if (!texture)
        return;
    Main.spriteBatch['void Draw(Texture2D texture, Rectangle destinationRectangle, Color color)'](texture, Rect(x, y, width, height), color);
}

function DrawCenteredText(text, x, y, scale, color) {
    try {
        const font = FontAssets.MouseText.Value;
        const value = String(text);
        let size = TextSizeCache.get(value);
        if (!size) {
            const measured = font['Vector2 MeasureString(string text)'](value);
            size = { x: Number(measured.X) || 0, y: Number(measured.Y) || 0 };
            if (TextSizeCache.size < 256) TextSizeCache.set(value, size);
        }
        DrawText(Main.spriteBatch, font, value, Vec(x, y), color, 0, Vec(size.x / 2, size.y / 2), Vec(scale, scale), -1, 0);
    } catch (e) { }
}

export class RipperUIHooks extends GlobalHooks {
    constructor() {
        super();
        this.TexturesLoaded = false;
        this.RageBar = null;
        this.RageBorder = null;
        this.RageAnimation = null;
        this.AdrenalineBar = null;
        this.AdrenalineBorder = null;
        this.AdrenalineBorderFull = null;
        this.AdrenalineAnimation = null;
        this.Pixel = null;
        this.RageAnimFrame = -1;
        this.RageAnimTimer = 0;
        this.AdrenalineAnimFrame = -1;
        this.AdrenalineAnimTimer = 0;
        this.MouseTouchLocked = false;
        this.WorldTouchLocked = false;
        this.PreviousRawTouchIds = {};
        this.RawRageHeld = false;
        this.RawAdrenalineHeld = false;
        this.RawTouchAvailable = false;
        this.LastRawTouchCount = 0;
        this.LastInputSource = 'none';
        this.WorldTouchAvailable = false;
        this.LastWorldMouseX = -1;
        this.LastWorldMouseY = -1;
        this.LastTouchX = -1;
        this.LastTouchY = -1;
        this.LastActivation = 'none';
        this.UnifiedTouchLocked = false;
        this.LastActivationTick = -1000;
        this.LastTouchError = '';
        this.CachedPlayerState = null;
        this.CachedWorldState = null;
        this.NextTextureRetryTick = 0;
        this.HudReadyLogged = false;
    }

    Initialize() {
        Main['void Initialize_AlmostEverything()'].hook((original, self) => {
            original(self);
            this.LoadTextures();
        });
        Main.DrawInterface_14_EntityHealthBars.hook((original, self, ...args) => {
            // Boss-bar behavior lives in the standalone Boss Bar mod.
            // Calamity only uses this hook as a stable post-native UI draw point for Rippers.
            const result = original(self, ...args);
            this.Draw();
            return result;
        });
    }

    OnWorldUnload() {
        this.RageAnimFrame = -1;
        this.RageAnimTimer = 0;
        this.AdrenalineAnimFrame = -1;
        this.AdrenalineAnimTimer = 0;
        this.MouseTouchLocked = false;
        this.WorldTouchLocked = false;
        this.PreviousRawTouchIds = {};
        this.RawRageHeld = false;
        this.RawAdrenalineHeld = false;
        this.LastInputSource = 'none';
        this.LastActivation = 'none';
        this.UnifiedTouchLocked = false;
        this.LastActivationTick = -1000;
        this.HudReadyLogged = false;
        this.CachedPlayerState = null;
        this.CachedWorldState = null;
    }

    LoadTextures() {
        try {
            this.RageBar = tl.texture.load('Textures/UI/Rippers/RageBar.png');
            this.RageBorder = tl.texture.load('Textures/UI/Rippers/RageBarBorder.png');
            this.RageAnimation = tl.texture.load('Textures/UI/Rippers/RageFullAnimation.png');
            this.AdrenalineBar = tl.texture.load('Textures/UI/Rippers/AdrenalineBar.png');
            this.AdrenalineBorder = tl.texture.load('Textures/UI/Rippers/AdrenalineBarBorder.png');
            this.AdrenalineBorderFull = tl.texture.load('Textures/UI/Rippers/AdrenalineBarBorderFull.png');
            this.AdrenalineAnimation = tl.texture.load('Textures/UI/Rippers/AdrenalineFullAnimation.png');
            this.Pixel = tl.texture.load('Textures/Menus/BlankPixel.png');
            this.TexturesLoaded = !!(this.RageBar && this.RageBorder && this.AdrenalineBar && this.AdrenalineBorder && this.Pixel);
        } catch (e) {
            this.TexturesLoaded = false;
            tl.log(`[CalamityPort] Ripper UI texture load failed: ${e}`);
        }
    }

    PointInside(x, y, centerX, centerY, width, height) {
        return Number(x) >= centerX - width / 2 && Number(x) <= centerX + width / 2 &&
            Number(y) >= centerY - height / 2 && Number(y) <= centerY + height / 2;
    }

    IsMouseHovered(centerX, centerY, width, height) {
        return this.PointInside(Number(Main.mouseX), Number(Main.mouseY), centerX, centerY, width, height);
    }

    BlockGameInput(player) {
        try {
            if (player) {
                player.mouseInterface = true;
                player.controlUseItem = false;
                player.controlUseTile = false;
                player.releaseUseItem = true;
                player.releaseUseTile = true;
            }
            if (Main.LocalPlayer)
                Main.LocalPlayer.mouseInterface = true;
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
                const pressed = stateNumber === 2 || stateText.includes('pressed');
                points.push({ id: String(id), x, y, pressed });
            }
        } catch (e) {
            this.RawTouchAvailable = false;
            this.LastTouchError = String(e);
        }
        return points;
    }

    Activate(state, player, which, source, x, y) {
        let tick = 0;
        try { tick = Math.floor(Number(Main.GameUpdateCount) || 0); } catch (_) { }
        if (tick - this.LastActivationTick < 8)
            return false;
        this.LastActivationTick = tick;
        this.BlockGameInput(player);
        this.LastInputSource = source;
        this.LastTouchX = Math.round(Number(x));
        this.LastTouchY = Math.round(Number(y));
        this.LastActivation = which;
        let activated = false;
        if (which === 'rage')
            activated = state.TryActivateRage(player, true) === true;
        else
            activated = state.TryActivateAdrenaline(player, true) === true;
        return activated;
    }

    ProcessActivationButtons(state, player, rageButton, adrenalineButton) {
        const rageReady = state.RageModeActive !== true && Number(state.Rage) >= Number(state.RageMax) - 0.001;
        const adrenalineReady = state.AdrenalineModeActive !== true && Number(state.Adrenaline) >= Number(state.AdrenalineMax) - 0.001;
        if (!rageReady && !adrenalineReady) {
            this.PreviousRawTouchIds = {};
            this.RawRageHeld = false;
            this.RawAdrenalineHeld = false;
            this.UnifiedTouchLocked = false;
            return;
        }

        // Reuse the same mobile input path as the already-working Wulfrum/Sahara UI.
        // Raw TouchPanel is only queried while a Ripper is actually ready, so it cannot
        // reintroduce the old always-on reflection/performance cost.
        const currentIds = {};
        const touches = this.ReadRawTouches();
        let rawKind = '';
        let rawTrigger = false;
        let rawX = -1;
        let rawY = -1;
        let rawRageHeld = false;
        let rawAdrenalineHeld = false;
        for (const touch of touches) {
            currentIds[touch.id] = true;
            const overRage = rageReady && this.PointInside(touch.x, touch.y, rageButton.x, rageButton.y, rageButton.width + 20, rageButton.height + 16);
            const overAdrenaline = adrenalineReady && this.PointInside(touch.x, touch.y, adrenalineButton.x, adrenalineButton.y, adrenalineButton.width + 20, adrenalineButton.height + 16);
            if (!overRage && !overAdrenaline)
                continue;
            rawKind = overRage ? 'rage' : 'adrenaline';
            rawX = touch.x;
            rawY = touch.y;
            if (overRage) rawRageHeld = true;
            if (overAdrenaline) rawAdrenalineHeld = true;
            const wasHeld = overRage ? this.RawRageHeld : this.RawAdrenalineHeld;
            if (touch.pressed || !this.PreviousRawTouchIds[touch.id] || !wasHeld)
                rawTrigger = true;
        }
        this.PreviousRawTouchIds = currentIds;
        this.RawRageHeld = rawRageHeld;
        this.RawAdrenalineHeld = rawAdrenalineHeld;

        let worldDown = false;
        let worldReleased = false;
        let worldX = -1;
        let worldY = -1;
        try {
            worldDown = Main.worldMouseLeft === true;
            worldReleased = Main.worldMouseLeftRelease === true;
            worldX = Number(Main.worldMouseX);
            worldY = Number(Main.worldMouseY);
        } catch (_) { }
        const worldRage = rageReady && worldDown && this.PointInside(worldX, worldY, rageButton.x, rageButton.y, rageButton.width + 20, rageButton.height + 16);
        const worldAdrenaline = adrenalineReady && worldDown && this.PointInside(worldX, worldY, adrenalineButton.x, adrenalineButton.y, adrenalineButton.width + 20, adrenalineButton.height + 16);

        let mouseDown = false;
        let mouseX = -1;
        let mouseY = -1;
        try {
            mouseDown = Main.mouseLeft === true;
            mouseX = Number(Main.mouseX);
            mouseY = Number(Main.mouseY);
        } catch (_) { }
        const mouseRage = rageReady && mouseDown && this.PointInside(mouseX, mouseY, rageButton.x, rageButton.y, rageButton.width + 20, rageButton.height + 16);
        const mouseAdrenaline = adrenalineReady && mouseDown && this.PointInside(mouseX, mouseY, adrenalineButton.x, adrenalineButton.y, adrenalineButton.width + 20, adrenalineButton.height + 16);

        const heldInside = rawRageHeld || rawAdrenalineHeld || worldRage || worldAdrenaline || mouseRage || mouseAdrenaline;
        if (!heldInside)
            this.UnifiedTouchLocked = false;
        if (heldInside)
            this.BlockGameInput(player);
        if (this.UnifiedTouchLocked)
            return;

        if (rawTrigger && rawKind) {
            this.UnifiedTouchLocked = true;
            this.Activate(state, player, rawKind, 'raw-touch', rawX, rawY);
            return;
        }
        if ((worldRage || worldAdrenaline) && worldReleased) {
            this.UnifiedTouchLocked = true;
            try { Main.worldMouseLeftRelease = false; } catch (_) { }
            this.Activate(state, player, worldRage ? 'rage' : 'adrenaline', 'world-touch', worldX, worldY);
            return;
        }
        if (mouseRage || mouseAdrenaline) {
            this.UnifiedTouchLocked = true;
            this.Activate(state, player, mouseRage ? 'rage' : 'adrenaline', 'mouse-fallback', mouseX, mouseY);
        }
    }

    UpdateFullAnimation(value, maxValue, which) {
        const full = Number(value) >= Number(maxValue) - 0.001;
        if (which === 'rage') {
            if (full && this.RageAnimFrame < 0)
                this.RageAnimFrame = 0;
            if (!full && this.RageAnimFrame >= 10)
                this.RageAnimFrame = -1;
            if (this.RageAnimFrame >= 0 && this.RageAnimFrame < 10) {
                this.RageAnimTimer++;
                if (this.RageAnimTimer >= 6) {
                    this.RageAnimTimer = 0;
                    this.RageAnimFrame++;
                }
            }
        } else {
            if (full && this.AdrenalineAnimFrame < 0)
                this.AdrenalineAnimFrame = 0;
            if (!full && this.AdrenalineAnimFrame >= 10)
                this.AdrenalineAnimFrame = -1;
            if (this.AdrenalineAnimFrame >= 0 && this.AdrenalineAnimFrame < 10) {
                this.AdrenalineAnimTimer++;
                if (this.AdrenalineAnimTimer >= 5) {
                    this.AdrenalineAnimTimer = 0;
                    this.AdrenalineAnimFrame++;
                }
            }
        }
    }

    DrawRage(state, x, y, scale) {
        const ratio = Clamp(state.Rage / state.RageMax, 0, 1);
        this.UpdateFullAnimation(state.Rage, state.RageMax, 'rage');
        const shakeX = state.RageModeActive ? (Math.random() * 3 - 1.5) : 0;
        const shakeY = state.RageModeActive ? (Math.random() * 3 - 1.5) : 0;
        const pos = Vec(x + shakeX, y + shakeY);
        const origin = Vec(this.RageBorder.Width / 2, this.RageBorder.Height / 2);
        DrawTexture(this.RageBorder, pos, null, origin, scale);
        const cropWidth = Math.floor(this.RageBar.Width * ratio);
        if (cropWidth > 0) {
            const crop = Rect(0, 0, cropWidth, this.RageBar.Height);
            const offset = (this.RageBorder.Width - this.RageBar.Width) * 0.5;
            DrawTexture(this.RageBar, Vec(pos.X + offset * scale, pos.Y), crop, origin, scale);
        }
        if (this.RageAnimFrame >= 0 && this.RageAnimFrame < 10 && this.RageAnimation) {
            const frameHeight = Math.floor(this.RageAnimation.Height / 10) - 1;
            const source = Rect(0, (frameHeight + 1) * this.RageAnimFrame, this.RageAnimation.Width, frameHeight);
            const xOffset = (this.RageBorder.Width - this.RageAnimation.Width) / 2;
            const yOffset = (this.RageBorder.Height - frameHeight) / 2;
            DrawTexture(this.RageAnimation, Vec(pos.X + xOffset * scale, pos.Y + yOffset * scale), source, origin, scale);
        }
        const percent = Math.floor(ratio * 100);
        DrawCenteredText(state.RageModeActive ? `RAGE ${percent}%` : `${percent}%`, x, y + 1, 0.55 * scale, Color.White);
    }

    DrawAdrenaline(state, x, y, scale) {
        const ratio = Clamp(state.Adrenaline / state.AdrenalineMax, 0, 1);
        this.UpdateFullAnimation(state.Adrenaline, state.AdrenalineMax, 'adrenaline');
        const useFull = ratio >= 1 || state.AdrenalineModeActive;
        const border = useFull ? this.AdrenalineBorderFull : this.AdrenalineBorder;
        const frames = useFull ? 6 : 12;
        const frameHeight = Math.floor(border.Height / frames) - 1;
        const borderSource = Rect(0, 0, border.Width, frameHeight);
        const shakeX = state.AdrenalineModeActive ? (Math.random() * 3 - 1.5) : 0;
        const shakeY = state.AdrenalineModeActive ? (Math.random() * 3 - 1.5) : 0;
        const pos = Vec(x + shakeX, y + shakeY);
        const origin = Vec(border.Width / 2, frameHeight / 2);
        DrawTexture(border, pos, borderSource, origin, scale);
        const cropWidth = Math.floor(this.AdrenalineBar.Width * ratio);
        if (cropWidth > 0) {
            const crop = Rect(0, 0, cropWidth, this.AdrenalineBar.Height);
            const offset = (border.Width - this.AdrenalineBar.Width) * 0.5;
            DrawTexture(this.AdrenalineBar, Vec(pos.X + offset * scale, pos.Y + 2 * scale), crop, origin, scale);
        }
        if (this.AdrenalineAnimFrame >= 0 && this.AdrenalineAnimFrame < 10 && this.AdrenalineAnimation) {
            const animFrameHeight = Math.floor(this.AdrenalineAnimation.Height / 10) - 1;
            const source = Rect(0, (animFrameHeight + 1) * this.AdrenalineAnimFrame, this.AdrenalineAnimation.Width, animFrameHeight);
            const xOffset = (border.Width - this.AdrenalineAnimation.Width) / 2;
            const yOffset = (frameHeight - animFrameHeight) / 2 + 5;
            DrawTexture(this.AdrenalineAnimation, Vec(pos.X + xOffset * scale, pos.Y + yOffset * scale), source, origin, scale);
        }
        const percent = Math.floor(ratio * 100);
        DrawCenteredText(state.AdrenalineModeActive ? `ADRENALINE ${percent}%` : `${percent}%`, x, y + 3, 0.48 * scale, Color.White);
    }

    DrawActivationButton(state, kind, button) {
        const rage = kind === 'rage';
        const value = rage ? Number(state.Rage) : Number(state.Adrenaline);
        const maxValue = rage ? Number(state.RageMax) : Number(state.AdrenalineMax);
        const active = rage ? state.RageModeActive === true : state.AdrenalineModeActive === true;
        const readyHeld = rage ? state.RageReadyHeld === true : state.AdrenalineReadyHeld === true;
        const full = value >= maxValue - 0.001;
        const ratio = Clamp(value / Math.max(1, maxValue), 0, 1);
        const baseColor = rage ? Color.Red : Color.Cyan;
        const fillOpacity = active ? 0.88 : full ? 0.72 : 0.28;
        const borderColor = active ? Color.White : full ? Color.Gold : Color.Gray;
        const innerColor = Tint(baseColor, fillOpacity);
        const backgroundColor = Tint(Color.Black, 0.72);
        const left = button.x - button.width / 2;
        const top = button.y - button.height / 2;
        DrawRectangle(this.Pixel, left, top, button.width, button.height, borderColor);
        DrawRectangle(this.Pixel, left + 2, top + 2, button.width - 4, button.height - 4, backgroundColor);
        const fillWidth = Math.max(0, (button.width - 8) * ratio);
        if (fillWidth > 0) {
            DrawRectangle(this.Pixel, left + 4, top + 4, fillWidth, button.height - 8, innerColor);
        }
        const topLabel = active
            ? (rage ? 'FÚRIA ATIVA' : 'ADREN. ATIVA')
            : readyHeld
                ? (rage ? 'FÚRIA PRONTA' : 'ADREN. PRONTA')
                : (rage ? 'FÚRIA' : 'ADREN.');
        const percent = Math.floor(ratio * 100);
        DrawCenteredText(topLabel, button.x, button.y - 5 * button.scale, 0.34 * button.scale, Color.White);
        DrawCenteredText(`${percent}%`, button.x, button.y + 7 * button.scale, 0.28 * button.scale, full || active ? Color.White : Color.LightGray);
    }

    Draw() {
        if (Main.gameMenu || Main.hideUI)
            return;
        if (!this.TexturesLoaded) {
            let tick = 0;
            try { tick = Math.floor(Number(Main.GameUpdateCount) || 0); } catch (_) { }
            if (tick >= this.NextTextureRetryTick) {
                this.NextTextureRetryTick = tick + 120;
                this.LoadTextures();
            }
            if (!this.TexturesLoaded) return;
        }
        const worldState = this.CachedWorldState || (this.CachedWorldState = ModSystem.getByName('CalamityWorldState'));
        const state = this.CachedPlayerState || (this.CachedPlayerState = ModPlayer.getByName('CalamityPlayerState'));
        if (!worldState || !state || worldState.RevengeanceMode !== true)
            return;
        let player = null;
        try { player = Terraria.Main.LocalPlayer || Main.LocalPlayer || null; } catch (_) { }
        if (!player) {
            let localIndex = -1;
            try { localIndex = Math.floor(Number(Terraria.Main.myPlayer)); } catch (_) { }
            if (localIndex >= 0 && localIndex < 255) {
                try { player = Terraria.Main.player.get_Item(localIndex); } catch (_) {
                    try { player = Terraria.Main.player[localIndex]; } catch (__){ player = null; }
                }
            }
        }
        if (!player || !player.active || player.dead)
            return;
        if (!this.HudReadyLogged) {
            this.HudReadyLogged = true;
            try { tl.log(`[CalamityPort Rippers] HUD active; rage=${Number(state.Rage).toFixed(1)}, adrenaline=${Number(state.Adrenaline).toFixed(1)}.`); } catch (_) { }
        }
        const barScale = Clamp(Number(Main.UIScale || 1) * 1.12, 1.05, 1.55);
        const buttonScale = Clamp(Number(Main.UIScale || 1), 0.95, 1.28);
        const x = Math.round(Main.screenWidth * 0.50);
        const rageY = Math.round(27 * barScale);
        const adrenY = Math.round(62 * barScale);
        const buttonWidth = 92 * buttonScale;
        const buttonHeight = 42 * buttonScale;
        const buttonGap = 10 * buttonScale;
        const buttonY = Math.round(adrenY + 33 * buttonScale);
        const buttonOffset = (buttonWidth + buttonGap) / 2;
        const rageButton = {
            x: x - buttonOffset, y: buttonY, width: buttonWidth, height: buttonHeight, scale: buttonScale
        };
        const adrenalineButton = {
            x: x + buttonOffset, y: buttonY, width: buttonWidth, height: buttonHeight, scale: buttonScale
        };
        this.ProcessActivationButtons(state, player, rageButton, adrenalineButton);
        this.DrawRage(state, x, rageY, barScale);
        this.DrawAdrenaline(state, x, adrenY, barScale);
        // Keep the always-on HUD light: activation buttons only exist while that Ripper is ready.
        if (state.RageModeActive !== true && Number(state.Rage) >= Number(state.RageMax) - 0.001)
            this.DrawActivationButton(state, 'rage', rageButton);
        if (state.AdrenalineModeActive !== true && Number(state.Adrenaline) >= Number(state.AdrenalineMax) - 0.001)
            this.DrawActivationButton(state, 'adrenaline', adrenalineButton);
    }
}
