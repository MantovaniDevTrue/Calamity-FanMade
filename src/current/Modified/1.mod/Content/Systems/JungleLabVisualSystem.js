import { Terraria } from './../../TL/ModImports.js';
import { ModSystem } from './../../TL/ModSystem.js';
import { ModTexture } from './../../TL/ModTexture.js';
import { WorldDB } from './../../TL/WorldDB.js';
import { JungleLabTileAnchors,JungleLabWallAnchors } from './../../Core/JungleLabAnchorIDs.js';
const KEY='calamity:structure:jungleLab:',CHECK=10,CHEST=21;
const T=[
 ['LaboratoryPlating','Textures/Tiles/DraedonStructures/LaboratoryPlating'],
 ['LaboratoryPipePlating','Textures/Tiles/DraedonStructures/LaboratoryPipePlating'],
 ['EutrophicGlass','Textures/Tiles/DraedonStructures/EutrophicGlass'],
 ['HazardChevronPanels','Textures/Tiles/DraedonStructures/HazardChevronPanels'],
 ['LaboratoryPanels','Textures/Tiles/DraedonStructures/LaboratoryPanels'],
 ['PlaguedPlate','Textures/Tiles/DraedonStructures/PlaguedPlate'],
 ['PlagueContainmentCells','Textures/Tiles/DraedonStructures/PlagueContainmentCells']
];
const W=[
 ['LaboratoryPanelWall','Textures/Walls/DraedonStructures/LaboratoryPanelWall'],
 ['PlaguedPlateWall','Textures/Walls/DraedonStructures/PlaguedPlateWall'],
 ['LaboratoryPlateBeam','Textures/Walls/DraedonStructures/LaboratoryPlateBeam'],
 ['LaboratoryPlatePillar','Textures/Walls/DraedonStructures/LaboratoryPlatePillar'],
 ['LaboratoryPlatingWall','Textures/Walls/DraedonStructures/LaboratoryPlatingWall'],
 ['HazardChevronWall','Textures/Walls/DraedonStructures/HazardChevronWall'],
 ['PlagueContainmentCellsWall','Textures/Walls/DraedonStructures/PlagueContainmentCellsWall']
];
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}function Tick(){try{return I(Terraria.Main.GameUpdateCount,0);}catch(e){return 0;}}function Local(){try{const i=I(Terraria.Main.myPlayer,-1);return i>=0&&i<255?Terraria.Main.player.get_Item(i):null;}catch(e){return null;}}
function AssetGet(a,i){try{return a&&typeof a.get_Item==='function'?a.get_Item(I(i,-1)):null;}catch(e){return null;}}
function AssetSet(a,i,v){try{if(!a||typeof a.set_Item!=='function'||!v)return false;a.set_Item(I(i,-1),v);return true;}catch(e){return false;}}
export class JungleLabVisualSystem extends ModSystem{constructor(){super();this.Ready=false;this.Failed=false;this.Applied=false;this.Last=-9999;this.Tiles=[];this.Walls=[];this.Chest=null;this.OldT=[];this.OldW=[];this.OldC=null;}Ensure(){if(this.Ready)return true;if(this.Failed)return false;try{this.Tiles=T.map(([k,p])=>{const a=new ModTexture(p);if(!a?.exists)throw new Error(`missing ${p}`);return{id:I(JungleLabTileAnchors[k],-1),asset:a.asset.asset};});this.Walls=W.map(([k,p])=>{const a=new ModTexture(p);if(!a?.exists)throw new Error(`missing ${p}`);return{id:I(JungleLabWallAnchors[k],-1),asset:a.asset.asset};});const c=new ModTexture('Textures/Tiles/DraedonStructures/SecurityChestTile');if(!c?.exists)throw new Error('missing SecurityChestTile');this.Chest=c.asset.asset;this.Ready=true;return true;}catch(e){try{tl.log(`[CalamityPort JungleLabVisual] asset setup failed: ${e}`);}catch(_){}this.Failed=true;return false;}}PostSetupContent(){this.Ensure();}OnWorldLoad(){this.Restore();this.Last=-9999;this.Ensure();}Inside(){if(!WorldDB.Instance||WorldDB.get(KEY+'generated')!==true)return false;const p=Local();if(!p||p.dead===true)return false;try{const c=Terraria.PlayerCenter(p),x=Math.floor(Number(c.X)/16),y=Math.floor(Number(c.Y)/16),l=I(WorldDB.get(KEY+'left'),-1),t=I(WorldDB.get(KEY+'top'),-1),w=I(WorldDB.get(KEY+'width'),0),h=I(WorldDB.get(KEY+'height'),0);return l>=0&&t>=0&&x>=l-50&&x<l+w+50&&y>=t-50&&y<t+h+50;}catch(e){return false;}}Apply(){if(this.Applied||!this.Ensure())return;try{const ta=Terraria.GameContent.TextureAssets.Tile,wa=Terraria.GameContent.TextureAssets.Wall;this.OldT=this.Tiles.map(e=>({id:e.id,asset:AssetGet(ta,e.id)}));for(const e of this.Tiles)if(!AssetSet(ta,e.id,e.asset))throw new Error(`tile texture set failed id=${e.id}`);this.OldW=this.Walls.map(e=>({id:e.id,asset:AssetGet(wa,e.id)}));for(const e of this.Walls)if(!AssetSet(wa,e.id,e.asset))throw new Error(`wall texture set failed id=${e.id}`);this.OldC=AssetGet(ta,CHEST);if(!AssetSet(ta,CHEST,this.Chest))throw new Error('security chest texture set failed');this.Applied=true;}catch(e){try{tl.log(`[CalamityPort JungleLabVisual] native texture swap failed: ${e}`);}catch(_){}this.Restore();}}Restore(){if(!this.Applied&&this.OldT.length===0&&this.OldW.length===0&&!this.OldC)return;try{const ta=Terraria.GameContent.TextureAssets.Tile,wa=Terraria.GameContent.TextureAssets.Wall;for(const e of this.OldT)if(e?.asset)AssetSet(ta,e.id,e.asset);for(const e of this.OldW)if(e?.asset)AssetSet(wa,e.id,e.asset);if(this.OldC)AssetSet(ta,CHEST,this.OldC);}catch(e){}this.OldT=[];this.OldW=[];this.OldC=null;this.Applied=false;}Update(){const n=Tick();if(n-this.Last<CHECK)return;this.Last=n;const a=this.Inside();if(a&&!this.Applied)this.Apply();else if(!a&&this.Applied)this.Restore();}OnWorldUnload(){this.Restore();this.Last=-9999;}}
