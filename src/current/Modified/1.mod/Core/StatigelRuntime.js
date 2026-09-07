import { ModPlayer } from './../TL/ModPlayer.js';

function LocalState(player) {
    const state = ModPlayer.getByName('CalamityPlayerState');
    if (!state || !state.IsLocalPlayer(player)) return null;
    return state;
}

export function AddGenericDamage(player, amount) {
    const value = Number(amount) || 0;
    player.meleeDamage = Number(player.meleeDamage || 1) + value;
    player.rangedDamage = Number(player.rangedDamage || 1) + value;
    player.magicDamage = Number(player.magicDamage || 1) + value;
    player.minionDamage = Number(player.minionDamage || player.summonDamage || 1) + value;
    const state = LocalState(player);
    if (state) state.RogueDamageBonus += value;
}

export function AddGenericCrit(player, amount) {
    const value = Number(amount) || 0;
    player.meleeCrit = Number(player.meleeCrit || 0) + value;
    player.rangedCrit = Number(player.rangedCrit || 0) + value;
    player.magicCrit = Number(player.magicCrit || 0) + value;
    const state = LocalState(player);
    if (state) state.RogueCritBonus += value;
}

export function AddRogueDamage(player, amount) {
    const state = LocalState(player);
    if (state) state.RogueDamageBonus += Number(amount) || 0;
}

export function AddRogueCrit(player, amount) {
    const state = LocalState(player);
    if (state) state.RogueCritBonus += Number(amount) || 0;
}

export function ApplyStatigelSet(player, classKey) {
    const setState = ModPlayer.getByName('StatigelPlayer');
    if (setState && typeof setState.ActivateSet === 'function') setState.ActivateSet(player, classKey);


    if (classKey === 'melee') {
        player.aggro = Number(player.aggro || 0) + 400;
    } else if (classKey === 'rogue') {
        const state = LocalState(player);
        if (state) {
            state.WearingRogueArmor = true;
            state.RogueStealthMax = Number(state.RogueStealthMax || 0) + 0.9;
        }
    } else if (classKey === 'summon') {
        player.minionDamage = Number(player.minionDamage || player.summonDamage || 1) + 0.15;
    }
}
