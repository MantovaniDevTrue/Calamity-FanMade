import { Terraria } from './../TL/ModImports.js';

let WorldKey='';
let Owner='';
let LastSeen=-1;
let CooldownUntil=0;
let StartedAt=0;
let OwnerStarted=0;
let LastRun=-999999;
const RUN_INTERVAL=2;

function Tick(){try{return Math.floor(Number(Terraria.Main.GameUpdateCount)||0);}catch(e){return 0;}}
function Key(){let id=0,w=0,h=0;try{id=Math.floor(Number(Terraria.Main.worldID)||0);}catch(e){}try{w=Math.floor(Number(Terraria.Main.maxTilesX)||0);h=Math.floor(Number(Terraria.Main.maxTilesY)||0);}catch(e){}return `${id}:${w}x${h}`;}
function Ensure(){const k=Key();if(k!==WorldKey){WorldKey=k;Owner='';LastSeen=-1;CooldownUntil=0;StartedAt=Tick();OwnerStarted=0;LastRun=-999999;}}
function Log(s){try{tl.log(`[CalamityPort PostLoadQueue] ${s}`);}catch(e){}}

export const PostLoadWorkCoordinator={
 TryEnter(name){Ensure();const now=Tick(),n=String(name||'job');
  if(Owner===n){LastSeen=now;if(now-LastRun<RUN_INTERVAL)return false;LastRun=now;return true;}
  if(Owner&&now-LastSeen<=24)return false;
  if(Owner&&now-LastSeen>24){Log(`lease expired owner=${Owner}; next=${n}.`);Owner='';}
  if(now<CooldownUntil)return false;
  Owner=n;OwnerStarted=now;LastSeen=now;LastRun=now;Log(`started ${n}; pulseEvery=${RUN_INTERVAL} ticks.`);return true;
 },
 Release(name){Ensure();const n=String(name||'job');if(Owner!==n)return;const now=Tick();Log(`finished ${n}; activeTicks=${Math.max(0,now-OwnerStarted)}.`);Owner='';OwnerStarted=0;LastSeen=-1;LastRun=-999999;CooldownUntil=now+30;},
 IsBusy(){Ensure();const now=Tick();if(Owner&&now-LastSeen>24)Owner='';return Owner!=='';},
 Owner(){Ensure();return Owner;},
 WorldAgeTicks(){Ensure();return Math.max(0,Tick()-StartedAt);}
};
