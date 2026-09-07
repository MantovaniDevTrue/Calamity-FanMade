import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
const KEY='calamity:structure:shimmerShrine:';
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Log(s){try{tl.log(`[CalamityPort ShimmerShrineDeferred] ${s}`);}catch(e){}}
function PortWorld(){for(const p of ['mechanicShed','desertShrine','graniteShrine','surfaceShrine','iceShrine','mushroomShrine','marbleShrine','roxShrine'])if(WorldDB.get(`calamity:structure:${p}:generated`)===true)return true;return WorldDB.get('calamity:sunkensea:terrain:generated')===true;}
function Context(){let dungeonX=Math.floor(N(Terraria.Main.maxTilesX,4200)*.5);try{dungeonX=N(Terraria.Main.dungeonX,dungeonX);}catch(e){}return{maxX:N(Terraria.Main.maxTilesX,4200),maxY:N(Terraria.Main.maxTilesY,1200),worldSurface:N(Terraria.Main.worldSurface,300),dungeonX};}
function Save(r){WorldDB.set(KEY+'generated',true);WorldDB.set(KEY+'pending',false);WorldDB.set(KEY+'searchStopped',false);WorldDB.set(KEY+'left',N(r.left));WorldDB.set(KEY+'top',N(r.top));WorldDB.set(KEY+'width',N(r.width,35));WorldDB.set(KEY+'height',N(r.height,86));WorldDB.set(KEY+'anchorX',N(r.anchorX));WorldDB.set(KEY+'anchorY',N(r.anchorY));WorldDB.set(KEY+'placementX',N(r.placementX));WorldDB.set(KEY+'placementY',N(r.placementY));WorldDB.set(KEY+'shimmerX',N(r.shimmerX));WorldDB.set(KEY+'groundY',N(r.groundY));WorldDB.set(KEY+'chestX',N(r.chestX,-1));WorldDB.set(KEY+'chestY',N(r.chestY,-1));WorldDB.set(KEY+'lootVersion',1);WorldDB.set(KEY+'source',String(r.source||'official-csch-delayed'));try{WorldDB.Instance.Save();}catch(e){Log(`metadata save deferred: ${e}`);}}
export class ShimmerShrineGenerationSystem extends ModSystem{
 constructor(){super();this.Reset();}Reset(){this.Delay=120;this.Done=false;this.Recovery=false;}OnWorldLoad(){this.Reset();}OnWorldUnload(){this.Reset();}
 Recover(){if(this.Recovery)return;this.Recovery=true;if(WorldDB.get(KEY+'generated')===true||WorldDB.get(KEY+'pending')===true)return;}
 Update(){
  try{if(Terraria.WorldGen.isGeneratingOrLoadingWorld===true)return;}catch(e){}
  if(this.Done||!WorldDB.Instance)return;
  this.Recover();
  if(this.Delay-->0)return;
  if(WorldDB.get(KEY+'generated')===true){this.Done=true;return;}
  if(WorldDB.get(KEY+'pending')!==true){this.Done=true;return;}

  // Phase 13.04.7: never search tens of thousands of Main.tile cells during gameplay.
  // Fresh worlds place the shrine while GenVars.shimmerPosition is still available in
  // WorldGen.ShimmerCleanUp. Legacy pending markers are retired here instead of producing
  // the 40-60 second 5-FPS scan seen on Android.
  WorldDB.set(KEY+'pending',false);
  WorldDB.set(KEY+'searchStopped',true);
  WorldDB.set(KEY+'backgroundScanSuppressed',true);
  WorldDB.set(KEY+'suppressedVersion',3);
  try{WorldDB.Instance.Save();}catch(e){}
  this.Done=true;
  Log('legacy/background Shimmer scan suppressed; no live Main.tile sweep will run. Fresh worlds use the worldgen-time Shimmer anchor.');
 }
}
