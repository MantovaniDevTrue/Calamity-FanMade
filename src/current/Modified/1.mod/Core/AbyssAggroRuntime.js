import { Terraria } from './../TL/ModImports.js';
import { ModBuff } from './../TL/ModBuff.js';
import { ModItem } from './../TL/ModItem.js';

let AnechoicPlatingType = 0;
let AnechoicCoatingBuffType = 0;
let FishAlertBuffType = 0;
const PlayerCache = new Map();

function I(v, f = -1) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : f;
}

function tickNow() {
    try { return I(Terraria.Main.GameUpdateCount, 0); } catch (_) { return 0; }
}

function platingType() {
    if (AnechoicPlatingType > 0) return AnechoicPlatingType;
    try { AnechoicPlatingType = I(ModItem.getTypeByName('AnechoicPlating'), 0); } catch (_) { }
    return AnechoicPlatingType;
}

function coatingType() {
    if (AnechoicCoatingBuffType > 0) return AnechoicCoatingBuffType;
    try { AnechoicCoatingBuffType = I(ModBuff.getTypeByName('AnechoicCoatingBuff'), 0); } catch (_) { }
    return AnechoicCoatingBuffType;
}
function fishAlertType() {
    if (FishAlertBuffType > 0) return FishAlertBuffType;
    try { FishAlertBuffType = I(ModBuff.getTypeByName('FishAlert'), 0); } catch (_) { }
    return FishAlertBuffType;
}

function hasBuff(player, buffType) {
    if (!player || !player.active || player.dead || !(buffType > 0)) return false;
    try { return Number(player.FindBuffIndex(buffType)) >= 0; } catch (_) { return false; }
}

function hasEquipped(player, itemType) {
    if (!player || !(itemType > 0)) return false;
    try {
        const armor = player.armor;
        const length = Math.min(20, Math.max(0, I(armor && armor.length, 20)));
        for (let i = 0; i < length; i++) {
            let item = null;
            try { item = armor.get_Item(i); } catch (_) { try { item = armor[i]; } catch (__){ } }
            if (item && Number(item.type) === Number(itemType) && Number(item.stack || 1) > 0)
                return true;
        }
    } catch (_) { }
    return false;
}

function playerFlags(player) {
    if (!player) return { plating: false, coating: false };
    const key = I(player.whoAmI, -1);
    const now = tickNow();
    const old = PlayerCache.get(key);
    if (old && now >= old.tick && now - old.tick < 12)
        return old;

    const value = {
        tick: now,
        plating: hasEquipped(player, platingType()),
        coating: hasBuff(player, coatingType())
    };
    PlayerCache.set(key, value);
    if (PlayerCache.size > 16) {
        for (const [k, v] of PlayerCache) {
            if (now - Number(v.tick || 0) > 120) PlayerCache.delete(k);
        }
    }
    return value;
}

export function HasAnechoicPlating(player) {
    return playerFlags(player).plating === true;
}

export function HasAnechoicCoating(player) {
    return playerFlags(player).coating === true;
}

export function GetAbyssAggroRange(player, range) {
    let baseRange = Math.max(0, Number(range) || 0);
    if (hasBuff(player, fishAlertType())) baseRange *= 3;
    const flags = playerFlags(player);
    return (flags.coating || flags.plating) ? baseRange * 0.5 : baseRange;
}
