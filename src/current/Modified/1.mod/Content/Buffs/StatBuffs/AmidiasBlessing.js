import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class AmidiasBlessing extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/StatBuffs/AmidiasBlessing';
    }

    SetStaticDefaults() {
        Terraria.Main.debuff[this.Type] = false;
        Terraria.Main.buffNoSave[this.Type] = false;
    }

    UpdatePlayer(player, buffIndex) {
        player.breath = Number(player.breathMax) + 91;
    }
}
