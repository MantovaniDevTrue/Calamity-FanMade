import { Terraria } from './../TL/ModImports.js';
import { ModItem } from './../TL/ModItem.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { FillChestByIndex, EnsureChestAt, GetChestByIndex, IsChestEmpty } from './OfficialSchematicRuntime.js';
import { PlanetoidLabSchematic } from './../Data/OfficialSchematics/PlanetoidLabSchematic.js';
import { DecodeLabCell, ApplyLabProxy, ClearProxyCoating } from './LabPhysicalProxy.js';

const CHEST=21;
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function Bit(v,i){return ((Number(v)>>>i)&1)!==0;}
function Unpack(v,s,w){return (Number(v)>>>s)&((1<<w)-1);}
function TryCall(t,s,v){try{if(t&&typeof t[s]==='function'){t[s](v);return true;}}catch(e){}return false;}
function Active(t){try{return !!t&&t['bool active()']()===true;}catch(e){return false;}}
function SetActive(t,v){try{t['void active(bool active)'](v===true);}catch(e){}}
function TileAt(x,y){try{return Terraria.Main.tile.get_Item(I(x),I(y));}catch(e){return null;}}
function InWorld(x,y,m=3){return x>=m&&y>=m&&x<I(Terraria.Main.maxTilesX)-m&&y<I(Terraria.Main.maxTilesY)-m;}
function Log(s){try{tl.log(`[CalamityPort PlanetoidLab] ${s}`);}catch(e){}}
function Decode(e){return DecodeLabCell(e);}
function ApplyCell(worldX,worldY,meta){
 const t=TileAt(worldX,worldY); if(!t)return false;
 if(!meta.keepTile){
  if(meta.kind>0){ApplyLabProxy(t,meta);}else{SetActive(t,meta.hasTile);t.type=meta.tile;t.frameX=meta.frameX;t.frameY=meta.frameY;ClearProxyCoating(t);TryCall(t,'void halfBrick(bool halfBrick)',meta.halfBlock);TryCall(t,'void slope(byte slope)',meta.slope);TryCall(t,'void actuator(bool actuator)',meta.hasActuator);TryCall(t,'void inActive(bool inActive)',meta.isActuated);}
  t.liquid=Clamp(meta.liquid,0,255);TryCall(t,'void liquidType(int liquidType)',meta.liquidType);TryCall(t,'void color(byte color)',meta.tileColor);TryCall(t,'void frameNumber(byte frameNumber)',meta.tileFrameNumber);
  TryCall(t,'void wire(bool wire)',(meta.wireData&1)!==0);TryCall(t,'void wire2(bool wire2)',(meta.wireData&2)!==0);TryCall(t,'void wire3(bool wire3)',(meta.wireData&4)!==0);TryCall(t,'void wire4(bool wire4)',(meta.wireData&8)!==0);
 }
 if(!meta.keepWall){t.wall=meta.wall;TryCall(t,'void wallColor(byte wallColor)',meta.wallColor);TryCall(t,'void wallFrameNumber(byte wallFrameNumber)',meta.wallFrameNumber);TryCall(t,'void wallFrameX(int wallFrameX)',meta.wallFrameX);TryCall(t,'void wallFrameY(int wallFrameY)',meta.wallFrameY);}
 return true;
}
function SetSecurityChestTiles(x,y){
 for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
  const t=TileAt(x+dx,y+dy);if(!t)continue;SetActive(t,true);t.type=CHEST;t.frameX=dx*18;t.frameY=dy*18;t.liquid=0;TryCall(t,'void liquidType(int liquidType)',0);TryCall(t,'void halfBrick(bool halfBrick)',false);TryCall(t,'void slope(byte slope)',0);TryCall(t,'void invisibleBlock(bool invisibleBlock)',true);
 }
}
function CustomType(name){try{return I(ModItem.getTypeByName(name),0);}catch(e){return 0;}}
function PlanetoidChestContents(first){
 const contents=[];
 if(first){const log=CustomType('DraedonsLogPlanetoid'),schem=CustomType('EncryptedSchematicPlanetoid'),core=CustomType('PlasmaDriveCore');if(log>0)contents.push([log,1]);if(schem>0)contents.push([schem,1]);if(core>0)contents.push([core,1]);}
 const seek=CustomType('GreenSeekingMechanism');if(seek>0)contents.push([seek,1]);
 const dubious=CustomType('DubiousPlating'),circuit=CustomType('MysteriousCircuitry');
 if(dubious>0)contents.push([dubious,WorldGenRand.NextInt(8,15)]);if(circuit>0)contents.push([circuit,WorldGenRand.NextInt(7,13)]);
 contents.push([3093,WorldGenRand.NextInt(12,18)],[3219,WorldGenRand.NextInt(5,10)],[3222,WorldGenRand.NextInt(5,10)],[3216,WorldGenRand.NextInt(5,10)],[3221,WorldGenRand.NextInt(5,10)],[3220,WorldGenRand.NextInt(5,10)]);
 let crimson=false;try{crimson=Terraria.WorldGen.crimson===true;}catch(e){}contents.push([crimson?3218:3217,WorldGenRand.NextInt(5,10)]);
 contents.push([8,WorldGenRand.NextInt(15,30)],[73,WorldGenRand.NextInt(5,12)],[188,WorldGenRand.NextInt(5,8)],[166,WorldGenRand.NextInt(6,8)]);
 const potions=[2346,305,2323,2345];contents.push([potions[WorldGenRand.NextInt(0,potions.length)],WorldGenRand.NextInt(3,6)]);
 return contents;
}
export function EnsureAndFillPlanetoidLabChest(x,y,first=false,onlyIfEmpty=true){
 x=I(x);y=I(y);if(!InWorld(x,y))return{success:false,index:-1,filled:0};SetSecurityChestTiles(x,y);
 const ensured=EnsureChestAt(x,y);if(ensured.chestIndex<0)return{success:false,index:-1,filled:0};const chest=GetChestByIndex(ensured.chestIndex);if(!chest)return{success:false,index:ensured.chestIndex,filled:0};
 if(onlyIfEmpty&&!IsChestEmpty(chest))return{success:true,index:ensured.chestIndex,filled:0,reason:'already-filled'};
 const contents=PlanetoidChestContents(first);const filled=FillChestByIndex(ensured.chestIndex,contents);return{success:filled>0,index:ensured.chestIndex,filled,reason:filled>0?'filled':'fill-failed'};
}
export const PlanetoidLabRuntime={
 CreateSession(centerX,centerY){centerX=I(centerX,-1);centerY=I(centerY,-1);const s=PlanetoidLabSchematic;const left=centerX-Math.floor(s.width/2),top=centerY-Math.floor(s.height/2);return{centerX,centerY,left,top,cursor:0,total:s.width*s.height,chestPhase:false,chestCursor:0,chests:[],done:false,started:Date.now(),applied:0};},
 StepSession(session,budget=420){
  if(!session||session.done)return{done:true,result:session?.result||null,applied:0};const s=PlanetoidLabSchematic;if(!InWorld(session.left,session.top)||!InWorld(session.left+s.width-1,session.top+s.height-1)){session.done=true;session.result={generated:false,reason:'out-of-world'};return{done:true,result:session.result,applied:0};}
  let used=0;
  while(session.cursor<session.total&&used<budget){const idx=session.cursor++;const y=Math.floor(idx/s.width),x=idx-y*s.width;const meta=Decode(s.palette[s.rows[y][x]]);if(ApplyCell(session.left+x,session.top+y,meta))session.applied++;used++;}
  if(session.cursor<session.total)return{done:false,applied:used};
  while(session.chestCursor<s.chests.length&&used<budget){const marker=s.chests[session.chestCursor],wx=session.left+I(marker[0]),wy=session.top+I(marker[1]);const r=EnsureAndFillPlanetoidLabChest(wx,wy,session.chestCursor===0,true);session.chests.push({x:wx,y:wy,index:r.index,filled:r.filled,success:r.success});session.chestCursor++;used+=8;}
  if(session.chestCursor<s.chests.length)return{done:false,applied:used};
  session.done=true;session.result={generated:true,left:session.left,top:session.top,width:s.width,height:s.height,centerX:session.centerX,centerY:session.centerY,chests:session.chests,applied:session.applied,sourceSha256:s.sourceSha256,elapsedMs:Date.now()-session.started};Log(`incremental complete center=${session.centerX},${session.centerY} applied=${session.applied} chests=${session.chests.filter(c=>c.success).length}/${s.chests.length} elapsed=${session.result.elapsedMs}ms.`);return{done:true,result:session.result,applied:used};
 }
};
