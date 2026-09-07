import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { PostLoadWorkCoordinator } from './../../Core/PostLoadWorkCoordinator.js';
import { PlanetoidLabSchematic } from './../../Data/OfficialSchematics/PlanetoidLabSchematic.js';
import { JungleLabSchematic } from './../../Data/OfficialSchematics/JungleLabSchematic.js';
import { IceLabSchematic } from './../../Data/OfficialSchematics/IceLabSchematic.js';
import { SunkenSeaLabSchematic } from './../../Data/OfficialSchematics/SunkenSeaLabSchematic.js';
import { UnderworldLabSchematic } from './../../Data/OfficialSchematics/UnderworldLabSchematic.js';
import { OnyxLabSchematic } from './../../Data/OfficialSchematics/OnyxLabSchematic.js';
import { PlanetoidLabTileAnchorSet } from './../../Core/PlanetoidLabAnchorIDs.js';
import { JungleLabTileAnchorSet } from './../../Core/JungleLabAnchorIDs.js';
import { IceLabTileAnchorSet } from './../../Core/IceLabAnchorIDs.js';
import { SunkenSeaLabTileAnchorSet } from './../../Core/SunkenSeaLabAnchorIDs.js';
import { UnderworldLabTileAnchorSet } from './../../Core/UnderworldLabAnchorIDs.js';
import { OnyxLabTileAnchorSet } from './../../Core/OnyxLabAnchorIDs.js';
import { DecodeLabCell,ApplyLabProxy,LabProxyIDs } from './../../Core/LabPhysicalProxy.js';
const BUDGET=16,PLANETOID_KEY='calamity:structure:planetoidLab:',JUNGLE_KEY='calamity:structure:jungleLab:',ICE_KEY='calamity:structure:iceLab:',SUNKEN_KEY='calamity:structure:sunkenSeaLab:',UNDERWORLD_KEY='calamity:structure:underworldLab:',ONYX_KEY='calamity:structure:onyxLab:',FIX='calamity:labPhysics:proxyV7:';
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Active(t){try{return !!t&&t['bool active()']()===true;}catch(e){return false;}}
function TileAt(x,y){try{return Terraria.Main.tile.get_Item(I(x),I(y));}catch(e){return null;}}
function Busy(){try{return Terraria.WorldGen.isGeneratingOrLoadingWorld===true;}catch(e){return true;}}
function Log(s){try{tl.log(`[CalamityPort LabPhysics] ${s}`);}catch(e){}}
function ChestCell(s,x,y){for(const c of s.chests){const cx=I(c[0]),cy=I(c[1]);if(x>=cx&&x<cx+2&&y>=cy&&y<cy+2)return true;}return false;}
function Legacy(cur,anchors){return cur===0||cur===LabProxyIDs.EchoBlock||cur===LabProxyIDs.SolidBlock||cur===LabProxyIDs.Platform||anchors.has(cur);}
function Make(name,key,s,anchors){if(!WorldDB.Instance||WorldDB.get(key+'generated')!==true||WorldDB.get(FIX+name)===true)return null;const l=I(WorldDB.get(key+'left'),-1),t=I(WorldDB.get(key+'top'),-1);if(l<0||t<0)return null;return{name,key,s,anchors,l,t,cursor:0,changed:0,solid:0,platform:0,nonsolid:0,skippedEdit:0,checked:0};}
function Step(j,budget){const total=j.s.width*j.s.height;let n=0;while(j.cursor<total&&n<budget){const q=j.cursor++,y=Math.floor(q/j.s.width),x=q-y*j.s.width;n++;j.checked++;if(ChestCell(j.s,x,y))continue;const m=DecodeLabCell(j.s.palette[j.s.rows[y][x]]);if(m.kind<=0||m.kind===7)continue;const t=TileAt(j.l+x,j.t+y);if(!t)continue;const cur=I(t.type,-1);if(!Legacy(cur,j.anchors)){j.skippedEdit++;continue;}if(!ApplyLabProxy(t,m))continue;j.changed++;if(m.kind===1)j.solid++;else if(m.kind===3||m.kind===4)j.platform++;else j.nonsolid++;}return j.cursor>=total;}
export class LabInvisibleAnchorSystem extends ModSystem{
 constructor(){super();this.Armed=false;this.Done=false;this.Delay=600;this.Job=null;this.Check=0;}
 OnWorldLoad(){this.Armed=true;this.Done=false;this.Delay=600;this.Job=null;this.Check=0;}
 OnWorldUnload(){this.Armed=false;this.Done=true;this.Job=null;this.Delay=600;this.Check=0;}
 Find(){return Make('planetoid',PLANETOID_KEY,PlanetoidLabSchematic,PlanetoidLabTileAnchorSet)||Make('jungle',JUNGLE_KEY,JungleLabSchematic,JungleLabTileAnchorSet)||Make('ice',ICE_KEY,IceLabSchematic,IceLabTileAnchorSet)||Make('sunken',SUNKEN_KEY,SunkenSeaLabSchematic,SunkenSeaLabTileAnchorSet)||Make('underworld',UNDERWORLD_KEY,UnderworldLabSchematic,UnderworldLabTileAnchorSet)||Make('onyx',ONYX_KEY,OnyxLabSchematic,OnyxLabTileAnchorSet);}
 Update(){if(this.Done||!this.Armed||Busy()||Terraria.Main.gameMenu===true||!WorldDB.Instance)return;if(this.Delay-->0)return;if(!this.Job){if(this.Check-->0)return;this.Check=180;this.Job=this.Find();if(!this.Job){this.Done=true;return;}Log(`${this.Job.name} physical-proxy v6 repair queued (remove Echo collision hosts + preserve walkways).`);}const owner='LabPhysics:'+this.Job.name;if(!PostLoadWorkCoordinator.TryEnter(owner))return;if(!Step(this.Job,BUDGET))return;const j=this.Job;WorldDB.set(FIX+j.name,true);try{WorldDB.Instance.Save();}catch(e){}Log(`${j.name} proxy v6 repair complete: changed=${j.changed}, solid=${j.solid}, platform=${j.platform}, nonSolid=${j.nonsolid}, playerEditsSkipped=${j.skippedEdit}, checked=${j.checked}.`);PostLoadWorkCoordinator.Release(owner);this.Job=null;this.Check=120;}
}
