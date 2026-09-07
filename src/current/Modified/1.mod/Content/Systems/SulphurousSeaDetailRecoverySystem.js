import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { SulphurousSeaDetailRuntime } from './../../Core/SulphurousSeaDetailRuntime.js';

const KEY='calamity:sulphursea:details:';
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function B(v){if(v===true)return true;if(v===false||v==null)return false;try{return Number(v)!==0;}catch(e){return false;}}
function Log(s){try{tl.log(`[CalamityPort SulphDetailsRepair] ${s}`);}catch(e){}}
function Width(maxX){if(maxX===4200)return 370;if(maxX===6400)return 445;return Math.floor(maxX/16.8);}
function Depth(maxX,yStart){const factor=maxX===4200?.8:(maxX===6400?.85:.925);const rock=Number(Terraria.Main.rockLayer||0);return Math.max(1,Math.floor((rock+112-yStart)*factor));}
function Persist(r){const scraps=Array.isArray(r?.scrapPiles)?r.scrapPiles:[],columns=Array.isArray(r?.columns)?r.columns:[];WorldDB.set(KEY+'generated',true);WorldDB.set(KEY+'version',2);WorldDB.set(KEY+'scrapCount',scraps.length);for(let i=0;i<scraps.length;i++){const p=scraps[i],k=KEY+`scrap:${i}:`;WorldDB.set(k+'left',I(p.left));WorldDB.set(k+'top',I(p.top));WorldDB.set(k+'width',I(p.width));WorldDB.set(k+'height',I(p.height));WorldDB.set(k+'variant',I(p.variant,1));}WorldDB.set(KEY+'columnCount',columns.length);for(let i=0;i<columns.length;i++){const p=columns[i],k=KEY+`column:${i}:`;WorldDB.set(k+'left',I(p.left));WorldDB.set(k+'top',I(p.top));WorldDB.set(k+'bottom',I(p.bottom));WorldDB.set(k+'variant',I(p.variant));}WorldDB.set(KEY+'repairScrapAttempts',I(r?.scrapAttempts));WorldDB.set(KEY+'repairScrapFallback',I(r?.scrapFallbackUsed));WorldDB.set(KEY+'repairColumnAttempts',I(r?.columnAttempts));WorldDB.set(KEY+'repairColumnFallback',I(r?.columnFallbackUsed));try{WorldDB.Instance.Save();}catch(e){}}

export class SulphurousSeaDetailRecoverySystem extends ModSystem{
 constructor(){super();this.Reset();}
 Reset(){this.Delay=180;this.Done=false;}
 OnWorldLoad(){this.Reset();}
 OnWorldUnload(){this.Reset();}
 Update(){if(this.Done||Terraria.Main.gameMenu===true||!WorldDB.Instance)return;if(this.Delay-->0)return;this.Done=true;try{const version=I(WorldDB.get(KEY+'version')),scraps=I(WorldDB.get(KEY+'scrapCount')),columns=I(WorldDB.get(KEY+'columnCount'));if(version>=2)return;if(scraps>0||columns>0){WorldDB.set(KEY+'version',2);try{WorldDB.Instance.Save();}catch(e){}Log(`existing detail metadata preserved; scraps=${scraps}, columns=${columns}.`);return;}if(WorldDB.get('calamity:sulphursea:terrain:generated')!==true)return;const mode=String(WorldDB.get('calamity:sulphursea:preview:mode')||'');if(mode.indexOf('fresh')<0&&mode.indexOf('worldgen')<0)return;const maxX=I(Terraria.Main.maxTilesX),maxY=I(Terraria.Main.maxTilesY);const h=I(WorldDB.get('calamity:sulphursea:preview:height')),cy=I(WorldDB.get('calamity:sulphursea:preview:centerY'));if(maxX<1000||maxY<500||h<=0||cy<=0)return;const top=Math.floor(cy-h*.5),yStart=Math.max(20,top+55),width=Width(maxX),blockDepth=Depth(maxX,yStart),atLeft=B(WorldDB.get('calamity:sulphursea:preview:atLeft'));const r=SulphurousSeaDetailRuntime.Generate({maxX,maxY},{width,yStart,blockDepth,atLeft});Persist(r);Log(`one-time v2 recovery placed scraps=${r.scrapPiles?.length||0}, columns=${r.columns?.length||0}/${r.columnRequested||0}, scrapFallback=${r.scrapFallbackUsed||0}, columnFallback=${r.columnFallbackUsed||0}.`);}catch(e){Log(`recovery failed safely: ${e}`);}}
}
