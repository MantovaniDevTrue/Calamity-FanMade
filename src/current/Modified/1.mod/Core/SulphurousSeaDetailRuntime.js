import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { SulphurousSeaAnchorWalls } from './SulphurousSeaTerrainRuntime.js';
import { SulphurousScrapSchematics } from './../Data/OfficialSchematics/SulphurousScrapSchematics.js';
import { SulphurousSeaProxyRuntime, SULPH_SOLID_PROXY, SULPH_PLATFORM_PROXY } from './SulphurousSeaProxyRuntime.js';

const PLATFORM = SULPH_PLATFORM_PROXY;
const SAND = Number(BiomeAnchorTiles.SulphurousSand);
const SANDSTONE = 396;
const HARDENED = 397;
const RUST_WALL_PROXY = Number(SulphurousSeaAnchorWalls.sandstone);
const SAND_WALL = Number(SulphurousSeaAnchorWalls.sand);
const HARDENED_WALL = Number(SulphurousSeaAnchorWalls.hardened);
const MIN_SCRAP_DISTANCE = 80;
let FastAccessor=null;

function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function InWorld(x,y){return x>=2&&y>=2&&x<I(Terraria.Main.maxTilesX)-2&&y<I(Terraria.Main.maxTilesY)-2;}
function TileAt(x,y){try{return InWorld(x,y)?Terraria.Main.tile.get_Item(I(x),I(y)):null;}catch(e){return null;}}
function Active(t){try{return !!t&&t['bool active()']()===true;}catch(e){return false;}}
function SetActive(t,v){try{t['void active(bool active)'](v===true);}catch(e){}}
function TryCall(t,s,v){try{if(t&&typeof t[s]==='function'){t[s](v);return true;}}catch(e){}return false;}
function NativeBoolAt(a,i){i=I(i,-1);if(!a||i<0)return false;try{if(typeof a.get_Item==='function')return a.get_Item(i)===true;}catch(e){}try{const g=a['bool get_Item(int index)'];if(typeof g==='function')return g(i)===true;}catch(e){}return false;}
function CellActive(x,y){if(FastAccessor&&typeof FastAccessor.active==='function')return FastAccessor.active(x,y)===true;const t=TileAt(x,y);return !!t&&Active(t);}
function Solid(x,y){if(FastAccessor&&typeof FastAccessor.solid==='function')return FastAccessor.solid(x,y)===true;const t=TileAt(x,y);if(!t||!Active(t))return false;const type=I(t.type,-1);const native=NativeBoolAt(Terraria.Main.tileSolid,type);if(native)return true;return type===SAND||type===SANDSTONE||type===HARDENED||type===0||type===1||type===53||type===112||type===234;}
function ActualX(local,atLeft){return atLeft?I(local):I(Terraria.Main.maxTilesX)-1-I(local);}
function Dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
function Bit(v,i){return ((Number(v)>>>i)&1)!==0;} function Unpack(v,s,w){return (Number(v)>>>s)&((1<<w)-1);}
function MapTile(k){if(typeof k==='number')return I(k);if(k==='SulphurousSandNoWater'||k==='SulphurousSand')return SAND;if(k==='SulphurousSandstone')return SANDSTONE;if(k==='HardenedSulphurousSandstone')return HARDENED;return 0;}
function IsShelf(k){return k==='RustedShelf';}
function IsSolidLab(k){return k==='RustedPipes'||k==='RustedPlating';}
function IsCustomLab(k){return typeof k==='string'&&k!=='_'&&!SulphurousSeaProxyRuntime.IsTerrainKey(k);}
function ApplyPackedShape(t,packed){TryCall(t,'void halfBrick(bool halfBrick)',Bit(packed,24));TryCall(t,'void slope(byte slope)',Unpack(packed,25,3));TryCall(t,'void color(byte color)',Unpack(packed,3,5));TryCall(t,'void frameNumber(byte frameNumber)',Unpack(packed,13,2));}
function ApplyWall(t,key,packed){if(key==='_')return;if(typeof key==='number')t.wall=I(key);else t.wall=RUST_WALL_PROXY;TryCall(t,'void wallColor(byte wallColor)',Unpack(packed,8,5));TryCall(t,'void wallFrameNumber(byte wallFrameNumber)',Unpack(packed,15,2));TryCall(t,'void wallFrameX(int wallFrameX)',Unpack(packed,17,4));TryCall(t,'void wallFrameY(int wallFrameY)',Unpack(packed,21,3));}
function ApplyCell(t,e){if(!t)return;const [tileKey,wallKey,liquid,liquidType,fx,fy,packed,keepTile,keepWall]=e;
 if(!keepTile){const has=Bit(packed,0),customKind=has?SulphurousSeaProxyRuntime.CellKind(tileKey,packed):'';
   if(customKind==='visual'){SetActive(t,false);t.type=0;t.frameX=0;t.frameY=0;t.liquid=I(liquid);TryCall(t,'void liquidType(int liquidType)',I(liquidType));TryCall(t,'void invisibleBlock(bool invisibleBlock)',false);TryCall(t,'void actuator(bool actuator)',false);TryCall(t,'void inActive(bool inActive)',false);TryCall(t,'void halfBrick(bool halfBrick)',false);TryCall(t,'void slope(byte slope)',0);}
   else {SetActive(t,has);t.type=customKind==='platform'?PLATFORM:(customKind==='solid'?SULPH_SOLID_PROXY:MapTile(tileKey));t.frameX=0;t.frameY=0;t.liquid=I(liquid);TryCall(t,'void liquidType(int liquidType)',I(liquidType));ApplyPackedShape(t,packed);
     if(has&&customKind){TryCall(t,'void invisibleBlock(bool invisibleBlock)',true);TryCall(t,'void inActive(bool inActive)',false);TryCall(t,'void actuator(bool actuator)',false);}
   }
 }
 if(!keepWall)ApplyWall(t,wallKey,packed);
}
function PlaceScrapSchematic(s,bottom){const left=I(bottom.x)-Math.floor(s.width/2),top=I(bottom.y)-s.height;if(!InWorld(left,top)||!InWorld(left+s.width,top+s.height))return null;
 for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){const wx=left+x,wy=top+y,e=s.palette[s.rows[y][x]],t=TileAt(wx,wy);ApplyCell(t,e);if(t&&FastAccessor&&typeof FastAccessor.set==='function')FastAccessor.set(wx,wy,Active(t),I(t.type,-1),I(t.wall,0));}return{left,top,width:s.width,height:s.height};}
function GroundY(x,start,maxY){let y=I(start);while(y<maxY&&!Solid(x,y))y++;return y;}

function ScrapCandidate(context,placement,localX,y,variant,placed){const width=I(placement.width);const yStart=I(placement.yStart);const depth=I(placement.blockDepth);const atLeft=placement.atLeft===true;const x=ActualX(localX,atLeft);if(Solid(x,y))return null;if(placed.some(p=>Dist(p,{x,y})<MIN_SCRAP_DISTANCE))return null;const s=SulphurousScrapSchematics[variant];if(!s)return null;const half=s.width*.5,leftX=I(x-half),rightX=I(x+half),limit=Math.min(I(context.maxY)-3,yStart+depth+30);const ly=GroundY(leftX,y,limit),ry=GroundY(rightX,y,limit);if(ly>=limit||ry>=limit)return null;if(Math.abs(ly-ry)>=20)return null;if(ly>=yStart+depth-50||ry>=yStart+depth-50)return null;return{x,y,variant,s,ly,ry};}
function FallbackScrapCandidate(context,placement,placed){const width=I(placement.width),yStart=I(placement.yStart),depth=I(placement.blockDepth);const y0=yStart+I(depth*.3),y1=yStart+I(depth*.8);const candidates=[];for(let localX=75;localX<width-85;localX+=2){for(let y=y0;y<y1;y+=3){if(Solid(ActualX(localX,placement.atLeft===true),y))continue;for(let variant=0;variant<7;variant++){const c=ScrapCandidate(context,placement,localX,y,variant,placed);if(c){candidates.push(c);break;}}if(candidates.length>4096)break;}if(candidates.length>4096)break;}if(candidates.length===0)return null;return candidates[WorldGenRand.NextInt(0,candidates.length)];}
function CommitScrap(c,placed){if(!c)return null;const bottom={x:c.x,y:Math.max(c.ly,c.ry)+6};const rect=PlaceScrapSchematic(c.s,bottom);if(!rect)return null;const out={...bottom,...rect,variant:c.variant+1,sourceSha256:c.s.sourceSha256};placed.push(out);return out;}
function PlaceScrapPiles(context,placement){const width=I(placement.width,0)>0?I(placement.width):I(context.maxX)/5;const yStart=I(placement.yStart);const depth=I(placement.blockDepth);const placed=[];let tries=0,i=0,randomAttempts=0,fallbackUsed=0;
 while(i<3&&tries<=20000){tries++;randomAttempts++;const localX=WorldGenRand.NextInt(75,Math.max(76,width-85));const y=WorldGenRand.NextInt(yStart+I(depth*.3),Math.max(yStart+I(depth*.3)+1,yStart+I(depth*.8)));const variant=WorldGenRand.NextInt(0,7),c=ScrapCandidate(context,{...placement,width},localX,y,variant,placed);if(!c)continue;if(!CommitScrap(c,placed))continue;i++;tries=0;}
 // The desktop loop retries indefinitely in a geometry produced by the exact native sea pass.
 // Our TLPro cave raster can have fewer random hits, so if the 20k safety cap is reached, scan
 // for cells that satisfy the *same official placement constraints* and choose one at random.
 while(i<3){const c=FallbackScrapCandidate(context,{...placement,width},placed);if(!c||!CommitScrap(c,placed))break;i++;fallbackUsed++;}
 return{placed,randomAttempts,fallbackUsed};}

function GenerateColumn(left,top,bottom){const variant=WorldGenRand.NextInt(0,3);for(let x=left;x<left+2;x++)for(let y=top;y<=bottom;y++){const t=TileAt(x,y);if(!t)continue;SetActive(t,true);t.type=PLATFORM;t.frameX=0;t.frameY=0;TryCall(t,'void invisibleBlock(bool invisibleBlock)',true);TryCall(t,'void actuator(bool actuator)',false);TryCall(t,'void inActive(bool inActive)',false);TryCall(t,'void halfBrick(bool halfBrick)',false);TryCall(t,'void slope(byte slope)',0);t.wall=(y>=CurrentColumnYStart+CurrentColumnDepth*.42)?HARDENED_WALL:SAND_WALL;if(FastAccessor&&typeof FastAccessor.set==='function')FastAccessor.set(x,y,true,PLATFORM,I(t.wall,0));}
 return{left,top,bottom,height:bottom-top+1,variant};}
let CurrentColumnYStart=0,CurrentColumnDepth=0;
function FindSolidUp(x,y){for(let k=0;k<=50;k++){const yy=y-k;if(yy<3)break;if(Solid(x,yy))return yy;}return-1;}
function ColumnCandidate(x,y){if(CellActive(x,y)||CellActive(x+1,y))return null;if(!Solid(x,y+1)||!Solid(x+1,y+1))return null;const top=FindSolidUp(x,y),topRight=FindSolidUp(x+1,y);if(top<0||topRight<0||top!==topRight)return null;if(Math.abs(y-top)<5)return null;return{x,y,top};}
function ScanColumnCandidates(context,placement){const width=I(placement.width),depth=I(placement.blockDepth),yStart=I(placement.yStart),atLeft=placement.atLeft===true;const out=[];for(let localX=20;localX<width-32;localX++){const x=ActualX(localX,atLeft);for(let y=yStart;y<yStart+depth-55;y++){const c=ColumnCandidate(x,y);if(c)out.push(c);if(out.length>=8192)return out;}}return out;}
function GenerateColumnsInCaverns(context,placement){const width=I(placement.width);const depth=I(placement.blockDepth);const yStart=I(placement.yStart);const atLeft=placement.atLeft===true;const columnCount=Math.floor(I(context.maxX)/96);const columns=[];CurrentColumnYStart=yStart;CurrentColumnDepth=depth;let c=0,attempts=0,maxAttempts=Math.max(2000,columnCount*900),fallbackUsed=0;
 while(c<columnCount&&attempts++<maxAttempts){const x=ActualX(WorldGenRand.NextInt(20,Math.max(21,width-32)),atLeft);const y=WorldGenRand.NextInt(yStart,Math.max(yStart+1,yStart+depth-55));const hit=ColumnCandidate(x,y);if(!hit)continue;c++;if(WorldGenRand.NextBool(2))columns.push(GenerateColumn(hit.x,hit.top,hit.y));}
 if(c<columnCount){const candidates=ScanColumnCandidates(context,placement);while(c<columnCount&&candidates.length){const hit=candidates[WorldGenRand.NextInt(0,candidates.length)];c++;fallbackUsed++;if(WorldGenRand.NextBool(2))columns.push(GenerateColumn(hit.x,hit.top,hit.y));}}
 return{requested:columnCount,validCandidates:c,attempts,columns,fallbackUsed};}

export const SulphurousSeaDetailRuntime={
 Generate(context,placement,accessor=null){FastAccessor=accessor;try{const scrap=PlaceScrapPiles(context,placement),scraps=scrap.placed;const col=GenerateColumnsInCaverns(context,placement);return{scrapPiles:scraps,scrapAttempts:scrap.randomAttempts,scrapFallbackUsed:scrap.fallbackUsed,columns:col.columns,columnRequested:col.requested,columnValidCandidates:col.validCandidates,columnAttempts:col.attempts,columnFallbackUsed:col.fallbackUsed,modified:scraps.reduce((a,s)=>a+s.width*s.height,0)+col.columns.reduce((a,c)=>a+c.height*2,0)};}finally{FastAccessor=null;}},
 IsProxyType(type){type=I(type,-1);return type===SULPH_SOLID_PROXY||type===PLATFORM;}
};
