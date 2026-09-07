const Main = new NativeClass('Terraria', 'Main');
const Utils = new NativeClass('Terraria', 'Utils');

export class Rand {
    static get Instance() { return Main.rand || null; }
    
    static Next(a, b) {
        const instance = Rand.Instance;
        if (instance === null) {
            return b === undefined ? Math.floor(Math.random() * a) : Math.floor(a + Math.random() * (b - a));
        }
        if (a === undefined) {
            return instance['int Next()']();
        }
        if (b === undefined) {
            return instance['int Next(int maxValue)'](a);
        }
        return instance['int Next(int minValue, int maxValue)'](a, b);
    }
    
    static NextInt(min = 0, max = 1) {
        return Rand.Next(Math.floor(min), Math.floor(max));
    }
    
    static NextFloat(min = 0, max = 1) {
        const instance = Rand.Instance;
        if (instance === null) {
            return min + Math.random() * (max - min);
        }
        return Utils['float NextFloat(UnifiedRandom r)'](instance) * (max - min) + min;
    }
    
    static NextBool(value = 2) {
        return Rand.Next(value) === 0;
    }
    
    static NextChance(value = 0.5) {
        return Rand.NextFloat() < value;
    }
    
    static NextVector2Square(rx, ry) {
        return Utils['Vector2 NextVector2Square(UnifiedRandom r, float min, float max)'](Rand.Instance, rx, ry);
    }
    
    static NextVector2FromRectangle(rect) {
        return Utils['Vector2 NextVector2FromRectangle(UnifiedRandom r, Rectangle rect)'](Rand.Instance, rect);
    }
    
    static NextVector2Circular(rx, ry) {
        return Utils['Vector2 NextVector2Circular(UnifiedRandom r, float circleHalfWidth, float circleHalfHeight)'](Rand.Instance, rx, ry);
    }
    
    static NextVector2Unit(start = 0, range = 6.28318548) {
        return Utils['Vector2 NextVector2Unit(UnifiedRandom r, float startRotation, float rotationRange)'](Rand.Instance, start, range);
    }
    
    static NextSign() {
        return Rand.NextBool() ? 1 : -1;
    }
    
    static NextFromList(arr) {
        return arr[Rand.Next(arr.length)];
    }
    
    // [[value1, weight], [value2, weight], ...];
    static NextFromListWeighted(arr) {
        let total = 0;
        for (let i = 0; i < arr.length; i++) total += arr[i][1];
        let r = Rand.NextFloat() * total;
        for (let i = 0; i < arr.length; i++) {
            if ((r -= arr[i][1]) <= 0) return arr[i][0];
        }
    }
}