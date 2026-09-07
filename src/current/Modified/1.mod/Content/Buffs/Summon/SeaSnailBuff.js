import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

export class SeaSnailBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Summon/SeaSnailBuff';
        this.SnailType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
    }

    PostSetupContent() {
        this.SnailType = Number(ModProjectile.getTypeByName('VictideSeaSnail') || 0);
    }

    UpdatePlayer(player, buffIndex) {
        if (!(this.SnailType > 0))
            this.SnailType = Number(ModProjectile.getTypeByName('VictideSeaSnail') || 0);
        let count = 0;
        try {
            count = Math.max(0, Number(player.ownedProjectileCounts[this.SnailType]) || 0);
        } catch (e) { }
        if (count > 0)
            player.buffTime[buffIndex] = 18000;
        else
            try {
                player.DelBuff(buffIndex);
            } catch (e) { }
    }
}
