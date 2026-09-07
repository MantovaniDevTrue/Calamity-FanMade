import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';

const KEY='calamity:abyss:ambience:';
const BUCKET=96, KEY_MUL=256;
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function BucketKey(bx,by){return I(bx)*KEY_MUL+I(by);}
function PlayerTile(){const p=Terraria.Main.LocalPlayer;if(!p||!p.active)return null;try{return{x:I(Terraria.PlayerCenterX(p)/16),y:I(Terraria.PlayerCenterY(p)/16)};}catch(_){try{return{x:I((Number(p.position?.X)+Number(p.width)*.5)/16),y:I((Number(p.position?.Y)+Number(p.height)*.5)/16)};}catch(__){return null;}}}

export class AbyssAmbientLightSystem extends ModSystem{
 constructor(){super();this.Reset();}
 Reset(){this.Version=-1;this.Count=-1;this.Buckets=new Map();this.Tick=0;this.LightCount=0;this.Nearby=false;this.IdleProbe=0;}
 OnWorldLoad(){this.Reset();}
 OnWorldUnload(){this.Reset();}
 Refresh(){if(!WorldDB.Instance)return;const version=I(WorldDB.get(KEY+'version'),0),count=Math.max(0,I(WorldDB.get(KEY+'count'),0));if(version===this.Version&&count===this.Count)return;const rawBuckets=new Map();let raw='[]',lightCount=0;
  try{const chunkCount=Math.max(0,I(WorldDB.get(KEY+'chunkCount'),0));if(chunkCount>0){const parts=[];let complete=true;for(let i=0;i<chunkCount;i++){const part=WorldDB.get(KEY+`chunk:${i}`);if(typeof part!=='string'){complete=false;break;}parts.push(part);}raw=complete?parts.join(''):'[]';}else raw=String(WorldDB.get(KEY+'data')||'[]');}catch(_){raw='[]';}
  try{const rows=JSON.parse(raw);if(Array.isArray(rows))for(const r of rows){if(!Array.isArray(r)||r.length<7)continue;const kind=String(r[0]||'');if(kind!=='pire'&&kind!=='kelp'&&kind!=='coral'&&kind!=='sulphVine')continue;const variant=Math.max(1,I(r[1],1)),left=I(r[2],-1),top=I(r[3],-1),w=I(r[4]),h=I(r[5]);if(left<0||top<0||w<=0||h<=0)continue;let light=null;if(kind==='pire')light=[.46,.51,0];else if(kind==='kelp'){if(variant<=2)light=[.72,.35,.08];else if(variant===3)light=[.46,.22,.05];else light=[.61,.30,.07];}else if(kind==='coral'){if((((left*17+top*31)|0)&3)!==0)continue;light=[.17,.28,.36];}else light=[.34,.50,.39];const x=left+Math.floor(w/2),y=top+Math.min(1,h-1),key=BucketKey(Math.floor(x/BUCKET),Math.floor(y/BUCKET));let b=rawBuckets.get(key);if(!b){b={sx:0,sy:0,n:0,r:0,g:0,b:0};rawBuckets.set(key,b);}b.sx+=x;b.sy+=y;b.n++;b.r=Math.max(b.r,light[0]);b.g=Math.max(b.g,light[1]);b.b=Math.max(b.b,light[2]);lightCount++;}}catch(_){}
  // One representative light per 96x96 tile bucket. The original 70 sources were close
  // enough that Terraria's lighting interpolation merges them visually anyway, while every
  // AddLight call crosses JS -> native. Preserve the strongest RGB contribution and the
  // average source position so the ambience stays in the same place with far fewer calls.
  const buckets=new Map();for(const [key,b] of rawBuckets){const n=Math.max(1,b.n);buckets.set(key,{x:I(b.sx/n),y:I(b.sy/n),light:[b.r,b.g,b.b]});}
  this.Buckets=buckets;this.Version=version;this.Count=count;this.LightCount=lightCount;
  try{tl.log(`[CalamityPort AbyssAmbientLight] 96-tile aggregation armed; sources=${lightCount}, nativeLights=${buckets.size}.`);}catch(_){}
 }
 PostUpdateTime(){try{if(Terraria.WorldGen.isGeneratingOrLoadingWorld===true||Terraria.Main.gameMenu===true)return;}catch(_){}if(!WorldDB.Instance)return;
  // Metadata is immutable during normal gameplay. Poll only every ~10 seconds rather than
  // hitting WorldDB twice on every update.
  this.Tick++;if(this.Version<0||this.Tick>=600){this.Tick=0;this.Refresh();}if(this.Buckets.size<=0){this.Nearby=false;return;}
  if(!this.Nearby){this.IdleProbe=(this.IdleProbe+1)%12;if(this.IdleProbe!==0)return;}else this.IdleProbe=0;
  const p=PlayerTile();if(!p){this.Nearby=false;return;}
  const sw=I(Terraria.Main.screenWidth,1920),sh=I(Terraria.Main.screenHeight,1080);
  const rx=Math.ceil(sw/32)+24,ry=Math.ceil(sh/32)+20;
  const bx0=Math.floor((p.x-rx)/BUCKET),bx1=Math.floor((p.x+rx)/BUCKET),by0=Math.floor((p.y-ry)/BUCKET),by1=Math.floor((p.y+ry)/BUCKET);
  let nearby=false;for(let bx=bx0;bx<=bx1;bx++)for(let by=by0;by<=by1;by++){const o=this.Buckets.get(BucketKey(bx,by));if(!o)continue;const dx=o.x-p.x,dy=o.y-p.y;if(Math.abs(dx)>rx||Math.abs(dy)>ry)continue;nearby=true;try{Terraria.Lighting.AddLight(o.x,o.y,o.light[0],o.light[1],o.light[2]);}catch(_){} }this.Nearby=nearby;
 }
}
