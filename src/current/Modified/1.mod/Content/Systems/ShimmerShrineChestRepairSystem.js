import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { GetChestByIndex, IsChestEmpty } from './../../Core/OfficialSchematicRuntime.js';
import { FillShimmerShrineChestByIndex } from './../../Core/ShimmerShrineRuntime.js';
const KEY='calamity:structure:shimmerShrine:';
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Player(){const i=N(Terraria.Main.myPlayer,-1);if(i<0)return null;try{return Terraria.Main.player.get_Item(i);}catch(e){try{return Terraria.Main.player[i];}catch(_){return null;}}}
function Inside(x,y){const l=N(WorldDB.get(KEY+'left'),-1),t=N(WorldDB.get(KEY+'top'),-1),w=Math.max(1,N(WorldDB.get(KEY+'width'),35)),h=Math.max(1,N(WorldDB.get(KEY+'height'),86));return l>=0&&t>=0&&x>=l&&x<l+w&&y>=t&&y<t+h;}
function Log(s){try{tl.log(`[CalamityPort ShimmerShrineRepair] ${s}`);}catch(e){}}
export class ShimmerShrineChestRepairSystem extends ModSystem{
 constructor(){super();this.Poll=30;}OnWorldLoad(){this.Poll=30;}OnWorldUnload(){this.Poll=30;}
 Update(){if(!WorldDB.Instance||this.Poll-->0)return;this.Poll=10;const p=Player();if(!p)return;const index=N(p.chest,-1);if(index<0)return;const chest=GetChestByIndex(index);if(!chest)return;const x=N(chest.x,-1),y=N(chest.y,-1);if(!Inside(x,y))return;if(!IsChestEmpty(chest)){WorldDB.set(KEY+'lootVersion',1);return;}const filled=FillShimmerShrineChestByIndex(index);Log(`Opened chest repair index=${index}, position=${x},${y}, filled=${filled}.`);if(filled>=7)WorldDB.set(KEY+'lootVersion',1);}
}
