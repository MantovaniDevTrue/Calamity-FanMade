import { Terraria } from './../TL/ModImports.js';
import { WorldDB } from './../TL/WorldDB.js';
import { ModItem } from './../TL/ModItem.js';
import { ModLocalization } from './../TL/ModLocalization.js';
import { WorldGenRand } from './../TL/Modules/WorldGenRand.js';
import { AbyssTerrainRuntime, AbyssTerrainProxyTiles } from './AbyssTerrainRuntime.js';
import { EnsureChestAt, FillChestByIndex, FindChestIndexAt, GetChestByIndex, IsChestEmpty, ResolveVanillaItemID } from './OfficialSchematicRuntime.js';

const ROOT='calamity:abyss:treasure:';
const VERSION=1;
const CHEST_TILE=21;
const PlaceChest=Terraria.WorldGen['int PlaceChest(int x, int y, ushort type, bool notNearOtherChests, int style)'];
const CreateChest=Terraria.Chest['int CreateChest(int X, int Y, int id)'];
const EXCLUSIVE=['TorrentialTear','IronBoots','DepthCharm','Archerfish','AnechoicPlating','BallOFugu','StrangeOrb','HerringStaff','BlackAnurian','Lionfish'];
const P1=[['ShinePotion',298],['GillsPotion',291],['TeleportationPotion',2351],['LuckPotionLesser',4477]];
const P2=[['ThornsPotion',301],['FlipperPotion',296],['BattlePotion',300],['IronskinPotion',292]];
function N(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function InWorld(x,y){return x>=3&&y>=3&&x<N(Terraria.Main.maxTilesX,4200)-3&&y<N(Terraria.Main.maxTilesY,1200)-3;}
function Tile(x,y){if(!InWorld(x,y))return null;try{return Terraria.Main.tile.get_Item(x,y);}catch(e){return null;}}
function Active(t){try{return !!t&&t['bool active()']()===true;}catch(e){return false;}}
function SetActive(t,v){try{t['void active(bool active)'](v===true);}catch(e){}}
function SetLiquidType(t,v){try{t['void liquidType(int liquidType)'](N(v));}catch(e){}}
function SetSlope(t,v){try{t['void slope(byte slope)'](N(v));}catch(e){}}
function Log(s){try{tl.log(`[CalamityPort AbyssChests] ${s}`);}catch(e){}}
function Tell(s,r=120,g=210,b=235){try{Terraria.Main['void NewText(string newText, byte R, byte G, byte B)'](String(s),r,g,b);}catch(e){}}
function Msg(key,fallback){try{return ModLocalization.Translate('Messages.'+key,true,false)||fallback;}catch(e){return fallback;}}
function ModType(name){return N(ModItem.getTypeByName(name),0);}
function DownedSkeletron(){try{return Terraria.NPC.downedBoss3===true;}catch(e){return false;}}
function SetSupport(x,y){const t=Tile(x,y);if(!t)return false;SetActive(t,true);t.type=N(AbyssTerrainProxyTiles.Gravel,685);t.frameX=-1;t.frameY=-1;t.liquid=0;SetLiquidType(t,0);SetSlope(t,0);return true;}
function Clear(x,y){const t=Tile(x,y);if(!t)return false;SetActive(t,false);t.liquid=0;SetLiquidType(t,0);SetSlope(t,0);return true;}
function SetChestTiles(x,y){for(let row=0;row<2;row++)for(let col=0;col<2;col++){const t=Tile(x+col,y+row);if(!t)continue;SetActive(t,true);t.type=CHEST_TILE;t.frameX=col*18;t.frameY=row*18;t.liquid=0;SetLiquidType(t,0);SetSlope(t,0);}}
function FindPlacement(anchor){
 const ax=N(anchor.x),ay=N(anchor.y);
 // Official AbyssChest uses j-2 above its supporting gravel island. Search only a tiny local
 // band so recovery is stable even if cleanup changed one or two cells.
 for(let dy=-5;dy<=14;dy++){
  const supportY=ay+dy,left=ax-1;
  const a=Tile(left,supportY),b=Tile(left+1,supportY);
  if(!a||!b||!Active(a)||!Active(b))continue;
  return {left,supportY,top:supportY-2};
 }
 return {left:ax-1,supportY:ay+4,top:ay+2};
}
function PlaceAt(anchor){
 const p=FindPlacement(anchor); if(!InWorld(p.left,p.top)||!InWorld(p.left+1,p.supportY))return {index:-1,...p,method:'out-of-world'};
 SetSupport(p.left,p.supportY);SetSupport(p.left+1,p.supportY);
 for(let y=p.top;y<p.supportY;y++){Clear(p.left,y);Clear(p.left+1,y);}
 let index=N(FindChestIndexAt(p.left,p.top),-1),method='existing';
 if(index<0&&typeof PlaceChest==='function'){
  try{index=N(PlaceChest(p.left,p.supportY-1,CHEST_TILE,false,0),-1);if(index>=0)method='WorldGen.PlaceChest';}catch(e){index=-1;}
 }
 if(index<0){SetChestTiles(p.left,p.top);const e=EnsureChestAt(p.left,p.top);index=N(e.chestIndex,-1);method='manual-supported-fallback';}
 const c=index>=0?GetChestByIndex(index):null;
 const x=c?N(c.x,p.left):p.left,y=c?N(c.y,p.top):p.top;
 return {index,x,y,supportY:p.supportY,method};
}
function Shuffle10(){const a=[0,1,2,3,4,5,6,7,8,9];for(let i=a.length-1;i>0;i--){const j=WorldGenRand.NextInt(0,i+1);const q=a[i];a[i]=a[j];a[j]=q;}return a;}
function Potion(pair){return ResolveVanillaItemID(pair[0],pair[1]);}
function Fill(index,exclusiveIndex){
 const main=ModType(EXCLUSIVE[exclusiveIndex]);
 const kelp=ModType('KelpTorch');
 if(!(main>0&&kelp>0))return 0;
 const a=P1[WorldGenRand.NextInt(0,P1.length)],b=P2[WorldGenRand.NextInt(0,P2.length)];
 return FillChestByIndex(index,[
  {type:main,stack:1,prefix:-1},
  {type:Potion(a),stack:WorldGenRand.NextInt(1,3),prefix:-1},
  {type:Potion(b),stack:WorldGenRand.NextInt(1,3),prefix:-1},
  {type:ResolveVanillaItemID('HealingPotion',188),stack:WorldGenRand.NextInt(1,3),prefix:-1},
  {type:ResolveVanillaItemID('ManaPotion',189),stack:WorldGenRand.NextInt(2,5),prefix:-1},
  {type:kelp,stack:WorldGenRand.NextInt(3,12),prefix:-1},
  {type:ResolveVanillaItemID('GoldCoin',73),stack:WorldGenRand.NextInt(2,5),prefix:-1}
 ]);
}
function SaveChest(i,data){const p=ROOT+i+':';WorldDB.set(p+'x',N(data.x));WorldDB.set(p+'y',N(data.y));WorldDB.set(p+'index',N(data.index,-1));WorldDB.set(p+'supportY',N(data.supportY));WorldDB.set(p+'exclusive',N(data.exclusive));WorldDB.set(p+'method',String(data.method||''));WorldDB.set(p+'filled',N(data.filled));}
function ReadChest(i){const p=ROOT+i+':';return {x:N(WorldDB.get(p+'x'),-1),y:N(WorldDB.get(p+'y'),-1),index:N(WorldDB.get(p+'index'),-1),exclusive:N(WorldDB.get(p+'exclusive'),-1)};}
function Close(player){try{player.chest=-1;}catch(e){} try{player.chestX=-1;player.chestY=-1;}catch(e){}}

export const AbyssTreasureChestRuntime={
 Ready:false,Delay:90,LastBlocked:-1,
 Reset(){this.Ready=false;this.Delay=90;this.LastBlocked=-1;},
 Load(){this.Reset();if(!WorldDB.Instance)return;this.Ready=WorldDB.get(ROOT+'generated')===true&&N(WorldDB.get(ROOT+'version'),0)>=VERSION;},
 Generate(){
  if(!WorldDB.Instance||!AbyssTerrainRuntime.Generated)return false;
  const anchors=AbyssTerrainRuntime.GetChestAnchors();if(!anchors.length)return false;
  const order=Shuffle10();let placed=0,filled=0;
  for(let i=0;i<anchors.length;i++){
   const exclusive=order[i>9?i-10:i] ?? order[i%10];
   const r=PlaceAt(anchors[i]);let f=0;
   if(r.index>=0){const chest=GetChestByIndex(r.index);if(chest&&IsChestEmpty(chest))f=Fill(r.index,exclusive);if(f>0)filled++;placed++;}
   SaveChest(i,{...r,exclusive,filled:f});
  }
  WorldDB.set(ROOT+'count',anchors.length);WorldDB.set(ROOT+'version',VERSION);WorldDB.set(ROOT+'generated',placed>0);WorldDB.set(ROOT+'unlocked',DownedSkeletron());
  try{WorldDB.Instance.Save();}catch(e){}
  this.Ready=placed>0;Log(`generated=${this.Ready}; anchors=${anchors.length}; placed=${placed}; filled=${filled}; locked=${!DownedSkeletron()}.`);return this.Ready;
 },
 Repair(){
  // Never recreate a chest after Skeletron: once unlocked, looting/removing it is legitimate progression.
  if(!this.Ready||!WorldDB.Instance||DownedSkeletron())return;
  const count=N(WorldDB.get(ROOT+'count'),0);let repaired=0,fastHits=0,slowLookups=0;
  for(let i=0;i<count;i++){
   const d=ReadChest(i);if(d.x<0||d.y<0)continue;
   let idx=-1,created=false;

   // Phase 13.13.0.6: worldgen already persists the native chest slot. Checking that slot
   // directly is O(1), while Terraria.Chest.FindChest scans the complete chest table and
   // cost ~570 ms for this five-chest repair pass on-device.
   if(d.index>=0){
    const cached=GetChestByIndex(d.index);
    if(cached&&N(cached.x,-2)===d.x&&N(cached.y,-2)===d.y){idx=d.index;fastHits++;}
    else if(!cached&&typeof CreateChest==='function'){
     // Restore the physical 2x2 object before registering the known free native slot.
     SetSupport(d.x,d.y+2);SetSupport(d.x+1,d.y+2);SetChestTiles(d.x,d.y);
     try{idx=N(CreateChest(d.x,d.y,d.index),-1);}catch(e){idx=-1;}
     if(idx>=0){created=true;fastHits++;}
    }
   }

   // Metadata can be stale in legacy/edited worlds. Only those rare cases pay the native
   // coordinate lookup; never overwrite a saved slot that is occupied by another chest.
   if(idx<0){
    slowLookups++;
    idx=N(FindChestIndexAt(d.x,d.y),-1);
   }
   if(idx<0){
    SetSupport(d.x,d.y+2);SetSupport(d.x+1,d.y+2);SetChestTiles(d.x,d.y);
    try{idx=typeof CreateChest==='function'?N(CreateChest(d.x,d.y,-1),-1):-1;}catch(e){idx=-1;}
    if(idx>=0)created=true;
   }
   if(created&&idx>=0){
    const f=Fill(idx,d.exclusive);
    WorldDB.set(ROOT+i+':index',idx);WorldDB.set(ROOT+i+':filled',f);repaired++;
   }else if(idx>=0&&idx!==d.index){
    // Keep repaired/legacy metadata current without forcing a synchronous sidecar write.
    WorldDB.set(ROOT+i+':index',idx);
   }
  }
  if(repaired>0)Log(`repaired=${repaired}; fastSlots=${fastHits}; slowLookups=${slowLookups}; metadataSave=deferred.`);
 },
 HandleLock(){
  if(!this.Ready||!WorldDB.Instance)return;
  const unlocked=DownedSkeletron();if(unlocked){if(WorldDB.get(ROOT+'unlocked')!==true){WorldDB.set(ROOT+'unlocked',true);try{WorldDB.Instance.Save();}catch(e){}Log('Skeletron defeated: all Abyss Treasure Chests unlocked.');}return;}
  const player=Terraria.Main.LocalPlayer;if(!player)return;const open=N(player.chest,-1);if(open<0){this.LastBlocked=-1;return;}
  const c=GetChestByIndex(open);if(!c)return;const x=N(c.x,-1),y=N(c.y,-1),count=N(WorldDB.get(ROOT+'count'),0);let match=false;
  for(let i=0;i<count;i++){const d=ReadChest(i);if(d.x===x&&d.y===y){match=true;break;}}
  if(!match)return;Close(player);if(this.LastBlocked!==open){this.LastBlocked=open;Tell(Msg('AbyssChestSealed','The chest is sealed. Defeat Skeletron to open it.'),220,170,100);Log(`blocked pre-Skeletron open at ${x},${y}; index=${open}.`);}
 },
 Update(){if(!WorldDB.Instance)return;if(!this.Ready){if(this.Delay-->0)return;if(AbyssTerrainRuntime.Generated)this.Generate();else this.Delay=90;return;}this.HandleLock();if(this.Delay-->0)return;this.Delay=180;this.Repair();}
};
