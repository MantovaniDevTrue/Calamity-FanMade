import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { GetAttachedClamWeight } from './../../../Core/SeaKingArsenalRuntime.js';

export class SnapClamDebuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/DamageOverTime/SnapClamDebuff';
    }

    SetStaticDefaults() {
        try {
            Terraria.Main.debuff[this.Type] = true;
            Terraria.Main.pvpBuff[this.Type] = true;
            Terraria.Main.buffNoSave[this.Type] = true;
        } catch (e) { }
    }

    UpdateNPC(npc, index) {
        const weight = GetAttachedClamWeight(npc);
        if (weight <= 0)
            return;
        if (Number(npc.lifeRegen) > 0)
            npc.lifeRegen = 0;
        npc.lifeRegen = Number(npc.lifeRegen) - weight * 15;
    }
}
