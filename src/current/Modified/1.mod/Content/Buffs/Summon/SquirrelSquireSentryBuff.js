import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

function setArray(holder, name, index, value) {
    try {
        let a = holder[name], need = Number(index) + 1;
        let len = Number(a && a.Length); if (!Number.isFinite(len)) len = Number(a && a.length) || 0;
        if (len < need) { a = a.cloneResized(need); holder[name] = a; }
        try { a['void SetValue(Object value, int index)'](value, Number(index)); return true; } catch (_) { }
        try { a.set_Item(Number(index), value); return true; } catch (_) { }
    } catch (_) { }
    return false;
}

// Controle visual para mobile: o Squirrel continua sendo sentry, mas o buff
// dá ao TLPro um botão que o jogador pode tocar para dispensar a sentry.
export class SquirrelSquireSentryBuff extends ModBuff {
    constructor() { super(); this.Texture = 'Buffs/Summon/SquirrelSquireSentryBuff'; }
    SetStaticDefaults() {
        setArray(Terraria.Main, 'buffNoTimeDisplay', this.Type, true);
        setArray(Terraria.Main, 'buffNoSave', this.Type, true);
    }
    UpdatePlayer(player, buffIndex) {
        if (!player || player.dead) { try { if (player) player.DelBuff(buffIndex); } catch (_) { } }
    }
}
