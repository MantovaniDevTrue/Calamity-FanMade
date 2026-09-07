import { Terraria } from './../TL/ModImports.js';
import { ModLocalization } from './../TL/ModLocalization.js';
import { FusionCamera } from './FusionCamera.js';
import { AndroidSound } from './../Common/Snippets/AndroidSound.js';
import { PlayRoarSound } from './../Common/Snippets/LegacySoundCompat.js';

const Main = new NativeClass('Terraria', 'Main');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const FontAssets = new NativeClass('Terraria.GameContent', 'FontAssets');
const ChatManager = new NativeClass('Terraria.UI.Chat', 'ChatManager');
const DrawText = ChatManager['void DrawColorCodedStringShadow(SpriteBatch spriteBatch, SpriteFont font, string text, Vector2 position, Color baseColor, float rotation, Vector2 origin, Vector2 baseScale, float maxWidth, float spread)'];

const Configs = Object.freeze({
    desert: {
        titleKey: 'NPCName.DesertScourgeHead', subtitleKey: 'BossIntro.DesertScourge',
        color: [226, 185, 99], duration: 150, focus: 100, hold: 92, reveal: 24, roar: 17,
        smoothing: 0.105, shake: 2.2, soundFile: 'Common/Sounds/DesertScourgeRoar.ogg', soundVolume: 0.95
    },
    crabulon: {
        titleKey: 'NPCName.Crabulon', subtitleKey: 'BossIntro.Crabulon',
        color: [105, 228, 238], duration: 150, focus: 98, hold: 90, reveal: 24, roar: 18,
        smoothing: 0.11, shake: 2.0, soundFile: 'Common/Sounds/Crabulon/CrabSlam1.ogg', soundVolume: 0.90
    },
    hive: {
        titleKey: 'NPCName.HiveMind', subtitleKey: 'BossIntro.HiveMind',
        color: [125, 100, 190], duration: 150, focus: 100, hold: 92, reveal: 24, roar: 17,
        smoothing: 0.11, shake: 2.0, soundFile: 'Common/Sounds/HiveMind/HiveMindRoar.ogg', soundVolume: 0.95
    },
    hivePhase: {
        titleKey: 'NPCName.HiveMind', subtitleKey: 'BossIntro.HiveMindPhase',
        color: [150, 90, 190], duration: 104, focus: 54, hold: 42, reveal: 10, roar: 6,
        smoothing: 0.14, shake: 2.4, soundFile: 'Common/Sounds/HiveMind/HiveMindRoarFast.ogg', soundVolume: 0.95
    },
    perforators: {
        titleKey: 'BossChecklist.Perforators', subtitleKey: 'BossIntro.Perforators',
        color: [211, 65, 75], duration: 150, focus: 100, hold: 92, reveal: 24, roar: 17,
        smoothing: 0.11, shake: 2.2, soundFile: 'Common/Sounds/Perforator/PerfHiveSpawn.ogg', soundVolume: 0.95
    },
    slimeGod: {
        titleKey: 'NPCName.SlimeGodCore', subtitleKey: 'BossIntro.SlimeGod',
        color: [183, 104, 220], duration: 150, focus: 100, hold: 90, reveal: 24, roar: 18,
        smoothing: 0.11, shake: 2.2, soundFile: '', soundVolume: 0.95, roarPitch: -0.08
    },
    giantClam: {
        titleKey: 'NPCName.GiantClam', subtitleKey: 'BossIntro.GiantClam',
        color: [80, 221, 231], duration: 132, focus: 82, hold: 72, reveal: 20, roar: 14,
        smoothing: 0.12, shake: 2.0, soundFile: 'Sounds/Item/ClamImpact.ogg', soundVolume: 0.90
    }
});

function Tick() {
    try { return Math.max(0, Math.floor(Number(Terraria.Main.GameUpdateCount) || 0)); }
    catch (_) { return 0; }
}
function Clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Number(v) || 0)); }
function EaseOutCubic(t) {
    const x = 1 - Clamp(t, 0, 1);
    return 1 - x * x * x;
}
function EaseOutBack(t) {
    const x = Clamp(t, 0, 1);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
function Translate(key) {
    try { return String(ModLocalization.Translate(key)); }
    catch (_) { return String(key || ''); }
}
function NewVector2(x = 0, y = 0) {
    const v = Vector2.new();
    v.X = Number(x) || 0;
    v.Y = Number(y) || 0;
    return v;
}
function NewRectangle(x = 0, y = 0, w = 1, h = 1) {
    const r = Rectangle.new();
    r.X = Math.floor(Number(x) || 0);
    r.Y = Math.floor(Number(y) || 0);
    r.Width = Math.max(1, Math.floor(Number(w) || 1));
    r.Height = Math.max(1, Math.floor(Number(h) || 1));
    return r;
}
function NewColor(r = 255, g = 255, b = 255, a = 255) {
    const c = Color.new();
    c.R = Math.max(0, Math.min(255, Math.floor(Number(r) || 0)));
    c.G = Math.max(0, Math.min(255, Math.floor(Number(g) || 0)));
    c.B = Math.max(0, Math.min(255, Math.floor(Number(b) || 0)));
    c.A = Math.max(0, Math.min(255, Math.floor(Number(a) || 0)));
    return c;
}
function ValidNPCIndex(npc) {
    if (!npc || !npc.active)
        return -1;
    const i = Math.floor(Number(npc.whoAmI));
    return Number.isFinite(i) && i >= 0 && i < 200 ? i : -1;
}
function NPCAt(index) {
    const i = Math.floor(Number(index));
    if (!Number.isFinite(i) || i < 0 || i >= 200)
        return null;
    let array = null;
    try { array = Terraria.Main.npc; } catch (_) { }
    if (!array)
        return null;
    try {
        const npc = array.get_Item(i);
        if (npc) return npc;
    } catch (_) { }
    try { return array[i] || null; } catch (_) { return null; }
}
function NPCPoint(npc) {
    if (!npc)
        return NewVector2(0, 0);
    try {
        const r = npc.getRect();
        return NewVector2(Number(r.X) + Number(r.Width) * 0.5, Number(r.Y) + Number(r.Height) * 0.5);
    } catch (_) { }
    try {
        return NewVector2(Number(npc.position.X) + Number(npc.width) * 0.5, Number(npc.position.Y) + Number(npc.height) * 0.5);
    } catch (_) { return NewVector2(0, 0); }
}

export class BossIntroRuntime {
    static Active = false;
    static Initialized = false;
    static Key = '';
    static NPCIndex = -1;
    static StartTick = 0;
    static EndTick = 0;
    static Duration = 0;
    static HoldDuration = 0;
    static HoldReleased = false;
    static RevealTick = 0;
    static RoarTick = 0;
    static RoarPlayed = false;
    static FlashStartTick = -1000;
    static ShakeStrength = 0;
    static OriginalDamage = 0;
    static OriginalDontTakeDamage = false;
    static OriginalChaseable = true;
    static Title = '';
    static Subtitle = '';
    static TitleWidth = 0;
    static TitleHeight = 0;
    static SubtitleWidth = 0;
    static SubtitleHeight = 0;
    static LastTriggerKey = '';
    static LastTriggerTick = -1000;
    static FontTitle = null;
    static FontSubtitle = null;
    static Position = null;
    static Origin = null;
    static Scale = null;
    static TitleColor = null;
    static SubtitleColor = null;
    static OverlayColor = null;
    static AccentColor = null;
    static FlashColor = null;
    static Pixel = null;
    static LastError = '';

    static EnsureDrawState() {
        if (!this.Position) this.Position = Vector2.new();
        if (!this.Origin) this.Origin = Vector2.new();
        if (!this.Scale) this.Scale = NewVector2(1, 1);
        if (!this.TitleColor) this.TitleColor = NewColor(255, 255, 255, 255);
        if (!this.SubtitleColor) this.SubtitleColor = NewColor(220, 220, 220, 255);
        if (!this.OverlayColor) this.OverlayColor = NewColor(0, 0, 0, 0);
        if (!this.AccentColor) this.AccentColor = NewColor(255, 255, 255, 0);
        if (!this.FlashColor) this.FlashColor = NewColor(255, 255, 255, 0);
        if (!this.Pixel) {
            try { this.Pixel = Terraria.GameContent.TextureAssets.MagicPixel.Value; } catch (_) { }
        }
        if (!this.FontTitle) {
            try { this.FontTitle = FontAssets.DeathText.Value; } catch (_) { }
            if (!this.FontTitle) try { this.FontTitle = FontAssets.MouseText.Value; } catch (_) { }
        }
        if (!this.FontSubtitle) {
            try { this.FontSubtitle = FontAssets.MouseText.Value; } catch (_) { }
            if (!this.FontSubtitle) this.FontSubtitle = this.FontTitle;
        }
    }

    static Measure(font, text) {
        if (!font || !text) return { x: 0, y: 0 };
        try {
            const v = font['Vector2 MeasureString(string text)'](String(text));
            return { x: Number(v.X) || 0, y: Number(v.Y) || 0 };
        } catch (_) { return { x: 0, y: 0 }; }
    }

    static DrawRect(x, y, w, h, color) {
        if (!this.Pixel || !Main.spriteBatch || !(w > 0) || !(h > 0))
            return;
        try {
            Main.spriteBatch['void Draw(Texture2D texture, Rectangle destinationRectangle, Color color)'](
                this.Pixel, NewRectangle(x, y, w, h), color
            );
        } catch (_) { }
    }

    static Trigger(npc, key) {
        try {
            if (Terraria.Main.gameMenu === true || Number(Terraria.Main.netMode) === 2)
                return false;
            let player = null;
            try { player = Terraria.Main.LocalPlayer; } catch (_) { }
            if (!player || !player.active || player.dead)
                return false;
            const cfg = Configs[String(key)];
            const index = ValidNPCIndex(npc);
            if (!cfg || index < 0)
                return false;
            const tick = Tick();
            const dedupe = `${key}:${index}`;
            if (this.LastTriggerKey === dedupe && tick - this.LastTriggerTick < 15)
                return false;

            // Release a previous presentation before replacing it with a new one.
            if (this.Active)
                this.RestoreHeldNPC();

            this.LastTriggerKey = dedupe;
            this.LastTriggerTick = tick;
            this.Key = String(key);
            this.NPCIndex = index;
            this.StartTick = tick;
            this.Duration = Math.max(50, Math.floor(Number(cfg.duration) || 140));
            this.EndTick = tick + this.Duration;
            this.HoldDuration = Math.max(0, Math.floor(Number(cfg.hold) || 0));
            this.RevealTick = Math.max(0, Math.floor(Number(cfg.reveal) || 20));
            this.RoarTick = Math.max(0, Math.floor(Number(cfg.roar) || 14));
            this.RoarPlayed = false;
            this.FlashStartTick = -1000;
            this.HoldReleased = this.HoldDuration <= 0;
            this.ShakeStrength = Number(cfg.shake) || 0;
            this.OriginalDamage = Number(npc.damage) || 0;
            this.OriginalDontTakeDamage = npc.dontTakeDamage === true;
            this.OriginalChaseable = npc.chaseable !== false;
            this.Title = '';
            this.Subtitle = '';
            this.TitleWidth = 0;
            this.TitleHeight = 0;
            this.SubtitleWidth = 0;
            this.SubtitleHeight = 0;
            this.Initialized = false;
            this.LastError = '';
            this.Active = true;
            return true;
        } catch (e) {
            this.LastError = String(e);
            this.Active = false;
            this.Initialized = false;
            try { tl.log(`[CalamityPort BossIntro] trigger safely cancelled: ${e}`); } catch (_) { }
            return false;
        }
    }

    static InitializeActive() {
        if (!this.Active)
            return false;
        if (this.Initialized)
            return true;
        const cfg = Configs[this.Key];
        if (!cfg) {
            this.Clear(true);
            return false;
        }
        try {
            this.EnsureDrawState();
            this.Title = Translate(cfg.titleKey);
            this.Subtitle = Translate(cfg.subtitleKey);
            const titleSize = this.Measure(this.FontTitle, this.Title);
            const subtitleSize = this.Measure(this.FontSubtitle, this.Subtitle);
            this.TitleWidth = titleSize.x;
            this.TitleHeight = titleSize.y;
            this.SubtitleWidth = subtitleSize.x;
            this.SubtitleHeight = subtitleSize.y;

            const rgb = cfg.color || [255, 255, 255];
            const r = Math.max(0, Math.min(255, Math.floor(Number(rgb[0]) || 255)));
            const g = Math.max(0, Math.min(255, Math.floor(Number(rgb[1]) || 255)));
            const b = Math.max(0, Math.min(255, Math.floor(Number(rgb[2]) || 255)));
            const sr = Math.min(255, Math.floor(r * 0.72 + 70));
            const sg = Math.min(255, Math.floor(g * 0.72 + 70));
            const sb = Math.min(255, Math.floor(b * 0.72 + 70));
            for (const color of [this.TitleColor, this.AccentColor]) {
                color.R = r; color.G = g; color.B = b; color.A = 0;
            }
            this.SubtitleColor.R = sr;
            this.SubtitleColor.G = sg;
            this.SubtitleColor.B = sb;
            this.SubtitleColor.A = 0;
            this.OverlayColor.R = 0;
            this.OverlayColor.G = 0;
            this.OverlayColor.B = 0;
            this.OverlayColor.A = 0;
            this.FlashColor.R = Math.min(255, r + 35);
            this.FlashColor.G = Math.min(255, g + 35);
            this.FlashColor.B = Math.min(255, b + 35);
            this.FlashColor.A = 0;

            this.Initialized = true;
            FusionCamera.FocusNPC(this.NPCIndex, Math.max(this.HoldDuration + 8, Math.floor(Number(cfg.focus) || 80)), Number(cfg.smoothing) || 0.11);
            return true;
        } catch (e) {
            this.LastError = String(e);
            try { tl.log(`[CalamityPort BossIntro] deferred initialization failed safely: ${e}`); } catch (_) { }
            this.Clear(true);
            return false;
        }
    }

    static PlayIntroSound() {
        if (this.RoarPlayed)
            return;
        this.RoarPlayed = true;
        const cfg = Configs[this.Key] || {};
        const npc = NPCAt(this.NPCIndex);
        const point = NPCPoint(npc);
        let played = false;
        const file = String(cfg.soundFile || '');
        if (file) {
            try {
                const volume = Number(Terraria.Main.soundVolume);
                const result = AndroidSound.PlayExclusive(
                    'calamity-boss-intro', file,
                    Clamp((Number.isFinite(volume) ? volume : 1) * Number(cfg.soundVolume || 1), 0, 1),
                    Number(point.X), Number(point.Y), 2000, 220, 8, true
                );
                played = result && result.ok === true;
            } catch (_) { }
        }
        if (!played) {
            try { PlayRoarSound(point, Number(cfg.roarPitch) || 0, Number(cfg.soundVolume) || 0.95); } catch (_) { }
        }
        this.FlashStartTick = Tick();
        if (this.ShakeStrength > 0)
            FusionCamera.Shake(14, this.ShakeStrength);
    }

    static RestoreHeldNPC(npc = null) {
        if (this.HoldReleased)
            return;
        const target = npc || NPCAt(this.NPCIndex);
        if (target && target.active) {
            try { target.damage = this.OriginalDamage; } catch (_) { }
            try { target.dontTakeDamage = this.OriginalDontTakeDamage; } catch (_) { }
            try { target.chaseable = this.OriginalChaseable; } catch (_) { }
            try { target.netUpdate = true; } catch (_) { }
        }
        this.HoldReleased = true;
    }

    static ShouldHoldNPC(npc) {
        if (!this.Active || !npc || !npc.active)
            return false;
        const index = ValidNPCIndex(npc);
        if (index < 0 || index !== this.NPCIndex)
            return false;
        const age = Math.max(0, Tick() - this.StartTick);
        if (age >= this.HoldDuration) {
            this.RestoreHeldNPC(npc);
            return false;
        }
        try {
            const velocity = npc.velocity;
            velocity.X = 0;
            velocity.Y = 0;
            npc.velocity = velocity;
        } catch (_) { }
        try { npc.damage = 0; } catch (_) { }
        try { npc.dontTakeDamage = true; } catch (_) { }
        try { npc.chaseable = false; } catch (_) { }
        if (Number(npc.timeLeft) < 300)
            try { npc.timeLeft = 300; } catch (_) { }
        return true;
    }

    static Update() {
        if (!this.Active)
            return;
        if (!this.Initialized && !this.InitializeActive())
            return;
        if (Terraria.Main.gameMenu === true) {
            this.Clear(false);
            return;
        }
        const tick = Tick();
        const age = Math.max(0, tick - this.StartTick);
        if (!this.RoarPlayed && age >= this.RoarTick)
            this.PlayIntroSound();
        if (!this.HoldReleased && age >= this.HoldDuration) {
            this.RestoreHeldNPC();
            FusionCamera.BeginReturn(tick);
        }
        if (tick >= this.EndTick)
            this.Clear(false);
    }

    static Draw() {
        if (!this.Active || !this.Initialized || Terraria.Main.gameMenu === true || Terraria.Main.mapFullscreen === true)
            return;
        this.EnsureDrawState();
        if (!DrawText || !Main.spriteBatch || !this.FontTitle)
            return;
        try {
            const age = Math.max(0, Tick() - this.StartTick);
            const left = Math.max(0, this.Duration - age);
            let sceneAlpha = age < 12 ? age / 12 : 1;
            if (left < 24) sceneAlpha *= left / 24;
            sceneAlpha = Clamp(sceneAlpha, 0, 1);
            if (sceneAlpha <= 0.001)
                return;

            const screenW = Number(Terraria.Main.screenWidth);
            const screenH = Number(Terraria.Main.screenHeight);
            const screenX = screenW * 0.5;
            const screenY = screenH * 0.285;

            // Lightweight cinematic letterbox. It is drawn once with the intro and uses MagicPixel only.
            const barHeight = Math.max(28, Math.floor(screenH * 0.055));
            this.OverlayColor.A = Math.floor(145 * sceneAlpha);
            this.DrawRect(0, 0, screenW, barHeight, this.OverlayColor);
            this.DrawRect(0, screenH - barHeight, screenW, barHeight, this.OverlayColor);
            this.OverlayColor.A = Math.floor(72 * sceneAlpha);
            this.DrawRect(0, screenY - 48, screenW, 104, this.OverlayColor);

            // A short accent flash lands exactly with the boss sound/shake.
            const flashAge = Tick() - this.FlashStartTick;
            if (flashAge >= 0 && flashAge < 10) {
                const flash = 1 - flashAge / 10;
                this.FlashColor.A = Math.floor(90 * flash);
                this.DrawRect(0, 0, screenW, screenH, this.FlashColor);
            }

            if (age < this.RevealTick)
                return;

            const revealAge = age - this.RevealTick;
            const enter = EaseOutBack(Math.min(1, revealAge / 24));
            const titleScale = 0.70 + enter * 0.30;
            let textAlpha = Math.min(1, revealAge / 12) * sceneAlpha;

            const lineProgress = EaseOutCubic(Math.min(1, revealAge / 22));
            const lineWidth = Math.max(1, screenW * 0.34 * lineProgress);
            this.AccentColor.A = Math.floor(210 * textAlpha);
            this.DrawRect(screenX - lineWidth * 0.5, screenY + 35, lineWidth, 2, this.AccentColor);

            this.Position.X = screenX;
            this.Position.Y = screenY;
            this.Origin.X = this.TitleWidth * 0.5;
            this.Origin.Y = this.TitleHeight * 0.5;
            this.Scale.X = titleScale;
            this.Scale.Y = titleScale;
            this.TitleColor.A = Math.floor(255 * textAlpha);
            DrawText(Main.spriteBatch, this.FontTitle, this.Title, this.Position, this.TitleColor, 0, this.Origin, this.Scale, -1, 2.4);

            if (revealAge >= 18 && this.Subtitle && this.FontSubtitle) {
                const subAlpha = Math.min(1, (revealAge - 18) / 14) * sceneAlpha;
                this.Position.Y = screenY + Math.max(51, this.TitleHeight * 0.48 + 24);
                this.Origin.X = this.SubtitleWidth * 0.5;
                this.Origin.Y = this.SubtitleHeight * 0.5;
                this.Scale.X = 0.84;
                this.Scale.Y = 0.84;
                this.SubtitleColor.A = Math.floor(235 * subAlpha);
                DrawText(Main.spriteBatch, this.FontSubtitle, this.Subtitle, this.Position, this.SubtitleColor, 0, this.Origin, this.Scale, -1, 1.25);
            }
        } catch (e) {
            this.LastError = String(e);
            this.Clear(true);
        }
    }

    static Clear(releaseCamera = true) {
        this.RestoreHeldNPC();
        this.Active = false;
        this.Initialized = false;
        this.Key = '';
        this.NPCIndex = -1;
        this.HoldDuration = 0;
        this.HoldReleased = true;
        this.RoarPlayed = false;
        this.FlashStartTick = -1000;
        this.ShakeStrength = 0;
        this.Title = '';
        this.Subtitle = '';
        if (releaseCamera)
            FusionCamera.BeginReturn();
    }

    static GetStats() {
        return {
            active: this.Active,
            key: this.Key,
            npc: this.NPCIndex,
            ticksLeft: this.Active ? Math.max(0, this.EndTick - Tick()) : 0,
            holdTicksLeft: this.Active ? Math.max(0, this.HoldDuration - (Tick() - this.StartTick)) : 0,
            roarPlayed: this.RoarPlayed === true,
            error: this.LastError
        };
    }
}
