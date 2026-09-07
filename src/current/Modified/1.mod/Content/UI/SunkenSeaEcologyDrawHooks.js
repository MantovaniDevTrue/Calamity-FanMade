import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModSystem } from './../../TL/ModSystem.js';

const Main = new NativeClass('Terraria', 'Main');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const DRAW = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
const BUCKET = 32;
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function NativeBool(v) { if (v === true) return true; if (v === false || v == null) return false; try { return Number(v) !== 0; } catch (e) { return false; } }
function BucketKey(bx, by) { return I(bx) * 4096 + I(by); }

export class SunkenSeaEcologyDrawHooks extends GlobalHooks {
    constructor() {
        super();
        this.Textures = Object.create(null);
        this.Failed = Object.create(null);
        this.HookInstalled = false;
        this.MarkerRef = null;
        this.MarkerCount = -1;
        this.Buckets = new Map();
        this.Bounds = null;
        this.Visible = [];
        this.VisibleKey = '';
        this.Position = null;
        this.Origin = null;
        this.Rects = Object.create(null);
    }

    EnsureScratch() {
        if (this.Position && this.Origin) return true;
        try {
            this.Position = Vector2.new();
            this.Origin = Vector2.new();
            this.Origin.X = 0; this.Origin.Y = 0;
            return true;
        } catch (_) { return false; }
    }

    LoadTexture(kind, path) {
        if (this.Textures[kind]) return this.Textures[kind];
        if (this.Failed[kind]) return null;
        try { this.Textures[kind] = tl.texture.load(path); }
        catch (e) { this.Failed[kind] = true; try { tl.log(`[CalamityPort] Sunken Sea ecology texture ${kind} failed: ${e}`); } catch (_) { } }
        return this.Textures[kind] || null;
    }

    Texture(kind) {
        if (kind === 'kelp') return this.LoadTexture(kind, 'Textures/Tiles/SunkenSea/Ambient/Kelp.png');
        if (kind === 'brain') return this.LoadTexture(kind, 'Textures/Tiles/SunkenSea/Ambient/BrainCoral.png');
        if (kind === 'coral') return this.LoadTexture(kind, 'Textures/Tiles/SunkenSea/Ambient/SmallCorals.png');
        if (kind === 'tube') return this.LoadTexture(kind, 'Textures/Tiles/SunkenSea/Ambient/SmallTubeCoral.png');
        if (kind === 'prism') return this.LoadTexture(kind, 'Textures/Tiles/SunkenSea/MediumSeaPrismCrystal.png');
        return null;
    }

    Source(kind, frame, texture) {
        if (kind !== 'coral' && kind !== 'prism') return null;
        const max = kind === 'coral' ? 5 : 8;
        const f = Math.max(0, I(frame) % max);
        const key = `${kind}:${f}`;
        let rect = this.Rects[key];
        if (rect) return rect;
        try {
            rect = Rectangle.new();
            rect.X = kind === 'coral' ? f * 72 : (f % 4) * 72;
            rect.Y = kind === 'coral' ? 0 : Math.floor(f / 4) * 72;
            rect.Width = 72; rect.Height = 72;
            this.Rects[key] = rect;
            return rect;
        } catch (_) { return null; }
    }

    RefreshMarkerCache(list) {
        if (list === this.MarkerRef && list.length === this.MarkerCount) return;
        this.MarkerRef = list;
        this.MarkerCount = list.length;
        this.Buckets = new Map();
        this.Bounds = null;
        this.VisibleKey = '';
        this.Visible.length = 0;
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        for (const marker of list) {
            if (!marker) continue;
            const x = I(marker.x, -1), y = I(marker.y, -1);
            if (x < 0 || y < 0) continue;
            const o = { marker, x, y, pixelX: x * 16 + 8, pixelY: y * 16 };
            const key = BucketKey(Math.floor(x / BUCKET), Math.floor(y / BUCKET));
            let bucket = this.Buckets.get(key);
            if (!bucket) { bucket = []; this.Buckets.set(key, bucket); }
            bucket.push(o);
            minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
        if (maxX >= minX && maxY >= minY) this.Bounds = { minX, minY, maxX, maxY };
    }

    VisibleMarkers(sx, sy, sw, sh) {
        const centerTileX = Math.floor((sx + sw * 0.5) / 16), centerTileY = Math.floor((sy + sh * 0.5) / 16);
        const key = `${Math.floor(centerTileX / 8)}:${Math.floor(centerTileY / 8)}:${I(sw)}:${I(sh)}:${this.MarkerCount}`;
        if (key === this.VisibleKey) return this.Visible;
        const marginX = 8, marginY = 9;
        const minX = Math.floor(sx / 16) - marginX, maxX = Math.ceil((sx + sw) / 16) + marginX;
        const minY = Math.floor(sy / 16) - marginY, maxY = Math.ceil((sy + sh) / 16) + marginY;
        const bx0 = Math.floor(minX / BUCKET), bx1 = Math.floor(maxX / BUCKET);
        const by0 = Math.floor(minY / BUCKET), by1 = Math.floor(maxY / BUCKET);
        const out = this.Visible; out.length = 0;
        for (let bx = bx0; bx <= bx1; bx++) for (let by = by0; by <= by1; by++) {
            const bucket = this.Buckets.get(BucketKey(bx, by));
            if (!bucket) continue;
            for (const o of bucket) if (o.x >= minX && o.x <= maxX && o.y >= minY && o.y <= maxY) out.push(o);
        }
        this.VisibleKey = key;
        return out;
    }

    Initialize() {
        let drawNPCs = null;
        try { drawNPCs = Main['void DrawNPCs(bool behindTiles)']; } catch (e) { }
        try { if (!drawNPCs) drawNPCs = Main.DrawNPCs; } catch (e) { }
        if (!drawNPCs || !drawNPCs.hook) { try { tl.log('[CalamityPort] Sunken Sea ecology draw hook unavailable.'); } catch (_) { } return; }
        drawNPCs.hook((original, self, behindTiles) => {
            const result = original(self, behindTiles);
            if (!NativeBool(behindTiles)) this.DrawEcology();
            return result;
        });
        this.HookInstalled = true;
    }

    OnWorldUnload() {
        this.Textures = Object.create(null);
        this.Failed = Object.create(null);
        this.MarkerRef = null; this.MarkerCount = -1; this.Buckets = new Map(); this.Bounds = null;
        this.VisibleKey = ''; this.Visible.length = 0; this.Rects = Object.create(null);
    }

    DrawEcology() {
        const runtimeSystem = ModSystem.getByName('SunkenSeaEcologySystem');
        if (!runtimeSystem) return;
        let list = [];
        try { list = runtimeSystem.GetMarkers ? runtimeSystem.GetMarkers() : []; } catch (e) { }
        if (!Array.isArray(list) || list.length === 0) return;
        this.RefreshMarkerCache(list);
        if (!this.Bounds || !this.EnsureScratch()) return;
        const offscreen = Main.drawToScreen === true ? 0 : Number(Main.offScreenRange || 0);
        const sx = Number(Main.screenPosition?.X || 0), sy = Number(Main.screenPosition?.Y || 0);
        const sw = Number(Main.screenWidth || 0), sh = Number(Main.screenHeight || 0);
        const minScreenX = this.Bounds.minX * 16 - sx, maxScreenX = this.Bounds.maxX * 16 - sx;
        const minScreenY = this.Bounds.minY * 16 - sy, maxScreenY = this.Bounds.maxY * 16 - sy;
        if (minScreenX > sw + 128 || maxScreenX < -128 || minScreenY > sh + 144 || maxScreenY < -144) return;
        const visible = this.VisibleMarkers(sx, sy, sw, sh);
        if (visible.length === 0) return;
        const draw = Main.spriteBatch[DRAW];
        if (!draw) return;
        const pos = this.Position, origin = this.Origin;
        for (const o of visible) {
            const marker = o.marker;
            const tex = this.Texture(marker.kind);
            if (!tex) continue;
            const src = this.Source(marker.kind, marker.frame, tex);
            const w = (marker.kind === 'coral' || marker.kind === 'prism') ? 72 : Number(tex.Width || 16);
            const h = (marker.kind === 'coral' || marker.kind === 'prism') ? 72 : Number(tex.Height || 16);
            const dx = o.pixelX - sx + offscreen, dy = o.pixelY - sy + offscreen;
            if (dx < -100 || dy < -120 || dx > sw + 100 || dy > sh + 120) continue;
            let light = Color.White;
            try { light = Terraria.Lighting['Color GetColor(int x, int y)'](o.x, o.y - 1); } catch (e) { }
            pos.X = dx; pos.Y = dy; origin.X = w * 0.5; origin.Y = h;
            draw(tex, pos, src, light, 0, origin, 1, marker.flip === true ? SpriteEffects.FlipHorizontally : SpriteEffects.None, 0);
        }
    }
}
