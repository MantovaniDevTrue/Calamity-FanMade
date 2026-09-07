import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class Mushy extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/StatBuffs/Mushy';
    }

    SetStaticDefaults() {
        try {
            Terraria.Main.pvpBuff[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.Main.buffNoSave[this.Type] = true;
        } catch (e) { }
    }

    UpdatePlayer(player, buffIndex) {
        player.statDefense += 3;
        player.lifeRegen += 2;
    }
}
