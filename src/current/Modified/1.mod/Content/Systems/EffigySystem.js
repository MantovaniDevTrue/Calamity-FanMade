import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { TileData } from './../../TL/Modules/TileData.js';
const TILE=617, KEY='calamity:world:effigies';
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
export class EffigySystem extends ModSystem{
 constructor(){super();this.Positions=[];this.Pending=null;this.LastCleanup=-9999;}
 OnWorldLoad(){this.Positions=[];this.Pending=null;this.LastCleanup=-9999;const raw=WorldDB.get(KEY);if(typeof raw==='string')try{const a=JSON.parse(raw);if(Array.isArray(a))for(const p of a)this.AddPosition(p.x,p.y,p.kind,false);}catch(e){}}
 OnWorldUnload(){this.Positions=[];this.Pending=null;}
 PreSaveAndQuit(){this.Save();}
 Save(){try{WorldDB.set(KEY,JSON.stringify(this.Positions.map(p=>({x:N(p.x),y:N(p.y),kind:p.kind}))));}catch(e){}}
 Key(x,y){return `${N(x)}:${N(y)}`;}
 GetTopLeft(i,j){let fx=0,fy=0;try{const t=new TileData(i,j);fx=N(t.frameX);fy=N(t.frameY);}catch(e){}const col=Math.max(0,Math.min(2,Math.floor((((fx%54)+54)%54)/18)));const row=Math.max(0,Math.min(3,Math.floor((((fy%72)+72)%72)/18)));return {x:N(i)-col,y:N(j)-row};}
 MarkPending(player,kind){if(!player)return;const anchors=this.Collect(player,12),existing={};for(const a of anchors)existing[this.Key(a.x,a.y)]=true;this.Pending={player,who:N(Terraria.PlayerIndex(player),-1),kind:String(kind),tick:N(Terraria.Main.GameUpdateCount),existing};}
 ConsumePending(player){const p=this.Pending;if(!p)return '';const who=N(Terraria.PlayerIndex(player),-2),age=N(Terraria.Main.GameUpdateCount)-p.tick;if(who!==p.who||age<0||age>100)return '';this.Pending=null;return p.kind;}
 Collect(player,r=12){const out=[],seen={};if(!player)return out;const cx=Math.floor(Number(Terraria.PlayerCenterX(player))/16),cy=Math.floor(Number(Terraria.PlayerCenterY(player))/16);for(let y=Math.max(2,cy-r);y<=Math.min(N(Terraria.Main.maxTilesY)-3,cy+r);y++)for(let x=Math.max(2,cx-r);x<=Math.min(N(Terraria.Main.maxTilesX)-3,cx+r);x++)try{const t=new TileData(x,y);if(N(t.type)!==TILE)continue;const a=this.GetTopLeft(x,y),k=this.Key(a.x,a.y);if(!seen[k]){seen[k]=true;out.push(a);}}catch(e){}return out;}
 ClaimPending(){const p=this.Pending;if(!p)return;const age=N(Terraria.Main.GameUpdateCount)-p.tick;if(age>100){this.Pending=null;return;}for(const a of this.Collect(p.player,12)){const k=this.Key(a.x,a.y);if(p.existing[k]||this.Positions.some(q=>q.x===a.x&&q.y===a.y))continue;this.AddPosition(a.x,a.y,p.kind,true);this.Pending=null;return;}}
 AddPosition(x,y,kind,save=true){x=N(x);y=N(y);kind=kind==='crimson'?'crimson':'corruption';if(this.Positions.some(p=>p.x===x&&p.y===y))return false;this.Positions.push({x,y,kind});if(save)this.Save();return true;}
 RemovePosition(p,save=true){const n=this.Positions.filter(q=>q!==p);if(n.length===this.Positions.length)return false;this.Positions=n;if(save)this.Save();return true;}
 FindContaining(i,j){i=N(i);j=N(j);return this.Positions.find(p=>i>=p.x&&i<p.x+3&&j>=p.y&&j<p.y+4)||null;}
 IsValid(p){try{const t=new TileData(p.x,p.y);return N(t.type)===TILE;}catch(e){return false;}}
 PostUpdateTime(){if(this.Pending)this.ClaimPending();const tick=N(Terraria.Main.GameUpdateCount);if(tick-this.LastCleanup<180)return;this.LastCleanup=tick;const good=this.Positions.filter(p=>this.IsValid(p));if(good.length!==this.Positions.length){this.Positions=good;this.Save();}}
}
