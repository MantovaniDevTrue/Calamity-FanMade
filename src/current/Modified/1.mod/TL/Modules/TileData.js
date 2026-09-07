import { Terraria } from './../ModImports.js';

export class TileData {
    x = 0;
    y = 0;
    offset = 0;
    
    constructor(x, y) {
        this.Initialize(x, y);
    }
    
    Initialize(x, y) {
        this.x = x;
        this.y = y;
        this.offset = y * Terraria.Main.maxTilesX + x;
    }
    
    // Tile
    get tile() {
        return Terraria.Main.tile.get_Item(this.x, this.y);
    }
    
    // Type
    get type() {
        return Terraria.TileData['ushort GetType(int tileIndex)'](this.offset);
    }
    set type(value) {
        Terraria.TileData['void SetType(int tileIndex, ushort newType)'](this.offset, value);
    }
    
    // Wall
    get wall() {
        return Terraria.TileData['ushort GetWall(int tileIndex)'](this.offset);
    }
    set wall(value) {
        Terraria.TileData['void SetWall(int tileIndex, ushort wall)'](this.offset, value);
    }
    
    // sHeader
    get sHeader() {
        return Terraria.TileData['short GetSHeader(int tileIndex)'](this.offset);
    }
    set sHeader(value) {
        Terraria.TileData['void SetSHeader(int tileIndex, short sHeader)'](this.offset, value);
    }
    
    // FrameX
    get frameX() {
        return Terraria.TileData['short GetFrameX(int tileIndex)'](this.offset);
    }
    set frameX(value) {
        Terraria.TileData['void SetFrameX(int tileIndex, short frameX)'](this.offset, value);
    }
    
    // FrameY
    get frameY() {
        return Terraria.TileData['short GetFrameY(int tileIndex)'](this.offset);
    }
    set frameY(value) {
        Terraria.TileData['void SetFrameY(int tileIndex, short frameY)'](this.offset, value);
    }
    
    // bHeader
    get bHeader() {
        return Terraria.TileData['byte GetBHeader(int tileIndex)'](this.offset);
    }
    set bHeader(value) {
        Terraria.TileData['void SetBHeader(int tileIndex, byte bHeader)'](this.offset, value);
    }
    
    // bHeader2
    get bHeader2() {
        return Terraria.TileData['byte GetBHeader2(int tileIndex)'](this.offset);
    }
    set bHeader2(value) {
        Terraria.TileData['void SetBHeader2(int tileIndex, byte bHeader2)'](this.offset, value);
    }
    
    // bHeader3
    get bHeader3() {
        return Terraria.TileData['byte GetBHeader3(int tileIndex)'](this.offset);
    }
    set bHeader3(value) {
        Terraria.TileData['void SetBHeader3(int tileIndex, byte bHeader3)'](this.offset, value);
    }
    
    // Liquid
    get liquid() {
        return Terraria.TileData['byte GetLiquid(int tileIndex)'](this.offset);
    }
    set liquid(value) {
        Terraria.TileData['void SetLiquid(int tileIndex, byte liquid)'](this.offset, value);
    }
    
    ClearEverything() {
        Terraria.TileData['void ClearEverything(int tileIndex)'](this.offset);
    }
    SetEverything(tileType, tileSHeader, frameX, frameY, tileBHeader, tileBHeader2, tileBHeader3, wall, liquid) {
        Terraria.TileData['void SetEverything(int tileIndex, ushort tileType, short tileSHeader, short frameX, short frameY, byte tileBHeader, byte tileBHeader2, byte tileBHeader3, byte wall, byte liquid)'
        ](this.offset, tileType, tileSHeader, frameX, frameY, tileBHeader, tileBHeader2, tileBHeader3, wall, liquid);
    }
    
    // IsSolid
    get isSolid() {
        return Terraria.WorldGen['bool SolidTile(short tileSHeader, ushort tileType)'](this.sHeader, this.type);
    }
    get isSolidOrSloped() {
        return Terraria.WorldGen['bool SolidOrSlopedTile(int x, int y)'](this.x, this.y);
    }
}