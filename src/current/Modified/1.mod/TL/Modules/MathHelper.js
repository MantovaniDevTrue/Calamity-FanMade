const _MathHelper = new NativeClass('Microsoft.Xna.Framework', 'MathHelper');

export class MathHelper {
    static get Type() {
        return _MathHelper;
    }
    
    static E = _MathHelper.E;
    static Log10E = _MathHelper.Log10E;
    static Log2E = _MathHelper.Log2E;
    static Pi = _MathHelper.Pi;
    static PiOver2 = _MathHelper.PiOver2;
    static PiOver4 = _MathHelper.PiOver4;
    static TwoPi = _MathHelper.TwoPi; 
    
    static Barycentric = _MathHelper.Barycentric;
    static CatmullRom = _MathHelper.CatmullRom;
    static Clamp = _MathHelper.Clamp;
    static Distance = _MathHelper.Distance;
    static Hermite = _MathHelper.Hermite;
    static Lerp = _MathHelper.Lerp;
    static Max = _MathHelper.Max;
    static Min = _MathHelper.Min;
    static SmoothStep = _MathHelper.SmoothStep;
    static ToDegrees = _MathHelper.ToDegrees;
    static ToRadians = _MathHelper.ToRadians;
    static WrapAngle = _MathHelper.WrapAngle;
    static IEEERemainder(x, y) {
        return x - Math.round(x / y) * y;
    }
}