import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
const { Color, Vector2 } = Modules;
const NewDust = Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
export class LunarBolt extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Ranged/LunarBolt';}
    SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.hostile=false;p.ranged=true;p.alpha=255;p.penetrate=1;p.extraUpdates=1;p.timeLeft=180;p.aiStyle=-1;}
    AI(p){
        const vx=N(p.velocity.X),vy=N(p.velocity.Y);p.spriteDirection=p.direction=vx>=0?1:-1;p.rotation=Math.atan2(vy,vx)+(p.spriteDirection===1?0:Math.PI);
        if(N(p.alpha)<170 && Math.random()<0.45){
            const idx=NewDust(p.position,p.width,p.height,229,-vx*.5,-vy*.5,N(p.alpha),Color.White,1.05);
            try{const d=Terraria.Main.dust[idx];if(d){d.noGravity=true;}}catch(_){}
        }
        if(N(p.alpha)>50)p.alpha=Math.max(50,N(p.alpha)-25);
    }
    OnTileCollide(p){
        try{Terraria.Collision.HitTiles(p.position,p.velocity,p.width,p.height);}catch(_){}
        try{p.velocity=Vector2.Zero;p.tileCollide=false;}catch(_){}
        return false;
    }
    GetAlpha(p){return Color.new(168,247,239,255);}
}
