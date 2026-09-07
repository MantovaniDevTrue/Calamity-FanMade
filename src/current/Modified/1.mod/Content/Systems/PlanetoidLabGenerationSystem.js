import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { PostLoadWorkCoordinator } from './../../Core/PostLoadWorkCoordinator.js';
import { PlanetoidLabRuntime } from './../../Core/PlanetoidLabRuntime.js';

const PLANETS='calamity:structure:planetoids:';
const LAB='calamity:structure:planetoidLab:';
const TILE_BUDGET=16;
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Log(s){try{tl.log(`[CalamityPort PlanetoidLabDeferred] ${s}`);}catch(e){}}
function Save(result){
 WorldDB.set(LAB+'generated',result?.generated===true);
 WorldDB.set(LAB+'left',I(result?.left,-1));
 WorldDB.set(LAB+'top',I(result?.top,-1));
 WorldDB.set(LAB+'width',I(result?.width,0));
 WorldDB.set(LAB+'height',I(result?.height,0));
 WorldDB.set(LAB+'centerX',I(result?.centerX,-1));
 WorldDB.set(LAB+'centerY',I(result?.centerY,-1));
 WorldDB.set(LAB+'applied',I(result?.applied,0));
 WorldDB.set(LAB+'sourceSha256',String(result?.sourceSha256||''));
 WorldDB.set(LAB+'source','official-planetoid-lab-incremental-v1');
 const chests=Array.isArray(result?.chests)?result.chests:[];
 WorldDB.set(LAB+'chestCount',chests.length);
 for(let i=0;i<chests.length;i++){
  const c=chests[i]||{},q=LAB+`chest:${i}:`;
  WorldDB.set(q+'x',I(c.x,-1));WorldDB.set(q+'y',I(c.y,-1));WorldDB.set(q+'index',I(c.index,-1));WorldDB.set(q+'filled',I(c.filled,0));
 }
 try{WorldDB.Instance?.Save();}catch(e){Log(`metadata save deferred: ${e}`);}
}
export class PlanetoidLabGenerationSystem extends ModSystem{
 constructor(){super();this.Reset();}
 Reset(){this.Done=false;this.Logged=false;}
 OnWorldLoad(){this.Reset();}
 OnWorldUnload(){this.Reset();}
 Update(){
  if(this.Done||!WorldDB.Instance||Terraria.Main.gameMenu===true)return;
  if(WorldDB.get(LAB+'generated')===true){this.Done=true;return;}
  if(!this.Logged){Log('live-world Planetoid Lab placement suppressed for TLPro safety; fresh-world worldgen only.');this.Logged=true;}
  this.Done=true;
 }
}
