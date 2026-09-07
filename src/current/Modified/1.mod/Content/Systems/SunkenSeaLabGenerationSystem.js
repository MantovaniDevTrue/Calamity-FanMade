import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { PostLoadWorkCoordinator } from './../../Core/PostLoadWorkCoordinator.js';
import { SunkenSeaLabRuntime } from './../../Core/SunkenSeaLabRuntime.js';
import { SunkenSeaLabSchematic } from './../../Data/OfficialSchematics/SunkenSeaLabSchematic.js';
import { DecodeLabCell } from './../../Core/LabPhysicalProxy.js';
import { BiomeAnchorTiles } from './../../Core/BiomeAnchorIDs.js';
import { WorldgenBiomeRuntime } from './../../Core/WorldgenBiomeRuntime.js';

const KEY='calamity:structure:sunkenSeaLab:',BUDGET=16,PROBE_X=8,PROBE_Y=6,MAX_RETRIES=4;
function I(v,f=0){if(v===null||v===undefined||v==='')return f;const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Log(s){try{tl.log(`[CalamityPort SunkenSeaLabDeferred] ${s}`);}catch(e){}}
function Tell(s,r=80,g=235,b=240){try{Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'](String(s),r,g,b);}catch(e){}}
function Active(t){try{return !!t&&t['bool active()']()===true;}catch(e){return false;}}
function TileAt(x,y){try{return Terraria.Main.tile.get_Item(I(x),I(y));}catch(e){return null;}}
function Rect(prefix,defW=0,defH=0){if(!WorldDB.Instance||WorldDB.get(prefix+'generated')!==true)return null;const l=I(WorldDB.get(prefix+'left'),-1),t=I(WorldDB.get(prefix+'top'),-1),w=I(WorldDB.get(prefix+'width'),defW),h=I(WorldDB.get(prefix+'height'),defH);return l>=0&&t>=0&&w>0&&h>0?{l,t,r:l+w,b:t+h}:null;}
function Overlap(a,b,p=45){return !!a&&!!b&&a.l<b.r+p&&a.r>b.l-p&&a.t<b.b+p&&a.b>b.t-p;}
function Meta(){const cx=I(WorldDB.get('calamity:sunkensea:preview:centerX'),-1),cy=I(WorldDB.get('calamity:sunkensea:preview:centerY'),-1),bw=I(WorldDB.get('calamity:sunkensea:preview:width'),320),bh=I(WorldDB.get('calamity:sunkensea:preview:height'),180);if(!(cx>0&&cy>0&&bw>=SunkenSeaLabSchematic.width+20&&bh>=SunkenSeaLabSchematic.height+16))return null;return{cx,cy,bw,bh,left:cx-Math.floor(bw/2),top:cy-Math.floor(bh/2),right:cx+Math.ceil(bw/2),bottom:cy+Math.ceil(bh/2)};}
function Reserved(l,t){const a={l,t,r:l+SunkenSeaLabSchematic.width,b:t+SunkenSeaLabSchematic.height};const list=[
 Rect('calamity:structure:planetoidLab:',105,125),Rect('calamity:structure:jungleLab:',90,87),Rect('calamity:structure:iceLab:',77,92),
 Rect('calamity:structure:giantHive:'),Rect('calamity:structure:vernalPass:',276,208),Rect('calamity:structure:desertShrine:',30,24),
 Rect('calamity:structure:graniteShrine:',20,20),Rect('calamity:structure:marbleShrine:',24,20),Rect('calamity:structure:mushroomShrine:',24,20),
 Rect('calamity:structure:roxShrine:',24,20),Rect('calamity:structure:shimmerShrine:',24,20),Rect('calamity:structure:abyssShrine:',24,20)
 ];for(const r of list)if(Overlap(a,r,36))return true;return false;}
function AddCandidate(out,seen,l,t,m){const w=SunkenSeaLabSchematic.width,h=SunkenSeaLabSchematic.height;l=Math.floor(l);t=Math.floor(t);if(l<m.left+8||t<m.top+6||l+w>m.right-8||t+h>m.bottom-6)return;const k=l+','+t;if(seen.has(k))return;seen.add(k);out.push({l,t});}
function CentralGeodeConflict(l,t,m,pad=8){const rim=m.bw>=360?20:0,coreW=Math.max(320,m.bw-rim*2),coreH=Math.max(168,m.bh-rim*2),scale=Math.max(1,Math.min(2,coreW/320));const r=28*scale+pad,cx=m.left+rim+coreW*.5,cy=m.top+rim+coreH*.33,w=SunkenSeaLabSchematic.width,h=SunkenSeaLabSchematic.height;const nearestX=Math.max(l,Math.min(cx,l+w)),nearestY=Math.max(t,Math.min(cy,t+h));const dx=nearestX-cx,dy=nearestY-cy;return dx*dx+dy*dy<r*r;}
function CandidateList(){const m=Meta();if(!m)return[];const w=SunkenSeaLabSchematic.width,h=SunkenSeaLabSchematic.height,out=[],seen=new Set();const minL=m.left+10,maxL=m.right-w-10,minT=m.top+8,maxT=m.bottom-h-8;if(maxL<minL||maxT<minT)return[];const spanX=maxL-minL,spanY=maxT-minT;const sideL=minL,sideR=maxL,qL=Math.floor(minL+spanX*.28),qR=Math.floor(maxL-spanX*.28);const upper=Math.floor(minT+spanY*.24),mid=Math.floor(minT+spanY*.48),lower=Math.floor(minT+spanY*.68);
 // Prefer side-mounted laboratories so the structure feels embedded in the biome instead
 // of occupying the visual center. The central geode is intentionally left unobstructed.
 for(const y of [mid,lower,upper])for(const x of [sideL,sideR,qL,qR])if(!CentralGeodeConflict(x,y,m,0))AddCandidate(out,seen,x,y,m);
 const sx=Math.max(22,Math.floor(Math.max(1,spanX)/6)),sy=Math.max(18,Math.floor(Math.max(1,spanY)/5));for(let y=minT;y<=maxT;y+=sy)for(let x=minL;x<=maxL;x+=sx)if(!CentralGeodeConflict(x,y,m,0))AddCandidate(out,seen,x,y,m);
 const midL=Math.floor((minL+maxL)/2),midT=Math.floor((minT+maxT)/2);AddCandidate(out,seen,midL,midT,m);return out;}
function SunkenScore(c){let score=0,seen=0;const m=Meta(),w=SunkenSeaLabSchematic.width,h=SunkenSeaLabSchematic.height;for(let gy=0;gy<PROBE_Y;gy++)for(let gx=0;gx<PROBE_X;gx++){const x=c.l+Math.floor(w*(gx+.5)/PROBE_X),y=c.t+Math.floor(h*(gy+.5)/PROBE_Y),t=TileAt(x,y);if(!t)continue;seen++;const type=I(t.type,-1),wall=I(t.wall,0),liq=I(t.liquid,0);if(type===BiomeAnchorTiles.SunkenEutrophic||type===BiomeAnchorTiles.LegacySunkenEutrophic)score+=4;else if(type===396||type===385)score+=3;if(wall===216||wall===187)score+=2;if(liq>96)score+=1;}if(m){const center=c.l+w*.5,side=Math.abs(center-m.cx)/Math.max(1,m.bw*.5);score+=Math.floor(side*8);if(CentralGeodeConflict(c.l,c.t,m,6))score-=20;}return{score,seen};}
function Probe(c,relaxed=false){if(Reserved(c.l,c.t))return false;const m=Meta();if(m&&CentralGeodeConflict(c.l,c.t,m,0))return false;const s=SunkenScore(c);return s.seen>=20&&s.score>=(relaxed?14:24);}
function FallbackCandidate(){const m=Meta();if(!m)return null;const w=SunkenSeaLabSchematic.width,h=SunkenSeaLabSchematic.height;const candidates=[{l:m.left+12,t:m.top+Math.floor((m.bh-h)*.48)},{l:m.right-w-12,t:m.top+Math.floor((m.bh-h)*.48)},{l:m.left+Math.floor((m.bw-w)*.25),t:m.top+Math.floor((m.bh-h)*.58)},{l:m.left+Math.floor((m.bw-w)*.75),t:m.top+Math.floor((m.bh-h)*.58)}];for(const c of candidates){c.l=Math.floor(c.l);c.t=Math.floor(c.t);if(c.l<m.left+4||c.t<m.top+4||c.l+w>m.right-4||c.t+h>m.bottom-4||Reserved(c.l,c.t)||CentralGeodeConflict(c.l,c.t,m,0))continue;return c;}return null;}
function PhysicalSignature(left,top){
 left=I(left,-1);top=I(top,-1);
 if(left<0||top<0)return{valid:false,expected:0,matched:0,solidMatched:0,platformMatched:0};
 let expected=0,matched=0,solidExpected=0,solidMatched=0,platformExpected=0,platformMatched=0;
 for(let y=3;y<SunkenSeaLabSchematic.height-3;y+=7)for(let x=3;x<SunkenSeaLabSchematic.width-3;x+=9){
  const e=SunkenSeaLabSchematic.palette[SunkenSeaLabSchematic.rows[y][x]],m=DecodeLabCell(e),k=I(m.kind,0);
  if(k!==1&&k!==3&&k!==4)continue;
  const wantPlatform=k===3||k===4,want=wantPlatform?19:38;
  expected++;if(wantPlatform)platformExpected++;else solidExpected++;
  const t=TileAt(left+x,top+y);
  if(!t||!Active(t)||I(t.type,-1)!==want)continue;
  matched++;if(wantPlatform)platformMatched++;else solidMatched++;
 }
 const enoughSolid=solidExpected>=12&&solidMatched>=Math.max(10,Math.floor(solidExpected*.22));
 const enoughTotal=expected>=20&&matched>=Math.max(12,Math.floor(expected*.22));
 return{valid:enoughSolid&&enoughTotal,expected,matched,solidExpected,solidMatched,platformExpected,platformMatched};
}
function ValidateSaved(){
 if(WorldDB.get(KEY+'generated')!==true)return false;
 const l=I(WorldDB.get(KEY+'left'),-1),t=I(WorldDB.get(KEY+'top'),-1),sig=PhysicalSignature(l,t);
 Log(`saved signature audit; left=${l}, top=${t}, exact=${sig.matched}/${sig.expected}, solid=${sig.solidMatched}/${sig.solidExpected}, platform=${sig.platformMatched}/${sig.platformExpected}, valid=${sig.valid}.`);
 if(sig.valid)return true;
 Log(`stale/false Sunken Sea Lab metadata rejected; forcing real generation at next valid candidate.`);
 WorldDB.set(KEY+'generated',false);WorldDB.set(KEY+'validationReset',true);WorldDB.set(KEY+'validationVersion',3);
 try{WorldDB.Instance?.Save();}catch(e){}return false;
}
function Save(r){WorldDB.set(KEY+'generated',r?.generated===true);for(const k of ['left','top','width','height','centerX','centerY','centerWorldX','centerWorldY','applied'])WorldDB.set(KEY+k,I(r?.[k],-1));WorldDB.set(KEY+'sourceSha256',String(r?.sourceSha256||''));WorldDB.set(KEY+'source','official-sunken-sea-lab-incremental-v2-self-healing');WorldDB.set(KEY+'validationVersion',3);const ch=Array.isArray(r?.chests)?r.chests:[];WorldDB.set(KEY+'chestCount',ch.length);for(let i=0;i<ch.length;i++){const c=ch[i]||{},p=KEY+`chest:${i}:`;WorldDB.set(p+'x',I(c.x,-1));WorldDB.set(p+'y',I(c.y,-1));WorldDB.set(p+'index',I(c.index,-1));WorldDB.set(p+'filled',I(c.filled,0));WorldDB.set(p+'kind',String(c.kind||'security'));}try{WorldDB.Instance?.Save();}catch(e){Log(`metadata save deferred: ${e}`);}}
export class SunkenSeaLabGenerationSystem extends ModSystem{
 constructor(){super();this.Reset();}
 Reset(){this.Delay=360;this.Candidates=[];this.Cursor=0;this.Session=null;this.Done=false;this.Relaxed=false;this.Retries=0;this.RecoveryTried=false;this.Validated=false;}
 OnWorldLoad(){this.Reset();}OnWorldUnload(){this.Reset();}
 Update(){if(this.Done||!WorldDB.Instance||Terraria.Main.gameMenu===true)return;
  if(!this.Validated){this.Validated=true;if(ValidateSaved()){this.Done=true;Log('existing Sunken Sea Laboratory physical signature validated.');return;}}
  if(this.Delay-->0)return;
  if(!PostLoadWorkCoordinator.TryEnter('SunkenSeaLab'))return;
  try{
   if(WorldDB.get('calamity:sunkensea:terrain:generated')!==true||!Meta()){
    if(!this.RecoveryTried){this.RecoveryTried=true;const ok=WorldgenBiomeRuntime.RecoverGeneratedWorldMetadata()===true;Log(`metadata recovery attempted; result=${ok}.`);this.Delay=120;return;}
    this.Retries++;if(this.Retries>=MAX_RETRIES){Log('Sunken Sea metadata is still unavailable after bounded recovery retries; waiting for next world load.');this.Done=true;return;}this.Delay=300;return;
   }
   if(!this.Session){
    if(this.Candidates.length===0){this.Candidates=CandidateList();this.Cursor=0;Log(`self-healing Sunken Sea search started; candidates=${this.Candidates.length}, relaxed=${this.Relaxed}.`);}
    let found=null;for(let n=0;n<1&&this.Cursor<this.Candidates.length;n++){const c=this.Candidates[this.Cursor++];if(Probe(c,this.Relaxed)){found=c;break;}}
    if(!found){
     if(this.Cursor>=this.Candidates.length&&!this.Relaxed){this.Relaxed=true;this.Candidates=[];this.Cursor=0;Log('strict material probe exhausted; retrying with relaxed Sunken Sea signature.');return;}
     if(this.Cursor>=this.Candidates.length){found=FallbackCandidate();if(found)Log(`material probe fallback accepted exact saved Sunken Sea center at ${found.l},${found.t}.`);else{this.Retries++;if(this.Retries>=MAX_RETRIES){Log('no safe Sunken Sea Lab position found after bounded retries.');this.Done=true;}else{this.Candidates=[];this.Cursor=0;this.Relaxed=false;this.Delay=360;}return;}}
     else return;
    }
    this.Session=SunkenSeaLabRuntime.CreateSession(found.l,found.t);Log(`official 119x93 Sunken Sea Laboratory started at ${found.l},${found.t}; tileBudget=${BUDGET}.`);
   }
   const s=SunkenSeaLabRuntime.StepSession(this.Session,BUDGET);if(!s.done)return;
   if(s.result?.generated===true){Save(s.result);Log(`laboratory committed; center=${s.result.centerX},${s.result.centerY}, chests=${s.result.chests?.length||0}.`);Tell('Laboratório do Mar Submerso gerado. Use o Mecanismo de Busca Ciano para localizá-lo.',80,235,240);}else Log(`laboratory aborted safely: ${s.result?.reason||'unknown'}.`);this.Done=true;PostLoadWorkCoordinator.Release('SunkenSeaLab');
  }catch(e){PostLoadWorkCoordinator.Release('SunkenSeaLab');Log(`incremental generation pass failed safely: ${e}`);this.Retries++;if(this.Retries>=MAX_RETRIES)this.Done=true;else{this.Session=null;this.Candidates=[];this.Cursor=0;this.Relaxed=false;this.Delay=300;}}
 }
}
