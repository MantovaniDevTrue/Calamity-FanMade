import { Terraria } from './../TL/ModImports.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { RoxcaliburShrineVariant1Schematic } from './../Data/OfficialSchematics/RoxcaliburShrineVariant1Schematic.js';
import { RoxcaliburShrineVariant2Schematic } from './../Data/OfficialSchematics/RoxcaliburShrineVariant2Schematic.js';
import { OfficialStructureMap } from './OfficialStructureMap.js';
import { OfficialSchematicRuntime } from './OfficialSchematicRuntime.js';
import { BiomeAnchorTiles } from './BiomeAnchorIDs.js';
import { OrganicBiomePlanner } from './OrganicBiomePlanner.js';
const DUNGEON=new Set([41,43,44]),TEMPLE_TILE=226,TEMPLE_WALL=87,FORBIDDEN=new Set([30,59]);
const SUNKEN=new Set([Number(BiomeAnchorTiles.SunkenEutrophic),385]);
const CACHE=new Map();
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function Active(t){try{return !!t&&t['bool active()']()===true;}catch(e){return !!t;}}
function InWorld(x,y){return x>=2&&y>=2&&x<N(Terraria.Main.maxTilesX)-2&&y<N(Terraria.Main.maxTilesY)-2;}
function Tile(x,y){if(!InWorld(x,y))return null;try{return Terraria.Main.tile.get_Item(x,y);}catch(e){return null;}}
function InSunken(p,x,y){if(!p)return false;const lx=x-N(p.left),ly=y-N(p.top),w=N(p.width),h=N(p.height);return lx>=0&&ly>=0&&lx<w&&ly<h&&OrganicBiomePlanner.SunkenPlanCode(lx,ly,w,h)>0;}
function Avoid(t,p,x,y,liquids){if(!t||InSunken(p,x,y))return true;const ty=N(t.type),wa=N(t.wall),liq=N(t.liquid);return (liquids&&liq>0)||DUNGEON.has(ty)||ty===TEMPLE_TILE||wa===TEMPLE_WALL||SUNKEN.has(ty);}
function NameOf(s,e){const t=N(e[0]);if(t<s.sourceTileCount)return '';const i=t-s.sourceTileCount;return i>=0&&i<s.modTileNames.length?String(s.modTileNames[i]):'';}
function Resolve(source){const key=source.name;if(CACHE.has(key))return CACHE.get(key);const palette=source.palette.map(e=>{const a=e.slice(0,9),tn=NameOf(source,e);if(tn){if(tn==='_'){a[0]=0;a[7]=1;}else if(tn==='CalamityMod/BrimstoneSlab')a[0]=1;else if(tn==='CalamityMod/RoxTile')a[0]=617;else{a[0]=0;a[7]=1;}}const w=N(e[1]);if(w>=source.sourceWallCount){const wi=w-source.sourceWallCount,n=wi>=0&&wi<source.modWallNames.length?String(source.modWallNames[wi]):'';if(n==='_'){a[1]=0;a[8]=1;}else{a[1]=0;a[8]=1;}}return a;});const r={...source,palette};CACHE.set(key,r);return r;}
function CustomCells(source){const out=[];for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){const e=source.palette[source.rows[y][x]],n=NameOf(source,e);if(n==='CalamityMod/BrimstoneSlab')out.push([x,y,'slab',N(e[4]),N(e[5])]);else if(n==='CalamityMod/RoxTile')out.push([x,y,'rox',N(e[4]),N(e[5])]);}return out;}
function Source(variant){return variant===2?RoxcaliburShrineVariant2Schematic:RoxcaliburShrineVariant1Schematic;}
function Candidates(ctx,count=900){const maxX=N(ctx.maxX,4200),maxY=N(ctx.maxY,1200),x0=Math.max(10,Math.floor(maxX*.15)),x1=Math.max(x0+1,Math.floor(maxX*.85)),y0=Math.max(30,Math.floor(maxY*.75));let uw=Math.floor(Number(Terraria.Main.UnderworldLayer)||maxY-200);const y1=Math.max(y0+1,Math.min(maxY-60,uw-50)),out=[],seen=new Set();for(let i=0;i<count*2&&out.length<count;i++){const x=WorldGenRand.NextInt(x0,x1),y=WorldGenRand.NextInt(y0,y1),k=x+':'+y;if(seen.has(k))continue;seen.add(k);out.push({x,y});}return out;}
function Remix(){try{return Terraria.Main.remixWorld===true;}catch(e){return false;}}
function BeginCandidate(s){const c=s.candidates[s.index];if(!c)return false;const rect={left:c.x,top:c.y,right:c.x+s.source.width,bottom:c.y+s.source.height};if(!OfficialStructureMap.CanPlace(rect,0)){s.index++;return true;}s.x=0;s.y=0;s.sub=0;s.reject=false;s.current=c;return true;}
function Place(s){const src=s.source,resolved=Resolve(src),c=s.current;const result=OfficialSchematicRuntime.Place(resolved,{x:c.x,y:c.y},'topLeft',null,4);if(!result.generated)return null;return {...result,anchorX:c.x,anchorY:c.y,variant:s.variant,customCells:CustomCells(src),source:'official-csch-delayed'};}
export const RoxShrineRuntime={
 Begin(ctx,sunken){const variant=WorldGenRand.NextInt(0,2)+1,source=Source(variant);return {ctx,sunken,variant,source,candidates:Candidates(ctx),index:0,current:null,x:0,y:0,sub:0,reject:false,reads:0,inspected:0,done:false};},
 Step(s,budget=768){budget=Math.max(1,N(budget,768));while(budget>0&&!s.done){if(s.index>=s.candidates.length){s.done=true;return {done:true,generated:false,reason:'no-valid-rox-location',inspected:s.inspected,candidates:s.candidates.length,reads:s.reads};}if(!s.current){BeginCandidate(s);if(!s.current)continue;if(Remix()){const r=Place(s);if(r)return {done:true,generated:true,result:r};s.current=null;s.index++;continue;}}
   const c=s.current,wx=c.x+s.x,wy=c.y+s.y;if(s.sub===0){const t=Tile(wx,wy);budget--;s.reads++;if(!t||FORBIDDEN.has(N(t.type))||Avoid(t,s.sunken,wx,wy,false)){s.reject=true;}s.sub=1;}else{const ay=wy-20,t=Tile(wx,ay);budget--;s.reads++;if(!t||Avoid(t,s.sunken,wx,ay,true))s.reject=true;s.sub=0;s.y++;if(s.y>=s.source.height+10){s.y=0;s.x++;}if(s.reject||s.x>=s.source.width){s.inspected++;if(!s.reject){const r=Place(s);if(r)return {done:true,generated:true,result:r};}s.current=null;s.index++;s.x=0;s.y=0;s.sub=0;s.reject=false;}}}
   return {done:false,generated:false,inspected:s.inspected,candidates:s.candidates.length,reads:s.reads};}
};
