import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { Terraria } from './../../TL/ModImports.js';
import { TileData } from './../../TL/Modules/TileData.js';

const Main = new NativeClass('Terraria', 'Main');
const WorldGen = new NativeClass('Terraria', 'WorldGen');
const TileDrawing = new NativeClass('Terraria.GameContent.Drawing', 'TileDrawing');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');

function N(v) { return Math.floor(Number(v) || 0); }
function V(x, y) { const v = Vector2.new(); v.X = Number(x); v.Y = Number(y); return v; }
function R(x, y, w, h) { const r = Rectangle.new(); r.X = N(x); r.Y = N(y); r.Width = N(w); r.Height = N(h); return r; }
function Bool(v) { return v === true || Number(v) !== 0 && String(v).toLowerCase() !== 'false'; }
function IsGeneratingWorld() {
    try { return WorldGen.isGeneratingOrLoadingWorld === true; } catch (e) { return false; }
}

export class EffigyDrawHooks extends GlobalHooks {
    constructor() {
        super();
        this.Corrupt = null;
        this.Crimson = null;
        this.Slab = null;
        this.Rox = null;
        this.SmoothVoid = null;
        this.SmoothVoidGlow = null;
        this.VoidChest = null;
        this.Fail = false;
    }

    S() { return ModSystem.getByName('EffigySystem'); }
    RS() { return ModSystem.getByName('RoxShrineVisualSystem'); }
    AS() { return ModSystem.getByName('AbyssShrineVisualSystem'); }

    Load() {
        if (this.Corrupt && this.Crimson && this.Slab && this.Rox && this.SmoothVoid && this.SmoothVoidGlow && this.VoidChest)
            return true;
        if (this.Fail)
            return false;
        try {
            this.Corrupt = tl.texture.load('Textures/Tiles/Furniture/CorruptionEffigy.png');
            this.Crimson = tl.texture.load('Textures/Tiles/Furniture/CrimsonEffigy.png');
            this.Slab = tl.texture.load('Textures/Tiles/Crags/BrimstoneSlab.png');
            this.Rox = tl.texture.load('Textures/Tiles/RoxTile.png');
            this.SmoothVoid = tl.texture.load('Textures/Tiles/FurnitureVoid/SmoothVoidstone.png');
            this.SmoothVoidGlow = tl.texture.load('Textures/Tiles/FurnitureVoid/SmoothVoidstoneGlow.png');
            this.VoidChest = tl.texture.load('Textures/Tiles/FurnitureVoid/VoidChest.png');
            return !!this.Corrupt && !!this.Crimson && !!this.Slab && !!this.Rox && !!this.SmoothVoid && !!this.SmoothVoidGlow && !!this.VoidChest;
        } catch (e) {
            this.Fail = true;
            return false;
        }
    }

    Snap(tile) {
        return {
            tile,
            type: N(tile.type),
            sHeader: N(tile.sHeader),
            frameX: N(tile.frameX),
            frameY: N(tile.frameY),
            bHeader: N(tile.bHeader),
            bHeader2: N(tile.bHeader2),
            bHeader3: N(tile.bHeader3),
            wall: N(tile.wall),
            liquid: N(tile.liquid)
        };
    }

    Restore(snapshot) {
        const tile = snapshot.tile;
        tile.type = snapshot.type;
        tile.sHeader = snapshot.sHeader;
        tile.frameX = snapshot.frameX;
        tile.frameY = snapshot.frameY;
        tile.bHeader = snapshot.bHeader;
        tile.bHeader2 = snapshot.bHeader2;
        tile.bHeader3 = snapshot.bHeader3;
        tile.wall = snapshot.wall;
        tile.liquid = snapshot.liquid;
    }

    Hide() {
        const out = [];
        for (const position of this.S()?.Positions || []) {
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 3; x++) {
                    try {
                        const tile = new TileData(position.x + x, position.y + y);
                        const snapshot = this.Snap(tile);
                        tile.ClearEverything();
                        out.push(snapshot);
                    } catch (e) { }
                }
            }
        }
        for (const cell of this.RS()?.Cells || []) {
            try {
                const tile = new TileData(cell.x, cell.y);
                const snapshot = this.Snap(tile);
                tile.ClearEverything();
                out.push(snapshot);
            } catch (e) { }
        }
        const abyss = this.AS();
        for (const cell of abyss?.Cells || []) {
            try {
                const tile = new TileData(cell.x, cell.y);
                const snapshot = this.Snap(tile);
                tile.ClearEverything();
                out.push(snapshot);
            } catch (e) { }
        }
        if (abyss?.Chest) {
            for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
                try {
                    const tile = new TileData(abyss.Chest.x + column, abyss.Chest.y + row);
                    const snapshot = this.Snap(tile);
                    tile.ClearEverything();
                    out.push(snapshot);
                } catch (e) { }
            }
        }
        return out;
    }

    Initialize() {
        let tileDraw = null;
        try {
            tileDraw = TileDrawing['void Draw(bool solidLayer, bool forRenderTargets, bool intoRenderTargets, int waterStyleOverride)'];
        } catch (e) { }
        if (tileDraw?.hook) {
            tileDraw.hook((original, self, solidLayer, forRenderTargets, intoRenderTargets, waterStyleOverride) => {
                if (IsGeneratingWorld())
                    return original(self, solidLayer, forRenderTargets, intoRenderTargets, waterStyleOverride);
                const effigies = this.S()?.Positions || [];
                const roxCells = this.RS()?.Cells || [];
                const abyssCells = this.AS()?.Cells || [];
                const abyssChest = this.AS()?.Chest || null;
                if (!effigies.length && !roxCells.length && !abyssCells.length && !abyssChest)
                    return original(self, solidLayer, forRenderTargets, intoRenderTargets, waterStyleOverride);
                const snapshots = this.Hide();
                try {
                    return original(self, solidLayer, forRenderTargets, intoRenderTargets, waterStyleOverride);
                } finally {
                    for (const snapshot of snapshots) {
                        try { this.Restore(snapshot); } catch (e) { }
                    }
                }
            });
        }

        let drawNPCs = null;
        try { drawNPCs = Main['void DrawNPCs(bool behindTiles)']; } catch (e) { }
        if (drawNPCs?.hook) {
            drawNPCs.hook((original, self, behindTiles) => {
                const result = original(self, behindTiles);
                if (!IsGeneratingWorld() && !Bool(behindTiles))
                    this.Draw();
                return result;
            });
        }
    }

    Draw() {
        const effigies = this.S()?.Positions || [];
        const roxCells = this.RS()?.Cells || [];
        const abyssCells = this.AS()?.Cells || [];
        const abyssChest = this.AS()?.Chest || null;
        if ((!effigies.length && !roxCells.length && !abyssCells.length && !abyssChest) || !this.Load())
            return;

        const off = Main.drawToScreen === true ? 0 : Number(Main.offScreenRange || 0);
        const screenX = Number(Main.screenPosition.X || 0);
        const screenY = Number(Main.screenPosition.Y || 0);
        const screenWidth = N(Main.screenWidth);
        const screenHeight = N(Main.screenHeight);
        const draw = Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];

        for (const position of effigies) {
            const baseX = position.x * 16 - screenX + off + 8;
            const baseY = position.y * 16 - screenY + off;
            if (baseX < -80 || baseY < -80 || baseX > screenWidth + 80 || baseY > screenHeight + 80)
                continue;
            const texture = position.kind === 'crimson' ? this.Crimson : this.Corrupt;
            for (let row = 0; row < 4; row++) {
                for (let column = 0; column < 2; column++) {
                    let light = Color.White;
                    try { light = Terraria.Lighting['Color GetColor(int x, int y)'](position.x + column, position.y + row); } catch (e) { }
                    draw(texture, V(baseX + column * 16, baseY + row * 16), R(column * 18, row * 18, 16, 16), light, 0, V(0, 0), 1, SpriteEffects.None, 0);
                }
            }
        }

        for (const cell of roxCells) {
            const pixelX = cell.x * 16 - screenX + off;
            const pixelY = cell.y * 16 - screenY + off;
            if (pixelX < -32 || pixelY < -32 || pixelX > screenWidth + 32 || pixelY > screenHeight + 32)
                continue;
            let light = Color.White;
            try { light = Terraria.Lighting['Color GetColor(int x, int y)'](cell.x, cell.y); } catch (e) { }
            if (cell.kind === 'slab') {
                const frameX = ((cell.fx % 450) + 450) % 450 + (Math.abs(cell.x) % 2) * 450;
                const frameY = ((cell.fy % 198) + 198) % 198 + (Math.abs(cell.y) % 2) * 198;
                draw(this.Slab, V(pixelX, pixelY), R(frameX, frameY, 16, 16), light, 0, V(0, 0), 1, SpriteEffects.None, 0);
            } else {
                draw(this.Rox, V(pixelX, pixelY), R(cell.fx, cell.fy, 16, 16), light, 0, V(0, 0), 1, SpriteEffects.None, 0);
            }
        }


        const glowColor = Color.White;
        for (const cell of abyssCells) {
            const pixelX = cell.x * 16 - screenX + off;
            const pixelY = cell.y * 16 - screenY + off;
            if (pixelX < -32 || pixelY < -32 || pixelX > screenWidth + 32 || pixelY > screenHeight + 32)
                continue;
            let light = Color.White;
            try { light = Terraria.Lighting['Color GetColor(int x, int y)'](cell.x, cell.y); } catch (e) { }
            const fx = Math.max(0, Math.min(560, N(cell.fx)));
            const fy = Math.max(0, Math.min(252, N(cell.fy)));
            draw(this.SmoothVoid, V(pixelX, pixelY), R(fx, fy, 16, 16), light, 0, V(0, 0), 1, SpriteEffects.None, 0);
            draw(this.SmoothVoidGlow, V(pixelX, pixelY), R(fx, fy, 16, 16), glowColor, 0, V(0, 0), 1, SpriteEffects.None, 0);
        }
        if (abyssChest) {
            let open = false;
            try { open = N(Main.LocalPlayer.chest, -1) === N(abyssChest.index, -2); } catch (e) { }
            const baseY = open ? 38 : 0;
            for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
                const tx = abyssChest.x + column, ty = abyssChest.y + row;
                const pixelX = tx * 16 - screenX + off, pixelY = ty * 16 - screenY + off;
                if (pixelX < -32 || pixelY < -32 || pixelX > screenWidth + 32 || pixelY > screenHeight + 32) continue;
                let light = Color.White;
                try { light = Terraria.Lighting['Color GetColor(int x, int y)'](tx, ty); } catch (e) { }
                draw(this.VoidChest, V(pixelX, pixelY), R(column * 18, baseY + row * 18, 16, 16), light, 0, V(0, 0), 1, SpriteEffects.None, 0);
            }
        }
    }

    OnWorldUnload() {
        this.Corrupt = null;
        this.Crimson = null;
        this.Slab = null;
        this.Rox = null;
        this.SmoothVoid = null;
        this.SmoothVoidGlow = null;
        this.VoidChest = null;
        this.Fail = false;
    }
}
