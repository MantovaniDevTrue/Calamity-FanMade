import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { EnsureChestAt, GetChestByIndex, IsChestEmpty } from './../../Core/OfficialSchematicRuntime.js';
import { FillVernalPassChestByIndex } from './../../Core/VernalPassRuntime.js';

const KEY = 'calamity:structure:vernalPass:';
const REPAIR_VERSION = 1;
const CHEST_OFFSETS = Object.freeze([
    [69, 23],
    [212, 41],
    [254, 105],
    [106, 181],
    [168, 181]
]);

function NumberOr(value, fallback) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? n : fallback;
}
function Log(message) { try { tl.log(`[CalamityPort VernalPassRepair] ${message}`); } catch (e) { } }

export class VernalPassChestRepairSystem extends ModSystem {
    constructor(){ super(); this.Delay=90; this.Done=false; }
    OnWorldLoad(){ this.Delay=90; this.Done=false; }
    OnWorldUnload(){ this.Delay=90; this.Done=false; }
    Update(){
        if(this.Done || !WorldDB.Instance || this.Delay-- > 0) return;
        if(WorldDB.get(KEY+'generated')!==true){ this.Delay=300; return; }
        if(Number(WorldDB.get(KEY+'lootVersion'))>=REPAIR_VERSION){ this.Done=true; return; }
        const left=NumberOr(WorldDB.get(KEY+'left'),-1), top=NumberOr(WorldDB.get(KEY+'top'),-1);
        if(left<0||top<0){ this.Delay=300; return; }

        let ready=0, repaired=0;
        for(let i=0;i<CHEST_OFFSETS.length;i++){
            const off=CHEST_OFFSETS[i], x=left+off[0], y=top+off[1];
            const ensured=EnsureChestAt(x,y);
            if(ensured.chestIndex<0) continue;
            const chest=GetChestByIndex(ensured.chestIndex);
            if(!chest) continue;
            if(IsChestEmpty(chest)){
                const filled=FillVernalPassChestByIndex(ensured.chestIndex,i===0);
                if(filled>0) repaired++;
            }
            if(!IsChestEmpty(chest)) ready++;
        }
        Log(`verification ready=${ready}/${CHEST_OFFSETS.length}, repaired=${repaired}.`);
        if(ready===CHEST_OFFSETS.length){
            WorldDB.set(KEY+'lootVersion',REPAIR_VERSION);
            try{WorldDB.Instance.Save();}catch(e){}
            this.Done=true;
        } else {
            this.Delay=600;
        }
    }
}
