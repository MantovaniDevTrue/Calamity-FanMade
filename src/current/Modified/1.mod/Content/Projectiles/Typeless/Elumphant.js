import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { AndroidSound } from './../../../Common/Snippets/AndroidSound.js';
import { FrozenCubeSignal, FrozenCubeLeaseTicks } from './../../../Core/FrozenCubeSignalRuntime.js';
import { FrozenCubeNPC, FrozenCubeTrackedIndices, FrozenCubeTargetDiagnostics, ScanFrozenCubeNPCs } from './../../../Core/FrozenCubeTargetRuntime.js';
import { QueueElumphantMistMotion } from './../../../Core/ElumphantMistMotionRuntime.js';
const { Vector2 }=Modules;
const TARGET_SCAN_INTERVAL=15,LEASE_REFRESH_INTERVAL=30,SAFETY_SCAN_INTERVAL=120;
let CachedFrozenCubePlayer=null,CachedCalamityPlayerState=null,CachedWindType=0,CachedMistType=0,LOSMode=0,ChaseMode=0;
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function NI(n){return Math.floor(Number(n&&n.whoAmI));}
function Active(o){try{return !!(o&&o.active);}catch(e){return false;}}
function Center(o){if(!o)return null;try{const c=o.Center;if(c&&Number.isFinite(Number(c.X))&&Number.isFinite(Number(c.Y)))return c;}catch(e){}try{const r=o['Rectangle getRect()']();if(r)return Vector2.new(Number(r.X)+Number(r.Width)*0.5,Number(r.Y)+Number(r.Height)*0.5);}catch(e){}try{return Vector2.new(Number(o.position.X)+Number(o.width)*0.5,Number(o.position.Y)+Number(o.height)*0.5);}catch(e){return null;}}
function PlayerCenter(p){try{const c=Terraria.PlayerCenter(p);if(c)return c;}catch(e){}return Center(p);}
function CanChase(n,p){if(!n||!Active(n)||n.friendly||n.townNPC||n.dontTakeDamage||Number(n.life)<=0||Number(n.lifeMax)<=5)return false;if(ChaseMode<0)return true;try{const ok=n['bool CanBeChasedBy(object attacker, bool ignoreDontTakeDamage)'](p,false);ChaseMode=1;return !!ok;}catch(e){ChaseMode=-1;return true;}}
function DistSq(a,b){if(!a||!b)return 1e30;const dx=Number(a.X)-Number(b.X),dy=Number(a.Y)-Number(b.Y);return dx*dx+dy*dy;}
function HorizontalDist(a,b){if(!a||!b)return 1e30;return Math.abs(Number(a.X)-Number(b.X));}
function LOS(a,b){if(!a||!b||LOSMode<0)return true;try{const ok=Terraria.Collision['bool CanHit(Vector2 Position1, int Width1, int Height1, Vector2 Position2, int Width2, int Height2)'](a,1,1,b,1,1);LOSMode=1;return !!ok;}catch(e){LOSMode=-1;return true;}}
function CenterSet(p,x,y){p.position=Vector2.new(x-Number(p.width)*0.5,y-Number(p.height)*0.5);}
function Log(s){try{tl.log(`[CalamityPort FrozenCube] ${s}`);}catch(e){}}
function Source(){try{return null;}catch(e){return null;}}
function CubePlayer(){if(!CachedFrozenCubePlayer)CachedFrozenCubePlayer=ModPlayer.getByName('FrozenCubePlayer');return CachedFrozenCubePlayer;}
function PlayerState(){if(!CachedCalamityPlayerState)CachedCalamityPlayerState=ModPlayer.getByName('CalamityPlayerState');return CachedCalamityPlayerState;}
function WindType(){if(!(CachedWindType>0))CachedWindType=Number(ModBuff.getTypeByName('WindChilled')||0);return CachedWindType;}
function MistType(){if(!(CachedMistType>0))CachedMistType=Number(ModProjectile.getTypeByName('ElumphantMist')||0);return CachedMistType;}
export class Elumphant extends ModProjectile{
    constructor(){super();this.Texture='Projectiles/Typeless/Elumphant';this.States=new Map();}
    SetStaticDefaults(){Terraria.Main.projFrames[this.Type]=3;try{Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type]=25;}catch(e){}try{Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type]=2;}catch(e){}}
    SetDefaults(){const p=this.Projectile;p.width=46;p.height=34;p.ignoreWater=true;p.timeLeft=FrozenCubeLeaseTicks();p.tileCollide=false;p.friendly=false;p.hostile=false;p.penetrate=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;p.aiStyle=-1;p.extraUpdates=0;}
    Key(p){return `${Math.floor(Number(p&&p.owner))}:${Math.floor(Number(p&&p.identity))}`;}
    State(p){const k=this.Key(p);let s=this.States.get(k);if(!s){const pc=Center(p)||Vector2.new(0,0);s={phase:'idle',timer:0,shots:0,mistClock:2,target:-1,hit:new Set(),dashTick:0,startX:Number(pc.X),startY:Number(pc.Y),returnX:0,returnY:0,lifeTicks:0,nextTargetScan:0,stableLogged:false,scanLogged:false,registryLogged:false,perfLogged:false,loggedMist:false,loggedDash:false,mistDamage:1,slamDamage:20};this.States.set(k,s);}return s;}
    FindNearest(p,owner,max){const slots=FrozenCubeTrackedIndices(),oc=PlayerCenter(owner);let best=-1,d=max,tracked=0,hostile=0,inRange=0;for(let q=0;q<slots.length;q++){const index=slots[q],n=FrozenCubeNPC(index);if(!n)continue;tracked++;if(!CanChase(n,p))continue;hostile++;const nc=Center(n),nd=HorizontalDist(oc,nc);if(nd>=max)continue;inRange++;if(nd<d&&LOS(oc,nc)){d=nd;best=index;}}return {target:best,tracked,hostile,inRange};}
    HasWind(n,type){if(!n||!(type>0))return false;try{return Number(n['int FindBuffIndex(int type)'](Math.floor(type)))>=0;}catch(e){return false;}}
    FindWind(p,s,type){const slots=FrozenCubeTrackedIndices(),pc=Center(p);let normal=-1,normalD=-1,boss=-1,bossD=-1;for(let q=0;q<slots.length;q++){const index=slots[q];if(s.hit.has(index))continue;const n=FrozenCubeNPC(index);if(!CanChase(n,p)||!this.HasWind(n,type))continue;const d=HorizontalDist(Center(n),pc);if(n.boss){if(d>bossD){bossD=d;boss=index;}}else if(d>normalD){normalD=d;normal=index;}}return normal>=0?normal:boss;}
    Stats(owner){const c=CubePlayer();return c?c.Stats(owner):{power:0,maxDistance:500,attackTime:90,damageScaling:1,cooldown:180,mistPower:1,mistRate:0.35};}
    BestDamage(owner,base){const s=PlayerState();return s&&typeof s.BestClassDamage==='function'?Math.max(1,Math.floor(s.BestClassDamage(owner,base))):base;}
    Play(file,p,vol=0.6,ticks=100){const pc=Center(p);if(pc)AndroidSound.PlayOneShot(`Sounds/Item/${file}.ogg`,vol,Number(pc.X),Number(pc.Y),1200,ticks);}
    BeginDash(p,s,owner,stats,wind){const target=this.FindWind(p,s,wind);if(target<0){s.phase='idle';s.shots=0;s.timer=Math.floor(stats.cooldown/2);s.nextTargetScan=s.lifeTicks+TARGET_SCAN_INTERVAL;s.hit.clear();p.friendly=false;return;}s.phase='dash';s.target=target;s.dashTick=0;s.slamDamage=Math.max(1,Math.floor(this.BestDamage(owner,20)*stats.damageScaling));if(!s.loggedDash){s.loggedDash=true;Log(`headbutt sequence started; owner=${p.owner}, target=${target}.`);}const pc=Center(p);s.startX=Number(pc.X);s.startY=Number(pc.Y);p.frame=2;}
    BeginMist(p,s,owner,stats,target){s.target=target;s.phase='mist';s.timer=0;s.mistClock=2;s.mistDamage=Math.max(1,Math.floor(this.BestDamage(owner,1)*stats.damageScaling));if(!s.loggedMist){s.loggedMist=true;Log(`mist attack started; owner=${p.owner}, target=${s.target}.`);}this.Play('ElumphantSound',p,0.6,120);}
    SpawnMist(p,s,stats,combat){if(Number(Terraria.Main.myPlayer)!==Number(p.owner))return;const n=FrozenCubeNPC(s.target);if(!CanChase(n,p))return;const pc=Center(p),nc=Center(n);if(!pc||!nc)return;const dx=Number(nc.X)-Number(pc.X),dy=Number(nc.Y)-Number(pc.Y),d=Math.sqrt(dx*dx+dy*dy)||1;const speed=d/25*(0.9+Math.random()*0.2),type=MistType();if(type<=0)return;const dmg=combat?s.mistDamage:0,vx=dx/d*speed,vy=dy/d*speed;const index=NewProjectile(Source(),pc,Vector2.new(0,0),type,dmg,0,p.owner,0,Math.floor(Math.random()*3),stats.mistPower,null);if(Number(index)>=0&&Number(index)<1000)QueueElumphantMistMotion(p.owner,vx,vy);}
    AI(p){
        const signal=FrozenCubeSignal(p.owner),owner=signal.player;
        if(!owner||!Active(owner)||owner.dead){p.active=false;this.States.delete(this.Key(p));return;}
        if(!signal.active){p.friendly=false;p.hostile=false;p.Opacity=0;p.alpha=255;p.timeLeft=Math.min(2,Math.max(1,Math.floor(Number(p.timeLeft)||2)));return;}
        const s=this.State(p);s.lifeTicks++;
        if(s.lifeTicks===1||s.lifeTicks%LEASE_REFRESH_INTERVAL===0)p.timeLeft=FrozenCubeLeaseTicks();
        // OnSpawn/OnKill keep a compact target registry. The Native Main.npc scan is
        // only a low-frequency safety net for pre-existing entities, not a per-frame job.
        let diag=FrozenCubeTargetDiagnostics(),registry=null;
        if((diag.tracked===0&&s.lifeTicks%30===1)||s.lifeTicks%SAFETY_SCAN_INTERVAL===0)registry=ScanFrozenCubeNPCs(diag.tracked===0?8:2);
        if(!s.registryLogged&&(diag.tracked>0||(registry&&registry.cycleCompleted))){s.registryLogged=true;diag=FrozenCubeTargetDiagnostics();Log(`compact target registry active; tracked=${diag.tracked}, slots=${diag.compact}, safetyScan=${SAFETY_SCAN_INTERVAL}.`);}
        if(!s.stableLogged&&s.lifeTicks>=60){s.stableLogged=true;Log(`companion stable; owner=${p.owner}, identity=${p.identity}, timeLeft=${p.timeLeft}, signalAgeMs=${signal.ageMs}.`);}
        if(!s.perfLogged&&s.lifeTicks>=90){s.perfLogged=true;Log(`mobile hotpath optimization active; targetLoop=compact, lease=${LEASE_REFRESH_INTERVAL}, mistHeavy=1/3.`);}
        const stats=this.Stats(p.owner),combat=signal.combat,wind=WindType(),oc=PlayerCenter(owner);if(!oc)return;
        const dir=Number(owner.direction)||1,headX=Number(oc.X)+3*dir,headY=Number(oc.Y)-(Number(owner.height)/2+Number(p.height)/2.5);p.spriteDirection=p.direction=dir;
        if(s.phase==='idle'){
            p.frame=0;p.friendly=false;CenterSet(p,headX,headY);s.timer++;
            if(s.timer>stats.cooldown&&s.lifeTicks>=s.nextTargetScan){s.nextTargetScan=s.lifeTicks+TARGET_SCAN_INTERVAL;const scan=this.FindNearest(p,owner,stats.maxDistance);s.target=scan.target;if(s.target>=0)this.BeginMist(p,s,owner,stats,s.target);else if(!s.scanLogged){s.scanLogged=true;Log(`target scan waiting; owner=${p.owner}, tracked=${scan.tracked}, hostile=${scan.hostile}, inRange=${scan.inRange}, maxDistance=${Math.floor(stats.maxDistance)}.`);}}
        }else if(s.phase==='mist'){
            p.frame=1;p.friendly=false;CenterSet(p,headX,headY);const n=FrozenCubeNPC(s.target),nc=Center(n);
            if(!CanChase(n,p)||DistSq(oc,nc)>=stats.maxDistance*stats.maxDistance){s.phase='idle';s.timer=Math.max(0,Math.floor(stats.cooldown)-TARGET_SCAN_INTERVAL);s.nextTargetScan=s.lifeTicks+TARGET_SCAN_INTERVAL;s.target=-1;}
            else{s.timer++;s.mistClock+=stats.mistRate/3;if(s.mistClock>=2){s.mistClock=0;this.SpawnMist(p,s,stats,combat);}if(s.timer>=90){s.shots++;s.timer=0;if(s.shots>=2)this.BeginDash(p,s,owner,stats,wind);else{s.phase='idle';s.nextTargetScan=s.lifeTicks+TARGET_SCAN_INTERVAL;}}}
        }else if(s.phase==='dash'){
            let n=FrozenCubeNPC(s.target);if(!CanChase(n,p)||!this.HasWind(n,wind)){s.target=this.FindWind(p,s,wind);s.dashTick=0;const pc=Center(p);s.startX=Number(pc.X);s.startY=Number(pc.Y);}
            const target=FrozenCubeNPC(s.target);
            if(!CanChase(target,p)){const pc=Center(p);s.returnX=Number(pc.X);s.returnY=Number(pc.Y);s.phase='return';s.dashTick=0;}
            else{const duration=Math.max(12,stats.attackTime),t=Math.max(0,Math.min(1,s.dashTick/duration)),tc=Center(target);const x=s.startX+(Number(tc.X)-s.startX)*t,y=s.startY+(Number(tc.Y)-Number(target.height)/2-s.startY)*t-250*4*t*(1-t);CenterSet(p,x,y);p.frame=2;p.friendly=combat&&t>0.82;p.damage=combat?Math.max(1,Math.floor(s.slamDamage*Math.max(0.25,1-s.hit.size*(0.75/10)))):0;s.dashTick++;if(s.dashTick>duration+12){s.hit.add(s.target);this.BeginDash(p,s,owner,stats,wind);}}
        }else if(s.phase==='return'){
            p.friendly=false;p.frame=2;const duration=Math.max(8,Math.floor(stats.attackTime/2)),t=Math.max(0,Math.min(1,s.dashTick/duration));const x=s.returnX+(headX-s.returnX)*t,y=s.returnY+(headY-s.returnY)*t-100*4*t*(1-t);CenterSet(p,x,y);s.dashTick++;if(t>=1){s.phase='idle';s.timer=Math.floor(stats.cooldown/2);s.nextTargetScan=s.lifeTicks+TARGET_SCAN_INTERVAL;s.shots=0;s.hit.clear();p.frame=0;}
        }
        const fullVisual=signal.visual,attackVisual=s.phase!=='idle',opacity=fullVisual?1:(attackVisual?0.4:0);p.Opacity=opacity;p.alpha=Math.max(0,Math.min(255,Math.floor(255*(1-opacity))));p.rotation=0;
    }
    OnHitNPC(p,npc){const s=this.State(p);if(s.phase!=='dash'||NI(npc)!==s.target)return;s.hit.add(s.target);this.Play('ElumphantBop',p,0.65,90);const stats=this.Stats(p.owner),wind=WindType(),next=this.FindWind(p,s,wind);if(next>=0){s.target=next;const pc=Center(p);s.startX=Number(pc.X);s.startY=Number(pc.Y);s.dashTick=0;}else{const pc=Center(p);s.returnX=Number(pc.X);s.returnY=Number(pc.Y);s.phase='return';s.dashTick=0;p.friendly=false;}}
    OnKill(p){this.States.delete(this.Key(p));}
}
