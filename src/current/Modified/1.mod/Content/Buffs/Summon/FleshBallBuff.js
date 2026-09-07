import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { CountOwned } from './../../../Core/PerforatorRewardRuntime.js';
function killOwned(player,type){if(!player||!(type>0))return;let owner=-1;try{owner=Math.floor(Number(Terraria.PlayerIndex(player)));}catch(_){}for(let i=0;i<1000;i++){let p=null;try{p=Terraria.Main.projectile[i];}catch(_){}if(p&&p.active&&Number(p.owner)===owner&&Number(p.type)===Number(type)){try{p.Kill();}catch(_){try{p.active=false;}catch(__){}}}}}

export class FleshBallBuff extends ModBuff {
    constructor() {
        super();
        this.Texture = 'Buffs/Summon/FleshBallBuff';
    }

    SetStaticDefaults() {
        Terraria.Main.buffNoSave[this.Type] = true;
        Terraria.Main.buffNoTimeDisplay[this.Type] = true;
    }

    UpdatePlayer(player, index) {
        const type = Number(ModProjectile.getTypeByName('FleshBallMinion') || 0);
        if (CountOwned(player, type) > 0) {
            try {
                player.buffTime[index] = 18000;
            } catch (e) { }
        } else
            try {
                player.DelBuff(index);
            } catch (e) { }
    }

    OnRemove(player) {
        const type = Number(ModProjectile.getTypeByName('FleshBallMinion') || 0);
        killOwned(player, type);
    }
}
