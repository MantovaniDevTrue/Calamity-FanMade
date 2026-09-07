import { Terraria } from './../../../TL/ModImports.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
function killOwned(player,type){if(!player||!(type>0))return;let owner=-1;try{owner=Math.floor(Number(Terraria.PlayerIndex(player)));}catch(_){}for(let i=0;i<1000;i++){let p=null;try{p=Terraria.Main.projectile[i];}catch(_){}if(p&&p.active&&Number(p.owner)===owner&&Number(p.type)===Number(type)){try{p.Kill();}catch(_){try{p.active=false;}catch(__){}}}}}
export class HerringBuff extends ModBuff {
    constructor(){super();this.Texture='Buffs/Summon/HerringBuff';}
    SetStaticDefaults(){try{Terraria.Main.buffNoTimeDisplay[this.Type]=true;}catch(_){} try{Terraria.Main.buffNoSave[this.Type]=true;}catch(_){} }
    UpdatePlayer(player,buffIndex){
        if(!player||player.dead){try{player?.DelBuff(buffIndex);}catch(_){} return;}
        const p=Number(ModProjectile.getTypeByName('Herring')||0); let count=0;
        try{count=Math.max(0,Number(player.ownedProjectileCounts[p])||0);}catch(_){}
        if(p>0&&count>0){try{player.buffTime[buffIndex]=18000;}catch(_){}}
        else try{player.DelBuff(buffIndex);}catch(_){}
    }
    OnRemove(player){const p=Number(ModProjectile.getTypeByName('Herring')||0);killOwned(player,p);}
}
