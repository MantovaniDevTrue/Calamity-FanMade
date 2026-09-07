import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModMount } from './../../TL/ModMount.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { ModTexture } from './../../TL/ModTexture.js';

const { Vector2 } = Modules;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function Set(obj, name, value) { try { obj[name] = value; return true; } catch (_) { return false; } }

export class MarniteLift extends ModMount {
    constructor() { super(); this.Texture = 'Items/Armor/MarniteArchitect/MarniteLift'; }
    SetStaticDefaults() {
        const d = this.Data, buff = Number(ModBuff.getTypeByName('MarniteLiftBuff'));
        if (buff >= 0) Set(d, 'buff', buff);
        Set(d, 'jumpHeight', 0); Set(d, 'acceleration', .2); Set(d, 'jumpSpeed', 0);
        Set(d, 'blockExtraJumps', true); Set(d, 'constantJump', false); Set(d, 'fallDamage', 1);
        Set(d, 'runSpeed', 2); Set(d, 'dashSpeed', 2); Set(d, 'flightTimeMax', 0); Set(d, 'fatigueMax', 0); Set(d, 'usesHover', false);
        Set(d, 'spawnDust', 6); Set(d, 'totalFrames', 1); Set(d, 'heightBoost', 0); Set(d, 'textureWidth', 32); Set(d, 'textureHeight', 24);
        try { d.playerYOffsets = [33].makeGeneric('int'); } catch (_) { }
        Set(d, 'xOffset', 0); Set(d, 'yOffset', 0); Set(d, 'bodyFrame', 0); Set(d, 'playerHeadOffset', 4);
        try { const fire = new ModTexture('Textures/Items/Armor/MarniteArchitect/MarniteLiftFire'); if (fire?.exists) d.frontTextureGlow = fire.asset.asset; } catch (_) { }
        Set(d, 'standingFrameCount', 1); Set(d, 'standingFrameDelay', 12); Set(d, 'standingFrameStart', 0);
        Set(d, 'runningFrameCount', 1); Set(d, 'runningFrameDelay', 12); Set(d, 'runningFrameStart', 0);
        Set(d, 'inAirFrameCount', 1); Set(d, 'inAirFrameDelay', 12); Set(d, 'inAirFrameStart', 0);
    }
    UpdateEffects(mount, player) {
        try { Terraria.Lighting.AddLight(Vector2.new(N(player.position.X) + N(player.width) * .5, N(player.position.Y) + N(player.height) + 10), 0.08, 0.45, 0.7); } catch (_) { }
        if (Math.random() < 1 / 3) { try { const q = Terraria.Dust.QuickDust(Vector2.new(N(player.position.X) + N(player.width) * .5 + (Math.random() * 12 - 6), N(player.position.Y) + N(player.height) + 5), Modules.Color.Cyan); if (q) { q.noGravity = true; q.scale = .6 + Math.random() * .4; } } catch (_) { } }
    }
    SetMount(mount, player) { return true; }
    Dismount(mount, player) { return true; }
}
