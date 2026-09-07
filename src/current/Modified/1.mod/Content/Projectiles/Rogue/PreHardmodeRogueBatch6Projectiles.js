import { Terraria, Modules } from './../../../TL/ModImports.js'; import { ModProjectile } from './../../../TL/ModProjectile.js'; import { ProjAI } from './../../../TL/ProjAI.js'; import { FusionEntityData } from './../../../Core/FusionEntityData.js'; import { FusionVFXSystem } from './../../../Core/FusionVFXSystem.js'; import { MarkRogueProjectile, IsStealthStrike, MarkStealthStrike } from './../../../Core/RogueRuntime.js'; import { FrozenCubeNPC } from './../../../Core/FrozenCubeTargetRuntime.js'; import { PlayItemSound } from './../../../Common/Snippets/LegacySoundCompat.js';
const {Vector2,Color}=Modules; const SpriteEffects=new NativeClass('Microsoft.Xna.Framework.Graphics','SpriteEffects'); const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)']; const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;} function player(o){const i=Math.floor(N(o,-1));if(i<0)return null;try{if(i===Math.floor(N(Terraria.Main.myPlayer,-2))&&Terraria.Main.LocalPlayer)return Terraria.Main.LocalPlayer;}catch(_){}try{return Terraria.Main.player.get_Item(i);}catch(_){return null;}} function validPlayer(p){return !!(p&&p.active!==false&&p.dead!==true);} function validNpc(n){return !!(n&&n.active&&N(n.life)>0);} function src(p){try{return p.GetProjectileSource_FromThis();}catch(_){return null;}} function norm(v,s=1){const x=N(v&&v.X),y=N(v&&v.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*s,y/l*s);} function dust(p,id,c=1,s=.8){for(let i=0;i<c;i++)try{NewDust(p.position,p.width,p.height,id,(Math.random()-.5)*5,(Math.random()-.5)*5,80,Color.White,s);}catch(_){}} function getSpawn(id){try{return Terraria.Main.projectile.get_Item(Number(id));}catch(_){return null;}}
const PumpHB=new Map(); export function PumpkaboomHeldActive(o){const now=N(Terraria.Main.GameUpdateCount),t=N(PumpHB.get(Number(o)),-9999);if(now-t<=3)return true;PumpHB.delete(Number(o));return false;}
let PumpSmallTexture=null, PumpBigTexture=null;
function pumpTexture(big){
    if(big&&PumpBigTexture)return PumpBigTexture;if(!big&&PumpSmallTexture)return PumpSmallTexture;
    try{const t=tl.texture.load(big?'Textures/Projectiles/Rogue/PumpkaboomBig.png':'Textures/Items/Weapons/Rogue/Pumpkaboom.png');if(big)PumpBigTexture=t;else PumpSmallTexture=t;return t;}catch(_){return null;}
}
function rotateXY(x,y,a){const c=Math.cos(a),sn=Math.sin(a);return Vector2.new(x*c-y*sn,x*sn+y*c);}
function lerp(a,b,t){return a+(b-a)*Math.max(0,Math.min(1,t));}

class PumpBase extends ModProjectile{
    constructor(big=false){super();this.big=big;this.Texture=big?'Projectiles/Rogue/PumpkaboomBig':'Items/Weapons/Rogue/Pumpkaboom';}
    SetDefaults(){
        const p=this.Projectile;p.width=this.big?32:26;p.height=this.big?40:34;p.friendly=true;p.penetrate=-1;
        p.timeLeft=1200;p.tileCollide=false;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;p.aiStyle=-1;
    }
    OnSpawn(p){
        MarkRogueProjectile(p,'Pumpkaboom',false);if(this.big)MarkStealthStrike(p,'Pumpkaboom',false);
        const st=FusionEntityData.GetProjectileBag(p,'pumpkaboom',()=>({age:0,flung:false,stuck:false,target:-1,off:Vector2.Zero,stuckTimer:0,hit:false,heldRot:0,dir:1,aim:norm(p.velocity)}));
        st.aim=norm(p.velocity);
        PumpHB.set(Number(p.owner),N(Terraria.Main.GameUpdateCount));
    }
    CanDamage(p){const st=FusionEntityData.GetProjectileBag(p,'pumpkaboom',()=>({flung:false,stuck:false,hit:false}));return st.flung&&!st.stuck&&!st.hit?null:false;}
    AI(p){
        const pl=player(p.owner),st=FusionEntityData.GetProjectileBag(p,'pumpkaboom',()=>({age:0,flung:false,stuck:false,target:-1,off:Vector2.Zero,stuckTimer:0,hit:false,heldRot:0,dir:1,aim:norm(p.velocity)}));
        if(!validPlayer(pl)){try{p.Kill();}catch(_){p.active=false;}return;}
        if(!st.flung)PumpHB.set(Number(p.owner),N(Terraria.Main.GameUpdateCount));
        st.age++;
        if(st.stuck){
            const n=FrozenCubeNPC(st.target);if(validNpc(n)){p.Center=Vector2.Add(n.Center,st.off);p.velocity=Vector2.Zero;}
            st.stuckTimer++;if(st.stuckTimer>=105)p.Kill();return;
        }
        if(!st.flung){
            const center=pl.MountedCenter;let aim=st.aim||norm(p.velocity);
            try{if(Number(p.owner)===Number(Terraria.Main.myPlayer)){const m=Terraria.Main.MouseWorld;aim=norm(Vector2.new(N(m.X)-N(center.X),N(m.Y)-N(center.Y)));}}catch(_){}
            st.aim=aim;const dir=N(aim.X)>=0?1:-1,aimAngle=Math.atan2(N(aim.Y),N(aim.X));st.dir=dir;
            try{Terraria.SetPlayerDirection(pl,dir);}catch(_){}

            // O arremesso original usa 70 ticks, mas libera com 70% da animação (~49).
            const completion=Math.max(0,Math.min(1,st.age/(70*0.7)));
            let offsetDeg;
            if(completion<=0.75){const t=Math.pow(completion/0.75,2);offsetDeg=lerp(120,-75,t)*dir;}
            else{const t=Math.pow((completion-0.75)/0.25,3);offsetDeg=lerp(-75,30,t)*dir;}
            const grenadeRot=aimAngle+offsetDeg*Math.PI/180;st.heldRot=grenadeRot;

            // Aproxima a posição da mão frontal sem depender de GetFrontHandPosition,
            // que não é um caminho validado no bridge. O offset é o mesmo desenho de arco
            // usado pela arma original e acompanha o braço em vez de flutuar no cursor.
            const handDir=Vector2.new(Math.cos(grenadeRot),Math.sin(grenadeRot));
            const hand=Vector2.Add(center,Vector2.Multiply(handDir,10));
            const local=dir>0?Vector2.new(5,-24):Vector2.new(-3,-4);
            p.Center=Vector2.Add(hand,rotateXY(N(local.X),N(local.Y),grenadeRot));
            p.velocity=Vector2.Zero;
            p.rotation=grenadeRot+(dir>0?Math.PI:0);
            p.direction=p.spriteDirection=dir;

            try{
                pl.heldProj=p.whoAmI;
                pl.itemRotation=aimAngle*dir;
                const stretch=Terraria.Player.CompositeArmStretchAmount.Full,grav=N(pl.gravDir,1)<0?-1:1;
                const back=(aimAngle-Math.PI/2)*grav+(grav<0?Math.PI:0);
                const front=(grenadeRot-(dir>0?Math.PI:0))*grav;
                pl.SetCompositeArmBack(true,stretch,back);
                pl.SetCompositeArmFront(true,stretch,front);
            }catch(_){}

            if(completion>=1){
                p.Center=center;p.velocity=Vector2.Multiply(aim,16);p.tileCollide=true;st.flung=true;PumpHB.delete(Number(p.owner));
            }
            return;
        }
        p.velocity=Vector2.new(N(p.velocity.X)*.995,Math.min(16,N(p.velocity.Y)+.22));
        p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;
    }
    OnHitNPC(p,npc){
        const st=FusionEntityData.GetProjectileBag(p,'pumpkaboom',()=>({stuck:false,target:-1,off:Vector2.Zero,stuckTimer:0,hit:false}));if(st.hit)return;
        st.hit=true;st.stuck=true;st.target=Math.floor(N(npc.whoAmI,-1));st.off=Vector2.new(N(p.Center.X)-N(npc.Center.X),N(p.Center.Y)-N(npc.Center.Y));st.stuckTimer=0;
        p.velocity=Vector2.Zero;p.tileCollide=false;p.timeLeft=Math.min(N(p.timeLeft),110);try{PlayItemSound(10,p.Center,0,.25);}catch(_){}
    }
    OnTileCollide(p){return true;}
    PreDraw(p,lightColor){
        const texture=pumpTexture(this.big);if(!texture)return true;
        try{
            const draw=Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];if(!draw)return true;
            const st=FusionEntityData.GetProjectileBag(p,'pumpkaboom',()=>({flung:false,dir:1}));
            const pos=Vector2.new(N(p.Center.X)-N(Terraria.Main.screenPosition.X),N(p.Center.Y)-N(Terraria.Main.screenPosition.Y)+N(p.gfxOffY));
            const origin=Vector2.new(N(texture.Width)*.5,N(texture.Height)*.5);
            const effects=!st.flung?SpriteEffects.FlipVertically:SpriteEffects.None;
            let color=lightColor;try{color=p.GetAlpha(lightColor);}catch(_){}
            draw(texture,pos,null,color,N(p.rotation),origin,N(p.scale,1),effects,0);return false;
        }catch(_){return true;}
    }
    PreKill(p){
        PumpHB.delete(Number(p.owner));const c=p.Center,size=this.big?190:120;
        try{p['void Resize(int newWidth, int newHeight)'](size,size);}catch(_){p.width=size;p.height=size;p.Center=c;}
        p.penetrate=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;p.damage=Math.max(1,Math.floor(N(p.damage)*(this.big?2:1.5)));
        try{p.Damage();}catch(_){}try{FusionVFXSystem.SpawnLayeredBurst(c,this.big?52:36,{r:255,g:115,b:35,a:215},this.big?28:22,{sizeEnd:this.big?112:76,priority:2,variant:2,fadeIn:1,fadeOut:this.big?22:17,rotVel:.05});}catch(_){}
        dust(p,6,this.big?16:10,this.big?1.3:1);try{PlayItemSound(14,c,0,.4);}catch(_){}return true;
    }
    OnKill(p){PumpHB.delete(Number(p.owner));}
}
export class PumpkaboomSmall extends PumpBase{constructor(){super(false);}} export class PumpkaboomBig extends PumpBase{constructor(){super(true);}}
export class NastyChollaBol extends ModProjectile{constructor(){super();this.Texture='Items/Weapons/Rogue/NastyCholla';} SetDefaults(){const p=this.Projectile;p.width=18;p.height=18;p.friendly=true;p.penetrate=-1;p.timeLeft=200;p.tileCollide=true;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-2;p.aiStyle=-1;} OnSpawn(p){MarkRogueProjectile(p,'NastyCholla',false);FusionEntityData.GetProjectileBag(p,'cholla',()=>({age:0,stuck:false,target:-1,off:Vector2.Zero,tile:false}));} CanDamage(p){const s=FusionEntityData.GetProjectileBag(p,'cholla',()=>({stuck:false,tile:false}));return s.stuck||s.tile?false:null;} AI(p){const s=FusionEntityData.GetProjectileBag(p,'cholla',()=>({age:0,stuck:false,target:-1,off:Vector2.Zero,tile:false}));s.age++;if(s.stuck){const n=FrozenCubeNPC(s.target);if(validNpc(n)){p.Center=Vector2.Add(n.Center,s.off);p.velocity=Vector2.Zero;return;}s.stuck=false;}if(s.tile){p.velocity=Vector2.Zero;return;}p.rotation=N(p.rotation)+N(p.velocity.X)*.1;if(s.age>10)p.velocity=Vector2.new(N(p.velocity.X)*.97,Math.min(14,N(p.velocity.Y)+.2));if(s.age%12===0)dust(p,75,1,.6);} OnHitNPC(p,npc){const s=FusionEntityData.GetProjectileBag(p,'cholla',()=>({stuck:false,target:-1,off:Vector2.Zero,tile:false}));if(s.stuck)return;s.stuck=true;s.target=Math.floor(N(npc.whoAmI,-1));s.off=Vector2.new(N(p.Center.X)-N(npc.Center.X),N(p.Center.Y)-N(npc.Center.Y));p.velocity=Vector2.Zero;p.tileCollide=false;} OnTileCollide(p){const s=FusionEntityData.GetProjectileBag(p,'cholla',()=>({tile:false}));s.tile=true;p.velocity=Vector2.Zero;p.tileCollide=false;return false;} OnKill(p){if(Number(p.owner)===Number(Terraria.Main.myPlayer)){const t=Number(ModProjectile.getTypeByName('NastyChollaNeedle')||0),count=2+Math.floor(Math.random()*2);for(let i=0;i<count&&t>0;i++){const a=Math.random()*Math.PI*2,v=Vector2.new(Math.cos(a)*(5+Math.random()*4),Math.sin(a)*(5+Math.random()*4));const id=NewProjectile(src(p),p.Center,v,t,1,0,p.owner,0,0,0,null),q=getSpawn(id);if(q)MarkRogueProjectile(q,'NastyCholla',true);}}dust(p,75,5,.7);}}
export class NastyChollaNeedle extends ModProjectile{constructor(){super();this.Texture='Projectiles/Rogue/NastyChollaNeedle';} SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.penetrate=3;p.timeLeft=180;p.aiStyle=1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-2;} OnSpawn(p){MarkRogueProjectile(p,'NastyCholla',true);}}
export class InfernalKrisProjectile extends ModProjectile{constructor(){super();this.Texture='Items/Weapons/Rogue/InfernalKris';} SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.hostile=false;p.penetrate=2;p.timeLeft=300;p.usesIDStaticNPCImmunity=false;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;p.aiStyle=-1;} CanDamage(p){return p&&p.active&&p.friendly&&N(p.damage)>0?null:false;} OnSpawn(p){MarkRogueProjectile(p,'InfernalKris',false);const ai=new ProjAI(p);if(N(ai[1])>0){MarkStealthStrike(p,'InfernalKris',false);p.penetrate=1;}FusionEntityData.GetProjectileBag(p,'kris',()=>({age:0,spawned:false}));} AI(p){const s=FusionEntityData.GetProjectileBag(p,'kris',()=>({age:0,spawned:false}));s.age++;if(s.age<20)p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/4;else p.rotation=N(p.rotation)+.4*(N(p.velocity.X)>=0?1:-1);p.velocity=Vector2.new(N(p.velocity.X),Math.min(10,N(p.velocity.Y)+.01));if(s.age%4===0)dust(p,6,1,.65);} OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.OnFire,(IsStealthStrike(p)?4+Math.floor(Math.random()*4):3+Math.floor(Math.random()*3))*60,false);}catch(_){}if(IsStealthStrike(p))this.Stealth(p);} Stealth(p){const s=FusionEntityData.GetProjectileBag(p,'kris',()=>({spawned:false}));if(s.spawned)return;s.spawned=true;if(Number(p.owner)!==Number(Terraria.Main.myPlayer))return;const ct=Number(ModProjectile.getTypeByName('InfernalKrisCinder')||0),et=Number(ModProjectile.getTypeByName('InfernalKrisExplosion')||0),d=Math.max(1,Math.floor(N(p.damage)*.5));for(let i=0;i<5&&ct>0;i++){const a=Math.random()*Math.PI*2,v=Vector2.new(Math.cos(a)*(4+Math.random()*5),Math.sin(a)*(4+Math.random()*5));const id=NewProjectile(src(p),p.Center,v,ct,d,N(p.knockBack)*.5,p.owner,0,0,0,null),q=getSpawn(id);if(q){MarkRogueProjectile(q,'InfernalKris',true);MarkStealthStrike(q,'InfernalKris',true);}}if(et>0){const id=NewProjectile(src(p),p.Center,Vector2.Zero,et,d,0,p.owner,0,0,0,null),q=getSpawn(id);if(q){MarkRogueProjectile(q,'InfernalKris',true);MarkStealthStrike(q,'InfernalKris',true);}}}
 PreKill(p){if(IsStealthStrike(p))this.Stealth(p);return true;}}
export class InfernalKrisCinder extends ModProjectile{constructor(){super();this.Texture='Projectiles/Rogue/InfernalKrisCinder';} SetDefaults(){const p=this.Projectile;p.width=4;p.height=4;p.friendly=true;p.penetrate=3;p.tileCollide=true;p.timeLeft=120;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;p.aiStyle=-1;} OnSpawn(p){MarkRogueProjectile(p,'InfernalKris',true);} AI(p){p.rotation=N(p.rotation)+.3;p.velocity=Vector2.new(N(p.velocity.X)*.99,Math.min(14,N(p.velocity.Y)+.12));} OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.OnFire,90,false);}catch(_){}}}
export class InfernalKrisExplosion extends ModProjectile{constructor(){super();this.Texture='Projectiles/InvisibleProj';} SetDefaults(){const p=this.Projectile;p.width=128;p.height=128;p.friendly=true;p.penetrate=-1;p.tileCollide=false;p.ignoreWater=true;p.timeLeft=9;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;p.aiStyle=-1;} OnSpawn(p){MarkRogueProjectile(p,'InfernalKris',true);try{FusionVFXSystem.SpawnLayeredBurst(p.Center,34,{r:255,g:80,b:35,a:205},20,{sizeEnd:72,priority:2,variant:2,fadeIn:1,fadeOut:15});}catch(_){}dust(p,6,10,1);} CanDamage(p){return N(p.timeLeft)>=5?null:false;} OnHitNPC(p,npc){try{npc.AddBuff(Terraria.ID.BuffID.OnFire,180,false);}catch(_){}}}
