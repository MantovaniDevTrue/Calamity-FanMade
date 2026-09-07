const ECHO_BLOCK=541; // legacy v15-and-earlier proxy; repair-only
const SOLID_PROXY=38; // Gray Brick: visible, stable vanilla solid used beneath the official lab overlay
const PLATFORM=19;
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Bit(v,i){return ((Number(v)>>>i)&1)!==0;}
function Unpack(v,s,w){return (Number(v)>>>s)&((1<<w)-1);}
function TryCall(t,s,v){try{if(t&&typeof t[s]==='function'){t[s](v);return true;}}catch(e){}return false;}
function SetActive(t,v){try{t['void active(bool active)'](v===true);}catch(e){}}
function Invisible(t,v){TryCall(t,'void invisibleBlock(bool invisibleBlock)',v===true);}
function Actuator(t,v){TryCall(t,'void actuator(bool actuator)',v===true);TryCall(t,'void inActive(bool inActive)',v===true);}
function ClearShape(t){TryCall(t,'void halfBrick(bool halfBrick)',false);TryCall(t,'void slope(byte slope)',0);}
export function DecodeLabCell(e){const p=Number(e[6])>>>0;return{tile:I(e[0]),wall:I(e[1]),liquid:I(e[2]),liquidType:I(e[3]),frameX:I(e[4]),frameY:I(e[5]),hasTile:Bit(p,0),isActuated:Bit(p,1),hasActuator:Bit(p,2),tileColor:Unpack(p,3,5),wallColor:Unpack(p,8,5),tileFrameNumber:Unpack(p,13,2),wallFrameNumber:Unpack(p,15,2),wallFrameX:Unpack(p,17,4),wallFrameY:Unpack(p,21,3),halfBlock:Bit(p,24),slope:Unpack(p,25,3),wireData:Unpack(p,28,4),keepTile:I(e[7])===1,keepWall:I(e[8])===1,kind:I(e[9],0),legacyType:I(e[10],-1)};}
export function IsCustomPhysicalKind(k){return I(k,0)>=1&&I(k,0)<=7;}
export function IsCollisionProxyKind(k){k=I(k,0);return k===1||k===3||k===4;}
function ClearVisualOnlyProxy(t){
 // Kinds 2/5/6 are visual-only Calamity lab tiles. The old mobile proxy represented
 // them with an actuated Echo Block, but actuation is not a reliable collision bypass
 // on every TLPro/Terraria Mobile build. That could leave invisible Echo Blocks inside
 // doorways and walkable rooms. The baked official lab overlay already renders these
 // cells, so they need no physical tile at all.
 SetActive(t,false);
 Invisible(t,false);
 Actuator(t,false);
 ClearShape(t);
 t.type=0;t.frameX=0;t.frameY=0;
}
export function ApplyLabProxy(t,m){if(!t||!m)return false;const k=I(m.kind,0);
 if(k===0||k===7)return false;
 if(!IsCollisionProxyKind(k)){ClearVisualOnlyProxy(t);return true;}
 SetActive(t,true);Invisible(t,false);t.frameX=0;t.frameY=0;
 // Never use Echo Block as a live laboratory collision tile. Echo is intrinsically invisible
 // and leaked into drill targeting / mining on mobile. A normal solid vanilla host is drawn
 // underneath the official baked lab overlay instead; GlobalTile prevents proxy mining/drops.
 if(k===1){t.type=SOLID_PROXY;Actuator(t,false);TryCall(t,'void halfBrick(bool halfBrick)',m.halfBlock===true);TryCall(t,'void slope(byte slope)',I(m.slope,0));}
 else if(k===3||k===4){t.type=PLATFORM;Actuator(t,false);ClearShape(t);}
 return true;
}
export function ClearProxyCoating(t){if(!t)return;Invisible(t,false);}
export const LabProxyIDs=Object.freeze({EchoBlock:ECHO_BLOCK,SolidBlock:SOLID_PROXY,Platform:PLATFORM});
