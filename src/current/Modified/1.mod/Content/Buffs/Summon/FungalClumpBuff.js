import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { GetCachedFungalClump } from './../../../Core/FungalClumpRuntime.js';

export class FungalClumpBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Summon/FungalClumpBuff';
        this.MinionType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
    }

    PostSetupContent() {
        this.MinionType = ModProjectile.getTypeByName('FungalClumpMinion');
        try {
            const handler = Terraria.DataStructures.CachedProjectileCounterBuffTextHandler.new();
            handler.projectilesToLookFor = [this.MinionType].makeGeneric('int');
            Terraria.ID.BuffID.Sets.BuffTextHandlers.Add(this.Type, handler);
        } catch (e) { }
    }

    UpdatePlayer(player, buffIndex) {
        if (!(this.MinionType > 0))
            this.MinionType = ModProjectile.getTypeByName('FungalClumpMinion');
        const clump = this.MinionType > 0 ? GetCachedFungalClump(Terraria.PlayerIndex(player), this.MinionType) : null;
        if (clump)
            player.buffTime[buffIndex] = 18000;
        else
            player.DelBuff(buffIndex);
    }
}
