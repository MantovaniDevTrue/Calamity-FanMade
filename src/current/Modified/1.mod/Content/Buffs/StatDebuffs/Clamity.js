import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class Clamity extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/StatDebuffs/Clamity';
    }

    SetStaticDefaults() {
        try {
            Terraria.Main.buffNoTimeDisplay[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.Main.debuff[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.Main.pvpBuff[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.Main.buffNoSave[this.Type] = true;
        } catch (e) { }
        try {
            Terraria.ID.BuffID.Sets.NurseCannotRemoveDebuff[this.Type] = true;
        } catch (e) { }
    }
}
