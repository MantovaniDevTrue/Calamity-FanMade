import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class ChiBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/StatBuffs/ChiBuff';
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
        Terraria.Main.debuff[this.Type] = false;
        Terraria.Main.pvpBuff[this.Type] = true;
        Terraria.Main.buffNoSave[this.Type] = true;
    }

    UpdatePlayer(player, buffIndex) {
        player.endurance = Number(player.endurance || 0) + 0.20;
    }
}
