import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';
function killOwned(player,type){if(!player||!(type>0))return;let owner=-1;try{owner=Math.floor(Number(Terraria.PlayerIndex(player)));}catch(_){}for(let i=0;i<1000;i++){let p=null;try{p=Terraria.Main.projectile[i];}catch(_){}if(p&&p.active&&Number(p.owner)===owner&&Number(p.type)===Number(type)){try{p.Kill();}catch(_){try{p.active=false;}catch(__){}}}}}

export class DankCreeperBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Summon/DankCreeperBuff';
        this.MinionType = 0;
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
    }

    PostSetupContent() {
        this.MinionType = Number(ModProjectile.getTypeByName('DankCreeperMinion') || 0);
    }

    UpdatePlayer(player, buffIndex) {
        if (!(this.MinionType > 0))
            this.MinionType = Number(ModProjectile.getTypeByName('DankCreeperMinion') || 0);
        if (CountOwned(player, this.MinionType) > 0) {
            try {
                player.buffTime[buffIndex] = 18000;
            } catch (e) {
                try {
                    player.AddBuff(this.Type, 18000, false);
                } catch (ignored) { }
            }
        } else {
            try {
                player.DelBuff(buffIndex);
            } catch (e) {
                try {
                    player.ClearBuff(this.Type);
                } catch (ignored) { }
            }
        }
    }

    OnRemove(player) {
        if (!(this.MinionType > 0)) this.MinionType = Number(ModProjectile.getTypeByName('DankCreeperMinion') || 0);
        killOwned(player, this.MinionType);
    }
}
