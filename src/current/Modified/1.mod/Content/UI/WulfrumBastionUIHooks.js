import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModItem } from './../../TL/ModItem.js';
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
    if (texture)
        Main.spriteBatch['void Draw(Texture2D texture, Rectangle destinationRectangle, Color color)'](texture, Rect(x, y, width, height), color);
}

function DrawTexture(texture, x, y, scale, color) {
    if (texture)
        Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](texture, Vec(x, y), null, color, 0, Vec(texture.Width / 2, texture.Height / 2), scale, SpriteEffects.None, 0);
}

function DrawTextureSource(texture, source, x, y, scale, color) {
    if (!texture || !source)
        return;
    Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](
        texture,
        Vec(x, y),
        source,
        color,
        0,
        Vec(source.Width / 2, source.Height / 2),
        scale,
        SpriteEffects.None,
        0
    );
}

function DrawCenteredText(text, x, y, scale, color) {
    try {
        const font = FontAssets.MouseText.Value;
        const value = String(text);
        const size = font['Vector2 MeasureString(string text)'](value);
        DrawText(Main.spriteBatch, font, value, Vec(x, y), color, 0, Vec(size.X / 2, size.Y / 2), Vec(scale, scale), -1, 0);
    } catch (e) { }
}

export class WulfrumBastionUIHooks extends GlobalHooks {
    constructor() {
        super();
        this.Pixel = null;
        this.ReadyTexture = null;
        this.ActiveTexture = null;
        this.CooldownOverlayTexture = null;
        this.CooldownOutlineTexture = null;
        this.CooldownRadialActiveTexture = null;
        this.CooldownRadialCooldownTexture = null;
        this.CooldownOutlineActiveTexture = null;
        this.CooldownOutlineCooldownTexture = null;
        this.RadialFrameCount = 61;
        this.RadialFrameColumns = 8;
        this.TexturesLoaded = false;
        this.PreviousRawTouchIds = {};
        this.RawHeld = false;
        this.UnifiedTouchLocked = false;
        this.LastActivationTick = -1000;
        this.CachedPlayerState = null;
        this.CachedWorldState = null;
        this.CachedSaharaType = 0;
        this.CooldownRackLogged = false;
    }

    Initialize() {
    }

    OnWorldUnload() {
        this.PreviousRawTouchIds = {};
        this.RawHeld = false;
        this.UnifiedTouchLocked = false;
        this.LastActivationTick = -1000;
        this.CooldownRackLogged = false;
    }

    LoadTextures() {
        try {
            this.Pixel = tl.texture.load('Textures/Menus/BlankPixel.png');
            this.ReadyTexture = tl.texture.load('Textures/UI/Wulfrum/WulfrumBastion.png');
            this.ActiveTexture = tl.texture.load('Textures/UI/Wulfrum/WulfrumBastionActive.png');
            this.CooldownOverlayTexture = tl.texture.load('Textures/UI/Wulfrum/WulfrumBastionOverlay.png');
            this.CooldownOutlineTexture = tl.texture.load('Textures/UI/Wulfrum/WulfrumBastionOutline.png');
            this.TexturesLoaded = !!(this.Pixel && this.ReadyTexture && this.ActiveTexture && this.CooldownOverlayTexture && this.CooldownOutlineTexture);
        } catch (e) {
            this.TexturesLoaded = false;
            tl.log(`[CalamityPort] Wulfrum Bastion button texture load failed: ${e}`);
            return;
        }

        // Expanded-mode shader simulation is optional. If a device rejects the
        // sprite sheets for any reason, keep the official compact overlay fallback.
        try {
            this.CooldownRadialActiveTexture = tl.texture.load('Textures/UI/Wulfrum/WulfrumBastionRadialActive.png');
            this.CooldownRadialCooldownTexture = tl.texture.load('Textures/UI/Wulfrum/WulfrumBastionRadialCooldown.png');
            this.CooldownOutlineActiveTexture = tl.texture.load('Textures/UI/Wulfrum/WulfrumBastionOutlineActive.png');
            this.CooldownOutlineCooldownTexture = tl.texture.load('Textures/UI/Wulfrum/WulfrumBastionOutlineCooldown.png');
        } catch (e) {
            this.CooldownRadialActiveTexture = null;
            this.CooldownRadialCooldownTexture = null;
            this.CooldownOutlineActiveTexture = null;
            this.CooldownOutlineCooldownTexture = null;
            try { tl.log(`[CalamityPort CooldownRack] radial assets unavailable; compact fallback active: ${e}`); } catch (ignored) { }
        }
    }

    PointInside(x, y, button) {
        return Number(x) >= button.x - button.width / 2 && Number(x) <= button.x + button.width / 2 && Number(y) >= button.y - button.height / 2 && Number(y) <= button.y + button.height / 2;
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
            const fn = TouchPanel['TouchCollection GetState()'];
            if (fn)
                return fn();
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
        try {
            const collection = this.GetTouchCollection();
            if (!collection)
                return points;
            const count = Math.max(0, Math.floor(Number(collection.Count) || 0));
            let displayWidth = Number(Main.screenWidth), displayHeight = Number(Main.screenHeight);
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
                let id = Number(touch.Id);
                if (!Number.isFinite(id))
                    id = i;
                points.push({
                    id: String(id), x: Number(touch.Position.X) * scaleX, y: Number(touch.Position.Y) * scaleY, pressed: stateNumber === 2 || stateText.includes('pressed')
                });
            }
        } catch (e) { }
        return points;
    }

    Activate(state, player) {
        const tick = Number(Main.GameUpdateCount || 0);
        if (tick - this.LastActivationTick < 8)
            return;
        this.LastActivationTick = tick;
        this.BlockGameInput(player);
        state.ActivateWulfrumBastion(player, true);
    }

    ProcessInput(state, player, button) {
        const currentIds = {};
        const touches = this.ReadRawTouches();
        let rawInside = false, rawTrigger = false;
        for (const touch of touches) {
            currentIds[touch.id] = true;
            if (!this.PointInside(touch.x, touch.y, button))
                continue;
            rawInside = true;
            if (touch.pressed || !this.PreviousRawTouchIds[touch.id] || !this.RawHeld)
                rawTrigger = true;
        }
        this.PreviousRawTouchIds = currentIds;
        this.RawHeld = rawInside;
        let worldDown = false, worldReleased = false, worldInside = false;
        try {
            worldDown = Main.worldMouseLeft === true;
            worldReleased = Main.worldMouseLeftRelease === true;
            worldInside = worldDown && this.PointInside(Number(Main.worldMouseX), Number(Main.worldMouseY), button);
        } catch (e) { }
        const mouseInside = Main.mouseLeft === true && this.PointInside(Main.mouseX, Main.mouseY, button);
        const heldInside = rawInside || worldInside || mouseInside;
        if (!heldInside)
            this.UnifiedTouchLocked = false;
        if (heldInside)
            this.BlockGameInput(player);
        if (this.UnifiedTouchLocked || !state.IsWulfrumBastionReady())
            return;
        if (rawTrigger || (worldInside && worldReleased) || mouseInside) {
            this.UnifiedTouchLocked = true;
            if (worldInside)
                try {
                    Main.worldMouseLeftRelease = false;
                } catch (e) { }
            this.Activate(state, player);
        }
    }

    DrawButton(state, button) {
        const active = state.IsWulfrumBastionActive();
        const cooldown = Math.max(0, Number(state.WulfrumBastionCooldownFrames) || 0);
        const ready = !active && cooldown <= 0;
        const left = button.x - button.width / 2, top = button.y - button.height / 2;
        const border = active ? Color.Cyan : (ready ? Color.YellowGreen : Color.Gray);
        const inner = active ? Tint(Color.Cyan, 0.23) : (ready ? Tint(Color.YellowGreen, 0.25) : Tint(Color.Gray, 0.18));
        DrawRectangle(this.Pixel, left, top, button.width, button.height, border);
        DrawRectangle(this.Pixel, left + 2, top + 2, button.width - 4, button.height - 4, Tint(Color.Black, 0.80));
        DrawRectangle(this.Pixel, left + 5, top + 5, button.width - 10, button.height - 10, inner);
        DrawTexture(active ? this.ActiveTexture : this.ReadyTexture, left + 24 * button.scale, button.y, 1.25 * button.scale, Color.White);
        let topText = 'BASTIÃO: PRONTO', bottomText = 'TOQUE PARA ATIVAR';
        if (active) {
            topText = `BASTIÃO: ${(Number(state.WulfrumBastionActiveFrames) / 60).toFixed(1)}s`;
            bottomText = state.WulfrumBastionBuildFrames > 0 ? 'MONTANDO CANHÃO' : '+12 DEFESA / 10% REDUÇÃO';
        } else if (!ready) {
            topText = `RECARGA: ${(cooldown / 60).toFixed(1)}s`;
            bottomText = 'AGUARDE';
        }
        const textX = button.x + 14 * button.scale;
        DrawCenteredText(topText, textX, button.y - 7 * button.scale, 0.36 * button.scale, Color.White);
        DrawCenteredText(bottomText, textX, button.y + 8 * button.scale, 0.27 * button.scale, active ? Color.LightCyan : (ready ? Color.LightGoldenrodYellow : Color.LightGray));
    }


    DrawCooldownRack(state) {
        if (!state || Main.playerInventory)
            return;

        const active = state.IsWulfrumBastionActive();
        const activeFrames = Math.max(0, Number(state.WulfrumBastionActiveFrames) || 0);
        const activeDuration = Math.max(1, Number(state.WulfrumBastionMaxActive) || 1);
        const cooldown = Math.max(0, Number(state.WulfrumBastionCooldownFrames) || 0);
        const cooldownDuration = Math.max(1, Number(state.WulfrumBastionMaxCooldown) || 1);

        if (!active && cooldown <= 0)
            return;

        if (!this.CooldownRackLogged) {
            this.CooldownRackLogged = true;
            try {
                tl.log('[CalamityPort CooldownRack] official radial shader behavior baked for mobile; active drains cyan/blue, cooldown recharges green.');
            } catch (e) { }
        }

        // Desktop expanded mode renders a 52x52 radial shader, then the 24x24
        // outline and 20x20 icon above it. On TLPro the same shader output is
        // pre-baked into sprite-sheet frames, keeping runtime work to one draw.
        //
        // Official Wulfrum AdjustedCompletion:
        // active   = remainingActive / BastionTime            (1 -> 0)
        // cooldown = 1 - remainingCooldown / BastionCooldown (0 -> 1)
        const progress = active
            ? Clamp(activeFrames / activeDuration, 0, 1)
            : Clamp(1 - cooldown / cooldownDuration, 0, 1);

        const scale = Clamp(Number(Main.UIScale || 1), 0.90, 1.18);
        // Mobile layout: keep cooldowns adjacent to the Rage/Adrenaline HUD
        // instead of stacking them under the bars. The 1536x691 mobile HUD
        // places the free area at roughly center+145px, y=58px; scaling the
        // offsets preserves the same relationship across UI scales/resolutions.
        // Future cooldown entries can extend downward from this anchor.
        const x = Math.round(Number(Main.screenWidth || 0) * 0.50 + 145 * scale);
        const y = Math.round(58 * scale);

        const radial = active ? this.CooldownRadialActiveTexture : this.CooldownRadialCooldownTexture;
        const icon = active ? this.ActiveTexture : this.ReadyTexture;
        const coloredOutline = active ? this.CooldownOutlineActiveTexture : this.CooldownOutlineCooldownTexture;
        const fallbackOutlineColor = active ? Color.YellowGreen : Color.LightGray;

        if (radial && Number(radial.Width) >= 52 && Number(radial.Height) >= 52) {
            const frameCount = Math.max(2, Math.floor(Number(this.RadialFrameCount) || 61));
            const columns = Math.max(1, Math.floor(Number(this.RadialFrameColumns) || 8));
            const frame = Math.max(0, Math.min(frameCount - 1, Math.round(progress * (frameCount - 1))));
            const frameX = (frame % columns) * 52;
            const frameY = Math.floor(frame / columns) * 52;
            DrawTextureSource(radial, Rect(frameX, frameY, 52, 52), x, y, scale, Color.White);
        } else {
            // Exact compact-mode fallback used by WulfrumBastion.DrawCompact.
            const overlay = this.CooldownOverlayTexture;
            if (overlay) {
                const lostHeight = Math.max(0, Math.min(overlay.Height, Math.ceil(overlay.Height * progress)));
                const visibleHeight = Math.max(0, overlay.Height - lostHeight);
                if (visibleHeight > 0) {
                    const source = Rect(0, lostHeight, overlay.Width, visibleHeight);
                    const posY = y + lostHeight * scale;
                    Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'](
                        overlay,
                        Vec(x, posY),
                        source,
                        fallbackOutlineColor,
                        0,
                        Vec(overlay.Width / 2, overlay.Height / 2),
                        scale,
                        SpriteEffects.None,
                        0
                    );
                }
            }
        }

        DrawTexture(coloredOutline || this.CooldownOutlineTexture, x, y, scale, coloredOutline ? Color.White : fallbackOutlineColor);
        DrawTexture(icon, x, y, scale, Color.White);

        const remainingFrames = active ? activeFrames : cooldown;
        const seconds = Math.max(0, remainingFrames / 60);
        const timeText = seconds >= 10 ? `${Math.ceil(seconds)}s` : `${seconds.toFixed(1)}s`;
        DrawCenteredText(timeText, x, y + 31 * scale, 0.30 * scale, Color.White);
    }

    Draw() {
        if (!this.TexturesLoaded || Main.gameMenu || Main.hideUI)
            return;
        const player = Main.LocalPlayer;
        const state = this.CachedPlayerState || (this.CachedPlayerState = ModPlayer.getByName('CalamityPlayerState'));
        if (!player || player.dead || !state)
            return;
        this.DrawCooldownRack(state);
        if (state.WulfrumSetActive !== true)
            return;
        const worldState = this.CachedWorldState || (this.CachedWorldState = ModSystem.getByName('CalamityWorldState'));
        const revengeance = !!(worldState && worldState.RevengeanceMode === true);
        const starCount = state.CountBrittleStars(player);
        if (!(this.CachedSaharaType > 0))
            this.CachedSaharaType = Number(ModItem.getTypeByName('SaharaSlicers') || 0);
        let heldSahara = false;
        try {
            heldSahara = Number(player.HeldItem.type) === this.CachedSaharaType;
        } catch (e) { }
        const scale = Clamp(Number(Main.UIScale || 1), 0.90, 1.22);
        let y = revengeance ? 150 : 88;
        if (starCount > 0)
            y += 55;
        if (heldSahara)
            y += 55;
        const button = {
            x: Math.round(Main.screenWidth * 0.50), y: Math.round(y * scale), width: 190 * scale, height: 44 * scale, scale
        };
        this.ProcessInput(state, player, button);
        this.DrawButton(state, button);
    }
}
