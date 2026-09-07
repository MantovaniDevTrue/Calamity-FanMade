import { Terraria, Microsoft } from './../ModImports.js';

export class Vector2 {
    static get Type() {
        return Microsoft.Xna.Framework.Vector2;
    }
    
    static new(x = 0, y = 0) {
        const v = Microsoft.Xna.Framework.Vector2.new();
        v['void .ctor(float x, float y)'](x, y);
        return v;
    }
    
    static get Zero() {
        return Microsoft.Xna.Framework.Vector2.Zero;
    }
    
    static get One() {
        return Microsoft.Xna.Framework.Vector2.One;
    }
    
    static get UnitX() {
        return Microsoft.Xna.Framework.Vector2.UnitX;
    }
    
    static get UnitY() {
        return Microsoft.Xna.Framework.Vector2.UnitY;
    }
    
    static Add(v1, v2) {
        if (typeof v2 === 'number') {
            return Vector2.new(v1.X + v2, v1.Y + v2);
        }
        return Microsoft.Xna.Framework.Vector2[
        'Vector2 Add(Vector2 value1, Vector2 value2)'
        ](v1, v2);
    }
    
    static Subtract(v1, v2) {
        if (typeof v2 === 'number') {
            return Vector2.new(v1.X - v2, v1.Y - v2);
        }
        return Microsoft.Xna.Framework.Vector2[
        'Vector2 Subtract(Vector2 value1, Vector2 value2)'
        ](v1, v2);
    }
    
    static Multiply(v1, v2) {
        const method = typeof v2 === 'number'
        ? 'Vector2 Multiply(Vector2 value1, float scaleFactor)'
        : 'Vector2 Multiply(Vector2 value1, Vector2 value2)';
        return Microsoft.Xna.Framework.Vector2[method](v1, v2);
    }
    
    static Divide(v1, v2) {
        const method = typeof v2 === 'number'
        ? 'Vector2 Divide(Vector2 value1, float divider)'
        : 'Vector2 Divide(Vector2 value1, Vector2 value2)';
        return Microsoft.Xna.Framework.Vector2[method](v1, v2);
    }
    
    static Normalize(vec) {
        return Microsoft.Xna.Framework.Vector2[
        'Vector2 Normalize(Vector2 value)'
        ](vec);
    }
    
    static SafeNormalize(v1, v2) {
        return Terraria.Utils['Vector2 SafeNormalize(Vector2 v, Vector2 defaultValue)'
        ](v1, v2);
    }
    
    static Distance(v1, v2) {
        return Microsoft.Xna.Framework.Vector2[
        'float Distance(Vector2 value1, Vector2 value2)'
        ](v1, v2);
    }
    
    static DistanceSquared(v1, v2) {
        return Microsoft.Xna.Framework.Vector2[
        'float DistanceSquared(Vector2 value1, Vector2 value2)'
        ](v1, v2);
    }
    
    static Dot(v1, v2) {
        return Microsoft.Xna.Framework.Vector2[
        'float Dot(Vector2 value1, Vector2 value2)'
        ](v1, v2);
    }
    
    static Lerp(v1, v2, amount) {
        return Microsoft.Xna.Framework.Vector2[
        'Vector2 Lerp(Vector2 value1, Vector2 value2, float amount)'
        ](v1, v2, amount);
    }
    
    static ToVector2(obj) {
        if (!obj || obj.X == null || obj.Y == null)
            return Vector2.Zero;
        return Vector2.new(obj.X, obj.Y);
    }
    
    static ToRotation(vec) {
        return Terraria.Utils['float ToRotation(Vector2 v)'](vec);
    }
    
    static ToRotationVector2(value) {
        return Terraria.Utils['Vector2 ToRotationVector2(float f)'](value);
    }
    
    static ToPoint(vec) {
        return Terraria.Utils['Point ToPoint(Vector2 v)'](vec);
    }
    
    static AngleTo(v1, v2) {
        return Terraria.Utils[
        'float AngleTo(Vector2 Origin, Vector2 Target)'
        ](v1, v2);
    }

    static AngleTowards(current, target, maxChange) {
    return Terraria.Utils[
        'float AngleTowards(float curAngle, float targetAngle, float maxChange)'
    ](current, target, maxChange);
}
    
    static AngleFrom(v1, v2) {
        return Terraria.Utils[
        'float AngleFrom(Vector2 Origin, Vector2 Target)'
        ](v1, v2);
    }
    
    static ToScreenPosition(vec) {
        return Terraria.Utils['Vector2 ToScreenPosition(Vector2 worldPosition)'](vec);
    }
    
    static ToTileCoordinates(vec) {
        return Terraria.Utils['Point ToTileCoordinates(Vector2 vec)'](vec);
    }
    
    static SmoothStep(v1, v2, amount) {
        return Microsoft.Xna.Framework.Vector2['Vector2 SmoothStep(Vector2 value1, Vector2 value2, float amount)'
        ](v1, v2, amount);
    }
    
    static RotatedBy(v1, angle, center = Microsoft.Xna.Framework.Vector2.Zero) {
        return Terraria.Utils['Vector2 RotatedBy(Vector2 spinningpoint, double radians, Vector2 center)'
        ](v1, angle, center);
    }

    static RotatedByRandom(vec, maxRadians) {
    const angle = (Math.random() * 2 - 1) * maxRadians;
    return Vector2.RotatedBy(vec, angle);
}

    
    constructor(x = 0, y = 0) {
        this._x = x;
        this._y = y;
        this._value = Vector2.new(x, y);
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
    
    get Value() { return this._value; }
    set Value(value) {
        this._value = value;
        this._x = value.X;
        this._y = value.Y;
    }
    
    Add(vec) {
        this.X += vec.X ?? vec;
        this.Y += vec.Y ?? vec;
        return this;
    }
    
    Subtract(vec) {
        this.X -= vec.X ?? vec;
        this.Y -= vec.Y ?? vec;
        return this;
    }
    
    Multiply(vec) {
        this.X *= vec.X ?? vec;
        this.Y *= vec.Y ?? vec;
        return this;
    }
    
    Divide(vec) {
        this.X /= vec.X ?? vec;
        this.Y /= vec.Y ?? vec;
        return this;
    }
    
    Negate() {
        this.X *= -1;
        this.Y *= -1;
        return this;
    }
    
    Max(vec) {
        this.X = Math.max(this.X, vec.X ?? vec);
        this.Y = Math.max(this.Y, vec.Y ?? vec);
        return this;
    }

    Min(vec) {
        this.X = Math.min(this.X, vec.X ?? vec);
        this.Y = Math.min(this.Y, vec.Y ?? vec);
        return this;
    }
    
    Normalize() {
        const len = Math.sqrt(this.X * this.X + this.Y * this.Y);
        if (len === 0) {
            this.X = 0;
            this.Y = 0;
        } else {
            this.X /= len;
            this.Y /= len;
        }
        return this;
    }
    
    Length() {
        return this.Value['float Length()']();
    }
    
    LengthSquared() {
        return this.Value['float LengthSquared()']();
    }
}