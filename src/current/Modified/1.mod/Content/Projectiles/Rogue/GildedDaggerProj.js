import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { IsStealthStrike, MarkRogueProjectile } from './../../../Core/RogueRuntime.js';
import { ScanFrozenCubeNPCs, FrozenCubeTrackedIndices, FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js';
const { Color, Vector2 }=Modules;
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function center(e){try{return e.Center;}catch(_){try{const r=e['Rectangle getRect()']();return Vector2.new(N(r.X)+N(r.Width)*.5,N(r.Y)+N(r.Height)*.5);}catch(__){return Vector2.Zero;}}}
function valid(n,p){try{return !!n&&n.active&&!n.friendly&&!n.townNPC&&!n.dontTakeDamage&&N(n.life)>0&&n.CanBeChasedBy(p,false);}catch(_){return false;}}
function toward(a,b,s){const dx=N(b.X)-N(a.X),dy=N(b.Y)-N(a.Y),l=Math.sqrt(dx*dx+dy*dy)||1;return Vector2.new(dx/l*s,dy/l*s);}
export class GildedDaggerProj extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Rogue/GildedDaggerProj';}
    SetDefaults(){const p=this.Projectile;p.width=12;p.height=12;p.friendly=true;p.hostile=false;p.penetrate=2;p.timeLeft=600;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=10;p.aiStyle=-1;}
    OnSpawn(p){MarkRogueProjectile(p,'GildedDagger',false);}
    AI(p){
        const st=FusionEntityData.GetProjectileBag(p,'gildedDagger',()=>({hit:false,target:-1,seen:new Set(),age:0}));st.age++;
        if(st.hit)p.rotation=N(p.rotation)+N(p.direction,1)*.4;else{p.spriteDirection=p.direction=N(p.velocity.X)>=0?1:-1;/* A textura é vertical: os dois lados usam o mesmo +90 graus, igual o comportamento original. */p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;}
        if(IsStealthStrike(p)&&st.hit&&N(st.target,-1)>=0){try{const n=FrozenCubeNPC(Math.floor(st.target));if(valid(n,p))p.velocity=toward(center(p),center(n),15);}catch(_){} }
        else if(!IsStealthStrike(p)&&st.age>25){let vy=N(p.velocity.Y)+.5;if(vy>16)vy=16;p.velocity=Vector2.new(N(p.velocity.X),vy);}
        if(Math.random()<1/7){try{NewDust(Vector2.Add(p.position,p.velocity),p.width,p.height,244,N(p.velocity.X)*.5,N(p.velocity.Y)*.5,0,Color.White,1);}catch(_){} }
    }
    OnHitNPC(p,npc){
        const st=FusionEntityData.GetProjectileBag(p,'gildedDagger',()=>({hit:false,target:-1,seen:new Set(),age:0}));try{st.seen.add(Math.floor(N(npc.whoAmI,-1)));}catch(_){}
        let best=null,bestD=999;ScanFrozenCubeNPCs(2);const pc=center(p);
        for(const i of FrozenCubeTrackedIndices()){
            const n=FrozenCubeNPC(i);if(!valid(n,p)||n===npc||st.seen.has(Math.floor(N(n.whoAmI,-1))))continue;
            const nc=center(n),dx=N(nc.X)-N(pc.X),dy=N(nc.Y)-N(pc.Y),d=Math.sqrt(dx*dx+dy*dy);if(d<bestD){bestD=d;best=n;}
        }
        if(best&&bestD<999){if(IsStealthStrike(p))p.damage=Math.max(1,Math.floor(N(p.damage)*1.05));st.hit=true;st.target=Math.floor(N(best.whoAmI,-1));p.velocity=toward(pc,center(best),15);}
    }
    OnTileCollide(){return true;}
    OnKill(p){for(let k=0;k<8;k++)try{NewDust(p.position,p.width,p.height,244,0,0,100,Color.White,1);}catch(_){} }
}
