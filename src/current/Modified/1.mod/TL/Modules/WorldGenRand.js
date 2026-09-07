const Main = new NativeClass('Terraria', 'Main');
const WorldGen = new NativeClass('Terraria', 'WorldGen');
const Utils = new NativeClass('Terraria', 'Utils');

export class WorldGenRand {
    static get Instance() { return (WorldGen.isGeneratingOrLoadingWorld ? WorldGen.genRand : Main.rand) || null; }
    
    static Next(a, b) {
        const instance = WorldGenRand.Instance;
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
        return WorldGenRand.Next(Math.floor(min), Math.floor(max));
    }
    
    static NextFloat(min = 0, max = 1) {
        const instance = WorldGenRand.Instance;
        if (instance === null) {
            return min + Math.random() * (max - min);
        }
        return Utils['float NextFloat(UnifiedRandom r)'](instance) * (max - min) + min;
    }
    
    static NextBool(value = 2) {
        return WorldGenRand.Next(value) === 0;
    }
    
    static NextChance(value = 0.5) {
        return WorldGenRand.NextFloat() < value;
    }
    
    static NextVector2Square(rx, ry) {
        return Utils['Vector2 NextVector2Square(UnifiedRandom r, float min, float max)'](WorldGenRand.Instance, rx, ry);
    }
    
    static NextVector2FromRectangle(rect) {
        return Utils['Vector2 NextVector2FromRectangle(UnifiedRandom r, Rectangle rect)'](WorldGenRand.Instance, rect);
    }
    
    static NextVector2Circular(rx, ry) {
        return Utils['Vector2 NextVector2Circular(UnifiedRandom r, float circleHalfWidth, float circleHalfHeight)'](WorldGenRand.Instance, rx, ry);
    }
    
    static NextVector2Unit(start = 0, range = 6.28318548) {
        return Utils['Vector2 NextVector2Unit(UnifiedRandom r, float startRotation, float rotationRange)'](WorldGenRand.Instance, start, range);
    }
    
    static NextSign() {
        return WorldGenRand.NextBool() ? 1 : -1;
    }
    
    static NextFromList(arr) {
        return arr[WorldGenRand.Next(arr.length)];
    }
    
    // [[value1, weight], [value2, weight], ...];
    static NextFromListWeighted(arr) {
        let total = 0;
        for (let i = 0; i < arr.length; i++) total += arr[i][1];
        let r = WorldGenRand.NextFloat() * total;
        for (let i = 0; i < arr.length; i++) {
            if ((r -= arr[i][1]) <= 0) return arr[i][0];
        }
    }
}