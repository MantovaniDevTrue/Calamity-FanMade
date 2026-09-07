import { Terraria, Modules } from './../ModImports.js';

const { Color } = Modules;
const NewDust = Terraria.Dust[
    'int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'
];

export class DustLoader {
    static RegisteredDusts = new Map();

    static register(name, settings = {}) {
        const key = String(name || '').trim();
        const type = Math.floor(Number(settings.type) || 0);

        if (!key || type <= 0)
            return false;

        this.RegisteredDusts.set(key, {
            type,
            onSpawn: typeof settings.onSpawn === 'function' ? settings.onSpawn : null
        });

        return true;
    }

    static getByName(name) {
        return this.RegisteredDusts.get(String(name || '').trim()) ?? null;
    }

    static getTypeByName(name) {
        return Number(this.getByName(name)?.type || 0);
    }

    static newDust(
        name,
        position,
        width = 1,
        height = 1,
        speedX = 0,
        speedY = 0,
        alpha = 0,
        color = Color.White,
        scale = 1
    ) {
        const definition = this.getByName(name);
        if (!definition || !position)
            return -1;

        let index = -1;
        try {
            index = Number(NewDust(
                position,
                Math.max(1, Math.floor(Number(width) || 1)),
                Math.max(1, Math.floor(Number(height) || 1)),
                definition.type,
                Number(speedX) || 0,
                Number(speedY) || 0,
                Math.max(0, Math.floor(Number(alpha) || 0)),
                color ?? Color.White,
                Math.max(0.01, Number(scale) || 1)
            ));
        } catch (e) {
            return -1;
        }

        if (index < 0 || !definition.onSpawn)
            return index;

        try {
            const dust = Terraria.Main.dust[index];
            if (dust)
                definition.onSpawn(dust);
        } catch (e) { }

        return index;
    }

    static clear() {
        this.RegisteredDusts.clear();
    }
}
