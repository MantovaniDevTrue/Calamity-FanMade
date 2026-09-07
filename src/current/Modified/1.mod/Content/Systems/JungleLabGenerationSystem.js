import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { PostLoadWorkCoordinator } from './../../Core/PostLoadWorkCoordinator.js';
import { JungleLabRuntime } from './../../Core/JungleLabRuntime.js';
import { JungleLabSchematic } from './../../Data/OfficialSchematics/JungleLabSchematic.js';
const KEY='calamity:structure:jungleLab:',BUDGET=16,PROBE_X=10,PROBE_Y=8;
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Active(t){try{return !!t&&t['bool active()']()===true;}catch(e){return false;}}
function TileAt(x,y){try{return Terraria.Main.tile.get_Item(I(x),I(y));}catch(e){return null;}}
function Log(s){try{tl.log(`[CalamityPort JungleLabDeferred] ${s}`);}catch(e){}}
function Rect(prefix,defW=0,defH=0){if(!WorldDB.Instance||WorldDB.get(prefix+'generated')!==true)return null;const l=I(WorldDB.get(prefix+'left'),-1),t=I(WorldDB.get(prefix+'top'),-1),w=I(WorldDB.get(prefix+'width'),defW),h=I(WorldDB.get(prefix+'height'),defH);return l>=0&&t>=0&&w>0&&h>0?{l,t,r:l+w,b:t+h}:null;}
function Overlap(a,b,p=55){return !!a&&!!b&&a.l<b.r+p&&a.r>b.l-p&&a.t<b.b+p&&a.b>b.t-p;}
function Hash(x){x=(x^61)^(x>>>16);x=(x+(x<<3))|0;x^=x>>>4;x=Math.imul(x,0x27d4eb2d);x^=x>>>15;return x>>>0;}
function CandidateList(){
 const W=I(Terraria.Main.maxTilesX,4200),H=I(Terraria.Main.maxTilesY,1200),surf=I(Terraria.Main.worldSurface,250),under=I(Terraria.Main.UnderworldLayer,H-200),sw=JungleLabSchematic.width,sh=JungleLabSchematic.height,out=[],seen=new Set();
 const add=(cx,cy)=>{const l=Math.floor(cx-sw/2),t=Math.floor(cy-sh/2),k=l+','+t;if(l<80||t<surf+100||l+sw>W-80||t+sh>under-65||seen.has(k))return;seen.add(k);out.push({l,t});};
 const gh=Rect('calamity:structure:giantHive:');
 if(gh){const cx=(gh.l+gh.r)/2,cy=(gh.t+gh.b)/2;for(const dx of [-720,720,-560,560,-400,400,-280,280])for(const dy of [-220,-120,0,120,220])add(cx+dx,cy+dy);}
 const vp=Rect('calamity:structure:vernalPass:',276,208);
 if(vp){const cx=(vp.l+vp.r)/2,cy=(vp.t+vp.b)/2;for(const dx of [-760,760,-580,580,-420,420])for(const dy of [-220,-80,100,220])add(cx+dx,cy+dy);}
 const xs=[];for(let x=Math.floor(W*.14);x<=Math.floor(W*.86);x+=Math.max(120,Math.floor(W/24)))xs.push(x);
 const ys=[];for(let y=surf+150;y<=under-110;y+=Math.max(80,Math.floor((under-surf)/10)))ys.push(y);
 const grid=[];for(const y of ys)for(const x of xs)grid.push({x,y,h:Hash(x*73856093^y*19349663)});grid.sort((a,b)=>a.h-b.h);for(const c of grid)add(c.x,c.y);
 return out.slice(0,240);
}
function Reserved(left,top){const a={l:left,t:top,r:left+JungleLabSchematic.width,b:top+JungleLabSchematic.height};for(const r of [Rect('calamity:structure:giantHive:'),Rect('calamity:structure:vernalPass:',276,208),Rect('calamity:structure:graniteShrine:',17,18),Rect('calamity:structure:iceShrine:',46,32)])if(Overlap(a,r,70))return true;return false;}
function Probe(c,relaxed=false){if(Reserved(c.l,c.t))return false;let jungle=0,active=0,bad=0,reads=0;const w=JungleLabSchematic.width,h=JungleLabSchematic.height;for(let gy=0;gy<PROBE_Y;gy++)for(let gx=0;gx<PROBE_X;gx++){const x=c.l-20+Math.floor((w+40)*(gx+.5)/PROBE_X),y=c.t+Math.floor(h*(gy+.5)/PROBE_Y),t=TileAt(x,y);reads++;if(!t)continue;const type=I(t.type,-1),wall=I(t.wall,0);if(Active(t)){active++;if(type===59||type===60)jungle++;if(type===70||type===71||type===528)jungle-=3;if(type===41||type===43||type===44||type===226||type===25||type===203)bad++;}if(wall===87||wall===3||wall===83)bad++;}
 const need=relaxed?18:26;return bad===0&&active>=34&&jungle>=need;
}
function Save(r){WorldDB.set(KEY+'generated',r?.generated===true);for(const k of ['left','top','width','height','centerX','centerY','centerWorldX','centerWorldY','applied'])WorldDB.set(KEY+k,I(r?.[k],-1));WorldDB.set(KEY+'sourceSha256',String(r?.sourceSha256||''));WorldDB.set(KEY+'source','official-plague-lab-incremental-v1');const ch=Array.isArray(r?.chests)?r.chests:[];WorldDB.set(KEY+'chestCount',ch.length);for(let i=0;i<ch.length;i++){const c=ch[i]||{},p=KEY+`chest:${i}:`;WorldDB.set(p+'x',I(c.x,-1));WorldDB.set(p+'y',I(c.y,-1));WorldDB.set(p+'index',I(c.index,-1));WorldDB.set(p+'filled',I(c.filled,0));WorldDB.set(p+'kind',String(c.kind||'security'));}try{WorldDB.Instance?.Save();}catch(e){Log(`metadata save deferred: ${e}`);}}
export class JungleLabGenerationSystem extends ModSystem{
 constructor(){super();this.Reset();}
 Reset(){this.Delay=150;this.Candidates=[];this.Cursor=0;this.Session=null;this.Done=false;this.Relaxed=false;}
 OnWorldLoad(){this.Reset();}OnWorldUnload(){this.Reset();}
 Update(){if(this.Done||!WorldDB.Instance||Terraria.Main.gameMenu===true)return;if(WorldDB.get(KEY+'generated')===true){this.Done=true;return;}if(this.Delay-->0)return;if(!PostLoadWorkCoordinator.TryEnter('JungleLab'))return;try{
  if(!this.Session){if(this.Candidates.length===0){this.Candidates=CandidateList();this.Cursor=0;Log(`bounded jungle search started; candidates=${this.Candidates.length}, probes=${PROBE_X*PROBE_Y}/candidate.`);}let found=null;for(let n=0;n<1&&this.Cursor<this.Candidates.length;n++){const c=this.Candidates[this.Cursor++];if(Probe(c,this.Relaxed)){found=c;break;}}if(!found){if(this.Cursor>=this.Candidates.length&&!this.Relaxed){this.Relaxed=true;this.Candidates=CandidateList();this.Cursor=0;Log('strict search exhausted; retrying once with relaxed jungle density.');return;}if(this.Cursor>=this.Candidates.length){Log('no safe Underground Jungle location found; generation aborted without touching terrain.');this.Done=true;}return;}this.Session=JungleLabRuntime.CreateSession(found.l,found.t);Log(`official 90x87 Jungle/Plague Laboratory started at ${found.l},${found.t}; tileBudget=${BUDGET}.`);}
  const s=JungleLabRuntime.StepSession(this.Session,BUDGET);if(!s.done)return;if(s.result?.generated===true){Save(s.result);Log(`laboratory committed; center=${s.result.centerX},${s.result.centerY}, chests=${s.result.chests?.length||0}.`);}else Log(`laboratory aborted safely: ${s.result?.reason||'unknown'}.`);this.Done=true;PostLoadWorkCoordinator.Release('JungleLab');
 }catch(e){Log(`incremental generation aborted safely: ${e}`);this.Done=true;PostLoadWorkCoordinator.Release('JungleLab');}}
}
