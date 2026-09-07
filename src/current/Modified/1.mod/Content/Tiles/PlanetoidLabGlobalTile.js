import { GlobalTile } from './../../TL/GlobalTile.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { PlanetoidLabSchematic } from './../../Data/OfficialSchematics/PlanetoidLabSchematic.js';
const KEY='calamity:structure:planetoidLab:';
function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function KindAt(i,j){if(!WorldDB.Instance||WorldDB.get(KEY+'generated')!==true)return 0;const l=I(WorldDB.get(KEY+'left')),t=I(WorldDB.get(KEY+'top'));const x=I(i)-l,y=I(j)-t;if(x<0||y<0||x>=PlanetoidLabSchematic.width||y>=PlanetoidLabSchematic.height)return 0;const e=PlanetoidLabSchematic.palette[PlanetoidLabSchematic.rows[y][x]];return I(e?.[9],0);}
export class PlanetoidLabGlobalTile extends GlobalTile{
 CanKillTile(i,j,type,blockDamaged){const k=KindAt(i,j);return (k===1||k===3||k===4)?false:true;}
 CanDropItems(i,j,tile){return KindAt(i,j)>0?false:true;}
}
