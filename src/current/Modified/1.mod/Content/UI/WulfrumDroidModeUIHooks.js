import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModItem } from './../../TL/ModItem.js';

const Main = new NativeClass('Terraria', 'Main');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const FontAssets = new NativeClass('Terraria.GameContent', 'FontAssets');
const ChatManager = new NativeClass('Terraria.UI.Chat', 'ChatManager');
const DrawText = ChatManager['void DrawColorCodedStringShadow(SpriteBatch spriteBatch, SpriteFont font, string text, Vector2 position, Color baseColor, float rotation, Vector2 origin, Vector2 baseScale, float maxWidth, float spread)'];
const DrawRectangle = 'void Draw(Texture2D texture, Rectangle destinationRectangle, Color color)';
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
let TouchPanel = null;
try {
    TouchPanel = new NativeClass('Microsoft.Xna.Framework.Input.Touch', 'TouchPanel');
} catch (e) {
    TouchPanel = null;
}

function Vec(x = 0, y = 0) {
    const value = Vector2.new();
    value.X = Number(x);
    value.Y = Number(y);
    return value;
}

function Rect(x = 0, y = 0, width = 1, height = 1) {
    const value = Rectangle.new();
    value.X = Math.round(x);
    value.Y = Math.round(y);
    value.Width = Math.max(1, Math.round(width));
    value.Height = Math.max(1, Math.round(height));
    return value;
}

function SetVec(value, x, y) {
    value.X = Number(x);
    value.Y = Number(y);
    return value;
}

function SetRect(value, x, y, width, height) {
    value.X = Math.round(x);
    value.Y = Math.round(y);
    value.Width = Math.max(1, Math.round(width));
    value.Height = Math.max(1, Math.round(height));
    return value;
}

function Tint(color, amount) {
    try { return Color.op_Multiply(color, Number(amount)); } catch (e) { }
    try { return Color.Multiply(color, Number(amount)); } catch (e) { }
    return color;
}

export class WulfrumDroidModeUIHooks extends GlobalHooks {
    constructor() {
        super();
        this.Pixel = null;
        this.Icon = null;
        this.Font = null;
        this.TexturesLoaded = false;
        this.TouchHeld = false;
        this.InputLocked = false;
        this.LastToggleTick = -1000;
        this.ControllerType = 0;
        this.PlayerState = null;
        this.NextCountCheck = 0;
        this.CachedDroidCount = 0;
        this.LayoutKey = '';
        this.Button = { x: 0, y: 0, width: 0, height: 0, scale: 1 };
        this.OuterRect = Rect();
        this.MiddleRect = Rect();
        this.InnerRect = Rect();
        this.IconPosition = Vec();
        this.IconOrigin = Vec();
        this.TextPosition = Vec();
        this.TextScale = Vec(1, 1);
        this.AttackOrigin = Vec();
        this.SupportOrigin = Vec();
        this.HintOrigin = Vec();
        this.AttackText = 'ATAQUE';
        this.SupportText = 'SUPORTE';
        this.HintText = 'TOQUE PARA ALTERNAR';
        this.AttackBorder = Color.YellowGreen;
        this.SupportBorder = Color.Cyan;
        this.AttackInner = Tint(Color.YellowGreen, 0.20);
        this.SupportInner = Tint(Color.Cyan, 0.22);
        this.MiddleColor = Tint(Color.Black, 0.82);
    }

    Initialize() {
        Main['void Initialize_AlmostEverything()'].hook((original, self) => {
            original(self);
            this.LoadTextures();
        });
        Main.DrawInterface_14_EntityHealthBars.hook((original, self, ...args) => {
            const result = original(self, ...args);
            this.Draw();
            return result;
        });
    }

    OnWorldUnload() {
        this.TouchHeld = false;
        this.InputLocked = false;
        this.LastToggleTick = -1000;
        this.NextCountCheck = 0;
        this.CachedDroidCount = 0;
    }

    LoadTextures() {
        try {
            this.Pixel = tl.texture.load('Textures/Menus/BlankPixel.png');
            this.Icon = tl.texture.load('Textures/Items/Weapons/Summon/WulfrumController.png');
            this.Font = FontAssets.MouseText.Value;
            if (this.Icon)
                SetVec(this.IconOrigin, Number(this.Icon.Width) / 2, Number(this.Icon.Height) / 2);
            if (this.Font) {
                const attackSize = this.Font['Vector2 MeasureString(string text)'](this.AttackText);
                const supportSize = this.Font['Vector2 MeasureString(string text)'](this.SupportText);
                const hintSize = this.Font['Vector2 MeasureString(string text)'](this.HintText);
                SetVec(this.AttackOrigin, Number(attackSize.X) / 2, Number(attackSize.Y) / 2);
                SetVec(this.SupportOrigin, Number(supportSize.X) / 2, Number(supportSize.Y) / 2);
                SetVec(this.HintOrigin, Number(hintSize.X) / 2, Number(hintSize.Y) / 2);
            }
            this.TexturesLoaded = !!this.Pixel;
        } catch (e) {
            this.TexturesLoaded = false;
            tl.log(`[CalamityPort] Wulfrum Droid mode button texture load failed: ${e}`);
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
            const getter = TouchPanel['TouchCollection GetState()'];
            return getter ? getter() : null;
        } catch (e) {
            return null;
        }
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
        try { return collection[index]; } catch (e) { }
        return null;
    }

    TouchFlags(button) {
        const collection = this.GetTouchCollection();
        if (!collection)
            return 0;
        let flags = 0;
        try {
            const count = Math.max(0, Math.floor(Number(collection.Count) || 0));
            let displayWidth = Number(Main.screenWidth);
            let displayHeight = Number(Main.screenHeight);
            try {
                if (Number(TouchPanel.DisplayWidth) > 0)
                    displayWidth = Number(TouchPanel.DisplayWidth);
                if (Number(TouchPanel.DisplayHeight) > 0)
                    displayHeight = Number(TouchPanel.DisplayHeight);
            } catch (e) { }
            const scaleX = Number(Main.screenWidth) / Math.max(1, displayWidth);
            const scaleY = Number(Main.screenHeight) / Math.max(1, displayHeight);
            for (let i = 0; i < count; i++) {
                const touch = this.GetTouchAt(collection, i);
                if (!touch || !touch.Position)
                    continue;
                const stateNumber = Number(touch.State);
                const stateText = String(touch.State || '').toLowerCase();
                if ((Number.isFinite(stateNumber) && stateNumber < 2) || stateText.includes('released') || stateText.includes('invalid'))
                    continue;
                const x = Number(touch.Position.X) * scaleX;
                const y = Number(touch.Position.Y) * scaleY;
                if (!this.PointInside(x, y, button))
                    continue;
                flags |= 1;
                if (stateNumber === 2 || stateText.includes('pressed'))
                    flags |= 2;
                break;
            }
        } catch (e) { }
        return flags;
    }

    ProcessInput(state, player, button) {
        const touchFlags = this.TouchFlags(button);
        const rawInside = (touchFlags & 1) !== 0;
        let trigger = (touchFlags & 2) !== 0 || (rawInside && !this.TouchHeld);
        this.TouchHeld = rawInside;

        let worldInside = false;
        try {
            worldInside = Main.worldMouseLeft === true && this.PointInside(Number(Main.worldMouseX), Number(Main.worldMouseY), button);
            if (worldInside && Main.worldMouseLeftRelease === true)
                trigger = true;
        } catch (e) { }
        const mouseInside = Main.mouseLeft === true && this.PointInside(Number(Main.mouseX), Number(Main.mouseY), button);
        if (mouseInside && !this.InputLocked)
            trigger = true;

        const inside = rawInside || worldInside || mouseInside;
        if (!inside)
            this.InputLocked = false;
        if (inside)
            this.BlockGameInput(player);
        if (!trigger || this.InputLocked)
            return;

        const tick = Number(Main.GameUpdateCount || 0);
        if (tick - this.LastToggleTick < 8)
            return;
        this.LastToggleTick = tick;
        this.InputLocked = true;
        state.ToggleMode(player, true);
        try {
            if (worldInside)
                Main.worldMouseLeftRelease = false;
        } catch (e) { }
    }

    UpdateLayout() {
        const scale = Math.max(0.9, Math.min(1.2, Number(Main.UIScale || 1)));
        const key = `${Number(Main.screenWidth)}:${Number(Main.screenHeight)}:${scale}`;
        if (key === this.LayoutKey)
            return;
        this.LayoutKey = key;
        const button = this.Button;
        button.x = Math.round(Number(Main.screenWidth) * 0.78);
        button.y = Math.round(105 * scale);
        button.width = 170 * scale;
        button.height = 42 * scale;
        button.scale = scale;
        const left = button.x - button.width / 2;
        const top = button.y - button.height / 2;
        SetRect(this.OuterRect, left, top, button.width, button.height);
        SetRect(this.MiddleRect, left + 2, top + 2, button.width - 4, button.height - 4);
        SetRect(this.InnerRect, left + 5, top + 5, button.width - 10, button.height - 10);
        SetVec(this.IconPosition, left + 24 * scale, button.y);
    }

    DrawCachedText(text, positionX, positionY, scale, color, origin) {
        if (!this.Font)
            return;
        SetVec(this.TextPosition, positionX, positionY);
        SetVec(this.TextScale, scale, scale);
        DrawText(Main.spriteBatch, this.Font, text, this.TextPosition, color, 0, origin, this.TextScale, -1, 0);
    }

    DrawButton(supportMode) {
        const button = this.Button;
        Main.spriteBatch[DrawRectangle](this.Pixel, this.OuterRect, supportMode ? this.SupportBorder : this.AttackBorder);
        Main.spriteBatch[DrawRectangle](this.Pixel, this.MiddleRect, this.MiddleColor);
        Main.spriteBatch[DrawRectangle](this.Pixel, this.InnerRect, supportMode ? this.SupportInner : this.AttackInner);
        if (this.Icon) {
            Main.spriteBatch[DrawTexture](
                this.Icon,
                this.IconPosition,
                null,
                Color.White,
                0,
                this.IconOrigin,
                0.85 * button.scale,
                SpriteEffects.None,
                0
            );
        }
        const textX = button.x + 16 * button.scale;
        this.DrawCachedText(
            supportMode ? this.SupportText : this.AttackText,
            textX,
            button.y - 6 * button.scale,
            0.36 * button.scale,
            Color.White,
            supportMode ? this.SupportOrigin : this.AttackOrigin
        );
        this.DrawCachedText(
            this.HintText,
            textX,
            button.y + 8 * button.scale,
            0.24 * button.scale,
            supportMode ? Color.LightCyan : Color.LightGoldenrodYellow,
            this.HintOrigin
        );
    }

    Draw() {
        if (!this.TexturesLoaded || Main.gameMenu || Main.hideUI)
            return;
        const player = Main.player[Main.myPlayer];
        if (!player || !player.active || player.dead)
            return;
        if (!(this.ControllerType > 0))
            this.ControllerType = Number(ModItem.getTypeByName('WulfrumController') || 0);
        if (!(this.ControllerType > 0) || Number(player.HeldItem?.type) !== this.ControllerType)
            return;
        const state = this.PlayerState || (this.PlayerState = ModPlayer.getByName('WulfrumControllerPlayer'));
        if (!state)
            return;

        const tick = Math.floor(Number(Main.GameUpdateCount) || 0);
        if (tick >= this.NextCountCheck) {
            this.NextCountCheck = tick + 10;
            this.CachedDroidCount = state.CountOwnedDroids(player);
        }
        if (this.CachedDroidCount <= 0)
            return;

        this.UpdateLayout();
        this.ProcessInput(state, player, this.Button);
        this.DrawButton(state.GetMode(player));
    }
}
