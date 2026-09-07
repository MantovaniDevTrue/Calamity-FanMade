import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class ChiRegenBuff extends ModBuff {
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
        const controller = ModPlayer.getByName('SurfaceShrineAccessoryPlayer');
        if (controller)
            controller.EnableChiRegen(player);
    }
}
