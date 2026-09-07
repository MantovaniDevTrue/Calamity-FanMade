const MAX_PLAYERS=256;
const LastActiveMs=new Array(MAX_PLAYERS).fill(-1000000000);
const LastCombatMs=new Array(MAX_PLAYERS).fill(-1000000000);
const LastVisualMs=new Array(MAX_PLAYERS).fill(-1000000000);
const OwnerRefs=new Array(MAX_PLAYERS).fill(null);
const LEASE_TICKS=120;
const SIGNAL_GRACE_MS=750;
function OwnerIndex(owner){const i=Math.floor(Number(owner));return i>=0&&i<MAX_PLAYERS?i:-1;}
function NowMs(){try{return Number(Date.now())||0;}catch(e){return 0;}}
export function SignalFrozenCube(owner,player,combat,visual){const i=OwnerIndex(owner);if(i<0)return false;const now=NowMs();OwnerRefs[i]=player||OwnerRefs[i];LastActiveMs[i]=now;if(combat)LastCombatMs[i]=now;if(visual)LastVisualMs[i]=now;return true;}
export function FrozenCubeSignal(owner){const i=OwnerIndex(owner);if(i<0)return {active:false,combat:false,visual:false,ageMs:1000000000,leaseTicks:LEASE_TICKS,player:null};const now=NowMs();const ageMs=Math.max(0,now-Number(LastActiveMs[i]));const active=ageMs<=SIGNAL_GRACE_MS;return {active,combat:active&&(now-Number(LastCombatMs[i])<=SIGNAL_GRACE_MS),visual:active&&(now-Number(LastVisualMs[i])<=SIGNAL_GRACE_MS),ageMs,leaseTicks:LEASE_TICKS,player:OwnerRefs[i]};}
export function FrozenCubeLeaseTicks(){return LEASE_TICKS;}
