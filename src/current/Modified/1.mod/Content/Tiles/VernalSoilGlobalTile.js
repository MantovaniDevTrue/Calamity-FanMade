import { Terraria } from './../../TL/ModImports.js';
import { GlobalTile } from './../../TL/GlobalTile.js';
import { ModItem } from './../../TL/ModItem.js';
import { VernalSoilRuntime, VernalSoilAnchorTile } from './../../Core/VernalSoilRuntime.js';

const NewItem = Terraria.Item['int NewItem(int X, int Y, int Width, int Height, int Type, int Stack, bool noBroadcast, int pfix, bool noGrabDelay)'];

export class VernalSoilGlobalTile extends GlobalTile {
    OnPlace(player,i,j,type,style){
        if(Number(type)!==VernalSoilAnchorTile) return;
        if(VernalSoilRuntime.ConsumePending(player)) VernalSoilRuntime.Track(i,j);
    }
    CanDropItems(i,j,tile){
        if(!VernalSoilRuntime.IsVernalSoilAt(i,j,Number(tile?.type)||0)) return true;
        const itemType=Number(ModItem.getTypeByName('VernalSoil')||0);
        if(!(itemType>0)) return true;
        try{ NewItem(i*16,j*16,16,16,itemType,1,false,-1,true); VernalSoilRuntime.Remove(i,j); return false; }
        catch(e){ return true; }
    }
    KillTile(i,j,type,fail,effectOnly,noItem){
        if(!fail&&!effectOnly&&Number(type)===VernalSoilAnchorTile&&noItem) VernalSoilRuntime.Remove(i,j);
    }
}
