import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { TileData } from './../../TL/Modules/TileData.js';
const KEY='calamity:structure:abyssShrine:';
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
export class AbyssShrineVisualSystem extends ModSystem{
 constructor(){super();this.Cells=[];this.Chest=null;this.LastClean=0;}
 OnWorldLoad(){this.Reload();this.LastClean=0;}OnWorldUnload(){this.Cells=[];this.Chest=null;this.LastClean=0;}
 Reload(){this.Cells=[];this.Chest=null;if(WorldDB.get(KEY+'generated')!==true)return;const ox=N(WorldDB.get(KEY+'cellOriginX'),-1),oy=N(WorldDB.get(KEY+'cellOriginY'),-1);const raw=WorldDB.get(KEY+'smoothCells');if(typeof raw==='string')try{const a=JSON.parse(raw);if(Array.isArray(a))for(const e of a){if(!Array.isArray(e)||e.length<4)continue;this.Cells.push({x:ox+N(e[0]),y:oy+N(e[1]),fx:N(e[2]),fy:N(e[3])});}}catch(e){}const x=N(WorldDB.get(KEY+'chestX'),-1),y=N(WorldDB.get(KEY+'chestY'),-1),index=N(WorldDB.get(KEY+'chestIndex'),-1);if(x>0&&y>0)this.Chest={x,y,index};}
 IsCell(i,j){i=N(i);j=N(j);return this.Cells.find(c=>c.x===i&&c.y===j)||null;}
 SaveCells(){const ox=N(WorldDB.get(KEY+'cellOriginX'),0),oy=N(WorldDB.get(KEY+'cellOriginY'),0);WorldDB.set(KEY+'smoothCells',JSON.stringify(this.Cells.map(c=>[c.x-ox,c.y-oy,c.fx,c.fy])));try{WorldDB.Instance.Save();}catch(e){}}
 RemoveCell(c,save=true){if(!c)return false;this.Cells=this.Cells.filter(x=>x!==c);if(save)this.SaveCells();return true;}
 IsChestCell(i,j){if(!this.Chest)return false;i=N(i);j=N(j);return i>=this.Chest.x&&i<this.Chest.x+2&&j>=this.Chest.y&&j<this.Chest.y+2;}
 ValidCell(c){try{const t=new TileData(c.x,c.y);return N(t.type)===1;}catch(e){return false;}}
 ChestNearView(padding=26){if(!this.Chest)return false;try{const sx=Number(Terraria.Main.screenPosition?.X||0)/16,sy=Number(Terraria.Main.screenPosition?.Y||0)/16,sw=Math.max(1,N(Terraria.Main.screenWidth,1920))/16,sh=Math.max(1,N(Terraria.Main.screenHeight,1080))/16;return this.Chest.x>=sx-padding&&this.Chest.x<=sx+sw+padding&&this.Chest.y>=sy-padding&&this.Chest.y<=sy+sh+padding;}catch(e){return false;}}
 PostUpdateTime(){try{if(Terraria.WorldGen.isGeneratingOrLoadingWorld===true||Terraria.Main.gameMenu===true)return;}catch(e){}
  // Lighting is frame-local, but an off-screen shrine never needs an AddLight bridge call.
  // Keep the exact light at full 60 Hz whenever the chest can influence the visible grid.
  const near=this.ChestNearView(26);if(near&&this.Chest)try{Terraria.Lighting.AddLight(this.Chest.x+1,this.Chest.y+1,0.35,0.22,0.55);}catch(e){}
  // Normal tile callbacks remove smooth cells immediately. This is only a slow integrity
  // fallback for external world edits, so do not scan TileData globally every ten seconds.
  const tick=N(Terraria.Main.GameUpdateCount);if(tick-this.LastClean<1800)return;this.LastClean=tick;if(near)this.Cells=this.Cells.filter(c=>this.ValidCell(c));
 }
}
