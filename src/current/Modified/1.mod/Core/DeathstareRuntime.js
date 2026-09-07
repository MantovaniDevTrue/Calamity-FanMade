import { Terraria } from './../TL/ModImports.js';
const LastSeen = new Int32Array(255);
LastSeen.fill(-999999);
function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Tick(){try{return I(Terraria.Main.GameUpdateCount,0);}catch(_){return 0;}}
export function MarkDeathstareOwner(owner){const i=I(owner);if(i>=0&&i<LastSeen.length)LastSeen[i]=Tick();}
export function TouchDeathstare(proj){MarkDeathstareOwner(proj?.owner);}
export function ClearDeathstare(proj){const i=I(proj?.owner);if(i>=0&&i<LastSeen.length)LastSeen[i]=-999999;}
export function HasDeathstare(player){if(!player)return false;const i=I(Terraria.PlayerIndex(player));return i>=0&&i<LastSeen.length&&(Tick()-LastSeen[i])<=5;}
