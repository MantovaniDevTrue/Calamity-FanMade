import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';
const { Vector2, Rectangle }=Modules;
const SpriteEffects=new NativeClass('Microsoft.Xna.Framework.Graphics','SpriteEffects');
let WaterLeechTexture=null;function waterLeechTex(){if(WaterLeechTexture)return WaterLeechTexture;try{WaterLeechTexture=tl.texture.load('Textures/Projectiles/Magic/WaterLeechProj.png');}catch(_){}return WaterLeechTexture;}
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function setArray(holder,name,index,value){try{let a=holder[name],need=Math.floor(Number(index))+1,len=N(a&&a.Length,N(a&&a.length,0));if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,Math.floor(Number(index)));return true;}catch(_){}try{a.set_Item(Math.floor(Number(index)),value);return true;}catch(_){}return false;}catch(_){return false;}}
function valid(n){try{return !!n&&n.active!==false&&n.dontTakeDamage!==true&&N(n.life)>0;}catch(_){return false;}}
function center(e){try{return e.Center;}catch(_){return Vector2.Zero;}}
export class WaterLeechProj extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Magic/WaterLeechProj';this.Irradiated=0;}
 SetStaticDefaults(){setArray(Terraria.Main,'projFrames',this.Type,4);}
 PostSetupContent(){this.Irradiated=Number(ModBuff.getTypeByName('Irradiated')||0);}
 SetDefaults(){const p=this.Projectile;p.width=p.height=18;p.friendly=true;p.hostile=false;p.magic=true;p.penetrate=-1;p.timeLeft=540;p.aiStyle=-1;p.tileCollide=true;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;}
 AI(p){const st=FusionEntityData.GetProjectileBag(p,'waterLeech',()=>({stuck:null,ox:0,oy:0,age:0}));st.age++;p.frameCounter=N(p.frameCounter)+1;if(N(p.frameCounter)>4){p.frameCounter=0;p.frame=(Math.floor(N(p.frame))+1)%4;}if(st.stuck&&valid(st.stuck)){const c=center(st.stuck);p.Center=Vector2.new(N(c.X)+N(st.ox),N(c.Y)+N(st.oy));p.velocity=Vector2.Zero;p.tileCollide=false;p.friendly=false;}else if(st.stuck){p.Kill();}else p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI;}
 OnHitNPC(p,n){if(!(this.Irradiated>0))this.Irradiated=Number(ModBuff.getTypeByName('Irradiated')||0);if(this.Irradiated>0)try{n.AddBuff(this.Irradiated,180,false);}catch(_){}if(valid(n)){const st=FusionEntityData.GetProjectileBag(p,'waterLeech',()=>({stuck:null,ox:0,oy:0})),nc=center(n),pc=center(p);st.stuck=n;st.ox=N(pc.X)-N(nc.X);st.oy=N(pc.Y)-N(nc.Y);p.velocity=Vector2.Zero;p.tileCollide=false;}}
 OnTileCollide(){return true;}
 PreDraw(p,lightColor){try{const tex=waterLeechTex();const draw=Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];if(!tex||!draw)return true;const frame=Math.max(0,Math.min(3,Math.floor(N(p.frame,0)))),h=18,rect=Rectangle.new(0,frame*h,26,h),pos=Vector2.new(N(p.Center.X)-N(Terraria.Main.screenPosition.X),N(p.Center.Y)-N(Terraria.Main.screenPosition.Y)+N(p.gfxOffY)),fx=N(p.spriteDirection,1)<0?SpriteEffects.FlipHorizontally:SpriteEffects.None;draw(tex,pos,rect,lightColor,N(p.rotation),Vector2.new(13,9),N(p.scale,1),fx,0);return false;}catch(_){return true;}}
}
