import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
function killOwned(player,type){if(!player||!(type>0))return;let owner=-1;try{owner=Math.floor(Number(Terraria.PlayerIndex(player)));}catch(_){}for(let i=0;i<1000;i++){let p=null;try{p=Terraria.Main.projectile[i];}catch(_){}if(p&&p.active&&Number(p.owner)===owner&&Number(p.type)===Number(type)){try{p.Kill();}catch(_){try{p.active=false;}catch(__){}}}}}

export class BrittleStar extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Summon/BrittleStar';
        this.MinionType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
    }

    PostSetupContent() {
        this.MinionType = ModProjectile.getTypeByName('BrittleStarMinion');
        try {
            const handler = Terraria.DataStructures.CachedProjectileCounterBuffTextHandler.new();
            handler.projectilesToLookFor = [this.MinionType].makeGeneric('int');
            Terraria.ID.BuffID.Sets.BuffTextHandlers.Add(this.Type, handler);
        } catch (e) { }
    }

    UpdatePlayer(player, buffIndex) {
        if (!(this.MinionType > 0))
            this.MinionType = ModProjectile.getTypeByName('BrittleStarMinion');
        let count = 0;
        try {
            count = Math.max(0, Number(player.ownedProjectileCounts[this.MinionType]) || 0);
        } catch (e) { }
        if (count <= 0) {
            const state = ModPlayer.getByName('CalamityPlayerState');
            if (state && state.IsLocalPlayer(player))
                count = state.CountBrittleStars(player);
        }
        if (this.MinionType > 0 && count > 0) {
            player.buffTime[buffIndex] = 18000;
            const state = ModPlayer.getByName('CalamityPlayerState');
            if (state)
                state.ApplyBrittleStarDefense(player);
        } else {
            player.DelBuff(buffIndex);
        }
    }

    OnRemove(player) {
        if (!(this.MinionType > 0)) this.MinionType = Number(ModProjectile.getTypeByName('BrittleStarMinion') || 0);
        killOwned(player, this.MinionType);
    }
}
