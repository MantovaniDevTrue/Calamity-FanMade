import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { TileData } from './../../TL/Modules/TileData.js';
const KEY='calamity:structure:roxShrine:';
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
export class RoxShrineVisualSystem extends ModSystem{
 constructor(){super();this.Left=-1;this.Top=-1;this.Cells=[];this.Rox=null;this.PendingSlab=null;this.LastClean=0;}
 OnWorldLoad(){this.Reload();}OnWorldUnload(){this.Left=this.Top=-1;this.Cells=[];this.Rox=null;this.PendingSlab=null;}
 Reload(){this.Left=N(WorldDB.get(KEY+'left'),-1);this.Top=N(WorldDB.get(KEY+'top'),-1);this.Cells=[];this.Rox=null;let raw=WorldDB.get(KEY+'customCells');if(typeof raw==='string')try{const a=JSON.parse(raw);if(Array.isArray(a))for(const e of a){if(!Array.isArray(e)||e.length<5)continue;const c={x:this.Left+N(e[0]),y:this.Top+N(e[1]),kind:String(e[2]),fx:N(e[3]),fy:N(e[4])};this.Cells.push(c);if(c.kind==='rox'&&c.fx===0&&c.fy===0)this.Rox={x:c.x,y:c.y};}}catch(e){}if(WorldDB.get(KEY+'roxRemoved')===true)this.Rox=null;let extra=WorldDB.get(KEY+'extraSlabs');if(typeof extra==='string')try{const a=JSON.parse(extra);if(Array.isArray(a))for(const e of a)this.Cells.push({x:N(e[0]),y:N(e[1]),kind:'slab',fx:N(e[2]),fy:N(e[3])});}catch(e){} }
 SaveExtras(){const baseLeft=this.Left,baseTop=this.Top;const extras=this.Cells.filter(c=>c.kind==='slab'&&(baseLeft<0||c.x<baseLeft||c.x>=baseLeft+35||c.y<baseTop||c.y>=baseTop+35));try{WorldDB.set(KEY+'extraSlabs',JSON.stringify(extras.map(c=>[c.x,c.y,c.fx,c.fy])));}catch(e){}}
 IsCell(i,j,kind=''){i=N(i);j=N(j);return this.Cells.find(c=>c.x===i&&c.y===j&&(!kind||c.kind===kind))||null;}
 FindRox(i,j){if(!this.Rox)return null;i=N(i);j=N(j);return i>=this.Rox.x&&i<this.Rox.x+3&&j>=this.Rox.y&&j<this.Rox.y+4?this.Rox:null;}
 RemoveCell(c,save=true){if(!c)return false;this.Cells=this.Cells.filter(x=>x!==c);if(save)this.SaveExtras();return true;}
 RemoveRox(save=true){if(!this.Rox)return null;const r=this.Rox;this.Rox=null;this.Cells=this.Cells.filter(c=>c.kind!=='rox');if(save){WorldDB.set(KEY+'roxRemoved',true);try{WorldDB.Instance.Save();}catch(e){}}return r;}
 MarkSlabPlacement(player){this.PendingSlab={player,who:N(Terraria.PlayerIndex(player),-1),tick:N(Terraria.Main.GameUpdateCount)};}
 ConsumeSlabPlacement(player){const p=this.PendingSlab;if(!p)return false;const age=N(Terraria.Main.GameUpdateCount)-p.tick,who=N(Terraria.PlayerIndex(player),-2);if(age<0||age>90||who!==p.who)return false;this.PendingSlab=null;return true;}
 AddSlab(x,y,save=true){x=N(x);y=N(y);if(this.IsCell(x,y))return false;this.Cells.push({x,y,kind:'slab',fx:0,fy:0});if(save)this.SaveExtras();return true;}
 Valid(c){try{const t=new TileData(c.x,c.y);if(c.kind==='rox')return N(t.type)===617;return N(t.type)===1;}catch(e){return false;}}
 PostUpdateTime(){try{if(Terraria.WorldGen.isGeneratingOrLoadingWorld===true)return;}catch(e){}if(this.Rox)try{Terraria.Lighting.AddLight(this.Rox.x+1,this.Rox.y+2,1.64,0.25,1.89);}catch(e){}const tick=N(Terraria.Main.GameUpdateCount);if(tick-this.LastClean<300)return;this.LastClean=tick;const good=this.Cells.filter(c=>this.Valid(c));if(good.length!==this.Cells.length){this.Cells=good;if(this.Rox&&!this.FindRox(this.Rox.x,this.Rox.y))this.Rox=null;this.SaveExtras();}}
}
