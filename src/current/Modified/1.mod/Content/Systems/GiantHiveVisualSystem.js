import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModTexture } from './../../TL/ModTexture.js';
import { WorldDB } from './../../TL/WorldDB.js';

const WALL_ID=86,CHECK_INTERVAL=10,KEY='calamity:structure:giantHive:';
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function Tick(){try{return I(Terraria.Main.GameUpdateCount,0);}catch(e){return 0;}}
function Local(){try{const i=I(Terraria.Main.myPlayer,-1);return i>=0&&i<255?Terraria.Main.player.get_Item(i):null;}catch(e){return null;}}
export class GiantHiveVisualSystem extends ModSystem{
 constructor(){super();this.Asset=null;this.Old=null;this.Ready=false;this.Failed=false;this.Applied=false;this.Last=-9999;}
 Ensure(){if(this.Ready)return true;if(this.Failed)return false;try{const t=new ModTexture('Textures/Walls/GiantHiveWall');if(!t?.exists){this.Failed=true;return false;}this.Asset=t.asset.asset;this.Ready=true;return true;}catch(e){this.Failed=true;return false;}}
 PostSetupContent(){this.Ensure();}
 OnWorldLoad(){this.Restore();this.Last=-9999;this.Ensure();}
 Inside(){if(!WorldDB.Instance||WorldDB.get(KEY+'generated')!==true)return false;const p=Local();if(!p||p.dead===true)return false;try{const c=Terraria.PlayerCenter(p),x=Math.floor(Number(c.X)/16),y=Math.floor(Number(c.Y)/16),l=I(WorldDB.get(KEY+'left'),-1),t=I(WorldDB.get(KEY+'top'),-1),w=I(WorldDB.get(KEY+'width'),0),h=I(WorldDB.get(KEY+'height'),0);return l>=0&&t>=0&&x>=l-45&&x<l+w+45&&y>=t-45&&y<t+h+45;}catch(e){return false;}}
 Apply(){if(this.Applied||!this.Ensure())return;try{this.Old=Terraria.GameContent.TextureAssets.Wall[WALL_ID];Terraria.GameContent.TextureAssets.Wall[WALL_ID]=this.Asset;this.Applied=true;}catch(e){this.Old=null;this.Applied=false;}}
 Restore(){if(!this.Applied)return;try{if(this.Old)Terraria.GameContent.TextureAssets.Wall[WALL_ID]=this.Old;}catch(e){}this.Old=null;this.Applied=false;}
 Update(){const n=Tick();if(n-this.Last<CHECK_INTERVAL)return;this.Last=n;const a=this.Inside();if(a&&!this.Applied)this.Apply();else if(!a&&this.Applied)this.Restore();}
 OnWorldUnload(){this.Restore();this.Last=-9999;}
}
