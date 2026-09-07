import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';

export class PuffWarriorBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Summon/PuffWarriorBuff';
        this.MinionType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
    }

    PostSetupContent() {
        this.MinionType = ModProjectile.getTypeByName('PuffWarrior');
        try {
            const handler = Terraria.DataStructures.CachedProjectileCounterBuffTextHandler.new();
            handler.projectilesToLookFor = [this.MinionType].makeGeneric('int');
            Terraria.ID.BuffID.Sets.BuffTextHandlers.Add(this.Type, handler);
        } catch (e) { }
    }

    UpdatePlayer(player, buffIndex) {
        if (!(this.MinionType > 0))
            this.MinionType = ModProjectile.getTypeByName('PuffWarrior');
        let count = 0;
        try {
            count = Math.max(0, Number(player.ownedProjectileCounts[this.MinionType]) || 0);
        } catch (e) { }
        if (this.MinionType > 0 && count > 0) {
            player.buffTime[buffIndex] = 18000;
        } else {
            player.DelBuff(buffIndex);
        }
    }
}
