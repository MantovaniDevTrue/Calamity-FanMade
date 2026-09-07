import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModPlayer } from './../../TL/ModPlayer.js';
import { ModItem } from './../../TL/ModItem.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { OwnerIndex, SetSecondaryDown, Cooldown, SetCooldown, SetAugerBuffed, RequestDroneBarrage, DroneCount, ShortHookActive } from './../../Core/DraedonTier1Runtime.js';
const { Vector2 }=Modules;
let _augerItem=0,_shortItem=0,_droneItem=0,_augerPull=0,_shortHook=0;
function TypeCached(kind){
 if(kind==='augerItem')return _augerItem||(_augerItem=Math.floor(N(ModItem.getTypeByName('Auger'))));
 if(kind==='shortItem')return _shortItem||(_shortItem=Math.floor(N(ModItem.getTypeByName('ShortCircuit'))));
 if(kind==='droneItem')return _droneItem||(_droneItem=Math.floor(N(ModItem.getTypeByName('AqueousHunterDrone'))));
 if(kind==='augerPull')return _augerPull||(_augerPull=Math.floor(N(ModProjectile.getTypeByName('AugerPull'))));
 if(kind==='shortHook')return _shortHook||(_shortHook=Math.floor(N(ModProjectile.getTypeByName('ShortCircuitHook'))));
 return 0;
}
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function RawRight(player){try{return Math.floor(N(player.altFunctionUse))===2;}catch(_){return false;}}
function Local(player){try{return OwnerIndex(player)===Math.floor(N(Terraria.Main.myPlayer,-2));}catch(_){return false;}}
function Source(player,item){try{return player['IEntitySource GetProjectileSource_Item(Item item)'](item);}catch(_){}try{return null;}catch(_){return null;}}
function Aim(player,speed){const c=Terraria.PlayerCenter(player);let x=N(Terraria.PlayerDirection(player),1),y=0;try{const m=Terraria.Main.MouseWorld,dx=N(m.X)-N(c.X),dy=N(m.Y)-N(c.Y),d=Math.sqrt(dx*dx+dy*dy);if(d>.001){x=dx/d;y=dy/d;}}catch(_){}return Vector2.new(x*speed,y*speed);}
function Mouse(){try{return Terraria.Main.MouseWorld;}catch(_){return null;}}
function SpawnAugerSpecial(player,item){const owner=OwnerIndex(player);if(Cooldown(owner,'auger')>0)return false;const t=TypeCached('augerPull');if(!(t>0))return false;const m=Mouse()||Terraria.PlayerCenter(player);let id=-1;try{id=NewProjectile(Source(player,item),m,Vector2.Zero,t,0,0,owner,0,0,0,null);}catch(_){}if(id>=0&&id<1000){SetAugerBuffed(owner,true);SetCooldown(owner,'auger',800);return true;}return false;}
function SpawnShortHook(player,item){const owner=OwnerIndex(player);if(Cooldown(owner,'short')>0||ShortHookActive(owner,12))return false;const t=TypeCached('shortHook');if(!(t>0))return false;const c=Terraria.PlayerCenter(player),v=Aim(player,18);let id=-1;try{id=NewProjectile(Source(player,item),c,v,t,Math.max(1,Math.floor(N(item.damage,11)*1.2)),0,owner,0,0,0,null);}catch(_){}return id>=0&&id<1000;}
export class DraedonTier1InputPlayer extends ModPlayer{
 constructor(){super();this.last=false;}
 PreItemCheck(player){
  if(!Local(player)){this.last=false;return true;}
  const item=player?.HeldItem;const down=RawRight(player);const owner=OwnerIndex(player);SetSecondaryDown(owner,down);
  if(down&&!this.last&&item){
   const type=Math.floor(N(item.type));
   if(type===TypeCached('augerItem'))SpawnAugerSpecial(player,item);
   else if(type===TypeCached('shortItem'))SpawnShortHook(player,item);
   else if(type===TypeCached('droneItem')&&DroneCount(owner,12)>0)RequestDroneBarrage(owner);
  }
  this.last=down;return true;
 }
 PostItemCheck(player){if(!Local(player))return;SetSecondaryDown(OwnerIndex(player),RawRight(player));}
 UpdateDead(player){SetSecondaryDown(OwnerIndex(player),false);this.last=false;}
}
