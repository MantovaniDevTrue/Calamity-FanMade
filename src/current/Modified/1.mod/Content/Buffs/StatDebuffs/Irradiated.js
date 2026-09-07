import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class Irradiated extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/StatDebuffs/Irradiated';
    }

    SetStaticDefaults() {
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
        try {
            Terraria.ID.BuffID.Sets.BuffTimeIsExtendedWithGameDifficulty[this.Type] = true;
        } catch (e) { }
    }

    UpdatePlayer(player, buffIndex) {
        if (Number(player.lifeRegen) > 0)
            player.lifeRegen = 0;
        player.lifeRegenTime = 0;
        player.lifeRegen = Number(player.lifeRegen) - 8;
        player.statDefense = Number(player.statDefense) - 10;
        player.endurance = Number(player.endurance) - 0.10;
    }

    UpdateNPC(npc, buffIndex) {
        if (Number(npc.lifeRegen) > 0)
            npc.lifeRegen = 0;
        npc.lifeRegen = Number(npc.lifeRegen) - 20;
    }
}
