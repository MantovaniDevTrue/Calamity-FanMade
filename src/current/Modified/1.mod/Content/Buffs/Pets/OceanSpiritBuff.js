import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class OceanSpiritBuff extends ModBuff {
    constructor() { super(); this.Texture = 'Buffs/Pets/OceanSpiritBuff'; }

    SetStaticDefaults() {
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
        // Official Calamity: Ocean Spirit occupies the light-pet slot only.
        Terraria.Main.lightPet[this.Type] = true;
        try { Terraria.Main.vanityPet[this.Type] = false; } catch (_) { }
    }

    UpdatePlayer(player, buffIndex) {
        if (!player || !player.active || player.dead) return;
        // The buff only keeps itself alive. Spawning is intentionally owned by Strange Orb.
        // This prevents any ownership/count failure from creating an infinite pet loop.
        try { player.buffTime[buffIndex] = 18000; } catch (_) { }
    }
}
