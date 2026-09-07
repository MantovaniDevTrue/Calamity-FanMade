import { Terraria, Modules } from './../TL/ModImports.js';
import { FusionCamera } from './FusionCamera.js';
import { FusionVFXSystem } from './FusionVFXSystem.js';

const { Color } = Modules;

const Configs = Object.freeze({
    desert: { rgb: [224, 190, 105], dot: { r: 238, g: 206, b: 128, a: 225 }, shake: 2.2, variant: 2 },
    crabulon: { rgb: [92, 220, 238], dot: { r: 135, g: 240, b: 250, a: 230 }, shake: 2.2, variant: 3 },
    perforator: { rgb: [210, 65, 78], dot: { r: 235, g: 80, b: 92, a: 235 }, shake: 2.4, variant: 1 },
    slime: { rgb: [180, 105, 220], dot: { r: 205, g: 125, b: 238, a: 230 }, shake: 2.3, variant: 0 }
});

function CenterXY(npc) {
    const position = npc && npc.position;
    return {
        x: Number(position && position.X) + Number(npc && npc.width) * 0.5,
        y: Number(position && position.Y) + Number(npc && npc.height) * 0.5
    };
}

// Phase 13.23.1: the transition keeps the same one-shot gameplay trigger but
// uses cached AFTER-MOON-style sprite layers instead of a cloud of MagicPixel dots.
export class BossPhaseVFX {
    static Colors = new Map();

    static NativeColor(key, cfg) {
        if (this.Colors.has(key))
            return this.Colors.get(key);
        const rgb = cfg.rgb;
        const color = Color.new(rgb[0], rgb[1], rgb[2], 52);
        this.Colors.set(key, color);
        return color;
    }

    static Trigger(npc, key, level = 1) {
        if (!npc || npc.active !== true || Terraria.Main.netMode === 2)
            return false;
        const cfg = Configs[key];
        if (!cfg)
            return false;
        const power = Math.max(1, Math.min(3, Math.floor(Number(level) || 1)));
        const center = CenterXY(npc);
        try { FusionCamera.ShakeAt({ X: center.x, Y: center.y }, 12 + power * 4, cfg.shake + (power - 1) * 0.45, 1500); } catch (_) { }
        try { FusionCamera.Fade(this.NativeColor(key, cfg), 18, 0, 18); } catch (_) { }

        if (FusionVFXSystem.Enabled) {
            try {
                const coreSize = 52 + power * 17;
                FusionVFXSystem.SpawnLayeredBurst(
                    center,
                    coreSize,
                    cfg.dot,
                    34 + power * 5,
                    {
                        variant: cfg.variant,
                        sizeEnd: coreSize * (2.15 + power * 0.15),
                        rotVel: (key === 'perforator' ? -1 : 1) * 0.028,
                        pulseAmp: 0.10,
                        fadeIn: 2,
                        fadeOut: 22,
                        priority: 3
                    }
                );

                // A second soft shockwave makes the phase change read clearly
                // without creating another native particle system.
                FusionVFXSystem.SpawnSprite(
                    center,
                    'ring',
                    56 + power * 10,
                    cfg.dot,
                    30 + power * 4,
                    {
                        sizeY: 56 + power * 10,
                        rotVel: -0.018,
                        pulseAmp: 0.22,
                        pulseSpeed: 0.08,
                        fakeAdditive: true,
                        fadeIn: 1,
                        fadeOut: 24,
                        priority: 3
                    }
                );

                const count = 8 + power * 2;
                for (let i = 0; i < count; i++) {
                    const angle = Math.PI * 2 * i / count;
                    const speed = 1.45 + power * 0.35;
                    const radius = 18 + power * 7;
                    FusionVFXSystem.SpawnSprite(
                        {
                            x: center.x + Math.cos(angle) * radius,
                            y: center.y + Math.sin(angle) * radius
                        },
                        i % 3 === 0 ? 'flare' : 'tiny',
                        i % 3 === 0 ? 13 + power * 2 : 7 + power,
                        cfg.dot,
                        22 + power * 4,
                        {
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed - 0.10,
                            drag: 0.94,
                            gravity: 0.015,
                            rotation: angle,
                            rotVel: (i % 2 ? 1 : -1) * 0.07,
                            fakeAdditive: true,
                            fadeIn: 1,
                            fadeOut: 15,
                            priority: 2
                        }
                    );
                }
            } catch (_) { }
        }
        return true;
    }
}
