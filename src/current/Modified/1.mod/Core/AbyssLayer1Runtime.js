import { Terraria, Modules } from './../TL/ModImports.js';
import { SulphurousSeaPreviewRuntime } from './SulphurousSeaPreviewRuntime.js';
import { SulphurousSeaTerrainRuntime } from './SulphurousSeaTerrainRuntime.js';
import { WorldDB } from './../TL/WorldDB.js';
import { CalamityNPCState } from './CalamityNPCState.js';

const { TileData, Vector2 } = Modules;
let ReadyCacheTick=-999999, ReadyCacheValue=false;
let HorizontalCacheTick=-999999, HorizontalCacheValue=310, HorizontalCacheMaxX=-1, HorizontalCacheLeft=false;
let PlayerLayerCacheTick=-999999, PlayerLayerCachePlayer=null, PlayerLayerCacheValue=0;
let WaterSpawnCacheTick=-999999, WaterSpawnCacheX=-999999, WaterSpawnCacheY=-999999, WaterSpawnCacheValue=false;
try{tl.log('[CalamityPort AbyssPerf] Phase 13.08.5 spawn hotpath cache armed; player layer=once/tick, water probe=once/spawn coordinate/tick.');}catch(_){}
function GameTick(){try{return I(Terraria.Main.GameUpdateCount,0);}catch(e){return 0;}}
function WorldBusy(){try{return Terraria.WorldGen.isGeneratingOrLoadingWorld===true;}catch(e){return false;}}
function I(v,f=0){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function B(v){if(v===true)return true;if(v===false||v==null)return false;try{const n=Number(v);if(Number.isFinite(n))return n!==0;}catch(e){}return String(v).toLowerCase()==='true';}
function PlayerAt(i){try{return Terraria.Main.player.get_Item(I(i));}catch(e){return null;}}
export function TargetPlayer(npc){try{if(I(Terraria.Main.netMode,0)===0){const p=Terraria.Main.LocalPlayer;if(p&&p.active&&!p.dead){const my=I(Terraria.Main.myPlayer,0);if(I(npc.target,-1)!==my)npc.target=my;return p;}}let i=I(npc.target,-1);if(i<0||i>=255){npc.TargetClosest(true);i=I(npc.target,-1);}let p=PlayerAt(i);if(!p||!p.active||p.dead){npc.TargetClosest(true);p=PlayerAt(npc.target);}return p;}catch(e){return null;}}
export function PlayerCenter(p){try{return{x:N(Terraria.PlayerCenterX(p)),y:N(Terraria.PlayerCenterY(p))};}catch(e){return{x:N(p?.position?.X)+N(p?.width)*.5,y:N(p?.position?.Y)+N(p?.height)*.5};}}
export function NPCCenter(n){return{x:N(n?.position?.X)+N(n?.width)*.5,y:N(n?.position?.Y)+N(n?.height)*.5};}
export function MoveToward(npc,tx,ty,speed,inertia=14){const c=NPCCenter(npc),dx=tx-c.x,dy=ty-c.y,d=Math.sqrt(dx*dx+dy*dy)||1,wX=dx/d*speed,wY=dy/d*speed;const vx=(N(npc.velocity?.X)*inertia+wX)/(inertia+1),vy=(N(npc.velocity?.Y)*inertia+wY)/(inertia+1);try{const s=CalamityNPCState.Get(npc);let v=s.abyssVelocityScratch;if(!v){v=Vector2.new();s.abyssVelocityScratch=v;}v.X=vx;v.Y=vy;npc.velocity=v;}catch(e){npc.velocity=Vector2.new(vx,vy);}npc.direction=vx>=0?1:-1;npc.spriteDirection=npc.direction;return d;}

export function TerrainReady(){const tick=GameTick();if(!WorldBusy()&&tick>=ReadyCacheTick&&tick-ReadyCacheTick<120)return ReadyCacheValue;let sulph=false;try{if(B(SulphurousSeaTerrainRuntime.Generated))sulph=true;}catch(e){}if(!sulph)try{sulph=String(SulphurousSeaTerrainRuntime.GetStatus()).indexOf('generated=true')>=0;}catch(e){}let abyss=false;try{abyss=B(WorldDB.get('calamity:abyss:terrain:generated'));}catch(e){}ReadyCacheTick=tick;ReadyCacheValue=sulph&&abyss;return ReadyCacheValue;}
export function StartY(){let surface=250;try{surface=I(Terraria.Main.worldSurface,250);}catch(e){}const seaY=I(SulphurousSeaPreviewRuntime.BoundsTop,surface-55);return Math.max(surface+30,I((seaY+surface)/2+90));}
function RockY(){try{return N(Terraria.Main.rockLayer,600);}catch(e){return 600;}}
function MaxY(){try{return I(Terraria.Main.maxTilesY,1200);}catch(e){return 1200;}}
export function UnderworldY(){try{return I(Terraria.Main.UnderworldLayer,MaxY()-180);}catch(e){return MaxY()-180;}}
export function EndY(){return Math.max(StartY()+40,I(RockY()-10));}
export function Layer2EndY(){return I(RockY()+MaxY()*0.143);}
export function Layer3EndY(){return I(RockY()+MaxY()*0.268);}
export function AbyssEndY(){return Math.max(Layer3EndY()+1,UnderworldY());}

// Official Calamity base Abyss horizontal gate:
// abyssChasmX = 170 on the left (maxX-170 on the right), then a 140 tile margin.
// This resolves to x < 310 or x > maxX-310.
function HorizontalLimit(){
    const maxX=I(Terraria.Main.maxTilesX,4200),atLeft=SulphurousSeaPreviewRuntime.AtLeft===true,tick=GameTick();
    if(!WorldBusy()&&maxX===HorizontalCacheMaxX&&atLeft===HorizontalCacheLeft&&tick>=HorizontalCacheTick&&tick-HorizontalCacheTick<120)return HorizontalCacheValue;
    let value=310,cx=-1;try{cx=I(WorldDB.get('calamity:abyss:terrain:chasmX'),-1);}catch(e){}
    if(cx>20&&cx<maxX-20){const edge=atLeft?cx:(maxX-cx);value=Math.max(220,Math.min(420,edge+140));}
    HorizontalCacheTick=tick;HorizontalCacheValue=value;HorizontalCacheMaxX=maxX;HorizontalCacheLeft=atLeft;return value;
}
function PlayerTileCoords(player){let x=0,y=0;try{x=I(Terraria.PlayerCenterX(player)/16);y=I(Terraria.PlayerCenterY(player)/16);}catch(e){const c=PlayerCenter(player);x=I(c.x/16);y=I(c.y/16);}return{x,y};}
function HorizontalOK(x,padding=0){const maxX=I(Terraria.Main.maxTilesX,4200),atLeft=SulphurousSeaPreviewRuntime.AtLeft===true,limit=HorizontalLimit()+Math.max(0,I(padding));return atLeft?I(x)<limit:I(x)>maxX-limit;}
function BaseVerticalOK(y,padding=0){padding=Math.max(0,I(padding));return I(y)>=StartY()-padding&&I(y)<=UnderworldY()+padding;}
function LayerVerticalOK(y,layer,padding=0){const p=Math.max(0,I(padding)),yy=N(y);if(layer===1)return yy>=StartY()-p&&yy<=RockY()-10+p;if(layer===2)return yy>RockY()-10-p&&yy<=RockY()+MaxY()*0.143+p;if(layer===3)return yy>RockY()+MaxY()*0.143-p&&yy<=RockY()+MaxY()*0.268+p;if(layer===4)return yy>RockY()+MaxY()*0.268-p&&yy<=UnderworldY()+p;return false;}
export function LayerForY(y){const yy=N(y);if(!BaseVerticalOK(yy,0))return 0;if(yy<=RockY()-10)return 1;if(yy<=RockY()+MaxY()*0.143)return 2;if(yy<=RockY()+MaxY()*0.268)return 3;return yy<=UnderworldY()?4:0;}
export function ContainsAbyssTile(x,y,padding=0){if(!TerrainReady())return false;return HorizontalOK(x,padding)&&BaseVerticalOK(y,padding);}
export function ContainsLayerTile(x,y,layer,padding=0){if(!TerrainReady())return false;return HorizontalOK(x,padding)&&LayerVerticalOK(y,I(layer),padding);}
// Backwards-compatible Layer 1 helpers used by the four pre-Hardmode NPCs.
export function ContainsTile(x,y,padding=0){return ContainsLayerTile(x,y,1,padding);}
function PlayerLiquidOK(player){return !B(player?.lavaWet)&&!B(player?.honeyWet);}
export function GetPlayerLayer(player){
 if(!player||!B(player.active)||B(player.dead)||!PlayerLiquidOK(player))return 0;
 const tick=GameTick();
 // SpawnChance, music, biome suppression and NPC logic can all ask for the same local
 // player's Abyss layer in one update. Resolve the native player coordinates / WorldDB-backed
 // gates only once per game tick rather than crossing JS -> IL2CPP for every caller.
 if(tick===PlayerLayerCacheTick&&player===PlayerLayerCachePlayer)return PlayerLayerCacheValue;
 const q=PlayerTileCoords(player);
 const value=(!HorizontalOK(q.x,0)||!TerrainReady())?0:LayerForY(q.y);
 PlayerLayerCacheTick=tick;PlayerLayerCachePlayer=player;PlayerLayerCacheValue=value;
 return value;
}
export function ContainsLayerPlayer(player,layer){return GetPlayerLayer(player)===I(layer);}
export function ContainsAbyssPlayer(player){return GetPlayerLayer(player)>0;}
export function ContainsPlayer(player){return GetPlayerLayer(player)===1;}

export function WaterAtSpawn(info){
 if(info?.Water===true||B(info?.Player?.wet))return true;
 const x=I(info?.SpawnTileX,-999999),y=I(info?.SpawnTileY,-999999),tick=GameTick();
 if(x===WaterSpawnCacheX&&y===WaterSpawnCacheY&&tick===WaterSpawnCacheTick)return WaterSpawnCacheValue;
 let wet=false;
 try{for(let o=-4;o<=2;o++){const t=Terraria.Main.tile.get_Item(x,y+o);if(t&&N(t.liquid)>=180){wet=true;break;}}}catch(e){}
 WaterSpawnCacheTick=tick;WaterSpawnCacheX=x;WaterSpawnCacheY=y;WaterSpawnCacheValue=wet;
 return wet;
}
export function CountNPC(type){const wanted=I(type,0);if(wanted<=0)return 0;try{return Math.max(0,I(Terraria.NPC.CountNPCS(wanted),0));}catch(e){}let count=0;for(let i=0;i<200;i++){let n=null;try{n=Terraria.Main.npc.get_Item(i);}catch(e){}if(n&&n.active&&I(n.type)===wanted)count++;}return count;}
// Common Abyss NPCs do not have per-type population caps in Calamity. The previous
// mobile port caps prevented external spawn-rate/max-spawn mods from doing their job.
// Unique enemies (currently Oarfish) keep their explicit CountNPC check in their own SpawnChance.
export function CanSpawnLayer(info,layer,type=0,maxCount=0,requireWater=true){if(!info||!info.Player||!info.CommonEnemy||info.PlayerSafe||info.PlayerInTown)return false;if(GetPlayerLayer(info.Player)!==I(layer)||(requireWater&&!WaterAtSpawn(info)))return false;return true;}
export function CanSpawnLayer1(info,type=0,maxCount=0){return CanSpawnLayer(info,1,type,maxCount,true);}
export function ApplyElectrified(target,ticks=120){try{target.AddBuff(70,I(ticks),true);}catch(e){}}
export function ApplyPoisoned(target,ticks=240){try{target.AddBuff(20,I(ticks),true);}catch(e){}}
export function IsWetTile(x,y){try{const t=new TileData(I(x),I(y));return N(t.liquid)>=128;}catch(e){return false;}}

export const AbyssLayer1Runtime={
 ContainsPlayer,ContainsTile,ContainsLayerPlayer,ContainsLayerTile,ContainsAbyssPlayer,ContainsAbyssTile,GetPlayerLayer,LayerForY,StartY,EndY,Layer2EndY,Layer3EndY,AbyssEndY,UnderworldY,TerrainReady,
 GetStatus(player=null){const ready=TerrainReady(),preview=SulphurousSeaPreviewRuntime.IsAvailable(),side=SulphurousSeaPreviewRuntime.AtLeft===true?'left':'right',ranges=`L1=${StartY()}..${EndY()} L2=${EndY()+1}..${Layer2EndY()} L3=${Layer2EndY()+1}..${Layer3EndY()} L4=${Layer3EndY()+1}..${UnderworldY()}`;if(!player)return`ready=${ready} preview=${preview} inside=false layer=0 ${ranges} side=${side} limit=${HorizontalLimit()}`;const q=PlayerTileCoords(player),xOk=HorizontalOK(q.x,0),baseY=BaseVerticalOK(q.y,0),liquidOk=PlayerLiquidOK(player),layer=(ready&&xOk&&baseY&&liquidOk)?LayerForY(q.y):0,inside=layer>0;return`ready=${ready} preview=${preview} inside=${inside} layer=${layer} px=${q.x} py=${q.y} xOk=${xOk} baseY=${baseY} liquidOk=${liquidOk} ${ranges} side=${side} limit=${HorizontalLimit()}`;}
};
