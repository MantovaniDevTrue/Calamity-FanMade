import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
import { TouchDeathstare, ClearDeathstare } from './../../../Core/DeathstareRuntime.js';
const {Vector2,Color,Rectangle}=Modules;
const SpriteEffects=new NativeClass('Microsoft.Xna.Framework.Graphics','SpriteEffects');
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const NewDust=Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function ownerOf(p){const i=I(p.owner);if(i<0)return null;try{if(i===I(Terraria.Main.myPlayer))return Terraria.Main.LocalPlayer;}catch(_){}try{return Terraria.Main.player.get_Item(i)||null;}catch(_){return null;}}
function target(found){if(found==null)return null;try{if(found.active!==undefined)return found;}catch(_){}const i=I(found);if(i<0||i>=200)return null;try{return Terraria.Main.npc.get_Item(i);}catch(_){return null;}}
function valid(n){try{return !!n&&n.active&&!n.friendly&&!n.townNPC&&!n.dontTakeDamage&&N(n.life)>0;}catch(_){return false;}}
function setBoolSet(name,index,value){try{const a=Terraria.ID.ProjectileID.Sets[name];try{a['void SetValue(Object value, int index)'](value,Number(index));return;}catch(_){}try{a.set_Item(Number(index),value);}catch(_){}}catch(_){}}
function source(p){try{return p.GetProjectileSource_FromThis();}catch(_){try{return null;}catch(__){return null;}}}
function projectileAt(i){try{return Terraria.Main.projectile.get_Item(Number(i));}catch(_){return null;}}
function setArray(holder,name,index,value){try{let a=holder[name],need=I(index,0)+1,len=N(a?.Length,N(a?.length));if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a.set_Item(I(index,0),value);}catch(_){a['void SetValue(Object value, int index)'](value,I(index,0));}return true;}catch(_){return false;}}
let DeathstareTexture=null;function deathstareTexture(){if(DeathstareTexture)return DeathstareTexture;try{DeathstareTexture=tl.texture.load('Textures/Projectiles/Summon/DeathstareEyeball.png');}catch(_){}return DeathstareTexture;}

export class DeathstareEyeball extends ModProjectile {
    constructor(){super();this.Texture='Projectiles/Summon/DeathstareEyeball';this.BuffType=0;this.BeamType=0;}
    SetStaticDefaults(){try{Terraria.Main.projFrames[this.Type]=6;}catch(_){}try{Terraria.Main.projPet[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type]=true;}catch(_){} }
    PostSetupContent(){this.BuffType=Number(ModBuff.getTypeByName('MiniatureEyeofCthulhu')||0);this.BeamType=Number(ModProjectile.getTypeByName('DeathstareBeam')||0);}
    SetDefaults(){const p=this.Projectile;p.width=22;p.height=22;p.netImportant=true;p.friendly=true;p.hostile=false;p.ignoreWater=true;p.minionSlots=1;p.timeLeft=18000;p.penetrate=-1;p.tileCollide=false;p.minion=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=20;}
    OnSpawn(p){TouchDeathstare(p);const d=Math.max(1,Math.floor(N(p.damage,N(p.originalDamage,20))));p.damage=d;p.originalDamage=Math.max(d,Math.floor(N(p.originalDamage,d)));p.friendly=true;p.hostile=false;}
    AI(p){const pl=ownerOf(p);if(!pl||!pl.active||pl.dead){try{p.Kill();}catch(_){p.active=false;}return;}TouchDeathstare(p);const baseDamage=Math.max(1,Math.floor(N(p.damage,N(p.originalDamage,20))));p.damage=baseDamage;if(!(N(p.originalDamage)>0))p.originalDamage=baseDamage;p.friendly=true;p.hostile=false;if(!(this.BuffType>0))this.BuffType=Number(ModBuff.getTypeByName('MiniatureEyeofCthulhu')||0);let bi=-1;try{bi=this.BuffType>0?pl.FindBuffIndex(this.BuffType):-1;}catch(_){}if(!(this.BuffType>0)||bi<0){try{p.Kill();}catch(_){p.active=false;}return;}p.timeLeft=2;
        const st=FusionEntityData.GetProjectileBag(p,'deathstare13260',()=>({time:0,target:null,nextScan:0}));st.time=I(st.time,0)+1;
        const pc=Terraria.PlayerCenter(pl),destY=N(pc.Y)+(N(pl.gfxOffY)-110)*N(pl.gravDir,1),cx=N(p.Center.X),cy=N(p.Center.Y);p.Center=Vector2.new(cx+(N(pc.X)-cx)*0.36,cy+(destY-cy)*0.36);p.velocity=Vector2.Zero;
        const tick=I(Terraria.Main.GameUpdateCount,0);let n=valid(st.target)?st.target:null;if(tick>=I(st.nextScan,0)||!n){st.nextScan=tick+8;st.target=null;try{n=target(p.FindTargetWithinRange(720,true));if(valid(n))st.target=n;}catch(_){} }else n=st.target;
        p.frame=Math.floor(st.time/5)%4;p.rotation=Math.max(-0.4,Math.min(0.4,N(pl.velocity?.X)*0.08));
        try{const c=p.Center;Terraria.Lighting.AddLight(Math.floor(N(c.X)/16),Math.floor(N(c.Y)/16),0.05,0.2,0.55);}catch(_){}
        if(!valid(n)||st.time%60!==40)return;if(I(p.owner)!==I(Terraria.Main.myPlayer))return;if(!(this.BeamType>0))this.BeamType=Number(ModProjectile.getTypeByName('DeathstareBeam')||0);if(!(this.BeamType>0))return;const a=p.Center,b=n.Center,dx=N(b.X)-N(a.X),dy=N(b.Y)-N(a.Y),d=Math.max(1,Math.floor(N(p.damage,N(p.originalDamage,20)))),v=Vector2.new(dx/15,dy/15);const idx=NewProjectile(source(p),b,v,this.BeamType,d,N(p.knockBack),I(p.owner),0,0,0,null),beam=projectileAt(idx);if(beam){beam.damage=d;beam.originalDamage=d;beam.friendly=true;beam.hostile=false;beam.Center=b;try{beam.Damage();}catch(_){try{beam['void Damage()']();}catch(__){}}beam.friendly=false;}
    }
    PreDraw(p,lightColor){const tex=deathstareTexture();if(!tex)return true;try{const draw=Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];if(!draw)return true;const w=22,h=30,frame=Math.max(0,Math.min(5,I(p.frame,0))),rect=Rectangle.new(0,frame*h,w,h),pos=Vector2.new(N(p.Center.X)-N(Terraria.Main.screenPosition.X),N(p.Center.Y)-N(Terraria.Main.screenPosition.Y)+N(p.gfxOffY));draw(tex,pos,rect,lightColor,N(p.rotation),Vector2.new(w/2,h/2),N(p.scale,1),SpriteEffects.None,0);return false;}catch(_){return true;}}
    OnKill(p){ClearDeathstare(p);}
}

export class DeathstareBeam extends ModProjectile {
    constructor(){super();this.Texture='ExtraTextures/TinyGreyscaleCircle';}
    SetStaticDefaults(){setBoolSet('MinionShot',this.Type,true);}
    SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.hostile=false;p.penetrate=-1;p.tileCollide=false;p.ignoreWater=true;p.timeLeft=10;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;p.light=0.55;}
    OnSpawn(p){const d=Math.max(1,Math.floor(N(p.damage,N(p.originalDamage,20))));p.damage=d;p.originalDamage=Math.max(d,Math.floor(N(p.originalDamage,d)));p.friendly=true;p.hostile=false;}
    AI(p){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X));if((I(p.timeLeft)%3)===0){try{NewDust(p.position,p.width,p.height,Number(Terraria.ID.DustID.BlueTorch||59),-N(p.velocity.X)*0.05,-N(p.velocity.Y)*0.05,80,Color.White,0.8);}catch(_){}}}
    GetAlpha(p,light){try{return Color.new(110,180,255,230);}catch(_){return light;}}
}
