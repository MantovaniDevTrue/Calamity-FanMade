import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { GetChestByIndex, IsChestEmpty } from './../../Core/OfficialSchematicRuntime.js';
import { FillAbyssShrineChestByIndex } from './../../Core/AbyssShrineRuntime.js';
const KEY='calamity:structure:abyssShrine:';
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Player(){try{return Terraria.Main.LocalPlayer;}catch(e){return null;}}
function Log(s){try{tl.log(`[CalamityPort AbyssShrineChestRepair] ${s}`);}catch(e){}}
export class AbyssShrineChestRepairSystem extends ModSystem{
 constructor(){super();this.Poll=30;}OnWorldLoad(){this.Poll=30;}OnWorldUnload(){this.Poll=30;}
 Update(){if(!WorldDB.Instance||WorldDB.get(KEY+'generated')!==true||this.Poll-->0)return;this.Poll=10;const p=Player();if(!p)return;const index=N(p.chest,-1);if(index<0)return;const c=GetChestByIndex(index);if(!c)return;const x=N(c.x,-1),y=N(c.y,-1);if(x!==N(WorldDB.get(KEY+'chestX'),-2)||y!==N(WorldDB.get(KEY+'chestY'),-2))return;if(!IsChestEmpty(c)){WorldDB.set(KEY+'lootVersion',1);return;}const filled=FillAbyssShrineChestByIndex(index);Log(`opened-empty repair; index=${index}, position=${x},${y}, filled=${filled}.`);if(filled>=6){WorldDB.set(KEY+'lootVersion',1);try{WorldDB.Instance.Save();}catch(e){}}}
}
