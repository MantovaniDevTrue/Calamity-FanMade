import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';

export class BloodfinBoost extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Potions/BloodfinBoost';
    }

    SetStaticDefaults() {
        Terraria.Main.debuff[this.Type] = false;
        Terraria.Main.pvpBuff[this.Type] = true;
        Terraria.Main.buffNoSave[this.Type] = true;
    }

    UpdatePlayer(player, index) {
        if (!player || !player.active || player.dead)
            return;
        const tick = Number(Terraria.Main.GameUpdateCount || 0);
        if (tick % 15 === 0 && Number(player.statLife) < Number(player.statLifeMax2)) {
            player.statLife = Math.min(Number(player.statLifeMax2), Number(player.statLife) + 1);
            try {
                player.HealEffect(1, true);
            } catch (e) { }
        }
    }
}
