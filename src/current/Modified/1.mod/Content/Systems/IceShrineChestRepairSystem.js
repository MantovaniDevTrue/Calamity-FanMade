import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { GetChestByIndex, IsChestEmpty } from './../../Core/OfficialSchematicRuntime.js';
import { FillIceShrineChestByIndex } from './../../Core/OfficialStructureRuntime.js';
const KEY='calamity:structure:iceShrine:';
function N(v,f){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Player(){try{return Terraria.Main.player.get_Item(Math.floor(Number(Terraria.Main.myPlayer)));}catch(e){return null;}}
function Inside(x,y){const l=N(WorldDB.get(KEY+'left'),-1),t=N(WorldDB.get(KEY+'top'),-1),w=Math.max(1,N(WorldDB.get(KEY+'width'),46)),h=Math.max(1,N(WorldDB.get(KEY+'height'),32));return l>=0&&t>=0&&x>=l&&x<l+w&&y>=t&&y<t+h;}
function Log(s){try{tl.log(`[CalamityPort IceShrineRepair] ${s}`);}catch(e){}}
export class IceShrineChestRepairSystem extends ModSystem{
    constructor(){super();this.Poll=30;}OnWorldLoad(){this.Poll=30;}OnWorldUnload(){this.Poll=30;}
    Update(){if(!WorldDB.Instance||this.Poll-->0)return;this.Poll=10;const p=Player();if(!p)return;const i=N(p.chest,-1);if(i<0)return;const c=GetChestByIndex(i);if(!c)return;const x=N(c.x,-1),y=N(c.y,-1);if(!Inside(x,y))return;if(!IsChestEmpty(c)){WorldDB.set(KEY+'lootVersion',1);return;}const filled=FillIceShrineChestByIndex(i);Log(`Opened chest repair index=${i}, position=${x},${y}, filled=${filled}.`);if(filled>=7)WorldDB.set(KEY+'lootVersion',1);}
}
