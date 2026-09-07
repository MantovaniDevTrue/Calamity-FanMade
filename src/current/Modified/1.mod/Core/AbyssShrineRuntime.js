import { Terraria } from './../TL/ModImports.js';
import { ModItem } from './../TL/ModItem.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { TileData } from './../TL/Modules/TileData.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import { EnsureChestAt, FillChestByIndex, FindChestIndexAt, GetChestByIndex } from './OfficialSchematicRuntime.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';

const CHEST_TILE=21;
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Log(s){try{tl.log(`[CalamityPort AbyssShrine] ${s}`);}catch(e){}}
function InWorld(x,y){return x>=2&&y>=2&&x<N(Terraria.Main.maxTilesX,4200)-2&&y<N(Terraria.Main.maxTilesY,1200)-2;}
function Active(t){try{return !!t&&t['bool active()']()===true;}catch(e){try{return !!t&&t.active===true;}catch(_){return false;}}}
function SetActive(t,v){try{t['void active(bool active)'](v===true);return;}catch(e){}try{t.active=v===true;}catch(e){}}
function Tile(x,y){if(!InWorld(x,y))return null;try{return Terraria.Main.tile.get_Item(x,y);}catch(e){try{return Terraria.Main.tile[x][y];}catch(_){return null;}}}
function SetLiquidType(t,v){try{t['void liquidType(int liquidType)'](N(v));}catch(e){}}
function SetSlope(t,v){try{t['void slope(byte slope)'](N(v));}catch(e){}}
function FrameFor(x,y){const h=Math.abs((N(x)*73856093)^(N(y)*19349663));return {fx:(h%16)*18+(((x+y)&1)?288:0),fy:(Math.floor(h/16)%15)*18};}
function SetSolid(x,y,visible){const t=Tile(x,y);if(!t)return false;SetActive(t,true);t.type=1;t.frameX=0;t.frameY=0;t.liquid=0;SetLiquidType(t,0);SetSlope(t,0);visible.push([x,y,FrameFor(x,y).fx,FrameFor(x,y).fy]);return true;}
function Clear(x,y){const t=Tile(x,y);if(!t)return false;SetActive(t,false);t.liquid=0;SetLiquidType(t,0);SetSlope(t,0);return true;}
function SetNativeChestTiles(x,y){for(let row=0;row<2;row++)for(let col=0;col<2;col++){const t=Tile(x+col,y+row);if(!t)continue;SetActive(t,true);t.type=CHEST_TILE;t.frameX=col*18;t.frameY=row*18;t.liquid=0;SetLiquidType(t,0);SetSlope(t,0);}}
function ClearNativeChestTiles(x,y){for(let row=0;row<2;row++)for(let col=0;col<2;col++){const t=Tile(x+col,y+row);if(!t)continue;if(Active(t)&&N(t.type)===CHEST_TILE){SetActive(t,false);t.liquid=0;SetLiquidType(t,0);SetSlope(t,0);}}}
function SetSupportSolid(x,y){const t=Tile(x,y);if(!t)return false;SetActive(t,true);t.type=1;t.frameX=0;t.frameY=0;t.liquid=0;SetLiquidType(t,0);SetSlope(t,0);return true;}
function FinalVisibleCells(cells,chestX,chestY){const out=[],seen={};for(const c of cells||[]){if(!Array.isArray(c)||c.length<4)continue;const x=N(c[0]),y=N(c[1]);if(x>=chestX&&x<chestX+2&&y>=chestY&&y<chestY+2)continue;const k=`${x},${y}`;if(seen[k])continue;const t=Tile(x,y);if(!t||!Active(t)||N(t.type)!==1)continue;seen[k]=true;out.push([x,y,N(c[2]),N(c[3])]);}return out;}
function PlaceSupportedVanillaChest(anchorX,anchorY,supportY){const bottomLeftX=N(anchorX)-1,bottomLeftY=N(supportY)-1,expectedX=bottomLeftX,expectedY=bottomLeftY-1;SetSupportSolid(expectedX,N(supportY));SetSupportSolid(expectedX+1,N(supportY));let chestIndex=-1,created=false,method='';try{const place=Terraria.WorldGen['int PlaceChest(int x, int y, ushort type, bool notNearOtherChests, int style)'];if(typeof place==='function'){chestIndex=N(place(bottomLeftX,bottomLeftY,CHEST_TILE,false,0),-1);if(chestIndex>=0){created=true;method='WorldGen.PlaceChest';}}}catch(e){}if(chestIndex>=0){const c=GetChestByIndex(chestIndex);const x=c?N(c.x,expectedX):expectedX,y=c?N(c.y,expectedY):expectedY;return {chestIndex,created,x,y,method};}SetNativeChestTiles(expectedX,expectedY);const ensured=EnsureChestAt(expectedX,expectedY);return {chestIndex:ensured.chestIndex,created:ensured.created,x:expectedX,y:expectedY,method:'manual-supported-fallback'};}
function RemoveOverlappingChests(left,top,right,bottom){const seen={};for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){let index=-1;try{index=N(FindChestIndexAt(x,y),-1);}catch(e){}if(index<0||seen[index])continue;seen[index]=true;try{const c=Terraria.Main.chest[index]||Terraria.Main.chest.get_Item(index);if(c)Terraria.Chest['bool DestroyChest(int X, int Y)'](N(c.x),N(c.y));}catch(e){}}}
function ModType(name){return N(ModItem.getTypeByName(name),0);}
export function FillAbyssShrineChestByIndex(chestIndex){
 const zenith=Terraria.Main.zenithWorld===true;
 const drops=[ModType('AbyssShocker'),ModType('DepthCrusher'),ModType('InkBomb')].filter(v=>v>0);
 const drop=zenith?2337:drops[WorldGenRand.NextInt(0,Math.max(1,drops.length))];
 const potion=zenith?678:(WorldGenRand.NextBool()?4870:4479);
 const contents=[
  {type:ModType('Terminus'),stack:1,prefix:-1},
  {type:drop,stack:1,prefix:-1},
  {type:ModType('VoidTorch'),stack:WorldGenRand.NextInt(100,111),prefix:-1},
  {type:73,stack:WorldGenRand.NextInt(8,11),prefix:-1},
  {type:ModType('HadalStew'),stack:WorldGenRand.NextInt(10,13),prefix:-1},
  {type:potion,stack:WorldGenRand.NextInt(10,13),prefix:-1}
 ];
 if(zenith)contents.push({type:5346,stack:1,prefix:-1});
 return FillChestByIndex(chestIndex,contents);
}
function Side(){try{if(SulphurousSeaPreviewRuntime&&SulphurousSeaPreviewRuntime.IsAvailable())return SulphurousSeaPreviewRuntime.AtLeft===true?'left':'right';}catch(e){}const maxX=N(Terraria.Main.maxTilesX,4200);let dungeonX=Math.floor(maxX/2);try{dungeonX=N(Terraria.Main.dungeonX,dungeonX);}catch(e){}return dungeonX<maxX/2?'left':'right';}
function IsRemix(){try{return Terraria.Main.remixWorld===true;}catch(e){return false;}}
export function RepairAbyssShrineChestPlacement(anchorX,anchorY,oldChestX,oldChestY,chestIndex,supportY){anchorX=N(anchorX,oldChestX);anchorY=N(anchorY,oldChestY);oldChestX=N(oldChestX,anchorX);oldChestY=N(oldChestY,anchorY);supportY=N(supportY,anchorY+3);const targetX=anchorX-1,targetY=supportY-2;let index=N(chestIndex,-1);if(index<0)index=N(FindChestIndexAt(oldChestX,oldChestY),-1);let c=index>=0?GetChestByIndex(index):null;if(oldChestX===targetX&&oldChestY===targetY&&index>=0){SetSupportSolid(targetX,supportY);SetSupportSolid(targetX+1,supportY);SetNativeChestTiles(targetX,targetY);return {success:true,moved:false,chestX:targetX,chestY:targetY,chestIndex:index,method:'already-supported'};}ClearNativeChestTiles(oldChestX,oldChestY);SetSupportSolid(targetX,supportY);SetSupportSolid(targetX+1,supportY);SetNativeChestTiles(targetX,targetY);if(c){try{c.x=targetX;c.y=targetY;}catch(e){}const verify=N(FindChestIndexAt(targetX,targetY),-1);if(verify>=0)return {success:true,moved:true,chestX:targetX,chestY:targetY,chestIndex:verify,method:'moved-existing-registry'};}const ensured=EnsureChestAt(targetX,targetY);if(ensured.chestIndex>=0){const filled=FillAbyssShrineChestByIndex(ensured.chestIndex);return {success:true,moved:true,chestX:targetX,chestY:targetY,chestIndex:ensured.chestIndex,method:'recreated-supported',filled};}return {success:false,moved:false,chestX:targetX,chestY:targetY,chestIndex:-1,method:'repair-failed'};}

export const AbyssShrineRuntime={
 OfficialAnchor(){const maxX=N(Terraria.Main.maxTilesX,4200),maxY=N(Terraria.Main.maxTilesY,1200),side=Side();return {x:side==='left'?170:maxX-170,y:IsRemix()?100:maxY-350,side,maxX,maxY};},
 Place(){
  const a=this.OfficialAnchor(),cx=a.x,cy=a.y,left=cx-5,right=cx+4,top=cy-5,bottom=cy+3;
  if(!InWorld(left-2,top-8)||!InWorld(right+2,bottom+2))return {generated:false,reason:'out-of-world',...a};
  RemoveOverlappingChests(left-2,top-8,right+2,bottom+2);
  const cells=[];
  for(let x=left;x<=right;x++)for(let y=top;y<=bottom;y++)SetSolid(x,y,cells);
  for(let x=left+1;x<=right-1;x++)for(let y=top+1;y<=bottom-1;y++)Clear(x,y);
  for(let x=left;x<=right;x++)for(let y=bottom-3;y<=bottom-1;y++)Clear(x,y);
  let yTop=top-1,halfWidth=4,roofRows=0;
  while(halfWidth>-1){halfWidth-=WorldGenRand.NextInt(1,3);for(let x=cx-halfWidth-1;x<=cx+halfWidth;x++)SetSolid(x,yTop,cells);yTop--;roofRows++;}
  const placedChest=PlaceSupportedVanillaChest(cx,cy,bottom);let filled=0;
  if(placedChest.chestIndex>=0)filled=FillAbyssShrineChestByIndex(placedChest.chestIndex);
  const visibleCells=FinalVisibleCells(cells,placedChest.x,placedChest.y);
  OfficialStructureMap.Reserve('Abyss Shrine',{left:left-1,top:yTop,right:right+2,bottom:bottom+1},4);
  const result={generated:placedChest.chestIndex>=0,reason:placedChest.chestIndex>=0?'placed':'chest-create-failed',side:a.side,left,top:yTop+1,right,bottom,width:right-left+1,height:bottom-(yTop+1)+1,chestAnchorX:cx,chestAnchorY:cy,chestX:placedChest.x,chestY:placedChest.y,chestIndex:placedChest.chestIndex,chestCreated:placedChest.created,chestPlacementMethod:placedChest.method,filled,roofRows,cells:visibleCells.map(c=>[c[0]-left,c[1]-(yTop+1),c[2],c[3]]),cellOriginX:left,cellOriginY:yTop+1};
  Log(`generated=${result.generated}; side=${result.side}; chest=${result.chestX},${result.chestY}; anchor=${cx},${cy}; supportY=${bottom}; method=${placedChest.method}; bounds=${left},${yTop+1}..${right},${bottom}; roofRows=${roofRows}; smoothCells=${visibleCells.length}; chestIndex=${placedChest.chestIndex}; created=${placedChest.created}; filled=${filled}.`);
  return result;
 }
};
