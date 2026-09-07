import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { OwnerIndex, DroneCount } from './../../../Core/DraedonTier1Runtime.js';

export class AqueousHunterDroneBuff extends ModBuff {
    constructor() { super(); this.Texture = 'Buffs/Summon/AqueousHunterDroneBuff'; }
    SetStaticDefaults() {
        try { Terraria.Main.buffNoTimeDisplay[this.Type] = true; } catch (_) { }
        try { Terraria.Main.buffNoSave[this.Type] = true; } catch (_) { }
    }
    UpdatePlayer(player, buffIndex) {
        if (!player || player.dead) { try { player?.DelBuff(buffIndex); } catch (_) { } return; }
        // Agora segue o mesmo ciclo dos summons que já funcionam no port: com drone vivo o buff
        // é renovado; sem nenhum drone registrado, o próprio buff também some.
        if (DroneCount(OwnerIndex(player), 18) > 0) {
            try { player.buffTime[buffIndex] = 18000; } catch (_) { }
        } else {
            try { player.DelBuff(buffIndex); } catch (_) { }
        }
    }
}
