import { Microsoft } from './../ModImports.js';

export class Point {
    static get Type() {
        return Microsoft.Xna.Framework.Point;
    }
    
    static new(x = 0, y = 0) {
        const p = Microsoft.Xna.Framework.Point.new();
        p['void .ctor(int x, int y)'](x, y);
        return p;
    }
    
    static get Zero() {
        return Microsoft.Xna.Framework.Point.Zero;
    }
    
    static op_Equality(a, b) {
        return Microsoft.Xna.Framework.Point['bool op_Equality(Point a, Point b)'](a, b);
    }
    static op_Inequality(a, b) {
        return Microsoft.Xna.Framework.Point['bool op_Inequality(Point a, Point b)'](a, b);
    }
    
    constructor(x = 0, y = 0) {
        this._x = x;
        this._y = y;
        this._value = Point.new(x, y);
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