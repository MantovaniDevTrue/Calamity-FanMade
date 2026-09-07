import { Terraria, Modules } from './../TL/ModImports.js';

const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
const DrawScaledTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';

const Visuals = new Map();
const YoyoOwnerLocks = new Map();
let YoyoTexture = null;
let PuppetTexture = null;
let PixelTexture = null;
let TextureLoadTried = false;
let YoyoDrawLogged = false;
let PuppetDrawLogged = false;
let DrawFailureLogged = false;

function N(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function Tick() {
    return Math.floor(N(Terraria.Main.GameUpdateCount, 0));
}

function Key(projectile) {
    return `${Math.floor(N(projectile?.owner, -1))}:${Math.floor(N(projectile?.identity, -1))}:${Math.floor(N(projectile?.type, -1))}`;
}

function ProjectileToken(projectile) {
    const identity = Math.floor(N(projectile?.identity, -1));
    if (identity >= 0) return `i:${identity}`;
    const slot = Math.floor(N(projectile?.whoAmI, -1));
    if (slot >= 0) return `w:${slot}`;
    return Key(projectile);
}

function OwnerKey(projectile) {
    return Math.floor(N(projectile?.owner, -1));
}

function IsFreshYoyoLock(lock, now) {
    return !!lock && now - N(lock.tick, -9999) <= 8;
}

export function ClaimPostSlimeGodYoyo(projectile) {
    if (!projectile) return false;
    const owner = OwnerKey(projectile);
    if (owner < 0) return true;
    const now = Tick();
    const token = ProjectileToken(projectile);
    const current = YoyoOwnerLocks.get(owner);
    if (!IsFreshYoyoLock(current, now) || current.token === token) {
        YoyoOwnerLocks.set(owner, { token, tick: now });
        return true;
    }
    return false;
}

export function RefreshPostSlimeGodYoyo(projectile) {
    if (!projectile) return false;
    const owner = OwnerKey(projectile);
    if (owner < 0) return true;
    const now = Tick();
    const token = ProjectileToken(projectile);
    const current = YoyoOwnerLocks.get(owner);
    if (!IsFreshYoyoLock(current, now)) {
        YoyoOwnerLocks.set(owner, { token, tick: now });
        return true;
    }
    if (current.token !== token) return false;
    current.tick = now;
    return true;
}

export function ReleasePostSlimeGodYoyo(projectile) {
    if (!projectile) return;
    const owner = OwnerKey(projectile);
    if (owner < 0) return;
    const current = YoyoOwnerLocks.get(owner);
    if (current && current.token === ProjectileToken(projectile)) YoyoOwnerLocks.delete(owner);
}

function LoadTextures() {
    if (TextureLoadTried) return;
    TextureLoadTried = true;
    try { YoyoTexture = tl.texture.load('Textures/Projectiles/Melee/Yoyos/GodsGambitYoyo.png'); } catch (e) { }
    try { PuppetTexture = tl.texture.load('Textures/Projectiles/Summon/SlimePuppet.png'); } catch (e) { }
    try { PixelTexture = Terraria.GameContent.TextureAssets.MagicPixel?.Value || null; } catch (e) { }
    if (!PixelTexture) {
        try { PixelTexture = tl.texture.load('Textures/Menus/BlankPixel.png'); } catch (e) { }
    }
}

export function UpdatePostSlimeGodVisual(projectile, kind, owner = null) {
    if (!projectile) return;
    try {
        const getRect = projectile['Rectangle getRect()'];
        if (typeof getRect !== 'function') return;
        const rect = getRect();
        if (!rect) return;
        let ownerX = 0;
        let ownerY = 0;
        let hasOwner = false;
        if (owner) {
            try {
                const ownerCenter = Terraria.PlayerCenter(owner);
                ownerX = N(ownerCenter?.X);
                ownerY = N(ownerCenter?.Y);
                hasOwner = Number.isFinite(ownerX) && Number.isFinite(ownerY);
            } catch (e) { }
        }
        Visuals.set(Key(projectile), {
            kind,
            type: Math.floor(N(projectile.type, -1)),
            owner: Math.floor(N(projectile.owner, -1)),
            tick: Tick(),
            x: N(rect.X) + N(rect.Width) * 0.5,
            y: N(rect.Y) + N(rect.Height) * 0.5,
            rotation: N(projectile.rotation),
            scale: Math.max(0.01, N(projectile.scale, 1)),
            ownerX,
            ownerY,
            hasOwner
        });
    } catch (e) { }
}

export function RemovePostSlimeGodVisual(projectile) {
    if (!projectile) return;
    try { Visuals.delete(Key(projectile)); } catch (e) { }
}

export function ClearPostSlimeGodVisuals() {
    Visuals.clear();
    YoyoOwnerLocks.clear();
    YoyoDrawLogged = false;
    PuppetDrawLogged = false;
    DrawFailureLogged = false;
}

function DrawString(spriteBatch, drawScaled, visual, screenX, screenY) {
    if (!visual.hasOwner || !PixelTexture || !drawScaled) return;
    const dx = visual.x - visual.ownerX;
    const dy = visual.y - visual.ownerY;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!(length > 4)) return;
    const position = Vector2.new(visual.ownerX - screenX, visual.ownerY - screenY);
    const pixelWidth = Math.max(1, N(PixelTexture.Width, 1));
    const pixelHeight = Math.max(1, N(PixelTexture.Height, 1));
    const targetThickness = 1.25;
    const origin = Vector2.new(0, pixelHeight * 0.5);
    drawScaled(PixelTexture, position, null, Color.White, Math.atan2(dy, dx), origin, Vector2.new(length / pixelWidth, targetThickness / pixelHeight), SpriteEffects.None, 0);
}

export function DrawPostSlimeGodVisuals() {
    if (Visuals.size <= 0 || Terraria.Main.gameMenu) return;
    LoadTextures();
    const spriteBatch = Terraria.Main.spriteBatch;
    const draw = spriteBatch && spriteBatch[DrawTexture];
    const drawScaled = spriteBatch && spriteBatch[DrawScaledTexture];
    if (!draw) {
        if (!DrawFailureLogged) {
            DrawFailureLogged = true;
            try { tl.log('[CalamityPort 12.84.6] post-Slime-God world overlay unavailable: SpriteBatch.Draw missing.'); } catch (e) { }
        }
        return;
    }
    const now = Tick();
    const screenX = N(Terraria.Main.screenPosition?.X);
    const screenY = N(Terraria.Main.screenPosition?.Y);
    for (const [key, visual] of Visuals) {
        if (!visual || now - N(visual.tick, -9999) > 4) {
            Visuals.delete(key);
            continue;
        }
        const texture = visual.kind === 'yoyo' ? YoyoTexture : PuppetTexture;
        if (!texture) continue;
        const position = Vector2.new(visual.x - screenX, visual.y - screenY);
        const origin = Vector2.new(N(texture.Width) * 0.5, N(texture.Height) * 0.5);
        if (visual.kind === 'yoyo') {
            DrawString(spriteBatch, drawScaled, visual, screenX, screenY);
            let light = Color.White;
            try { light = Terraria.Lighting['Color GetColor(int x, int y)'](Math.floor(visual.x / 16), Math.floor(visual.y / 16)); } catch (e) { }
            draw(texture, position, null, light, visual.rotation, origin, visual.scale, SpriteEffects.None, 0);
            if (!YoyoDrawLogged) {
                YoyoDrawLogged = true;
                try { tl.log('[CalamityPort 12.84.6] God\'s Gambit world-overlay renderer active.'); } catch (e) { }
            }
        } else {
            draw(texture, position, null, Color.White, visual.rotation, origin, visual.scale, SpriteEffects.None, 0);
            if (!PuppetDrawLogged) {
                PuppetDrawLogged = true;
                try { tl.log('[CalamityPort 12.84.6] Slime Puppet world-overlay renderer active.'); } catch (e) { }
            }
        }
    }
}
