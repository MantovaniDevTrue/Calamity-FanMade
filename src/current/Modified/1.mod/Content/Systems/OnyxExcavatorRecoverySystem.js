import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModItem } from './../../TL/ModItem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { ModLocalization } from './../../TL/ModLocalization.js';

const KEY = 'calamity:structure:onyxLab:';
const OBJECT_LEFT = 95, OBJECT_TOP = 35, OBJECT_W = 8, OBJECT_H = 4;
const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];

function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = -1) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function Tick() { try { return I(Terraria.Main.GameUpdateCount, 0); } catch (e) { return 0; } }
function Center(player) { try { return { x: N(player.MountedCenter.X), y: N(player.MountedCenter.Y) }; } catch (e) { return { x: N(player.position?.X) + N(player.width, 20) * 0.5, y: N(player.position?.Y) + N(player.height, 42) * 0.5 }; } }
function ItemAt(inv, index) {
    if (!inv) return null;
    try { if (typeof inv.get_Item === 'function') return inv.get_Item(I(index)); } catch (e) { }
    try { const g = inv['Item get_Item(int index)']; if (typeof g === 'function') return g(I(index)); } catch (e) { }
    try { const copy = Array.from(inv); return copy[I(index)] || null; } catch (e) { }
    return null;
}
function HeldPick(player) {
    try {
        const item = ItemAt(player.inventory, I(player.selectedItem, 0));
        return item && N(item.stack, 0) > 0 ? I(item.pick, 0) : 0;
    } catch (e) { return 0; }
}
function UseHeld(player) { try { return player.controlUseItem === true || Terraria.Main.mouseLeft === true || N(player.itemAnimation, 0) > 0; } catch (e) { return false; } }
function Inside(x, y, r, pad = 0) { return x >= r.l - pad && x <= r.r + pad && y >= r.t - pad && y <= r.b + pad; }

export class OnyxExcavatorRecoverySystem extends ModSystem {
    constructor() { super(); this.LastAttempt = -999; this.Logged = false; }
    OnWorldLoad() { this.LastAttempt = -999; this.Logged = false; }
    OnWorldUnload() { this.LastAttempt = -999; this.Logged = false; }

    PostUpdateTime() {
        if (!WorldDB.Instance || WorldDB.get(KEY + 'generated') !== true || WorldDB.get(KEY + 'excavatorKeyRecovered') === true) return;
        let player = null;
        try { player = Terraria.Main.LocalPlayer; } catch (e) { }
        if (!player || player.dead === true || player.noBuilding === true || HeldPick(player) <= 0 || !UseHeld(player)) return;
        const now = Tick();
        if (now - this.LastAttempt < 10) return;
        this.LastAttempt = now;
        const left = I(WorldDB.get(KEY + 'left')), top = I(WorldDB.get(KEY + 'top'));
        if (left < 0 || top < 0) return;
        const r = { l: (left + OBJECT_LEFT) * 16, t: (top + OBJECT_TOP) * 16, r: (left + OBJECT_LEFT + OBJECT_W) * 16, b: (top + OBJECT_TOP + OBJECT_H) * 16 };
        const c = Center(player);
        if (!Inside(c.x, c.y, r, 88)) return;
        let aimed = false;
        try { const m = Terraria.Main.MouseWorld; aimed = Inside(N(m.X), N(m.Y), r, 28); } catch (e) { }
        if (!aimed && !Inside(c.x, c.y, r, 40)) return;
        const keyType = I(ModItem.getTypeByName('OnyxExcavatorKey'), 0);
        if (keyType <= 0) return;
        try {
            NewItem(I(r.l), I(r.t), OBJECT_W * 16, OBJECT_H * 16, keyType, 1, false, -1, true);
            WorldDB.set(KEY + 'excavatorKeyRecovered', true);
            WorldDB.set(KEY + 'excavatorKeyRecoveredTick', now);
            try { WorldDB.Instance.Save(); } catch (e) { }
            try { Terraria.Main.NewText(ModLocalization.Translate('Messages.OnyxExcavatorKeyRecovered'), 190, 100, 210); } catch (e) { }
            try { tl.log(`[CalamityPort OnyxExcavator] key recovered from parked excavator at ${left + OBJECT_LEFT},${top + OBJECT_TOP}.`); } catch (e) { }
        } catch (e) {
            try { tl.log(`[CalamityPort OnyxExcavator] key recovery failed: ${e}`); } catch (_) { }
        }
    }
}
