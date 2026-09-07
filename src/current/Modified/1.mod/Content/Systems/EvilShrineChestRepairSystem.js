import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { GetChestByIndex, IsChestEmpty } from './../../Core/OfficialSchematicRuntime.js';
import { FillCorruptionShrineChestByIndex, FillCrimsonShrineChestByIndex } from './../../Core/OfficialStructureRuntime.js';
function N(v,f){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Player(){const i=N(Terraria.Main.myPlayer,-1);try{return Terraria.Main.player.get_Item(i);}catch(e){try{return Terraria.Main.player[i];}catch(_){return null;}}}
function KindAt(x,y){for(const k of ['corruption','crimson']){const p=`calamity:structure:${k}Shrine:`,l=N(WorldDB.get(p+'left'),-1),t=N(WorldDB.get(p+'top'),-1),w=N(WorldDB.get(p+'width'),k==='crimson'?54:26),h=N(WorldDB.get(p+'height'),k==='crimson'?19:11);if(l>=0&&t>=0&&x>=l&&x<l+w&&y>=t&&y<t+h)return k;}return '';}
export class EvilShrineChestRepairSystem extends ModSystem{constructor(){super();this.Poll=30;}OnWorldLoad(){this.Poll=30;}OnWorldUnload(){this.Poll=30;}Update(){if(!WorldDB.Instance||this.Poll-->0)return;this.Poll=10;const p=Player();if(!p)return;const idx=N(p.chest,-1);if(idx<0)return;const chest=GetChestByIndex(idx);if(!chest)return;const kind=KindAt(N(chest.x,-1),N(chest.y,-1));if(!kind||!IsChestEmpty(chest))return;const filled=kind==='crimson'?FillCrimsonShrineChestByIndex(idx):FillCorruptionShrineChestByIndex(idx);try{tl.log(`[CalamityPort EvilShrineRepair] ${kind} opened-empty repair; chest=${idx}, filled=${filled}.`);}catch(e){}if(filled>=7)WorldDB.set(`calamity:structure:${kind}Shrine:lootVersion`,1);}}
