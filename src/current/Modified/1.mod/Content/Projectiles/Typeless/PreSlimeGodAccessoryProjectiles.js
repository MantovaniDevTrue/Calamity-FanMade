import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2, Color } = Modules;
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];

function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function NativeGet(arr,i,def=0){
    if(!arr)return def;
    try{const v=arr.get_Item(Math.floor(i));return v===undefined||v===null?def:v;}catch(_){}
    try{const fn=arr['Object GetValue(int index)'];if(typeof fn==='function'){const v=fn(Math.floor(i));return v===undefined||v===null?def:v;}}catch(_){}
    return def;
}
function NativeSet(arr,i,v){
    if(!arr)return false;
    try{arr.set_Item(Math.floor(i),v);return true;}catch(_){}
    try{const fn=arr['void SetValue(Object value, int index)'];if(typeof fn==='function'){fn(v,Math.floor(i));return true;}}catch(_){}
    return false;
}
function AIGet(p,i,def=0){
    try{return N(NativeGet(p.ai,i,def),def);}catch(_){}
    try{if(i===0)return N(p.ai.val0,def);if(i===1)return N(p.ai.val1,def);if(i===2)return N(p.ai.val2,def);}catch(_){}
    return def;
}
function PlayerAt(i){try{return Terraria.Main.player.get_Item(Math.floor(N(i,-1)));}catch(_){}return null;}
function NPCAt(i){try{return Terraria.Main.npc.get_Item(Math.floor(N(i,-1)));}catch(_){}return null;}
function DustAt(i){try{return Terraria.Main.dust.get_Item(Math.floor(N(i,-1)));}catch(_){}return null;}
function ProjRect(p){
    if(!p)return null;
    try{const fn=p['Rectangle getRect()'];if(typeof fn==='function'){const r=fn();if(r)return r;}}catch(_){}
    return null;
}
function ProjCenter(p){
    const r=ProjRect(p);if(!r)return Vector2.Zero;
    return Vector2.new(N(r.X)+N(r.Width)*.5,N(r.Y)+N(r.Height)*.5);
}
function ProjTopLeft(p){
    const r=ProjRect(p);if(!r)return Vector2.Zero;
    return Vector2.new(N(r.X),N(r.Y));
}
function Center(e){
    // getRect() is exposed directly by Player/NPC/Projectile in this mobile build.
    // Do not probe a type-specific field first (for example statLife): a missing-member
    // lookup on a Projectile makes TLPro dump Projectile -> Entity -> Object to visible_log.
    try{const fn=e&&e['Rectangle getRect()'];if(typeof fn==='function'){const r=fn();if(r)return Vector2.new(N(r.X)+N(r.Width)*.5,N(r.Y)+N(r.Height)*.5);}}catch(_){}
    // Never fall back to Entity.position/Center here for the same reason.
    return Vector2.Zero;
}
function NearestNPC(from,range=500){let best=null,bestD=range*range;for(let i=0;i<200;i++){const n=NPCAt(i);if(!n||n.active===false||n.friendly===true||n.townNPC===true||n.dontTakeDamage===true||N(n.life)<=0)continue;const c=Center(n),dx=N(c.X)-N(from.X),dy=N(c.Y)-N(from.Y),d=dx*dx+dy*dy;if(d<bestD){bestD=d;best=n;}}return best;}
function Normalize(x,y,speed){const l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*speed,y/l*speed);}
function Source(){try{return null;}catch(_){return null;}}
function AddLight(c,r,g,b){try{Terraria.Lighting.AddLight(c,r,g,b);}catch(_){} }
function Dust(pos,type,sx=0,sy=0,scale=1){try{const idx=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'](pos,4,4,type,sx,sy,100,Color.White,scale);if(idx>=0){const d=DustAt(idx);if(d)d.noGravity=true;}}catch(_){} }
function State(){return ModPlayer.getByName('PreSlimeGodAccessoryPlayer');}
function SetProjFrames(type,count){try{let a=Terraria.Main.projFrames,need=Math.floor(N(type))+1,len=Math.floor(N(a?.Length,N(a?.length)));if(len<need){a=a.cloneResized(need);Terraria.Main.projFrames=a;}return NativeSet(a,type,count);}catch(_){return false;}}
function auraScale(p,age){
    const enter=Math.min(1,Math.max(0,N(age)/10));
    const leave=Math.min(1,Math.max(0,N(p.timeLeft)/10));
    const fade=Math.min(enter,leave);
    const pulse=1+Math.sin(N(age)*.035)*.018;
    return (330/156)*pulse*fade;
}

export class MarniteRepulsionHitbox extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/InvisibleProj';}
    SetDefaults(){const p=this.Projectile;p.width=40;p.height=80;p.friendly=true;p.penetrate=-1;p.timeLeft=10;p.tileCollide=false;p.armorPenetration=20;p.netImportant=true;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;}
    AI(p){const owner=PlayerAt(p.owner),state=State();if(!owner||owner.active===false||owner.dead===true||!state||!state.Has(owner,'MarniteRepulsionShield')){p.active=false;return;}const c=Center(owner),dir=N(owner.direction,1)||1,target=Vector2.new(N(c.X)-dir*20,N(c.Y)),pc=ProjCenter(p);p.velocity=Vector2.new(N(target.X)-N(pc.X),N(target.Y)-N(pc.Y));p.timeLeft=10;if(Math.random()<1/12){const a=(Math.random()-.5)*Math.PI*.9+Math.PI*(dir>0?1:0),v=Vector2.new(Math.cos(a)*2,Math.sin(a)*2);Dust(target,Terraria.ID.DustID.Vortex,N(v.X),N(v.Y),.8);}}
    CanCutTiles(){return false;}
}

export class IlmerisElectricSpark extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/InvisibleProj';}
    SetDefaults(){const p=this.Projectile;p.width=6;p.height=12;p.friendly=true;p.penetrate=3;p.timeLeft=120;p.tileCollide=true;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=15;}
    AI(p){
        // Ilmeris' Spark is a very hot path: eight sparks can exist at once. Do not read
        // Projectile.position or Projectile.Center here; those are inherited from Entity
        // and TLPro Android responds by printing the entire Projectile -> Entity -> Object
        // member tree to visible_log on repeated resolution. Use Projectile.getRect(),
        // which is declared directly by Projectile and does not trigger reflection spam.
        const age=Math.max(0,120-N(p.timeLeft,120));
        let vx=N(p.velocity.X),vy=N(p.velocity.Y);
        if(age>5)vy=Math.min(16,vy+.2);
        p.velocity=Vector2.new(vx,vy);
        if(Math.random()<.5){const r=ProjRect(p);if(r)Dust(Vector2.new(N(r.X)-2,N(r.Y)+2),229,0,-2,.8+Math.random()*.5);}
    }
    OnTileCollide(){return false;}
}

export class JewelSpike extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Typeless/JewelSpike';}
    SetStaticDefaults(){SetProjFrames(this.Type,5);}
    SetDefaults(){const p=this.Projectile;p.width=36;p.height=44;p.friendly=true;p.penetrate=3;p.tileCollide=false;p.timeLeft=80;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;}
    AI(p){p.velocity=Vector2.Zero;p.frameCounter=N(p.frameCounter)+1;if(N(p.frameCounter)>4&&N(p.frame)>0){p.frame=N(p.frame)-1;p.frameCounter=0;}if(Math.random()<.2&&N(p.frame)<3)Dust(ProjTopLeft(p),Terraria.ID.DustID.GemTopaz,0,-.3,1);}
    OnKill(p){const dmg=Math.max(1,Math.floor(N(p.damage,1)/3));for(let k=0;k<2;k++){const a=Math.random()*Math.PI*2,s=4+Math.random()*4;try{NewProjectile(Source(),Center(p),Vector2.new(Math.cos(a)*s,Math.sin(a)*s),Terraria.ID.ProjectileID.CrystalShard,dmg,0,N(p.owner),0,0,0,null);}catch(_){} }}
}

export class EnergyOrb extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Magic/BlueBubble';}
    SetStaticDefaults(){try{Terraria.ID.ProjectileID.Sets.CultistIsResistantTo[this.Type]=true;}catch(_){}}
    SetDefaults(){const p=this.Projectile;p.width=14;p.height=14;p.alpha=100;p.friendly=true;p.penetrate=1;p.tileCollide=false;p.timeLeft=200;}
    OnSpawn(p){FusionEntityData.GetProjectileBag(p,'jellyEnergyOrb',()=>({age:0,target:-1}));}
    AI(p){const st=FusionEntityData.GetProjectileBag(p,'jellyEnergyOrb',()=>({age:0,target:-1}));st.age=N(st.age)+1;const c=Center(p);let target=st.target>=0?NPCAt(st.target):null;if(!target||target.active===false||target.friendly===true||N(target.life)<=0){target=null;st.target=-1;}if(!target&&st.age%10===0){target=NearestNPC(c,400);if(target)st.target=Math.floor(N(target.whoAmI,-1));}if(target){const tc=Center(target),vx=N(p.velocity.X)*20,vy=N(p.velocity.Y)*20,d=Normalize(N(tc.X)-N(c.X),N(tc.Y)-N(c.Y),10);p.velocity=Vector2.new((vx+N(d.X))/21,(vy+N(d.Y))/21);}if(st.age>4&&Math.random()<.35)Dust(ProjTopLeft(p),Terraria.ID.DustID.BlueFlare,0,0,.8);AddLight(c,.1,.25,.65);}
    OnHitNPC(p,npc){const b=N(ModBuff.getTypeByName('StaticDischarge'));if(b>0)try{npc.AddBuff(b,90,false);}catch(_){} }
}

export class AmuletEnergy extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Magic/BlueBubble';}
    SetDefaults(){const p=this.Projectile;p.width=20;p.height=20;p.ignoreWater=true;p.timeLeft=240;p.tileCollide=false;p.friendly=true;p.penetrate=1;p.armorPenetration=20;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;}
    OnSpawn(p){FusionEntityData.GetProjectileBag(p,'amuletEnergy',()=>({slot:Math.max(0,Math.floor(AIGet(p,0,0))),mode:Math.floor(AIGet(p,2,0)),time:0,target:-1}));}
    AI(p){
        const owner=PlayerAt(p.owner),state=State();if(!owner||owner.active===false||owner.dead===true){p.active=false;return;}
        const st=FusionEntityData.GetProjectileBag(p,'amuletEnergy',()=>({slot:Math.max(0,Math.floor(AIGet(p,0,0))),mode:Math.floor(AIGet(p,2,0)),time:0,target:-1}));st.time=N(st.time)+1;let mode=Math.floor(N(st.mode)),time=st.time;const c=Center(p),oc=Center(owner);
        if(mode===0){if(!state||!state.Has(owner,'SeaSpiritAmulet')){p.active=false;return;}p.timeLeft=10;const tick=(()=>{try{return N(Terraria.Main.GameUpdateCount,time);}catch(_){return time;}})(),a=tick*.025+N(st.slot)*Math.PI*2/8,goal=Vector2.new(N(oc.X)+Math.cos(a)*48,N(oc.Y)+Math.sin(a)*28),dx=N(goal.X)-N(c.X),dy=N(goal.Y)-N(c.Y);p.velocity=Vector2.new(N(p.velocity.X)*.90+dx*.03,N(p.velocity.Y)*.90+dy*.03);AddLight(c,.05,.35,.45);return;}
        if(mode===5){st.time=0;time=0;if(N(owner.statLife)<N(owner.statLifeMax2)*.5){st.mode=7;mode=7;}else{st.mode=6;mode=6;}const dx=N(c.X)-N(oc.X),dy=N(c.Y)-N(oc.Y);p.velocity=Normalize(dx,dy,5);}
        if(mode===7){const dx=N(oc.X)-N(c.X),dy=N(oc.Y)-N(c.Y),d=Math.sqrt(dx*dx+dy*dy),v=Normalize(dx,dy,8);p.velocity=Vector2.new(N(p.velocity.X)*.88+N(v.X)*.12,N(p.velocity.Y)*.88+N(v.Y)*.12);if(d<28){const heal=(Math.floor(N(st.slot))%2===0)?3:4;playerHeal(owner,heal);p.active=false;}AddLight(c,.05,.35,.45);return;}
        if(mode===6){let target=st.target>=0?NPCAt(st.target):null;if(!target||target.active===false||target.friendly===true||N(target.life)<=0){target=null;st.target=-1;}if(!target&&(time%12===0||st.target<0)){target=NearestNPC(c,1200);if(target)st.target=Math.floor(N(target.whoAmI,-1));}if(target){const tc=Center(target),v=Normalize(N(tc.X)-N(c.X),N(tc.Y)-N(c.Y),18);p.velocity=Vector2.new(N(p.velocity.X)*.90+N(v.X)*.10,N(p.velocity.Y)*.90+N(v.Y)*.10);}else p.velocity=Vector2.new(N(p.velocity.X)*.995,N(p.velocity.Y)-.02);AddLight(c,.35,.25,.05);}
    }
    CanDamage(p){const st=FusionEntityData.GetProjectileBag(p,'amuletEnergy',()=>({slot:Math.max(0,Math.floor(AIGet(p,0,0))),mode:Math.floor(AIGet(p,2,0)),time:0,target:-1}));return Math.floor(N(st.mode))===6;}
    OnHitNPC(p,npc){const b=N(ModBuff.getTypeByName('RiptideDebuff'));if(b>0)try{npc.AddBuff(b,180,false);}catch(_){} }
}

class JellyAuraBase extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/InvisibleProj';}
    SetDefaults(){const p=this.Projectile;p.width=2;p.height=2;p.friendly=false;p.hostile=false;p.penetrate=-1;p.ignoreWater=true;p.tileCollide=false;p.timeLeft=1810;p.alpha=0;p.netImportant=false;p.aiStyle=-1;p.scale=.01;}
    OnSpawn(p){FusionEntityData.GetProjectileBag(p,'jellyAura',()=>({age:0}));p.velocity=Vector2.Zero;p.scale=.01;}
    AuraState(p){return FusionEntityData.GetProjectileBag(p,'jellyAura',()=>({age:0}));}
    UpdateAuraVisual(p,st){
        st.age=N(st.age)+1;
        p.velocity=Vector2.Zero;
        // Do not mutate Center/position after spawn. TLPro can invalidate/cull a modded
        // projectile when both value-type position fields are rewritten from JS. The aura
        // uses a tiny 2x2 hitbox and is spawned already centered, while the 156px texture
        // is enlarged only by Projectile.scale in the native renderer.
        // Mobile/TLPro optimization: one native projectile draw only. No custom SpriteBatch, no per-frame Dust, no dynamic Lighting.
        // The ring PNG already has a transparent background and is pre-tinted, so the compiled native draw fast path can render it cheaply.
        p.scale=Math.max(.01,auraScale(p,st.age));
    }
    CanDamage(){return false;}
}

export class PinkJellyAuraTL extends JellyAuraBase {
    constructor(){super();this.Texture='Projectiles/Typeless/JellyAuraRingPink';}
    AI(p){this.UpdateAuraVisual(p,this.AuraState(p));}
}

export class BlueJellyAuraTL extends JellyAuraBase {
    constructor(){super();this.Texture='Projectiles/Typeless/JellyAuraRingBlue';}
    AI(p){this.UpdateAuraVisual(p,this.AuraState(p));}
}

function playerHeal(player,amount){const before=N(player.statLife),max=N(player.statLifeMax2,before),after=Math.min(max,before+Math.max(0,Math.floor(amount)));player.statLife=after;try{if(after>before)player.HealEffect(after-before,true);}catch(_){} }
