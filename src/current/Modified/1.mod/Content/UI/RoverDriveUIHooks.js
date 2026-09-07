import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { Color } from './../../TL/Modules/Color.js';

const Main = new NativeClass('Terraria', 'Main');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const FontAssets = new NativeClass('Terraria.GameContent', 'FontAssets');
const ChatManager = new NativeClass('Terraria.UI.Chat', 'ChatManager');
const DrawText = ChatManager['void DrawColorCodedStringShadow(SpriteBatch spriteBatch, SpriteFont font, string text, Vector2 position, Color baseColor, float rotation, Vector2 origin, Vector2 baseScale, float maxWidth, float spread)'];
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
const DrawRectangle = 'void Draw(Texture2D texture, Rectangle destinationRectangle, Color color)';

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

function SetAlpha(value, alpha) {
    value.A = Math.max(0, Math.min(255, Math.floor(Number(alpha) || 0)));
    return value;
}

function NativeBool(value) {
    if (typeof value === 'boolean')
        return value;
    try { return Number(value) !== 0; } catch (e) { }
    return !!value;
}

function DrawCenteredText(text, x, y, scale, color) {
    try {
        const font = FontAssets.MouseText.Value;
        const value = String(text);
        const size = font['Vector2 MeasureString(string text)'](value);
        DrawText(Main.spriteBatch, font, value, Vec(x, y), color, 0, Vec(Number(size.X) * 0.5, Number(size.Y) * 0.5), Vec(scale, scale), -1, 0);
    } catch (e) { }
}

export class RoverDriveUIHooks extends GlobalHooks {
    constructor() {
        super();
        this.Noise = null;
        this.Icon = null;
        this.Active = null;
        this.Outline = null;
        this.Overlay = null;
        this.ItemIcon = null;
        this.Pixel = null;
        this.State = null;

        this.WorldPosition = Vec();
        this.NoiseOrigin = Vec();
        this.StatusPosition = Vec();
        this.OutlineOrigin = Vec();
        this.IconOrigin = Vec();
        this.ActiveOrigin = Vec();
        this.OverlayOrigin = Vec();
        this.ItemIconOrigin = Vec();
        this.BarOuter = Rect();
        this.BarInner = Rect();
        this.BarFill = Rect();

        this.WorldBlue = Color.new(42, 130, 255, 55);
        this.WorldCyan = Color.new(80, 235, 255, 38);
        this.WorldGreen = Color.new(194, 255, 67, 22);
        this.OverlayColor = Color.new(255, 255, 255, 130);
        this.BarBack = Color.new(15, 25, 35, 210);
        this.BarInside = Color.new(40, 55, 65, 220);
        this.BarShield = Color.new(60, 205, 255, 235);
        this.BarRecharge = Color.new(115, 135, 145, 220);
        this.WorldDrawHookInstalled = false;
        this.WorldDrawHookLogged = false;
    }

    Initialize() {
        let drawNPCs = null;
        try { drawNPCs = Main['void DrawNPCs(bool behindTiles)']; } catch (e) { }
        try { if (!drawNPCs) drawNPCs = Main.DrawNPCs; } catch (e) { }
        if (drawNPCs && drawNPCs.hook) {
            drawNPCs.hook((original, self, behindTiles) => {
                const result = original(self, behindTiles);
                if (!NativeBool(behindTiles))
                    this.DrawWorldShield();
                return result;
            });
            this.WorldDrawHookInstalled = true;
        } else {
            try { tl.log('[CalamityPort RoverDrive] world draw hook unavailable; shield visual disabled to avoid UI-space offset.'); } catch (e) { }
        }

        Main.DrawInterface_14_EntityHealthBars.hook((original, self, ...args) => {
            const result = original(self, ...args);
            this.DrawStatus();
            return result;
        });
    }

    LoadTextures() {
        if (!this.Noise) {
            try { this.Noise = tl.texture.load('Textures/UI/Wulfrum/TechyNoise.png'); } catch (e) { }
            if (this.Noise)
                SetVec(this.NoiseOrigin, Number(this.Noise.Width) * 0.5, Number(this.Noise.Height) * 0.5);
        }
        if (!this.Icon) {
            try { this.Icon = tl.texture.load('Textures/UI/Wulfrum/WulfrumRoverDrive.png'); } catch (e) { }
            if (this.Icon)
                SetVec(this.IconOrigin, Number(this.Icon.Width) * 0.5, Number(this.Icon.Height) * 0.5);
        }
        if (!this.Active) {
            try { this.Active = tl.texture.load('Textures/UI/Wulfrum/WulfrumRoverDriveActive.png'); } catch (e) { }
            if (this.Active)
                SetVec(this.ActiveOrigin, Number(this.Active.Width) * 0.5, Number(this.Active.Height) * 0.5);
        }
        if (!this.Outline) {
            try { this.Outline = tl.texture.load('Textures/UI/Wulfrum/WulfrumRoverDriveOutline.png'); } catch (e) { }
            if (this.Outline)
                SetVec(this.OutlineOrigin, Number(this.Outline.Width) * 0.5, Number(this.Outline.Height) * 0.5);
        }
        if (!this.Overlay) {
            try { this.Overlay = tl.texture.load('Textures/UI/Wulfrum/WulfrumRoverDriveOverlay.png'); } catch (e) { }
            if (this.Overlay)
                SetVec(this.OverlayOrigin, Number(this.Overlay.Width) * 0.5, Number(this.Overlay.Height) * 0.5);
        }
        if (!this.ItemIcon) {
            try { this.ItemIcon = tl.texture.load('Textures/Items/Accessories/RoverDrive.png'); } catch (e) { }
            if (this.ItemIcon)
                SetVec(this.ItemIconOrigin, Number(this.ItemIcon.Width) * 0.5, Number(this.ItemIcon.Height) * 0.5);
        }
        if (!this.Pixel) {
            try { this.Pixel = tl.texture.load('Textures/Menus/BlankPixel.png'); } catch (e) { }
        }
    }

    GetState() {
        if (!this.State)
            this.State = ModPlayer.getByName('RoverDrivePlayer');
        return this.State;
    }

    LocalPlayer() {
        const player = Main.player[Main.myPlayer];
        return player && player.active && !player.dead ? player : null;
    }

    DrawWorldShield() {
        if (Main.gameMenu || Main.hideUI)
            return;
        const player = this.LocalPlayer();
        const state = this.GetState();
        if (!player || !state || !state.IsEquipped(player) || !state.IsVisible(player))
            return;
        const durability = state.GetDurability(player);
        if (durability <= 0)
            return;
        this.LoadTextures();
        if (!this.Noise)
            return;

        const strength = Math.sqrt(durability / 20);
        const time = Number(Main.GlobalTimeWrappedHourly || 0);
        const pulse = 0.108 + Math.sin(time * 2 + Number(Main.myPlayer)) * 0.004;
        // This draw now executes inside Terraria's world SpriteBatch. Use getRect()
        // through the cached safe helper instead of MountedCenter/gfxOffY so the
        // shield stays anchored to the actual player hitbox under mobile zoom.
        const rect = Terraria.PlayerRect(player);
        const centerX = Number(rect.X) + Number(rect.Width) * 0.5;
        const centerY = Number(rect.Y) + Number(rect.Height) * 0.5;
        SetVec(
            this.WorldPosition,
            centerX - Number(Main.screenPosition.X),
            centerY - 3 - Number(Main.screenPosition.Y)
        );
        if (!this.WorldDrawHookLogged) {
            this.WorldDrawHookLogged = true;
            try { tl.log('[CalamityPort RoverDrive] shield visual anchored in world draw pass using Player.getRect center.'); } catch (e) { }
        }
        SetAlpha(this.WorldBlue, 55 * strength);
        SetAlpha(this.WorldCyan, 38 * strength);
        SetAlpha(this.WorldGreen, 22 * strength);
        const draw = Main.spriteBatch[DrawTexture];
        if (!draw)
            return;
        draw(this.Noise, this.WorldPosition, null, this.WorldBlue, time * 0.08, this.NoiseOrigin, pulse, SpriteEffects.None, 0);
        draw(this.Noise, this.WorldPosition, null, this.WorldCyan, -time * 0.06, this.NoiseOrigin, pulse * 0.90, SpriteEffects.FlipHorizontally, 0);
        draw(this.Noise, this.WorldPosition, null, this.WorldGreen, time * 0.04, this.NoiseOrigin, pulse * 0.80, SpriteEffects.None, 0);
    }

    DrawStatus() {
        if (Main.gameMenu || Main.hideUI)
            return;
        const player = this.LocalPlayer();
        const state = this.GetState();
        if (!player || !state || !state.IsEquipped(player))
            return;
        this.LoadTextures();

        const durability = state.GetDurability(player);
        const framesUntilFull = Math.max(0, Number(state.GetFramesUntilFull(player)) || 0);
        const scale = Math.max(0.90, Math.min(1.18, Number(Main.UIScale || 1)));

        // Keep Rover Drive in the same visual column as the Calamity cooldown rack.
        // Bastion uses center+145 at y=58; Rover sits directly below it so both
        // systems read as one compact status cluster without covering the bars.
        const x = Math.round(Number(Main.screenWidth || 0) * 0.50 + 145 * scale);
        const y = Math.round(116 * scale);
        SetVec(this.StatusPosition, x, y);

        const draw = Main.spriteBatch[DrawTexture];
        const icon = this.ItemIcon || (durability > 0 ? (this.Active || this.Icon) : this.Icon);
        if (!draw || !icon)
            return;

        // The old 24x24 white outline looked like an empty inventory slot on mobile.
        // Use the actual Rover Drive item sprite instead. Ready = full-color; while
        // recovering, slightly dim it and let the countdown carry the state clearly.
        const tint = framesUntilFull > 0 ? Color.LightGray : Color.White;
        const origin = icon === this.ItemIcon
            ? this.ItemIconOrigin
            : (icon === this.Active ? this.ActiveOrigin : this.IconOrigin);
        const iconScale = icon === this.ItemIcon ? 0.82 * scale : 1.10 * scale;
        draw(icon, this.StatusPosition, null, tint, 0, origin, iconScale, SpriteEffects.None, 0);

        if (framesUntilFull > 0) {
            const seconds = framesUntilFull / 60;
            // Integer seconds keep the HUD calm; only the last 3 seconds use a
            // decimal so the player can immediately tell when recovery is imminent.
            const text = seconds > 3
                ? `${Math.ceil(seconds)}s`
                : `${Math.max(0, seconds).toFixed(1)}s`;
            const textColor = durability <= 0 ? Color.LightGray : Color.LightCyan;
            DrawCenteredText(text, x, y + 22 * scale, 0.36 * scale, textColor);
        }
    }
}
