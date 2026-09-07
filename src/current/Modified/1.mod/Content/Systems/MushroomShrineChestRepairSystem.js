import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { GetChestByIndex, IsChestEmpty } from './../../Core/OfficialSchematicRuntime.js';
import { FillMushroomShrineChestByIndex } from './../../Core/OfficialStructureRuntime.js';
const KEY = 'calamity:structure:mushroomShrine:';
function N(value, fallback) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function Player() { try { return Terraria.Main.player.get_Item(Math.floor(Number(Terraria.Main.myPlayer))); } catch (e) { try { return Terraria.Main.player[Math.floor(Number(Terraria.Main.myPlayer))]; } catch (_) { return null; } } }
function Inside(x, y) { const l=N(WorldDB.get(KEY+'left'),-1),t=N(WorldDB.get(KEY+'top'),-1),w=Math.max(1,N(WorldDB.get(KEY+'width'),35)),h=Math.max(1,N(WorldDB.get(KEY+'height'),42)); return l>=0&&t>=0&&x>=l&&x<l+w&&y>=t&&y<t+h; }
function Log(message) { try { tl.log(`[CalamityPort MushroomShrineRepair] ${message}`); } catch (e) { } }
export class MushroomShrineChestRepairSystem extends ModSystem {
    constructor(){super();this.Poll=30;} OnWorldLoad(){this.Poll=30;} OnWorldUnload(){this.Poll=30;}
    Update(){
        if(!WorldDB.Instance||this.Poll-->0)return; this.Poll=10;
        const p=Player(); if(!p)return; const index=N(p.chest,-1); if(index<0)return;
        const chest=GetChestByIndex(index); if(!chest)return; const x=N(chest.x,-1),y=N(chest.y,-1); if(!Inside(x,y))return;
        if(!IsChestEmpty(chest)){WorldDB.set(KEY+'lootVersion',1);return;}
        const filled=FillMushroomShrineChestByIndex(index);
        Log(`Opened chest repair index=${index}, position=${x},${y}, filled=${filled}.`);
        if(filled>=6)WorldDB.set(KEY+'lootVersion',1);
    }
}
