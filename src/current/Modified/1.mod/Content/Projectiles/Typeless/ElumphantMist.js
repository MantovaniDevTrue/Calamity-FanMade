import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModPlayer } from './../../../TL/ModPlayer.js';
import { ProjAI } from './../../../TL/ProjAI.js';
import { TakeElumphantMistMotion } from './../../../Core/ElumphantMistMotionRuntime.js';
const { Vector2 }=Modules;
let CachedFrozenCubePlayer=null;
function CubePlayer(){if(!CachedFrozenCubePlayer)CachedFrozenCubePlayer=ModPlayer.getByName('FrozenCubePlayer');return CachedFrozenCubePlayer;}
export class ElumphantMist extends ModProjectile{
    constructor(){super();this.Texture='Projectiles/Typeless/ElumphantMistMobile';this.States=new Map();this.PerfLogged=false;this.QueueMissLogged=false;}
    SetDefaults(){const p=this.Projectile;try{p['void Resize(int newWidth, int newHeight)'](32,38);}catch(e){}p.ignoreWater=true;p.timeLeft=90;p.extraUpdates=2;p.tileCollide=false;p.friendly=true;p.hostile=false;p.penetrate=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;p.aiStyle=-1;}
    Key(p){return `${Math.floor(Number(p&&p.owner))}:${Math.floor(Number(p&&p.identity))}`;}
    RectCenter(p){try{const r=p&&p['Rectangle getRect()']();if(r)return Vector2.new(Number(r.X)+Number(r.Width)*0.5,Number(r.Y)+Number(r.Height)*0.5);}catch(e){}return null;}
    Move(p,vx,vy){try{p['void UpdatePosition(Vector2 wetVelocity)'](Vector2.new(vx,vy));return true;}catch(e){return false;}}
    State(p){const k=this.Key(p);let s=this.States.get(k);if(!s){const ai=new ProjAI(p,false),queued=TakeElumphantMistMotion(p.owner);s={power:Math.max(0.01,Number(ai[2])||1),originalScale:0.7+Math.random()*0.4,sub:0,visualTick:0,visible:true,vx:queued?Number(queued.vx)||0:0,vy:queued?Number(queued.vy)||0:0};this.States.set(k,s);if(!this.PerfLogged&&queued){this.PerfLogged=true;try{tl.log('[CalamityPort ElumphantMistPerf] inherited Projectile bridge removed; velocity=JS; movement=UpdatePosition; center=getRect; extraUpdates=2.');}catch(e){}}else if(!queued&&!this.QueueMissLogged){this.QueueMissLogged=true;try{tl.log('[CalamityPort ElumphantMistPerf] spawn-motion queue miss; safe zero-velocity fallback used.');}catch(e){}}}return s;}
    AI(p){
        const s=this.State(p);
        s.vx*=0.96;s.vy*=0.96;
        this.Move(p,s.vx,s.vy);
        p.rotation=Math.atan2(s.vy,s.vx)+Math.PI/2;
        s.sub=(s.sub+1)%3;
        // PC fidelity: extraUpdates=2 remains exactly intact. Motion/0.96 damping
        // still execute on all three sub-updates; only heavy visual bridge work
        // runs once per Terraria tick.
        if(s.sub!==0)return;
        s.visualTick++;
        if(s.visualTick===1||s.visualTick%5===0){const c=CubePlayer();s.visible=!c||c.IsVisual(p.owner);}
        const life=Math.max(0,Number(p.timeLeft)||0),power=s.power;
        const inv=Math.max(0,Math.min(1,(90-life)/90));
        const fade=1-Math.pow(inv,3/power);
        const scale=(1+(1-fade)*power)*s.originalScale;
        if(Number(p.scale)!==scale)p.scale=scale;
        const opacity=Math.max(0,Math.min(1,fade))*(s.visible?1:0.5);
        p.Opacity=opacity;
        p.alpha=Math.max(0,Math.min(255,Math.floor(255*(1-opacity))));
        const center=this.RectCenter(p);
    }
    OnHitNPC(p,npc){const s=this.State(p),c=CubePlayer();if(Number(p.damage)>0&&c)c.ApplyWindChilled(npc,p.owner,Math.floor(300*Math.max(1,s.power)));const hits=Math.max(0,Number(p.numHits)||0),mult=Math.max(0.25,1-hits*(0.75/3));p.damage=Math.max(1,Math.floor(Number(p.originalDamage||p.damage)*mult));}
    OnKill(p){this.States.delete(this.Key(p));}
}
