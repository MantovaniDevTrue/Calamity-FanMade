import { Terraria, Microsoft } from './../ModImports.js';

export class Rectangle {
    static get Type() {
        return Microsoft.Xna.Framework.Rectangle;
    }
    
    static new(x = 0, y = 0, width = 1, height = 1) {
        const r = Microsoft.Xna.Framework.Rectangle.new();
        r['void .ctor(int x, int y, int width, int height)'](x, y, width, height);
        return r;
    }
    
    static Empty() {
        return Microsoft.Xna.Framework.Rectangle.Empty;
    }
    
    static Size(rect) {
        return Terraria.Utils['Vector2 Size(Rectangle r)'](rect);
    }
    
    static Left(rect) {
        return Terraria.Utils['Vector2 Left(Rectangle r)'](rect);
    }
    
    static Right(rect) {
        return Terraria.Utils['Vector2 Right(Rectangle r)'](rect);
    }
    
    static Top(rect) {
        return Terraria.Utils['Vector2 Top(Rectangle r)'](rect);
    }
    
    static Bottom(rect) {
        return Terraria.Utils['Vector2 Bottom(Rectangle r)'](rect);
    }
    
    static Center(rect) {
        return Terraria.Utils['Vector2 Center(Rectangle r)'](rect);
    }
    
    static Distance(rect, point) {
        return Terraria.Utils['float Distance(Rectangle r, Vector2 point)'
        ](rect, point);
    }
    
    static ClosestPoint(rect, point) {
        return Terraria.Utils['Vector2 ClosestPointInRect(Rectangle r, Vector2 point)'
        ](rect, point);
    }
    
    constructor(x = 0, y = 0, width = 1, height = 1) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        this._value = Rectangle.new(x, y, width, height);
    }
    
    Update() {
        this._x = this.Value.X;
        this._y = this.Value.Y;
        this._width = this.Value.Width;
        this._height = this.Value.Height;
    }
    
    get X() { return this._x; }
    set X(value) {
        this._x = value;
        this.Value.X = value;
    }
    
    get Y() { return this._y; }
    set Y(value) {
        this._y = value;
        this.Value.Y = value;
    }
    
    get Width() { return this._width; }
    set Width(value) {
        this._width = value;
        this.Value.Width = value;
    }
    
    get Height() { return this._height; }
    set Height(value) {
        this._height = value;
        this.Value.Height = value;
    }
    
    get Value() { return this._value; }
    set Value(value) {
        this._value = value;
        this._x = value.X;
        this._y = value.Y;
        this._width = value.Width;
        this._height = value.Height;
    }
    
    get Center() {
        return this.Value.get_Center();
    }
    
    get Location() {
        return this.Value.get_Location();
    }
    
    set Location(pointValue) {
        this.Value.set_Location(pointValue);
        this.Update();
    }
    
    get IsEmpty() {
        return this.Value.get_IsEmpty();
    }
    
    get Left() {
        return this.Value.get_Left();
    }
    
    get Right() {
        return this.Value.get_Right();
    }
    
    get Top() {
        return this.Value.get_Top();
    }
    
    get Bottom() {
        return this.Value.get_Bottom();
    }
    
    Contains(x, y) {
        return this.Value['bool Contains(int x, int y)'](x, y);
    }
    
    Contains_Rect(rect) {
        return this.Value['bool Contains(Rectangle value)'](rect);
    }
    
    Intersects(rect) {
        return this.Value['bool Intersects(Rectangle rect)'](rect);
    }
    
    Equals(rect) {
        return this.Value['bool Equals(Rectangle other)'](rect);
    }
    
    Offset(offsetX = 0, offsetY = 0) {
        this.Value['void Offset(int offsetX, int offsetY)'](offsetX, offsetY);
        this.Update();
    }
    
    Inflate(horizontalValue, verticalValue) {
        this.Value['void Inflate(int horizontalValue, int verticalValue)'](horizontalValue, verticalValue);
        this.Update();
    }
}