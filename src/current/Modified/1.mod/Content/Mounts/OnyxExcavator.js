import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModMount } from './../../TL/ModMount.js';
import { ModBuff } from './../../TL/ModBuff.js';
import { ModTexture } from './../../TL/ModTexture.js';

const { Vector2 } = Modules;
const IMMUNE_TILES = new Set([26, 466]);
const CONTAINER_TILES = new Set([21, 467]);
const PickCache = new Map();
let TileContainerSnapshot = null;

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Tick() { try { return I(Terraria.Main.GameUpdateCount, 0); } catch (e) { return 0; } }
function PlayerIndex(player) { try { return I(Terraria.PlayerIndex(player), -1); } catch (e) { return I(player?.whoAmI, -1); } }
function TileAt(x, y) { try { return Terraria.Main.tile.get_Item(I(x), I(y)); } catch (e) { return null; } }
function Active(tile) { try { return !!tile && tile['bool active()']() === true; } catch (e) { return false; } }
function ArrayAt(array, index, fallback = null) {
    if (!array) return fallback;
    index = I(index, -1);
    if (index < 0) return fallback;
    try { if (typeof array.get_Item === 'function') return array.get_Item(index); } catch (e) { }
    try {
        const getter = array['bool get_Item(int index)'];
        if (typeof getter === 'function') return getter(index);
    } catch (e) { }
    return fallback;
}
function ItemAt(inventory, index) {
    if (!inventory) return null;
    index = I(index, -1);
    if (index < 0) return null;
    try { if (typeof inventory.get_Item === 'function') return inventory.get_Item(index); } catch (e) { }
    try {
        const getter = inventory['Item get_Item(int index)'];
        if (typeof getter === 'function') return getter(index);
    } catch (e) { }
    try { const copy = Array.from(inventory); return copy[index] || null; } catch (e) { }
    return null;
}
function BestPick(player) {
    const owner = PlayerIndex(player), now = Tick();
    const old = PickCache.get(owner);
    if (old && old.until >= now) return old;
    let power = 35, useTime = 15;
    try {
        const inv = player.inventory;
        let snapshot = null;
        try { snapshot = Array.from(inv); } catch (e) { }
        for (let i = 0; i < 58; i++) {
            const item = snapshot ? snapshot[i] : ItemAt(inv, i);
            if (!item || N(item.stack, 0) <= 0) continue;
            const p = I(item.pick, 0);
            if (p > power) {
                power = p;
                useTime = Math.max(1, I(item.useTime, 15));
            } else if (p === power && p > 0) {
                useTime = Math.min(useTime, Math.max(1, I(item.useTime, 15)));
            }
        }
    } catch (e) { }
    const result = { power: Math.max(35, power), useTime: Math.max(1, useTime), until: now + 45 };
    PickCache.set(owner, result);
    return result;
}
function IsContainer(type) {
    type = I(type, -1);
    if (CONTAINER_TILES.has(type)) return true;
    if (!TileContainerSnapshot) { try { TileContainerSnapshot = Array.from(Terraria.Main.tileContainer); } catch (e) { } }
    if (TileContainerSnapshot && type >= 0 && type < TileContainerSnapshot.length) return TileContainerSnapshot[type] === true;
    try { return ArrayAt(Terraria.Main.tileContainer, type, false) === true; } catch (e) { return false; }
}
function PickTile(player, x, y, power) {
    try {
        const fn = player['void PickTile(int x, int y, int pickPower)'];
        if (typeof fn === 'function') { fn(I(x), I(y), I(power)); return true; }
    } catch (e) { }
    try { if (typeof player.PickTile === 'function') { player.PickTile(I(x), I(y), I(power)); return true; } } catch (e) { }
    return false;
}
function Excavate(player, x, y, power) {
    const maxX = I(Terraria.Main.maxTilesX, 0), maxY = I(Terraria.Main.maxTilesY, 0);
    x = I(x); y = I(y);
    if (x < 2 || y < 2 || x >= maxX - 2 || y >= maxY - 2) return false;
    if (player?.noBuilding === true) return false;
    const tile = TileAt(x, y);
    if (!Active(tile)) return false;
    const type = I(tile.type, -1);
    if (IMMUNE_TILES.has(type) || IsContainer(type)) return false;
    return PickTile(player, x, y, power);
}
function IsUseHeld(player) {
    try {
        return player.controlUseItem === true || Terraria.Main.mouseLeft === true || N(player.itemAnimation, 0) > 0 || N(player.itemTime, 0) > 0;
    } catch (e) { return false; }
}
function PlayerBounds(player) {
    const x = N(player?.position?.X), y = N(player?.position?.Y), w = Math.max(1, I(player?.width, 20)), h = Math.max(1, I(player?.height, 42));
    return { left: x, right: x + w, top: y, bottom: y + h };
}
function Drill(player) {
    const owner = PlayerIndex(player);
    if (owner < 0 || owner !== I(Terraria.Main.myPlayer, -2) || player?.dead === true) return;
    if (!IsUseHeld(player)) return;
    const horizontal = player.controlLeft === true || player.controlRight === true;
    const down = player.controlDown === true;
    if (!horizontal && !down) return;
    const pick = BestPick(player), now = Tick();
    if (now % pick.useTime !== 0) return;
    const b = PlayerBounds(player);
    const targets = [];
    if (horizontal) {
        const vx = N(player?.velocity?.X), speed = Math.abs(vx);
        let dir = speed < 0.1 ? I(player?.direction, 1) : Math.sign(vx);
        if (dir === 0) dir = player.controlLeft === true ? -1 : 1;
        const xOffset = speed > 0.5 ? 2 : 1;
        const edgeX = dir < 0 ? b.left + 2 : b.right - 2;
        const bottomY = b.bottom - 8;
        const leadX = edgeX + dir * 16 * xOffset;
        const tx = Math.floor(leadX / 16), ty = Math.floor(bottomY / 16);
        targets.push([tx, ty], [tx, ty - 1], [tx, ty - 2], [tx, ty - 3], [tx + dir, ty - 1], [tx + dir, ty - 2]);
    } else if (down) {
        const leftX = b.left + 2, rightX = b.right - 2, leadY = b.bottom + 8;
        const lx = Math.floor(leftX / 16), rx = Math.floor(rightX / 16), ty = Math.floor(leadY / 16);
        targets.push([lx, ty - 1], [rx, ty - 1], [lx - 1, ty - 1], [rx + 1, ty - 1], [lx, ty], [rx, ty], [lx - 1, ty], [rx + 1, ty]);
    }
    for (const q of targets) Excavate(player, q[0], q[1], pick.power);
}
function SafeSet(obj, name, value) { try { obj[name] = value; return true; } catch (e) { return false; } }

export class OnyxExcavator extends ModMount {
    constructor() {
        super();
        this.Texture = 'Items/Mounts/OnyxExcavator';
    }

    SetStaticDefaults() {
        const d = this.Data;
        const buff = Number(ModBuff.getTypeByName('OnyxExcavatorBuff'));
        if (Number.isFinite(buff) && buff >= 0) SafeSet(d, 'buff', buff);
        SafeSet(d, 'spawnDust', 145);
        SafeSet(d, 'spawnDustNoGravity', true);
        SafeSet(d, 'runSpeed', 4.5);
        SafeSet(d, 'swimSpeed', 0.5);
        SafeSet(d, 'acceleration', 0.1);
        SafeSet(d, 'jumpHeight', 5);
        SafeSet(d, 'jumpSpeed', 3.0);
        SafeSet(d, 'blockExtraJumps', true);
        SafeSet(d, 'totalFrames', 6);
        SafeSet(d, 'heightBoost', 10);
        try { d.playerYOffsets = [6, 6, 6, 6, 6, 6].makeGeneric('int'); } catch (e) { }
        SafeSet(d, 'playerHeadOffset', 10);
        SafeSet(d, 'bodyFrame', 3);
        SafeSet(d, 'xOffset', 10);
        SafeSet(d, 'yOffset', -1);
        SafeSet(d, 'standingFrameCount', 1);
        SafeSet(d, 'standingFrameDelay', 12);
        SafeSet(d, 'standingFrameStart', 0);
        SafeSet(d, 'runningFrameCount', 6);
        SafeSet(d, 'runningFrameDelay', 12);
        SafeSet(d, 'runningFrameStart', 0);
        SafeSet(d, 'inAirFrameCount', 1);
        SafeSet(d, 'inAirFrameDelay', 12);
        SafeSet(d, 'inAirFrameStart', 0);
        SafeSet(d, 'idleFrameCount', 1);
        SafeSet(d, 'idleFrameDelay', 12);
        SafeSet(d, 'idleFrameStart', 0);
        SafeSet(d, 'idleFrameLoop', false);
        SafeSet(d, 'swimFrameCount', 1);
        SafeSet(d, 'swimFrameDelay', 12);
        SafeSet(d, 'swimFrameStart', 0);
        SafeSet(d, 'textureWidth', 120);
        SafeSet(d, 'textureHeight', 348);
        // The original Calamity mount explicitly replaces these two front layers.
        try {
            const front = new ModTexture('Textures/Items/Mounts/OnyxExcavatorExtra2');
            if (front?.exists) d.frontTexture = front.asset.asset;
        } catch (e) { }
        try {
            const extra = new ModTexture('Textures/Items/Mounts/OnyxExcavatorExtra');
            if (extra?.exists) d.frontTextureExtra = extra.asset.asset;
        } catch (e) { }
    }

    UpdateEffects(mount, player) {
        try { Terraria.Lighting.AddLight(player.MountedCenter, 0.5, 0.5, 0.4); } catch (e) { }
        Drill(player);
    }

    UpdateFrame(mount, player, state, velocity) {
        const now = Tick();
        if (Math.abs(N(velocity?.X)) > 2.25 && N(velocity?.Y) === 0 && now % 8 === 0) {
            try {
                const px = N(player?.position?.X) + N(player?.width, 20) * 0.5;
                const py = N(player?.position?.Y) + N(player?.height, 42);
                const dust = Terraria.Dust.QuickDust(Vector2.new(px + (Math.random() * 20 - 10), py - 3), Modules.Color.Gray);
                if (dust) { dust.noGravity = true; dust.scale = 0.7 + Math.random() * 0.4; }
            } catch (e) { }
        }
        return true;
    }
}
