import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModItem } from './../../../TL/ModItem.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { WorldDB } from './../../../TL/WorldDB.js';
import { SignalFrozenCube, FrozenCubeLeaseTicks } from './../../../Core/FrozenCubeSignalRuntime.js';
const { Vector2 }=Modules;
const MAX_PLAYERS=256,MAX_PROJECTILES=1000,VALIDATE_EVERY=30;
const CompanionSlot=new Array(MAX_PLAYERS).fill(-1);
const SpawnCooldownUntilMs=new Array(MAX_PLAYERS).fill(0);
const ValidationTick=new Array(MAX_PLAYERS).fill(0);
let CachedElumphantType=0,CachedFrozenCubePlayer=null,CachedCalamityPlayerState=null,ProjectileReadMode=0;
let UnlockDBRef=null,UnlockKnown=false;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function Log(s){try{tl.log(`[CalamityPort FrozenCube] ${s}`);}catch(e){}}
function NowMs(){try{return Number(Date.now())||0;}catch(e){return 0;}}
function PI(p){const direct=Math.floor(Number(p&&p.whoAmI));if(direct>=0&&direct<MAX_PLAYERS)return direct;try{const i=Math.floor(Number(Terraria.PlayerIndex(p)));if(i>=0&&i<MAX_PLAYERS)return i;}catch(e){}return -1;}
function Type(){if(CachedElumphantType>0)return CachedElumphantType;CachedElumphantType=Number(ModProjectile.getTypeByName('Elumphant')||0);return CachedElumphantType;}
function CubePlayer(){if(!CachedFrozenCubePlayer)CachedFrozenCubePlayer=ModPlayer.getByName('FrozenCubePlayer');return CachedFrozenCubePlayer;}
function PlayerState(){if(!CachedCalamityPlayerState)CachedCalamityPlayerState=ModPlayer.getByName('CalamityPlayerState');return CachedCalamityPlayerState;}
function ReadIndex(i){try{return Terraria.Main.projectile[i]||null;}catch(e){return null;}}
function ReadItem(i){try{return Terraria.Main.projectile.get_Item(i)||null;}catch(e){return null;}}
function GetProjWithMethod(i){i=Math.floor(Number(i));if(i<0||i>=MAX_PROJECTILES)return {p:null,method:'invalid'};if(ProjectileReadMode===1)return {p:ReadItem(i),method:'get_Item'};if(ProjectileReadMode===2)return {p:ReadIndex(i),method:'index-fallback'};let p=ReadItem(i);if(p){ProjectileReadMode=1;return {p,method:'get_Item'};}p=ReadIndex(i);if(p){ProjectileReadMode=2;return {p,method:'index-fallback'};}return {p:null,method:'unavailable'};}
function NativeActive(p){try{return !!p.active;}catch(e){return false;}}
function ValidProj(p,owner,type){return !!p&&NativeActive(p)&&Number(p.owner)===owner&&Number(p.type)===type;}
function OwnedCount(player,type){const counts=player&&player.ownedProjectileCounts;if(!counts)return -1;try{const n=Number(counts.get_Item(type));if(Number.isFinite(n))return Math.max(0,Math.floor(n));}catch(e){}try{const n=Number(counts.GetValue(type));if(Number.isFinite(n))return Math.max(0,Math.floor(n));}catch(e){}return -1;}
function RefreshLease(p){if(!p)return;try{p.timeLeft=Math.max(Math.floor(Number(p.timeLeft)||0),FrozenCubeLeaseTicks());}catch(e){}}
function Source(){try{return null;}catch(e){return null;}}
function MarkUnlock(){
    try{
        const db=WorldDB.Instance;
        if(!db)return;
        if(db!==UnlockDBRef){UnlockDBRef=db;UnlockKnown=false;}
        if(UnlockKnown)return;
        if(Terraria.Main.netMode===1)return;
        if(WorldDB.get('calamity:unlock:frozenCube')!==true)WorldDB.set('calamity:unlock:frozenCube',true);
        UnlockKnown=true;
    }catch(e){}
}
function CompanionDamage(player){let damage=20;const state=PlayerState();if(state&&typeof state.BestClassDamage==='function')damage=state.BestClassDamage(player,20);return Math.max(1,Math.floor(Number(damage)||20));}
function EnsureCompanion(player,combat,visual){
    const owner=PI(player),type=Type();
    if(owner<0||type<=0||!!player.dead)return false;
    SignalFrozenCube(owner,player,combat,visual);
    const slot=CompanionSlot[owner];
    ValidationTick[owner]=(Math.floor(Number(ValidationTick[owner])||0)+1)%VALIDATE_EVERY;
    // The Elumphant owns its lease. While a known slot is healthy we only
    // cross the NativeObject bridge once every 30 ticks instead of every frame.
    if(slot>=0&&ValidationTick[owner]!==0)return true;
    if(slot>=0){
        const read=GetProjWithMethod(slot);
        if(ValidProj(read.p,owner,type)){RefreshLease(read.p);return true;}
        CompanionSlot[owner]=-1;
    }
    const nativeCount=OwnedCount(player,type);
    if(nativeCount>0)return true;
    const now=NowMs();
    if(now<Number(SpawnCooldownUntilMs[owner]))return false;
    SpawnCooldownUntilMs[owner]=now+500;
    const c=Terraria.PlayerCenter(player);
    const spawnDamage=combat?CompanionDamage(player):0;
    const idx=Number(NewProjectile(Source(),Vector2.new(Number(c.X),Number(c.Y)-28),Vector2.new(0,0),type,spawnDamage,0,owner,0,0,0,null));
    if(idx>=0&&idx<MAX_PROJECTILES){
        CompanionSlot[owner]=idx;
        ValidationTick[owner]=1;
        const spawnedRead=GetProjWithMethod(idx),spawned=spawnedRead.p;
        RefreshLease(spawned);
        Log(`companion spawned; owner=${owner}, slot=${idx}, type=${type}, read=${spawnedRead.method}, active=${spawned?!!spawned.active:false}, nativeType=${spawned?Number(spawned.type):-1}, timeLeft=${spawned?Number(spawned.timeLeft):-1}.`);
        return true;
    }
    SpawnCooldownUntilMs[owner]=now+1500;
    Log(`companion spawn failed; owner=${owner}, type=${type}, result=${idx}.`);
    return false;
}
export class FrozenCube extends ModItem{
    constructor(){super();this.Texture='Items/Accessories/FrozenCube';this.ResearchUnlockCount=1;}
    SetDefaults(){const i=this.Item;i.width=34;i.height=34;i.maxStack=1;i.value=Terraria.Item.buyPrice(0,15,0,0);i.rare=3;i.accessory=true;this.MenuCategories.push('accessory');}
    Mark(){MarkUnlock();}
    UpdateInventory(item,player){this.Mark();}
    UpdateAccessory(item,player,hideVisual){this.Mark();const c=CubePlayer();if(!c)return;c.Enable(player,!hideVisual,false);c.ApplyDefenseCost(player);EnsureCompanion(player,true,!hideVisual);}
    UpdateVanityAccessory(item,player){const c=CubePlayer();if(!c)return;c.Enable(player,true,true);EnsureCompanion(player,false,true);}
}
