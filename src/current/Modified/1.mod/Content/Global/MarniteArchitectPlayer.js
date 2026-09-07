import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModMount } from './../../TL/ModMount.js';
import { ModLocalization } from './../../TL/ModLocalization.js';

const { Vector2 } = Modules;
const MAX_GROUND_DISTANCE = 138;
const RAISE_SPEED = 2;
let QuickMountInstalled = false;
function N(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function I(v, f = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : f; }
function ArrayAt(a, i) { try { if (a && typeof a.get_Item === 'function') return a.get_Item(i); } catch (_) { } try { return Array.from(a || [])[i] || null; } catch (_) { return null; } }
function MountActive(mount) {
    if (!mount) return false;
    try { if (Boolean(mount._active)) return true; } catch (_) { }
    try { if (Boolean(mount.Active)) return true; } catch (_) { }
    return false;
}
function FullSet(player) { const a = player?.armor, h = ArrayAt(a, 0), b = ArrayAt(a, 1); return Number(h?.type) === Number(ModItem.getTypeByName('MarniteArchitectHeadgear')) && Number(b?.type) === Number(ModItem.getTypeByName('MarniteArchitectToga')); }
function TileAt(x, y) { try { return Terraria.Main.tile.get_Item(I(x), I(y)); } catch (_) { return null; } }
function Solid(tile) { if (!tile) return false; try { if (tile['bool active()']() !== true) return false; } catch (_) { return false; } try { if (tile['bool inActive()']() === true) return false; } catch (_) { } try { return Terraria.Main.tileSolid[Number(tile.type)] === true; } catch (_) { return false; } }
function GroundDistance(player) {
    const left = N(player.position.X) + 2, right = N(player.position.X) + Math.max(4, N(player.width, 20) - 2), bottom = N(player.position.Y) + N(player.height, 42);
    let best = MAX_GROUND_DISTANCE + 1;
    for (let px = left; px <= right; px += Math.max(3, N(player.width, 20) / 6)) {
        for (let d = 0; d <= MAX_GROUND_DISTANCE; d += 8) {
            if (Solid(TileAt(Math.floor(px / 16), Math.floor((bottom + d) / 16)))) { best = Math.min(best, d); break; }
        }
    }
    return best;
}
function Dismount(player) { try { const fn = player.mount['void Dismount(Player mountedPlayer, bool ignoreEffect)']; if (typeof fn === 'function') fn(player, false); else player.mount.Dismount(player, false); } catch (_) { } }
function MountLift(player) {
    const type = Number(ModMount.getTypeByName('MarniteLift')); if (!(type >= 0)) return false;
    try {
        if (!player || player.dead === true || player.noItems === true || player.frozen === true || player.tongued === true || player.webbed === true || player.stoned === true || N(player.gravDir, 1) === -1) return false;
        const mount = player.mount; if (!mount || MountActive(mount)) return false;
        try { const slot = I(Terraria.Player.miscSlotMount, -1); if (slot >= 0) { const equipped = ArrayAt(player.miscEquips, slot); if (equipped && Number(equipped.type) > 0) return false; } } catch (_) { }
        const setMount = mount['void SetMount(int m, Player mountedPlayer, bool ignoreEffect)'];
        if (typeof setMount === 'function') setMount(type, player, false); else if (typeof mount.SetMount === 'function') mount.SetMount(type, player, false); else return false;
        return true;
    } catch (_) { return false; }
}
function InstallQuickMount() {
    if (QuickMountInstalled) return; QuickMountInstalled = true;
    try {
        const fn = Terraria.Player['void QuickMount()'];
        if (!fn || typeof fn.hook !== 'function') return;
        fn.hook((original, self) => { if (FullSet(self) && MountLift(self)) return; original(self); });
    } catch (_) { }
}

export class MarniteArchitectPlayer extends ModPlayer {
    constructor() { super(); InstallQuickMount(); this.setEquipped = false; }
    ResetEffects(player) { this.setEquipped = false; }
    UpdateDead(player) { this.setEquipped = false; }
    IsArmorSet(player, head, body, legs) { return Number(head?.type) === Number(ModItem.getTypeByName('MarniteArchitectHeadgear')) && Number(body?.type) === Number(ModItem.getTypeByName('MarniteArchitectToga')); }
    UpdateArmorSet(player) { this.setEquipped = true; try { player.setBonus = ModLocalization.getTranslationArmorSetBonus('MarniteArchitect'); } catch (_) { } }
    UpdateMovement(player) {
        const type = Number(ModMount.getTypeByName('MarniteLift')); if (!(type >= 0) || !player?.mount) return;
        const onLift = MountActive(player.mount) && Number(player.mount._type) === type;
        if (!onLift) return;
        if (!FullSet(player)) { Dismount(player); return; }
        const distance = GroundDistance(player); if (distance > MAX_GROUND_DISTANCE) return;
        let y = 0;
        if (player.controlUp === true || player.controlJump === true) { y = -RAISE_SPEED; if (distance + RAISE_SPEED > MAX_GROUND_DISTANCE - 3) y = -Math.max(0, (MAX_GROUND_DISTANCE - 3) - distance); }
        else if (player.controlDown === true) y = RAISE_SPEED;
        try { player.velocity = Vector2.new(N(player.velocity.X), Math.abs(N(player.velocity.Y)) < 4 ? y : N(player.velocity.Y) * .88 + y * .12); } catch (_) { try { player.velocity.Y = y; } catch (__) { } }
        try { player.fallStart = Math.floor((N(player.position.Y) + N(player.height) * .5) / 16); } catch (_) { }
    }
}
