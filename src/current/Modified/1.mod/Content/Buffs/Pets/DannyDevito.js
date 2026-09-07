import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class DannyDevito extends ModBuff {
    constructor() { super(); this.Texture = 'Buffs/Pets/DannyDevito'; }
    SetStaticDefaults() {
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
        Terraria.Main.vanityPet[this.Type] = true;
        try { Terraria.Main.lightPet[this.Type] = false; } catch (_) { }
    }
    UpdatePlayer(player, buffIndex) {
        if (!player || !player.active || player.dead) return;
        try { player.buffTime[buffIndex] = 18000; } catch (_) { }
    }
}
