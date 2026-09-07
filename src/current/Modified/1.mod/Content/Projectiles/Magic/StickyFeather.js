import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';
const { Color, Vector2 }=Modules;
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function state(p){return FusionEntityData.GetProjectileBag(p,'stickyFeather',()=>({stuck:false,age:0,burst:0}));}
function stick(p){const s=state(p);if(s.stuck)return;s.stuck=true;p.velocity=Vector2.Zero;p.tileCollide=false;p.friendly=false;p.penetrate=-1;p.timeLeft=Math.min(Math.max(1,Math.floor(N(p.timeLeft,24))),24);}

export class StickyFeather extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Magic/StickyFeather';}
    SetDefaults(){
        const p=this.Projectile;
        p.width=10;p.height=10;p.friendly=true;p.hostile=false;p.magic=true;p.penetrate=-1;
        p.alpha=255;p.aiStyle=-1;p.timeLeft=150;p.tileCollide=true;p.ignoreWater=false;
    }
    AI(p){
        const s=state(p);s.age=N(s.age)+1;
        if(s.stuck){p.velocity=Vector2.Zero;p.rotation=N(p.rotation);return;}
        const vx=N(p.velocity.X),vy=N(p.velocity.Y);
        p.rotation=Math.atan2(vy,vx)+Math.PI*0.5;
        if(N(p.alpha)>50)p.alpha=Math.max(50,N(p.alpha)-28);
        // Um único efeito ocasional por pena; evita acumular Dust a cada frame no Android.
        if((Math.floor(N(s.age))&7)===0){try{NewDust(Vector2.Add(p.position,p.velocity),p.width,p.height,229,vx*.2,vy*.2,100,Color.White,.8);}catch(_){} }
    }
    OnHitNPC(p,npc){stick(p);}
    OnTileCollide(p,hitDirection){stick(p);return false;}
    OnKill(p){
        try{PlayItemSound(14,p.position,0,1);}catch(_){}
        const cx=N(p.position.X)+N(p.width)*.5,cy=N(p.position.Y)+N(p.height)*.5,pos=Vector2.new(cx-20,cy-20);
        // Mantive o estouro visual, mas com orçamento pequeno para não derrubar FPS no mobile.
        for(let k=0;k<6;k++){
            try{
                const idx=NewDust(pos,40,40,229,0,0,100,Color.White,k<2?1.0:1.35);
                const d=Terraria.Main.dust[idx];if(d){d.noGravity=k>=2;d.velocity=Vector2.Multiply(d.velocity,k>=2?2.4:1.6);}
            }catch(_){}
        }
    }
}
