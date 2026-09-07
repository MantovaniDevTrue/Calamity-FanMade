import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class BabyStormlionBuff extends ModBuff {
    constructor() { super(); this.Texture = 'Buffs/Summon/BabyStormlionBuff'; }
    SetStaticDefaults() {
        try { Terraria.Main.buffNoTimeDisplay[this.Type] = true; } catch (_) { }
        try { Terraria.Main.buffNoSave[this.Type] = true; } catch (_) { }
    }
    UpdatePlayer(player, buffIndex) {
        if (!player || player.dead) {
            try { if (player) player.DelBuff(buffIndex); } catch (_) { }
        }
        // The living StormjawBaby refreshes this to two ticks from its own AI.
        // This intentionally avoids native ownedProjectileCounts indexing on Android.
    }
}
