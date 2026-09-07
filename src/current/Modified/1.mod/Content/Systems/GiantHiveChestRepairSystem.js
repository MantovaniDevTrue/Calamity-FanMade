import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { GetChestByIndex, IsChestEmpty } from './../../Core/OfficialSchematicRuntime.js';
import { FillGiantHiveChestByIndex } from './../../Core/GiantHiveRuntime.js';
const KEY='calamity:structure:giantHive:',VERSION=1;
function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Log(s){try{tl.log(`[CalamityPort GiantHiveRepair] ${s}`);}catch(e){}}
export class GiantHiveChestRepairSystem extends ModSystem{
 constructor(){super();this.Delay=120;this.Done=false;}
 OnWorldLoad(){this.Delay=120;this.Done=false;} OnWorldUnload(){this.Delay=120;this.Done=false;}
 Update(){if(this.Done||!WorldDB.Instance||this.Delay-->0)return;if(WorldDB.get(KEY+'generated')!==true){this.Delay=600;return;}if(I(WorldDB.get(KEY+'lootVersion'),0)>=VERSION){this.Done=true;return;}const count=Math.max(0,I(WorldDB.get(KEY+'chestCount'),0));let ready=0,repaired=0;for(let i=0;i<count;i++){const idx=I(WorldDB.get(KEY+`chest:${i}:index`),-1);if(idx<0)continue;const c=GetChestByIndex(idx);if(!c)continue;if(IsChestEmpty(c)){if(FillGiantHiveChestByIndex(idx)>0)repaired++;}if(!IsChestEmpty(c))ready++;}Log(`verification ready=${ready}/${count}, repaired=${repaired}.`);if(count>0&&ready===count){WorldDB.set(KEY+'lootVersion',VERSION);try{WorldDB.Instance.Save();}catch(e){}this.Done=true;}else this.Delay=900;}
}
