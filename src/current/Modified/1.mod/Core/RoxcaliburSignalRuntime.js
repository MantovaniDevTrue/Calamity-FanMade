const MAX_PLAYERS=256;
const Signals=new Array(MAX_PLAYERS).fill(null);
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
export function SignalRoxcalibur(owner,player,aimX,aimY,itemTimeMax=40){owner=N(owner,-1);if(owner<0||owner>=MAX_PLAYERS)return;Signals[owner]={player,aimX:Number(aimX)||0,aimY:Number(aimY)||0,itemTimeMax:Math.max(1,N(itemTimeMax,40)),at:Number(Date.now())||0};}
export function RoxcaliburSignal(owner){owner=N(owner,-1);const s=owner>=0&&owner<MAX_PLAYERS?Signals[owner]:null;if(!s)return {player:null,aimX:0,aimY:0,itemTimeMax:40,ageMs:1e9};return {...s,ageMs:Math.max(0,(Number(Date.now())||0)-Number(s.at||0))};}
export function ClearRoxcaliburSignal(owner){owner=N(owner,-1);if(owner>=0&&owner<MAX_PLAYERS)Signals[owner]=null;}
