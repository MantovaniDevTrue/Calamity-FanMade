import { Terraria } from './../../TL/ModImports.js';
import { GlobalHooks } from './../../TL/GlobalHooks.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { TileData } from './../../TL/Modules/TileData.js';

const Main = new NativeClass('Terraria', 'Main');
const TileDrawing = new NativeClass('Terraria.GameContent.Drawing', 'TileDrawing');
const Rectangle = new NativeClass('Microsoft.Xna.Framework', 'Rectangle');
const Vector2 = new NativeClass('Microsoft.Xna.Framework', 'Vector2');
const Color = new NativeClass('Microsoft.Xna.Framework.Graphics', 'Color');
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
function Vec(x, y) {
    const value = Vector2.new();
    value.X = Number(x);
    value.Y = Number(y);
    return value;
}

function Rect(x, y, width, height) {
    const value = Rectangle.new();
    value.X = Math.floor(Number(x));
    value.Y = Math.floor(Number(y));
    value.Width = Math.floor(Number(width));
    value.Height = Math.floor(Number(height));
    return value;
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

function NativeBool(value) {
    if (value === true)
        return true;
    if (value === false || value == null)
        return false;
    try {
        const number = Number(value);
        if (Number.isFinite(number))
            return number !== 0;
    } catch (e) { }
    return String(value).toLowerCase() === 'true';
}

export class DesertScourgeTrophyDrawHooks extends GlobalHooks {
    constructor() {
        super();
        this.Texture = null;
        this.LoadFailed = false;
        this.RelicTexture = null;
        this.RelicLoadFailed = false;
        this.RelicPedestalTexture = null;
        this.RelicPedestalLoadFailed = false;
        this.CrabulonTrophyTexture = null;
        this.CrabulonTrophyLoadFailed = false;
        this.CrabulonRelicTexture = null;
        this.CrabulonRelicLoadFailed = false;
        this.HiveMindTrophyTexture = null;
        this.HiveMindTrophyLoadFailed = false;
        this.HiveMindRelicTexture = null;
        this.PerforatorTrophyTexture = null;
        this.PerforatorRelicTexture = null;
        this.SlimeGodTrophyTexture = null;
        this.SlimeGodRelicTexture = null;
        this.GiantClamTrophyTexture = null;
        this.GiantClamRelicTexture = null;
        this.HiveMindRelicLoadFailed = false;
        this.PerforatorTrophyLoadFailed = false;
        this.PerforatorRelicLoadFailed = false;
        this.SlimeGodTrophyLoadFailed = false;
        this.SlimeGodRelicLoadFailed = false;
        this.GiantClamTrophyLoadFailed = false;
        this.GiantClamRelicLoadFailed = false;
        this.CachedSystems = null;
        this.HookInstalled = false;
        this.TileRendererHookInstalled = false;
        this.WorldDrawHookInstalled = false;
        this.LastHideError = '';
    }

    GetSystems() {
        if (this.CachedSystems)
            return this.CachedSystems;
        this.CachedSystems = {
            trophies: [
                {
                    system: ModSystem.getByName('DesertScourgeTrophySystem'), texture: 'Texture', ensure: 'EnsureTexture'
                },
                {
                    system: ModSystem.getByName('CrabulonTrophySystem'), texture: 'CrabulonTrophyTexture', ensure: 'EnsureCrabulonTrophyTexture'
                },
                {
                    system: ModSystem.getByName('HiveMindTrophySystem'), texture: 'HiveMindTrophyTexture', ensure: 'EnsureHiveMindTrophyTexture'
                },
                {
                    system: ModSystem.getByName('PerforatorTrophySystem'), texture: 'PerforatorTrophyTexture', ensure: 'EnsurePerforatorTrophyTexture'
                },
                {
                    system: ModSystem.getByName('SlimeGodTrophySystem'), texture: 'SlimeGodTrophyTexture', ensure: 'EnsureSlimeGodTrophyTexture'
                },
                {
                    system: ModSystem.getByName('GiantClamTrophySystem'), texture: 'GiantClamTrophyTexture', ensure: 'EnsureGiantClamTrophyTexture'
                }
            ],
            relics: [
                {
                    system: ModSystem.getByName('DesertScourgeRelicSystem'), texture: 'RelicTexture', ensure: 'EnsureRelicTexture'
                },
                {
                    system: ModSystem.getByName('CrabulonRelicSystem'), texture: 'CrabulonRelicTexture', ensure: 'EnsureCrabulonRelicTexture'
                },
                {
                    system: ModSystem.getByName('HiveMindRelicSystem'), texture: 'HiveMindRelicTexture', ensure: 'EnsureHiveMindRelicTexture'
                },
                {
                    system: ModSystem.getByName('PerforatorRelicSystem'), texture: 'PerforatorRelicTexture', ensure: 'EnsurePerforatorRelicTexture'
                },
                {
                    system: ModSystem.getByName('SlimeGodRelicSystem'), texture: 'SlimeGodRelicTexture', ensure: 'EnsureSlimeGodRelicTexture'
                },
                {
                    system: ModSystem.getByName('GiantClamRelicSystem'), texture: 'GiantClamRelicTexture', ensure: 'EnsureGiantClamRelicTexture'
                }
            ]
        };
        return this.CachedSystems;
    }

    HasPositions(entries) {
        for (const entry of entries) {
            if (entry.system && Array.isArray(entry.system.Positions) && entry.system.Positions.length > 0)
                return true;
        }
        return false;
    }

    Initialize() {
        let rendererDraw = null;
        try {
            rendererDraw = TileDrawing['void Draw(bool solidLayer, bool forRenderTargets, bool intoRenderTargets, int waterStyleOverride)'];
        } catch (e) {
            rendererDraw = null;
        }
        try {
            if (!rendererDraw)
                rendererDraw = TileDrawing.Draw;
        } catch (e) {
            rendererDraw = null;
        }
        if (rendererDraw && rendererDraw.hook) {
            rendererDraw.hook((original, self, solidLayer, forRenderTargets, intoRenderTargets, waterStyleOverride) => {
                const systems = this.GetSystems();
                if (!this.HasPositions(systems.relics)) {
                    return original(self, solidLayer, forRenderTargets, intoRenderTargets, waterStyleOverride);
                }
                let hiddenTiles = [];
                let result = null;
                try {
                    hiddenTiles = this.HideNativeRelicTiles();
                    result = original(self, solidLayer, forRenderTargets, intoRenderTargets, waterStyleOverride);
                } finally {
                    if (hiddenTiles.length > 0)
                        this.RestoreNativeRelicTiles(hiddenTiles);
                }
                return result;
            });
            this.TileRendererHookInstalled = true;
        } else {
            tl.log('[CalamityPort] TileDrawing.Draw hook was unavailable.');
        }
        let drawNPCs = null;
        try {
            drawNPCs = Main['void DrawNPCs(bool behindTiles)'];
        } catch (e) {
            drawNPCs = null;
        }
        try {
            if (!drawNPCs)
                drawNPCs = Main.DrawNPCs;
        } catch (e) {
            drawNPCs = null;
        }
        if (drawNPCs && drawNPCs.hook) {
            drawNPCs.hook((original, self, behindTiles) => {
                const result = original(self, behindTiles);
                if (!NativeBool(behindTiles)) {
                    const systems = this.GetSystems();
                    if (this.HasPositions(systems.trophies))
                        this.DrawPlacedTrophies();
                    if (this.HasPositions(systems.relics))
                        this.DrawPlacedRelics();
                }
                return result;
            });
            this.WorldDrawHookInstalled = true;
        } else {
            tl.log('[CalamityPort] Desert Scourge furniture world draw hook was unavailable.');
        }
        this.HookInstalled = this.TileRendererHookInstalled && this.WorldDrawHookInstalled;
    }

    OnWorldUnload() {
        this.LoadFailed = false;
        this.RelicLoadFailed = false;
        this.RelicPedestalLoadFailed = false;
        this.CrabulonTrophyTexture = null;
        this.CrabulonTrophyLoadFailed = false;
        this.CrabulonRelicTexture = null;
        this.CrabulonRelicLoadFailed = false;
        this.HiveMindTrophyTexture = null;
        this.HiveMindTrophyLoadFailed = false;
        this.HiveMindRelicTexture = null;
        this.PerforatorTrophyTexture = null;
        this.PerforatorRelicTexture = null;
        this.SlimeGodTrophyTexture = null;
        this.SlimeGodRelicTexture = null;
        this.GiantClamTrophyTexture = null;
        this.GiantClamRelicTexture = null;
        this.HiveMindRelicLoadFailed = false;
        this.LastHideError = '';
    }

    EnsureTexture() {
        if (this.Texture)
            return true;
        if (this.LoadFailed)
            return false;
        try {
            this.Texture = tl.texture.load('Textures/Tiles/Furniture/BossTrophies/DesertScourgeTrophyTile.png');
            return !!this.Texture;
        } catch (e) {
            this.LoadFailed = true;
            tl.log(`[CalamityPort] Desert Scourge trophy tile texture load failed: ${e}`);
            return false;
        }
    }

    EnsureRelicTexture() {
        if (this.RelicTexture)
            return true;
        if (this.RelicLoadFailed)
            return false;
        try {
            this.RelicTexture = tl.texture.load('Textures/Tiles/Furniture/BossRelics/DesertScourgeRelic.png');
            return !!this.RelicTexture;
        } catch (e) {
            this.RelicLoadFailed = true;
            tl.log(`[CalamityPort] Desert Scourge relic world texture load failed: ${e}`);
            return false;
        }
    }

    EnsureRelicPedestalTexture() {
        if (this.RelicPedestalTexture)
            return true;
        if (this.RelicPedestalLoadFailed)
            return false;
        try {
            this.RelicPedestalTexture = tl.texture.load('Textures/Tiles/Furniture/BossRelics/RelicPedestal.png');
            return !!this.RelicPedestalTexture;
        } catch (e) {
            this.RelicPedestalLoadFailed = true;
            tl.log(`[CalamityPort] Desert Scourge relic pedestal texture load failed: ${e}`);
            return false;
        }
    }

    EnsureCrabulonTrophyTexture() {
        if (this.CrabulonTrophyTexture)
            return true;
        if (this.CrabulonTrophyLoadFailed)
            return false;
        try {
            this.CrabulonTrophyTexture = tl.texture.load('Textures/Tiles/Furniture/BossTrophies/CrabulonTrophyTile.png');
            return !!this.CrabulonTrophyTexture;
        } catch (e) {
            this.CrabulonTrophyLoadFailed = true;
            tl.log(`[CalamityPort] Crabulon trophy tile texture load failed: ${e}`);
            return false;
        }
    }

    EnsureCrabulonRelicTexture() {
        if (this.CrabulonRelicTexture)
            return true;
        if (this.CrabulonRelicLoadFailed)
            return false;
        try {
            this.CrabulonRelicTexture = tl.texture.load('Textures/Tiles/Furniture/BossRelics/CrabulonRelic.png');
            return !!this.CrabulonRelicTexture;
        } catch (e) {
            this.CrabulonRelicLoadFailed = true;
            tl.log(`[CalamityPort] Crabulon relic world texture load failed: ${e}`);
            return false;
        }
    }

    EnsureHiveMindTrophyTexture() {
        if (this.HiveMindTrophyTexture)
            return true;
        if (this.HiveMindTrophyLoadFailed)
            return false;
        try {
            this.HiveMindTrophyTexture = tl.texture.load('Textures/Tiles/Furniture/BossTrophies/HiveMindTrophyTile.png');
            return !!this.HiveMindTrophyTexture;
        } catch (e) {
            this.HiveMindTrophyLoadFailed = true;
            tl.log(`[CalamityPort] Hive Mind trophy tile texture load failed: ${e}`);
            return false;
        }
    }

    EnsureHiveMindRelicTexture() {
        if (this.HiveMindRelicTexture)
            return true;
        if (this.HiveMindRelicLoadFailed)
            return false;
        try {
            this.HiveMindRelicTexture = tl.texture.load('Textures/Tiles/Furniture/BossRelics/HiveMindRelic.png');
            return !!this.HiveMindRelicTexture;
        } catch (e) {
            this.HiveMindRelicLoadFailed = true;
            tl.log(`[CalamityPort] Hive Mind relic world texture load failed: ${e}`);
            return false;
        }
    }

    SnapshotTile(tileData) {
        return {
            tileData,
            type: Number(tileData.type || 0),
            sHeader: Number(tileData.sHeader || 0),
            frameX: Number(tileData.frameX || 0),
            frameY: Number(tileData.frameY || 0),
            bHeader: Number(tileData.bHeader || 0),
            bHeader2: Number(tileData.bHeader2 || 0),
            bHeader3: Number(tileData.bHeader3 || 0),
            wall: Number(tileData.wall || 0),
            liquid: Number(tileData.liquid || 0)
        };
    }

    ClearTileForDraw(tileData) {
        tileData.ClearEverything();
    }

    RestoreTileSnapshot(snapshot) {
        const tileData = snapshot.tileData;
        tileData.type = snapshot.type;
        tileData.sHeader = snapshot.sHeader;
        tileData.frameX = snapshot.frameX;
        tileData.frameY = snapshot.frameY;
        tileData.bHeader = snapshot.bHeader;
        tileData.bHeader2 = snapshot.bHeader2;
        tileData.bHeader3 = snapshot.bHeader3;
        tileData.wall = snapshot.wall;
        tileData.liquid = snapshot.liquid;
    }

    HideNativeRelicTiles() {
        const systems = this.GetSystems().relics.map(entry => entry.system);
        const snapshots = [];
        const seen = {};
        this.LastHideError = '';
        for (const system of systems) {
            if (!system || !Array.isArray(system.Positions))
                continue;
            for (const position of system.Positions) {
                for (let row = 0; row < 4; row++) {
                    for (let column = 0; column < 3; column++) {
                        const x = Number(position.x) + column;
                        const y = Number(position.y) + row;
                        const key = `${x}:${y}`;
                        if (seen[key])
                            continue;
                        seen[key] = true;
                        try {
                            const tileData = new TileData(x, y);
                            const snapshot = this.SnapshotTile(tileData);
                            this.ClearTileForDraw(tileData);
                            snapshots.push(snapshot);
                        } catch (e) {
                            this.LastHideError = String(e);
                        }
                    }
                }
            }
        }
        return snapshots;
    }

    RestoreNativeRelicTiles(snapshots) {
        for (const snapshot of snapshots) {
            try {
                this.RestoreTileSnapshot(snapshot);
            } catch (e) {
                this.LastHideError = String(e);
            }
        }
    }

    EnsurePerforatorTrophyTexture() {
        if (this.PerforatorTrophyTexture)
            return true;
        if (this.PerforatorTrophyLoadFailed)
            return false;
        try {
            this.PerforatorTrophyTexture = tl.texture.load('Textures/Tiles/Furniture/BossTrophies/PerforatorTrophyTile.png');
        } catch (e) {
            this.PerforatorTrophyTexture = null;
        }
        this.PerforatorTrophyLoadFailed = !this.PerforatorTrophyTexture;
        return !!this.PerforatorTrophyTexture;
    }

    EnsurePerforatorRelicTexture() {
        if (this.PerforatorRelicTexture)
            return true;
        if (this.PerforatorRelicLoadFailed)
            return false;
        try {
            this.PerforatorRelicTexture = tl.texture.load('Textures/Tiles/Furniture/BossRelics/PerforatorsRelic.png');
        } catch (e) {
            this.PerforatorRelicTexture = null;
        }
        this.PerforatorRelicLoadFailed = !this.PerforatorRelicTexture;
        return !!this.PerforatorRelicTexture;
    }

    EnsureSlimeGodTrophyTexture() {
        if (this.SlimeGodTrophyTexture)
            return true;
        if (this.SlimeGodTrophyLoadFailed)
            return false;
        try {
            this.SlimeGodTrophyTexture = tl.texture.load('Textures/Tiles/Furniture/BossTrophies/SlimeGodTrophyTile.png');
        } catch (e) {
            this.SlimeGodTrophyTexture = null;
        }
        this.SlimeGodTrophyLoadFailed = !this.SlimeGodTrophyTexture;
        return !!this.SlimeGodTrophyTexture;
    }

    EnsureSlimeGodRelicTexture() {
        if (this.SlimeGodRelicTexture)
            return true;
        if (this.SlimeGodRelicLoadFailed)
            return false;
        try {
            this.SlimeGodRelicTexture = tl.texture.load('Textures/Tiles/Furniture/BossRelics/SlimeGodRelic.png');
        } catch (e) {
            this.SlimeGodRelicTexture = null;
        }
        this.SlimeGodRelicLoadFailed = !this.SlimeGodRelicTexture;
        return !!this.SlimeGodRelicTexture;
    }

    EnsureGiantClamTrophyTexture() {
        if (this.GiantClamTrophyTexture)
            return true;
        if (this.GiantClamTrophyLoadFailed)
            return false;
        try {
            this.GiantClamTrophyTexture = tl.texture.load('Textures/Tiles/Furniture/BossTrophies/GiantClamTrophyTile.png');
        } catch (e) {
            this.GiantClamTrophyTexture = null;
        }
        this.GiantClamTrophyLoadFailed = !this.GiantClamTrophyTexture;
        return !!this.GiantClamTrophyTexture;
    }

    EnsureGiantClamRelicTexture() {
        if (this.GiantClamRelicTexture)
            return true;
        if (this.GiantClamRelicLoadFailed)
            return false;
        try {
            this.GiantClamRelicTexture = tl.texture.load('Textures/Tiles/Furniture/BossRelics/GiantClamRelic.png');
        } catch (e) {
            this.GiantClamRelicTexture = null;
        }
        this.GiantClamRelicLoadFailed = !this.GiantClamRelicTexture;
        return !!this.GiantClamRelicTexture;
    }

    DrawPlacedTrophies() {
        for (const entry of this.GetSystems().trophies) {
            if (!entry.system || !Array.isArray(entry.system.Positions) || entry.system.Positions.length <= 0)
                continue;
            if (!this[entry.ensure]())
                continue;
            this.DrawTrophyPositions(entry.system, this[entry.texture]);
        }
    }

    DrawTrophyPositions(system, texture) {
        const offscreen = Main.drawToScreen === true ? 0 : Number(Main.offScreenRange || 0);
        const screenX = Number(Main.screenPosition.X || 0);
        const screenY = Number(Main.screenPosition.Y || 0);
        const screenWidth = Number(Main.screenWidth || 0);
        const screenHeight = Number(Main.screenHeight || 0);
        const draw = Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
        for (const position of system.Positions) {
            const worldX = Number(position.x) * 16;
            const worldY = Number(position.y) * 16;
            const baseX = worldX - screenX + offscreen;
            const baseY = worldY - screenY + offscreen;
            if (baseX < -80 || baseY < -80 || baseX > screenWidth + 80 || baseY > screenHeight + 80)
                continue;
            for (let row = 0; row < 3; row++) {
                for (let column = 0; column < 3; column++) {
                    let light = Color.White;
                    try {
                        light = Terraria.Lighting['Color GetColor(int x, int y)'](position.x + column, position.y + row);
                    } catch (e) { }
                    draw(texture, Vec(baseX + column * 16, baseY + row * 16), Rect(column * 18, row * 18, 16, 16), light, 0, Vec(0, 0), 1, SpriteEffects.None, 0);
                }
            }
        }
    }

    DrawRelicPedestal(position, baseX, baseY, draw) {
        const texture = this.RelicPedestalTexture;
        let directionFrame = 0;
        try {
            const tile = new TileData(position.x, position.y);
            directionFrame = Math.floor(Number(tile.frameY || 0) / 72) % 2;
            if (directionFrame < 0)
                directionFrame = 0;
        } catch (e) {
            directionFrame = 0;
        }
        for (let row = 0; row < 4; row++) {
            for (let column = 0; column < 3; column++) {
                let light = Color.White;
                try {
                    light = Terraria.Lighting['Color GetColor(int x, int y)'](position.x + column, position.y + row);
                } catch (e) { }
                draw(texture, Vec(baseX + column * 16, baseY + row * 16 + 2), Rect(column * 18, directionFrame * 72 + row * 18, 16, 16), light, 0, Vec(0, 0), 1, SpriteEffects.None, 0);
            }
        }
    }

    DrawPlacedRelics() {
        if (!this.EnsureRelicPedestalTexture())
            return;
        for (const entry of this.GetSystems().relics) {
            if (!entry.system || !Array.isArray(entry.system.Positions) || entry.system.Positions.length <= 0)
                continue;
            if (!this[entry.ensure]())
                continue;
            this.DrawRelicPositions(entry.system, this[entry.texture]);
        }
    }

    DrawRelicPositions(system, texture) {
        const offscreen = Main.drawToScreen === true ? 0 : Number(Main.offScreenRange || 0);
        const screenX = Number(Main.screenPosition.X || 0);
        const screenY = Number(Main.screenPosition.Y || 0);
        const screenWidth = Number(Main.screenWidth || 0);
        const screenHeight = Number(Main.screenHeight || 0);
        const draw = Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];
        const twoPi = Math.PI * 2;
        const time = Number(Main.GlobalTimeWrappedHourly || (Number(Main.GameUpdateCount || 0) / 3600));
        const bob = Math.sin(time * twoPi / 5) * 4;
        const glowScale = Math.sin(time * twoPi / 2) * 0.3 + 0.7;
        const glowDistance = 6 + Math.sin(time * twoPi / 5) * 2;
        for (const position of system.Positions) {
            const worldX = Number(position.x) * 16;
            const worldY = Number(position.y) * 16;
            const baseX = worldX - screenX + offscreen;
            const baseY = worldY - screenY + offscreen;
            if (baseX < -100 || baseY < -100 || baseX > screenWidth + 100 || baseY > screenHeight + 100)
                continue;
            this.DrawRelicPedestal(position, baseX, baseY, draw);
            const drawX = baseX + 24;
            const drawY = baseY + 24 + bob;
            let light = Color.White;
            try {
                light = Terraria.Lighting['Color GetColor(int x, int y)'](position.x, position.y);
            } catch (e) { }
            let effects = SpriteEffects.None;
            try {
                const tile = new TileData(position.x, position.y);
                if (Math.floor(Number(tile.frameY || 0) / 72) !== 0)
                    effects = SpriteEffects.FlipHorizontally;
            } catch (e) { }
            const origin = Vec(Number(texture.Width || 50) / 2, Number(texture.Height || 50) / 2);
            const glowColor = Tint(light, 0.10 * glowScale);
            for (let k = 0; k < 6; k++) {
                const angle = twoPi * k / 6;
                draw(texture, Vec(drawX + Math.cos(angle) * glowDistance, drawY + Math.sin(angle) * glowDistance), null, glowColor, 0, origin, 1, effects, 0);
            }
            draw(texture, Vec(drawX, drawY), null, light, 0, origin, 1, effects, 0);
        }
    }
}
