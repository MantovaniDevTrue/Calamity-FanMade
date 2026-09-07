import { Terraria } from './../../TL/ModImports.js';

// TLPro/IL2CPP compatibility bridge for Terraria's old numeric sound API.
// Passing Terraria.ID.SoundID.* (LegacySoundStyle NativeObject) through JS can trigger
// expensive native-member enumeration. The numeric overload avoids that bridge entirely.
const PlayXY = Terraria.Audio.SoundEngine['SoundEffectInstance PlaySound(int type, int x, int y, int Style, float volumeScale, float pitchOffset)'];
const PlayVector = Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'];
let BridgeLogged = false;

function LogBridgeOnce() {
    if (BridgeLogged)
        return;
    BridgeLogged = true;
    try { tl.log('[CalamityPort AudioCompat] numeric legacy sound bridge active; Native LegacySoundStyle arguments=0.'); } catch (e) { }
}

function XY(position) {
    if (!position)
        return { x: -1, y: -1 };
    return {
        x: Math.floor(Number(position.X) || 0),
        y: Math.floor(Number(position.Y) || 0)
    };
}

export function PlayLegacyNumeric(type, style, position, pitch = 0, volume = 1) {
    LogBridgeOnce();
    try {
        const p = XY(position);
        PlayXY(
            Math.floor(Number(type) || 0),
            p.x,
            p.y,
            Math.floor(Number(style) || 0),
            Number(volume),
            Number(pitch)
        );
        return true;
    } catch (e) {
        return false;
    }
}

export function PlayLegacyVector(type, style, position, pitch = 0) {
    LogBridgeOnce();
    try {
        PlayVector(
            Math.floor(Number(type) || 0),
            position,
            Math.floor(Number(style) || 0),
            Number(pitch)
        );
        return true;
    } catch (e) {
        return false;
    }
}

export function PlayItemSound(style, position, pitch = 0, volume = 1) {
    return PlayLegacyNumeric(2, style, position, pitch, volume);
}

export function PlayNPCHitSound(style, position, pitch = 0, volume = 1) {
    return PlayLegacyNumeric(3, style, position, pitch, volume);
}

export function PlayNPCDeathSound(style, position, pitch = 0, volume = 1) {
    return PlayLegacyNumeric(4, style, position, pitch, volume);
}

// Classic Terraria legacy sound type IDs used by the port.
export function PlayDigSound(position, pitch = 0, volume = 1) {
    return PlayLegacyNumeric(0, 1, position, pitch, volume);
}

export function PlayGrabSound(position, pitch = 0, volume = 1) {
    return PlayLegacyNumeric(7, 1, position, pitch, volume);
}

export function PlayMenuTickSound(position, pitch = 0, volume = 1) {
    return PlayLegacyNumeric(12, 1, position, pitch, volume);
}

export function PlayRoarSound(position, pitch = 0, volume = 1) {
    return PlayLegacyNumeric(15, 1, position, pitch, volume);
}
