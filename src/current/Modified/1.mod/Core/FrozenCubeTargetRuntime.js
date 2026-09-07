import { Terraria } from './../TL/ModImports.js';
const MAX_NPCS=200;
const NPCRefs=new Array(MAX_NPCS).fill(null);
const NPCIdentity=new Array(MAX_NPCS).fill(-1);
const ActiveSlots=[];
const ActivePos=new Array(MAX_NPCS).fill(-1);
let TrackedCount=0;
let ScanCursor=0;
let ScanCycles=0;
let ScanReadMode=0;
let ScanReadFailures=0;
let ScanBudgetTick=-1;
let ScanReadsThisTick=0;
let LastFallbackScanTick=-9999;
const MAX_FALLBACK_READS_PER_TICK=8;
const TRACKED_FALLBACK_INTERVAL=4;
function Index(npc){const i=Math.floor(Number(npc&&npc.whoAmI));return i>=0&&i<MAX_NPCS?i:-1;}
function Identity(npc){const id=Number(npc&&npc.netID);return Number.isFinite(id)?id:Number(npc&&npc.type)||-1;}
function Active(npc){try{return !!(npc&&npc.active);}catch(e){return false;}}
function AddActiveSlot(i){if(ActivePos[i]>=0)return;ActivePos[i]=ActiveSlots.length;ActiveSlots.push(i);}
function RemoveActiveSlot(i){const pos=ActivePos[i];if(pos<0)return;const last=ActiveSlots.pop();ActivePos[i]=-1;if(pos<ActiveSlots.length){ActiveSlots[pos]=last;ActivePos[last]=pos;}}
function SetSlot(i,npc){
    const old=NPCRefs[i];
    if(old===npc){if(npc){NPCIdentity[i]=Identity(npc);AddActiveSlot(i);}return;}
    if(old){TrackedCount=Math.max(0,TrackedCount-1);RemoveActiveSlot(i);}
    NPCRefs[i]=npc||null;
    NPCIdentity[i]=npc?Identity(npc):-1;
    if(npc){TrackedCount++;AddActiveSlot(i);}
}
function ReadIndexed(i){try{return Terraria.Main.npc[i]||null;}catch(e){return null;}}
function ReadItem(i){try{return Terraria.Main.npc.get_Item(i)||null;}catch(e){return null;}}
function ReadMainNPC(i){
    if(ScanReadMode===2)return ReadIndexed(i);
    if(ScanReadMode===1)return ReadItem(i);
    let npc=ReadIndexed(i);
    if(npc){ScanReadMode=2;return npc;}
    npc=ReadItem(i);
    if(npc){ScanReadMode=1;return npc;}
    ScanReadFailures++;
    return null;
}
export function TrackFrozenCubeNPC(npc){const i=Index(npc);if(i<0)return;if(!Active(npc)){SetSlot(i,null);return;}SetSlot(i,npc);}
export function RemoveFrozenCubeNPC(npc){const i=Index(npc);if(i<0)return;if(NPCRefs[i]===npc||NPCIdentity[i]===Identity(npc))SetSlot(i,null);}
export function ScanFrozenCubeNPCs(budget=2){
    let tick=0;try{tick=Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(e){}
    const newTick=tick!==ScanBudgetTick;
    if(newTick){ScanBudgetTick=tick;ScanReadsThisTick=0;}
    const requested=Math.max(1,Math.min(16,Math.floor(Number(budget)||2)));
    const available=Math.max(0,MAX_FALLBACK_READS_PER_TICK-ScanReadsThisTick);
    // OnSpawn tracks vanilla + mod NPCs now. Once the compact registry has entries, a
    // native-array safety sweep every four logical ticks is plenty; same-tick callers can
    // still share the remaining global read budget without each starting another sweep.
    const cadenceBlocked=newTick&&TrackedCount>0&&(tick-LastFallbackScanTick)<TRACKED_FALLBACK_INTERVAL;
    const reads=cadenceBlocked?0:Math.min(requested,available);
    let cycleCompleted=false;
    for(let n=0;n<reads;n++){
        const i=ScanCursor;
        ScanCursor++;
        if(ScanCursor>=MAX_NPCS){ScanCursor=0;ScanCycles++;cycleCompleted=true;}
        const npc=ReadMainNPC(i);
        if(npc&&Active(npc)&&Index(npc)===i)SetSlot(i,npc);else SetSlot(i,null);
    }
    if(reads>0)LastFallbackScanTick=tick;
    ScanReadsThisTick+=reads;
    return {cursor:ScanCursor,cycles:ScanCycles,tracked:TrackedCount,cycleCompleted,readMode:ScanReadMode===2?'index':ScanReadMode===1?'get_Item':'unavailable',readFailures:ScanReadFailures,readsThisTick:ScanReadsThisTick,maxReadsPerTick:MAX_FALLBACK_READS_PER_TICK,fallbackInterval:TRACKED_FALLBACK_INTERVAL};
}
export function FrozenCubeNPC(index){const i=Math.floor(Number(index));if(i<0||i>=MAX_NPCS)return null;const npc=NPCRefs[i];if(!Active(npc)||Index(npc)!==i){SetSlot(i,null);return null;}return npc;}
export function FrozenCubeNPCRefs(){return NPCRefs;}
export function FrozenCubeTrackedIndices(){return ActiveSlots;}
export function FrozenCubeTargetDiagnostics(){return {cursor:ScanCursor,cycles:ScanCycles,tracked:TrackedCount,compact:ActiveSlots.length,readMode:ScanReadMode===2?'index':ScanReadMode===1?'get_Item':'unavailable',readFailures:ScanReadFailures,readsThisTick:ScanReadsThisTick,maxReadsPerTick:MAX_FALLBACK_READS_PER_TICK,fallbackInterval:TRACKED_FALLBACK_INTERVAL};}
