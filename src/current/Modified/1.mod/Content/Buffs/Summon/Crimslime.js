import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';

export class Crimslime extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Summon/Crimslime';
        this.MinionType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
    }

    PostSetupContent() {
        this.MinionType = Number(ModProjectile.getTypeByName('CrimslimeMinion') || 0);
    }

    UpdatePlayer(player, index) {
        if (!(this.MinionType > 0))
            this.MinionType = Number(ModProjectile.getTypeByName('CrimslimeMinion') || 0);
        if (CountOwned(player, this.MinionType) > 0) {
            try {
                player.buffTime[index] = 18000;
            } catch (e) { }
        } else
            try {
                player.DelBuff(index);
            } catch (e) { }
    }
}
