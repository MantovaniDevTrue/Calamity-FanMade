import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';

export class ValkyrieBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Summon/ValkyrieBuff';
        this.MinionType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
    }

    PostSetupContent() {
        this.MinionType = Number(ModProjectile.getTypeByName('Valkyrie') || 0);
    }

    UpdatePlayer(player, index) {
        if (!(this.MinionType > 0))
            this.MinionType = Number(ModProjectile.getTypeByName('Valkyrie') || 0);
        const state = ModPlayer.getByName('CalamityPlayerState');
        let count = 0;
        try { count = Number(player.ownedProjectileCounts[this.MinionType] || 0); } catch (e) { }
        if (count > 0 && state && state.AerospecSetActive === true && state.AerospecClass === 'summon') {
            try { player.buffTime[index] = 18000; } catch (e) { }
        } else {
            try { player.DelBuff(index); } catch (e) { }
        }
    }
}
