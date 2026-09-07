import { GlobalItem } from './../../TL/GlobalItem.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModBuff } from './../../TL/ModBuff.js';
export class FungalSymbioteGlobalItem extends GlobalItem {
    constructor(){super();this.MushyType=0;}
    UseItem(item,player){
        if(Number(item?.type)!==5)return true;
        const controller=ModPlayer.getByName('FungalSymbiotePlayer');
        if(!controller||!controller.IsActive(player))return true;
        if(!(this.MushyType>0))this.MushyType=Number(ModBuff.getTypeByName('Mushy')||0);
        if(this.MushyType>0){
            try {
                // Exact signature exposed by the Terraria.Player member table on this build.
                player['void AddBuff(int type, int time, bool fromNetPvP)'](Math.floor(this.MushyType),3600,true);
                try { tl.log(`[CalamityPort FungalSymbiote] Mushy applied; buffType=${Math.floor(this.MushyType)}, duration=3600.`); } catch (_) { }
            } catch(e) {
                // Do not fall back to bare overloaded dispatch: it is what causes the
                // expensive Player/Entity/Object member-resolution dump in TLPro.
                try { tl.log(`[CalamityPort FungalSymbiote] Mushy application failed: ${e}`); } catch (_) { }
            }
        }
        return true;
    }
}
