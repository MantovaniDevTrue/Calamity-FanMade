import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class AnechoicCoatingBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Potions/AnechoicCoatingBuff';
    }

    SetStaticDefaults() {
        Terraria.Main.debuff[this.Type] = false;
        Terraria.Main.pvpBuff[this.Type] = true;
        Terraria.Main.buffNoSave[this.Type] = false;
    }
}
