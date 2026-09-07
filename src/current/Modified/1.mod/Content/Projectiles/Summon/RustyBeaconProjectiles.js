import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { AcquireTargetIndex, NPCCenter, ProjectileSource, SpawnProjectile } from './../../../Core/SeaKingArsenalRuntime.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
const { Vector2, Color } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics','SpriteEffects');
const DrawTexture = 'void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function ownerOf(p){const i=I(p.owner);if(i<0)return null;try{if(i===I(Terraria.Main.myPlayer))return Terraria.Main.LocalPlayer;}catch(_){}try{return Terraria.Main.player.get_Item(i)||null;}catch(_){try{return Terraria.Main.player[i]||null;}catch(__){return null;}}}
function projectileAt(i){try{return Terraria.Main.projectile.get_Item(I(i));}catch(_){try{return Terraria.Main.projectile[I(i)]||null;}catch(__){return null;}}}
function setProjectileSet(name,type,value){try{Terraria.ID.ProjectileID.Sets[name][type]=value;return true;}catch(_){return false;}}

export class RustyDrone extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Summon/RustyDrone';this.PulseType=0;}
    SetStaticDefaults(){
        // ProjectileLoader grows these CLR arrays before SetStaticDefaults. Direct
        // indexing is the same path used by the working animated projectiles in the
        // port; the old generic setter failed here and Terraria drew the whole 12-frame
        // sheet as one vertical projectile.
        try{Terraria.Main.projFrames[this.Type]=12;}catch(_){}
        setProjectileSet('MinionSacrificable',this.Type,true);
        setProjectileSet('MinionTargetingFeature',this.Type,true);
    }
    PostSetupContent(){this.PulseType=Number(ModProjectile.getTypeByName('RustyBeaconPulse')||0);}
    SetDefaults(){const p=this.Projectile;p.width=36;p.height=30;p.ignoreWater=true;p.tileCollide=false;p.netImportant=true;p.sentry=true;p.timeLeft=36000;p.penetrate=-1;p.friendly=false;p.hostile=false;p.aiStyle=-1;}
    CanDamage(){return false;}
    OnSpawn(p){const d=Math.max(1,I(N(p.damage,N(p.originalDamage,7)),7));p.damage=d;if(!(N(p.originalDamage)>0))p.originalDamage=d;FusionEntityData.GetProjectileBag(p,'rustyDrone',()=>({lastPulse:-1,targetIndex:-1,nextTargetScan:0}));}
    AI(p){
        const pl=ownerOf(p);if(!pl||pl.active===false){if(I(p.timeLeft)<2)p.timeLeft=2;return;}if(pl.dead){try{p.Kill();}catch(_){p.active=false;}return;}
        p.frameCounter=I(p.frameCounter,0)+1;
        p.frame=Math.floor(I(p.frameCounter,0)/5)%12;
        p.velocity=Vector2.new(0,-Math.sin(Math.PI*2*N(p.timeLeft)/96)*3);

        const st=FusionEntityData.GetProjectileBag(p,'rustyDrone',()=>({lastPulse:-1,targetIndex:-1,nextTargetScan:0}));
        const targetIndex=AcquireTargetIndex(p,pl,1000,st,12,false);
        if(targetIndex>=0){
            let target=null;try{target=Terraria.Main.npc.get_Item(targetIndex);}catch(_){try{target=Terraria.Main.npc[targetIndex];}catch(__){}}
            const c=NPCCenter(target);
            if(c){let pc=null;try{pc=p.Center;}catch(_){}if(pc)p.spriteDirection=N(pc.X)<N(c.X)?1:-1;}
        }

        if(I(p.timeLeft)%120===60&&I(st.lastPulse,-1)!==I(p.timeLeft)&&I(p.owner)===I(Terraria.Main.myPlayer)){
            st.lastPulse=I(p.timeLeft);
            if(!(this.PulseType>0))this.PulseType=Number(ModProjectile.getTypeByName('RustyBeaconPulse')||0);
            if(this.PulseType>0){
                const src=ProjectileSource(p,pl);
                const id=SpawnProjectile(src,p.Center,Vector2.Zero,this.PulseType,Math.max(1,I(p.damage,7)),0,I(p.owner),0,0,0);
                const q=projectileAt(id);if(q){q.originalDamage=Math.max(1,I(N(p.originalDamage,p.damage),7));q.netUpdate=true;}
            }
            try{Terraria.Audio.SoundEngine['SoundEffectInstance PlaySound(LegacySoundStyle type, Vector2 position, float pitchOffset, float volumeScale)'](Terraria.ID.SoundID.DD2_WitherBeastAuraPulse,p.Center,0,1.6);}catch(_){try{Terraria.Audio.SoundEngine['void PlaySound(int type, Vector2 position, int style, float pitchOffset)'](2,p.Center,14,0);}catch(__){}}
        }
    }
}

export class RustyBeaconPulse extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Summon/RustyBeaconPulse';this.IrradiatedType=0;this.TextureAsset=null;}
    SetStaticDefaults(){setProjectileSet('SentryShot',this.Type,true);}
    PostSetupContent(){this.IrradiatedType=Number(ModBuff.getTypeByName('Irradiated')||0);}
    SetDefaults(){const p=this.Projectile;p.width=96;p.height=96;p.friendly=true;p.hostile=false;p.tileCollide=false;p.ignoreWater=true;p.penetrate=-1;p.usesIDStaticNPCImmunity=true;p.idStaticNPCHitCooldown=30;p.timeLeft=95;p.scale=.001;p.aiStyle=-1;}
    OnSpawn(p){
        const st=FusionEntityData.GetProjectileBag(p,'rustyPulse',()=>({dir:Math.random()<.5?-1:1,started:false}));
        if(!st.started){st.started=true;p.rotation=Math.random()*Math.PI*2;p.netUpdate=true;}
        const d=Math.max(1,I(N(p.damage,N(p.originalDamage,7)),7));p.damage=d;if(!(N(p.originalDamage)>0))p.originalDamage=d;
    }
    AI(p){
        const st=FusionEntityData.GetProjectileBag(p,'rustyPulse',()=>({dir:1,started:true}));
        const completion=Math.max(0,Math.min(1,1-N(p.timeLeft)/95));
        const opacity=1-Math.pow(completion,1.56);
        p.Opacity=opacity;
        p.alpha=Math.max(0,Math.min(255,I(255*(1-opacity),0)));
        p.scale=.5+(7-.5)*completion;
        p.rotation=N(p.rotation)+N(st.dir,1)*.012;
    }
    // TLPro's native Damage() first performs a rectangle broadphase. The original
    // projectile keeps a 96x96 entity box and expands only through Colliding(), but
    // that means targets outside the base 96x96 box never reach the custom circle
    // test on mobile. Expand only Damage_GetHitbox's broadphase to the current pulse
    // diameter; Colliding() below still enforces the exact circular hit area.
    ModifyDamageHitbox(p,hitbox){
        try{
            const c=p.Center,r=Math.max(1,N(p.scale,1)*48),d=Math.max(2,Math.ceil(r*2));
            hitbox.X=Math.floor(N(c.X)-r);hitbox.Y=Math.floor(N(c.Y)-r);hitbox.Width=d;hitbox.Height=d;
        }catch(_){}
    }
    Colliding(p,myRect,targetRect){
        try{
            const cx=N(p.Center.X),cy=N(p.Center.Y),r=Math.max(1,N(p.scale,1)*48);
            const left=N(targetRect.X),top=N(targetRect.Y),right=left+N(targetRect.Width),bottom=top+N(targetRect.Height);
            const qx=Math.max(left,Math.min(cx,right)),qy=Math.max(top,Math.min(cy,bottom)),dx=cx-qx,dy=cy-qy;
            return dx*dx+dy*dy<=r*r;
        }catch(_){return null;}
    }
    OnHitNPC(p,target){if(!target||target.friendly===true)return;if(!(this.IrradiatedType>0))this.IrradiatedType=Number(ModBuff.getTypeByName('Irradiated')||0);if(this.IrradiatedType>0)try{target.AddBuff(this.IrradiatedType,120,false);}catch(_){} }
    OnTileCollide(){return false;}
    PreDraw(p,lightColor){
        try{
            if(!this.TextureAsset)this.TextureAsset=tl.texture.load('Textures/Projectiles/Summon/RustyBeaconPulse.png');const tex=this.TextureAsset;if(!tex)return true;
            const draw=Terraria.Main.spriteBatch&&Terraria.Main.spriteBatch[DrawTexture];if(!draw)return true;
            const opacity=Math.max(0,Math.min(1,N(p.Opacity,1)));
            // Match the original GetAlpha() + PreDraw multiplier instead of the old
            // over-bright solid green approximation.
            const t=1-opacity;
            const r=153+(158-153)*t,g=226+(128-226)*t,b=104+(175-104)*t,a=92*t;
            const f=opacity*.67*.33;
            let color;try{color=Color.new(I(r*f,0),I(g*f,0),I(b*f,0),I(a*f,0));}catch(_){color=lightColor;}
            const base=Vector2.new(N(p.Center.X)-N(Terraria.Main.screenPosition.X),N(p.Center.Y)-N(Terraria.Main.screenPosition.Y));
            const origin=Vector2.new(N(tex.Width)/2,N(tex.Height)/2);
            for(let i=0;i<8;i++){
                const ang=Math.PI*2*i/8,off=Vector2.new(Math.cos(ang)*N(p.scale),Math.sin(ang)*N(p.scale));
                const pos=Vector2.new(N(base.X)+N(off.X),N(base.Y)+N(off.Y));
                draw(tex,pos,null,color,i%2?-N(p.rotation):N(p.rotation),origin,N(p.scale),SpriteEffects.None,0);
            }
            return false;
        }catch(_){return true;}
    }
}
