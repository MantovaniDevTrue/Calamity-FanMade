import { Terraria } from './../ModImports.js';

export class Point16 {
    static get Type() {
        return Terraria.DataStructures.Point16;
    }
    
    static new(x = 0, y = 0) {
        const p = Terraria.DataStructures.Point16.new();
        p['void .ctor(int X, int Y)'](x, y);
        return p;
    }
    
    constructor(x = 0, y = 0) {
        this._x = x;
        this._y = y;
        this._value = Point16.new(x, y);
    }
    
    get X() { return this._x; }
    set X(value) {
        this._x = value;
        this._value.X = value;
    }
    
    get Y() { return this._y; }
    set Y(value) {
        this._y = value;
        this._value.Y = value;
    }
    
    get Value() { return this._value; }
    set Value(value) {
        this._value = value;
        this._x = value.X;
        this._y = value.Y;
    }
}