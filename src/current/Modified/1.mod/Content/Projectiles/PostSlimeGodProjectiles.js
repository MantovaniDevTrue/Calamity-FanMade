import { Terraria, Modules } from './../../TL/ModImports.js';
import { ModProjectile } from './../../TL/ModProjectile.js';
import { ModItem } from './../../TL/ModItem.js';
import { ProjAI } from './../../TL/ProjAI.js';
import { FusionEntityData } from './../../Core/FusionEntityData.js';
import { IsStealthStrike } from './../../Core/RogueRuntime.js';
import { UpdatePostSlimeGodVisual, RemovePostSlimeGodVisual, ClaimPostSlimeGodYoyo, RefreshPostSlimeGodYoyo, ReleasePostSlimeGodYoyo } from './../../Core/PostSlimeGodProjectileVisualRegistry.js';
const {Vector2,Rectangle}=Modules;
const SpriteEffects=new NativeClass('Microsoft.Xna.Framework.Graphics','SpriteEffects');
const DrawTexture='void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)';
const DrawScaledTexture='void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, Vector2 scale, SpriteEffects effects, float layerDepth)';
const NewProjectile=Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
function center(e){try{const r=e['Rectangle getRect()']();return Vector2.new(Number(r.X)+Number(r.Width)*0.5,Number(r.Y)+Number(r.Height)*0.5);}catch(x){try{return e.Center;}catch(y){return Vector2.Zero;}}}
function ownerOf(p){const i=Math.floor(Number(p?.owner));if(!Number.isFinite(i)||i<0)return null;try{if(i===Math.floor(Number(Terraria.Main.myPlayer))&&Terraria.Main.LocalPlayer)return Terraria.Main.LocalPlayer;}catch(e){}try{return Terraria.Main.player.get_Item(i);}catch(e){return null;}}
function projectileAt(i){try{return Terraria.Main.projectile.get_Item(Number(i));}catch(e){return null;}}
function safeSource(p){try{return null;}catch(e){return null;}}
function norm(x,y,s=1){const l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*s,y/l*s);}
function readNPC(i){const n=Math.floor(Number(i));if(!(n>=0&&n<200))return null;try{return Terraria.Main.npc.get_Item(n);}catch(e){try{return Terraria.Main.npc[n];}catch(_){return null;}}}
function validTarget(n,p,range){if(!n||!n.active||n.friendly||Number(n.life)<=0||n.dontTakeDamage)return false;const pc=center(p),nc=center(n),dx=Number(nc.X)-Number(pc.X),dy=Number(nc.Y)-Number(pc.Y);return dx*dx+dy*dy<Number(range)*Number(range);}
function findTarget(p,range,refresh=8){const st=FusionEntityData.GetProjectileBag(p,'postSlimeTarget',()=>({index:-1,next:-1,validTick:-1,valid:false})),tick=Math.floor(Number(Terraria.Main.GameUpdateCount)||0),cached=readNPC(st.index);if(tick<Number(st.next)){if(Number(st.validTick)!==tick){st.validTick=tick;st.valid=validTarget(cached,p,range);}return st.valid?cached:null;}let best=null;try{const found=p.FindTargetWithinRange(range,true);if(found&&found.active!==undefined)best=found;else best=readNPC(found);}catch(e){}if(!validTarget(best,p,range))best=null;st.index=best?Number(best.whoAmI):-1;st.next=tick+Math.max(1,Math.floor(Number(refresh)||8));st.validTick=tick;st.valid=!!best;return best;}
function rotateHitbox(p,target){try{const c=center(p),hw=Number(p.width)*0.5*Number(p.scale||1),hh=Number(p.height)*0.5*Number(p.scale||1),a=Number(p.rotation)||0,ca=Math.cos(a),sa=Math.sin(a);const tx=Number(target.X)+Number(target.Width)*0.5,ty=Number(target.Y)+Number(target.Height)*0.5,dx=tx-Number(c.X),dy=ty-Number(c.Y);const lx=dx*ca+dy*sa,ly=-dx*sa+dy*ca;const ex=Number(target.Width)*0.5,ey=Number(target.Height)*0.5;return Math.abs(lx)<=hw+Math.abs(ca)*ex+Math.abs(sa)*ey&&Math.abs(ly)<=hh+Math.abs(sa)*ex+Math.abs(ca)*ey;}catch(e){return null;}}
function setArray(holder,name,index,value){try{let a=holder[name];const need=Number(index)+1;if(Number(a.length)<need){a=a.cloneResized(need);holder[name]=a;}a[Number(index)]=value;return true;}catch(e){return false;}}

function drawTexture(holder,p,lightColor,path,forceWhite=false){
 try{
  if(!holder._drawLoadTried){holder._drawLoadTried=true;try{holder._drawTexture=tl.texture.load(path);}catch(e){} }
  let tex=holder._drawTexture;
  if(!tex){try{tex=Terraria.GameContent.TextureAssets.Projectile[p.type]?.Value||null;}catch(e){} }
  const draw=Terraria.Main.spriteBatch&&Terraria.Main.spriteBatch[DrawTexture];
  const getRect=p&&p['Rectangle getRect()'];
  if(!tex||!draw||typeof getRect!=='function'){
   if(!holder._drawFallbackLogged){holder._drawFallbackLogged=true;try{tl.log(`[CalamityPort 12.84.4] draw fallback; type=${p?.type}; texture=${!!tex}; draw=${!!draw}; rect=${typeof getRect==='function'}.`);}catch(e){}}
   return true;
  }
  const r=getRect();if(!r)return true;
  const pos=Vector2.new(Number(r.X)+Number(r.Width)*0.5-Number(Terraria.Main.screenPosition?.X||0),Number(r.Y)+Number(r.Height)*0.5-Number(Terraria.Main.screenPosition?.Y||0));
  const source=Rectangle.new(0,0,Math.max(1,Math.floor(Number(tex.Width)||1)),Math.max(1,Math.floor(Number(tex.Height)||1)));
  const origin=Vector2.new(Number(tex.Width)*0.5,Number(tex.Height)*0.5);
  let color=forceWhite?Modules.Color.White:lightColor;try{if(!forceWhite)color=p.GetAlpha(lightColor);}catch(e){}
  draw(tex,pos,source,color,Number(p.rotation)||0,origin,Math.max(0.01,Number(p.scale)||1),SpriteEffects.None,0);
  if(!holder._drawLogged){holder._drawLogged=true;try{tl.log(`[CalamityPort 12.84.4] safe projectile renderer active; type=${p.type}; texture=${Number(tex.Width)}x${Number(tex.Height)}.`);}catch(e){}}
  return false;
 }catch(e){
  if(!holder._drawFallbackLogged){holder._drawFallbackLogged=true;try{tl.log(`[CalamityPort 12.84.4] draw exception; type=${p?.type}; error=${e}.`);}catch(_){} }
  return true;
 }
}

function yoyoAim(owner,p){
 const oc=Terraria.PlayerCenter(owner);
 let tx=Number(oc.X)+(Number(Terraria.PlayerDirection(owner))||1)*180,ty=Number(oc.Y);
 try{
  const m=Terraria.Main.MouseWorld;
  const mx=Number(m?.X),my=Number(m?.Y);
  if(Number.isFinite(mx)&&Number.isFinite(my)){
   const dx=mx-Number(oc.X),dy=my-Number(oc.Y),d2=dx*dx+dy*dy;
   if(d2>=20*20&&d2<=1600*1600){tx=mx;ty=my;}
  }
 }catch(e){}
 let dx=tx-Number(oc.X),dy=ty-Number(oc.Y),d=Math.sqrt(dx*dx+dy*dy)||1;
 if(d>400){dx=dx/d*400;dy=dy/d*400;tx=Number(oc.X)+dx;ty=Number(oc.Y)+dy;}
 return Vector2.new(tx,ty);
}
function drawYoyoString(p,owner){
 try{
  const tex=Terraria.GameContent.TextureAssets.MagicPixel?.Value;if(!tex)return;
  const draw=Terraria.Main.spriteBatch&&Terraria.Main.spriteBatch[DrawScaledTexture];if(!draw)return;
  const oc=Terraria.PlayerCenter(owner),pc=center(p),sx=Number(Terraria.Main.screenPosition?.X||0),sy=Number(Terraria.Main.screenPosition?.Y||0);
  const dx=Number(pc.X)-Number(oc.X),dy=Number(pc.Y)-Number(oc.Y),len=Math.sqrt(dx*dx+dy*dy);if(!(len>3))return;
  const pos=Vector2.new(Number(oc.X)-sx,Number(oc.Y)-sy),src=Rectangle.new(0,0,1,1),origin=Vector2.new(0,0.5);
  draw(tex,pos,src,Modules.Color.White,Math.atan2(dy,dx),origin,Vector2.new(len,1.25),SpriteEffects.None,0);
 }catch(e){}
}

export class GelWave extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Melee/GelWave';}
 SetStaticDefaults(){try{Terraria.ID.ProjectileID.Sets.TrailCacheLength[this.Type]=10;Terraria.ID.ProjectileID.Sets.TrailingMode[this.Type]=1;}catch(e){}}
 SetDefaults(){const p=this.Projectile;p.width=42;p.height=84;p.friendly=true;p.ignoreWater=true;p.melee=true;p.penetrate=-1;p.timeLeft=200;p.tileCollide=false;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=-1;}
 AI(p){const vx=Number(p.velocity.X)||0,vy=Number(p.velocity.Y)||0;p.rotation=Math.atan2(vy,vx);if(Number(p.timeLeft)<=60){p.alpha=Math.max(0,Math.min(255,Math.floor(255*(1-Number(p.timeLeft)/60))));p.velocity=Vector2.new(vx*0.94,vy*0.94);}else if(Number(p.scale)<2){p.velocity=Vector2.new(vx*0.99,vy*0.99);p.scale=Number(p.scale)+0.02;}if(Math.random()<0.10){const c=center(p);try{Terraria.Dust['int NewDust(Vector2 Position, int Width, int Height, int Type, float SpeedX, float SpeedY, int Alpha, Color newColor, float Scale)'](c,2,2,Math.random()<0.5?56:73,vx*0.5,vy*0.5,0,Modules.Color.White,1);}catch(e){}}}
 Colliding(p,myRect,targetRect){return rotateHitbox(p,targetRect);}
 CanDamage(p){return Number(p.alpha)===0;}
 OnHitNPC(p,npc){try{npc.AddBuff(Number(Terraria.ID.BuffID.Slimed||137),300,false);}catch(e){}p.velocity=Vector2.new(Number(p.velocity.X)*1.1,Number(p.velocity.Y)*1.1);if(Number(p.numHits)>=3&&Number(p.timeLeft)>60)p.timeLeft=60;}
}
export class SlimeStream extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/InvisibleProj';}
 SetDefaults(){const p=this.Projectile;p.width=10;p.height=10;p.friendly=true;p.timeLeft=90;p.extraUpdates=2;p.tileCollide=true;}
 OnSpawn(p){const ai=new ProjAI(p);const st=FusionEntityData.GetProjectileBag(p,'slimeStreamFlags',()=>({color:0,homing:0}));st.color=Number(ai[0])||0;st.homing=Number(ai[1])||0;}
 AI(p){const st=FusionEntityData.GetProjectileBag(p,'slimeStreamFlags',()=>({color:0,homing:0})),c=center(p);try{Terraria.Dust.QuickDust(c,Number(st.color)>0?Modules.Color.Magenta:Modules.Color.RoyalBlue);}catch(e){}if(Number(st.homing)>0&&Number(p.timeLeft)<60){const t=findTarget(p,320,6);if(t){const tc=center(t),desired=norm(Number(tc.X)-Number(c.X),Number(tc.Y)-Number(c.Y),12);const vx=Number(p.velocity.X),vy=Number(p.velocity.Y);p.velocity=Vector2.new((vx*20+Number(desired.X))/21,(vy*20+Number(desired.Y))/21);}}}
 OnHitNPC(p,npc){try{npc.AddBuff(Number(Terraria.ID.BuffID.Slimed||137),600,false);}catch(e){}}
}
export class GodsGambitYoyo extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Melee/Yoyos/GodsGambitYoyo';this._spawnLogged=false;this._ownerFailLogged=false;}
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'YoyosLifeTimeMultiplier',this.Type,-1);setArray(Terraria.ID.ProjectileID.Sets,'YoyosMaximumRange',this.Type,400);setArray(Terraria.ID.ProjectileID.Sets,'YoyosTopSpeed',this.Type,16);}
 SetDefaults(){const p=this.Projectile;p.aiStyle=0;p.drawLayer=7;p.width=22;p.height=22;p.friendly=true;p.melee=true;p.penetrate=-1;p.extraUpdates=1;p.timeLeft=3600;p.tileCollide=false;p.ignoreWater=true;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=30;p.hide=true;p.alpha=0;p.scale=1;}
 OnSpawn(p){p.hide=true;p.alpha=0;p.friendly=true;if(!ClaimPostSlimeGodYoyo(p)){p.friendly=false;p.timeLeft=1;RemovePostSlimeGodVisual(p);try{p.Kill();}catch(e){}return;}const o=ownerOf(p);UpdatePostSlimeGodVisual(p,'yoyo',o);if(!this._spawnLogged){this._spawnLogged=true;try{tl.log(`[CalamityPort 12.84.11] God's Gambit spawned; single-yoyo gate active; type=${p.type}; owner=${p.owner}; damage=${p.damage}.`);}catch(e){}}}
 AI(p){
  p.friendly=true;p.tileCollide=false;p.hide=true;p.alpha=0;
  if(!RefreshPostSlimeGodYoyo(p)){p.friendly=false;p.timeLeft=1;RemovePostSlimeGodVisual(p);try{p.Kill();}catch(e){}return;}
  const o=ownerOf(p);
  if(!o){p.timeLeft=Math.max(Number(p.timeLeft)||0,30);UpdatePostSlimeGodVisual(p,'yoyo',null);if(!this._ownerFailLogged){this._ownerFailLogged=true;try{tl.log(`[CalamityPort 12.84.6] God's Gambit owner lookup deferred; owner=${p.owner}.`);}catch(e){}}return;}
  if(o.dead){RemovePostSlimeGodVisual(p);p.Kill();return;}
  const c=center(p),oc=Terraria.PlayerCenter(o),held=Number(o.HeldItem?.type||0),itemType=Number(ModItem.getTypeByName('TheGodsGambit')||0);
  const st=FusionEntityData.GetProjectileBag(p,'godsGambit',()=>({timer:0,returning:false,age:0,releaseTicks:0,launchX:0,launchY:0,launchReady:false}));
  st.age=Number(st.age||0)+1;
  if(!st.launchReady){let vx=Number(p.velocity.X)||0,vy=Number(p.velocity.Y)||0,l=Math.sqrt(vx*vx+vy*vy);if(l<0.25){vx=Number(Terraria.PlayerDirection(o))||1;vy=0;l=1;}st.launchX=vx/l;st.launchY=vy/l;st.launchReady=true;}
  const useHeld=(o.channel===true)||(o.controlUseItem===true)||Number(o.itemAnimation)>0||Number(o.itemTime)>0;
  const released=(o.releaseUseItem===true)&&!useHeld;
  if(held>0&&itemType>0&&held!==itemType)st.returning=true;
  else if(st.age>90){if(released)st.releaseTicks=Number(st.releaseTicks||0)+1;else st.releaseTicks=0;if(st.releaseTicks>=8)st.returning=true;}
  if(st.returning){
   const dx=Number(oc.X)-Number(c.X),dy=Number(oc.Y)-Number(c.Y),d=Math.sqrt(dx*dx+dy*dy)||1;
   if(d<24){RemovePostSlimeGodVisual(p);p.Kill();return;}
   const v=Vector2.new(dx/d*24,dy/d*24);p.velocity=Vector2.new(Number(p.velocity.X)*0.45+Number(v.X)*0.55,Number(p.velocity.Y)*0.45+Number(v.Y)*0.55);p.timeLeft=Math.max(Number(p.timeLeft)||0,30);p.rotation=Number(p.rotation)+0.18;UpdatePostSlimeGodVisual(p,'yoyo',o);return;
  }
  p.timeLeft=Math.max(Number(p.timeLeft)||0,60);
  let target=yoyoAim(o,p),tx=Number(target.X),ty=Number(target.Y),odx=tx-Number(oc.X),ody=ty-Number(oc.Y),od2=odx*odx+ody*ody;
  if(od2<70*70||od2>1000*1000){tx=Number(oc.X)+Number(st.launchX)*320;ty=Number(oc.Y)+Number(st.launchY)*320;}
  let dx=tx-Number(c.X),dy=ty-Number(c.Y),d=Math.sqrt(dx*dx+dy*dy)||1;
  if(d>6){const speed=Math.min(16,Math.max(4,d*0.20)),v=Vector2.new(dx/d*speed,dy/d*speed);p.velocity=Vector2.new(Number(p.velocity.X)*0.58+Number(v.X)*0.42,Number(p.velocity.Y)*0.58+Number(v.Y)*0.42);}else p.velocity=Vector2.new(Number(p.velocity.X)*0.50,Number(p.velocity.Y)*0.50);
  const fromOwnerX=Number(c.X)-Number(oc.X),fromOwnerY=Number(c.Y)-Number(oc.Y),ownerDistance=Math.sqrt(fromOwnerX*fromOwnerX+fromOwnerY*fromOwnerY)||1;if(ownerDistance>410)p.velocity=Vector2.new(-fromOwnerX/ownerDistance*16,-fromOwnerY/ownerDistance*16);
  p.rotation=Number(p.rotation)+0.18*(Number(p.direction)||1);UpdatePostSlimeGodVisual(p,'yoyo',o);
  st.timer=Number(st.timer||0)+1;if(st.timer<=30||Number(p.owner)!==Number(Terraria.Main.myPlayer))return;st.timer=0;
  const t=findTarget(p,300,12);if(!t)return;const tc=center(t),spawn=Vector2.new(Number(c.X)+Number(p.velocity.X)*4,Number(c.Y)+Number(p.velocity.Y)*4),v=norm(Number(tc.X)-Number(spawn.X),Number(tc.Y)-Number(spawn.Y),6),type=Number(ModProjectile.getTypeByName('SlimeStream')||0);if(type>0)NewProjectile(safeSource(p),spawn,v,type,Math.max(1,Math.floor(Number(p.damage)*0.75)),Number(p.knockBack)||0,p.owner,0,0,0,null);
 }
 CanDamage(){return true;}
 OnHitNPC(p,npc){try{npc.AddBuff(Number(Terraria.ID.BuffID.Slimed||137),300,false);}catch(e){}}
 OnKill(p){ReleasePostSlimeGodYoyo(p);RemovePostSlimeGodVisual(p);}
}
export class GelDartProjectile extends ModProjectile{
 constructor(){super();this.Texture='Items/Weapons/Rogue/GelDart';this.AIType=48;}
 SetDefaults(){const p=this.Projectile;p.width=12;p.height=12;p.friendly=true;p.penetrate=4;p.aiStyle=2;p.timeLeft=600;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;}
 AI(p){const bag=FusionEntityData.GetProjectileBag(p,'gelDart',()=>({tick:0,prevX:0,prevY:0}));bag.prevX=Number(p.velocity.X);bag.prevY=Number(p.velocity.Y);if(IsStealthStrike(p)&&Number(p.owner)===Number(Terraria.Main.myPlayer)){p.rotation=Number(p.rotation)+(Math.abs(Number(p.velocity.X))+Math.abs(Number(p.velocity.Y)))*0.01*Number(p.direction||1);bag.tick=(Number(bag.tick)||0)+1;if((bag.tick%8)===0){const st=Number(ModProjectile.getTypeByName('SlimeStream')||0);if(st>0){const a=Math.random()*Math.PI*2,s=7*Math.sqrt(Math.random()),v=Vector2.new(Math.cos(a)*s,Math.sin(a)*s),idx=NewProjectile(safeSource(p),center(p),v,st,Math.max(1,Math.floor(Number(p.damage)*0.5)),Number(p.knockBack)*0.5,p.owner,Math.floor(Math.random()*2),1,0,null);const sp=projectileAt(idx);if(sp){try{sp.ranged=false;}catch(e){}}}}}}
 OnTileCollide(p){const bag=FusionEntityData.GetProjectileBag(p,'gelDart',()=>({tick:0,prevX:0,prevY:0}));p.penetrate=Number(p.penetrate)-1;if(Number(p.penetrate)<=0)return true;const ox=Number(bag.prevX)||-Number(p.velocity.X),oy=Number(bag.prevY)||-Number(p.velocity.Y);if(IsStealthStrike(p)){const f=0.85+Math.random()*0.30;p.velocity=Vector2.new(-ox*1.35*f,-oy*1.35*f);}else p.velocity=Vector2.new(-ox,-oy);return false;}
 OnHitNPC(p,npc){try{npc.AddBuff(Number(Terraria.ID.BuffID.Slimed||137),120,false);}catch(e){}}
 OnHitPlayer(p,pl){try{pl.AddBuff(Number(Terraria.ID.BuffID.Slimed||137),120,true);}catch(e){}}
}
export class SlimePuppet extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/SlimePuppet';this._spawnLogged=false;this._ownerFailLogged=false;}
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'CultistIsResistantTo',this.Type,true);setArray(Terraria.ID.ProjectileID.Sets,'MinionSacrificable',this.Type,true);setArray(Terraria.ID.ProjectileID.Sets,'MinionTargetingFeature',this.Type,true);setArray(Terraria.ID.ProjectileID.Sets,'TrailCacheLength',this.Type,1);setArray(Terraria.ID.ProjectileID.Sets,'TrailingMode',this.Type,0);}
 SetDefaults(){const p=this.Projectile;p.width=60;p.height=60;p.netImportant=true;p.friendly=true;p.hostile=false;p.minionSlots=0;p.timeLeft=300;p.penetrate=1;p.minion=true;p.tileCollide=false;p.hide=true;p.alpha=0;p.scale=1;}
 OnSpawn(p){p.friendly=true;p.hostile=false;p.minion=true;p.minionSlots=0;p.hide=true;p.alpha=0;p.scale=1;if(!(Number(p.damage)>0))p.damage=10;if(!(Number(p.originalDamage)>0))p.originalDamage=10;const o=ownerOf(p);UpdatePostSlimeGodVisual(p,'puppet',o);if(!this._spawnLogged){this._spawnLogged=true;try{tl.log(`[CalamityPort 12.84.6] Slime Puppet spawned; type=${p.type}; owner=${p.owner}; damage=${p.damage}; overlayDraw=true.`);}catch(e){}}}
 CanDamage(p){return !!(p&&p.active&&p.friendly&&Number(p.damage)>0);}
 AI(p){p.friendly=true;p.hostile=false;p.minion=true;p.minionSlots=0;p.hide=true;p.alpha=0;p.scale=1;const o=ownerOf(p);if(!o){UpdatePostSlimeGodVisual(p,'puppet',null);if(!this._ownerFailLogged){this._ownerFailLogged=true;try{tl.log(`[CalamityPort 12.84.6] Slime Puppet owner lookup deferred; owner=${p.owner}.`);}catch(e){}}return;}if(o.dead){RemovePostSlimeGodVisual(p);p.Kill();return;}const c=center(p),t=findTarget(p,800,8);if(!t){const oc=Terraria.PlayerCenter(o),phase=(Number(p.identity||0)/6%6)*Math.PI,ang=Math.sin(phase)*Math.PI/10,dx=Math.sin(ang)*160,dy=Math.cos(ang)*160,d=Vector2.new(Number(oc.X)-dx,Number(oc.Y)-dy),vx=Number(d.X)-Number(c.X),vy=Number(d.Y)-Number(c.Y);if(vx*vx+vy*vy>324){const n=norm(vx,vy,9);p.velocity=Vector2.new((Number(p.velocity.X)*20+Number(n.X))/21,(Number(p.velocity.Y)*20+Number(n.Y))/21);}}else{const tc=center(t),vx=Number(tc.X)-Number(c.X),vy=Number(tc.Y)-Number(c.Y),n=norm(vx,vy,16);p.velocity=Vector2.new(Number(p.velocity.X)*0.75+Number(n.X)*0.25,Number(p.velocity.Y)*0.75+Number(n.Y)*0.25);if(vx*vx+vy*vy<240*240)p.velocity=Vector2.new(Number(p.velocity.X)*0.9+Number(n.X)*0.1,Number(p.velocity.Y)*0.9+Number(n.Y)*0.1);p.rotation=Math.atan2(Number(p.velocity.Y),Number(p.velocity.X));}UpdatePostSlimeGodVisual(p,'puppet',o);}
 OnHitNPC(p,npc){try{npc.AddBuff(Number(Terraria.ID.BuffID.Slimed||137),300,false);}catch(e){}}
 PreKill(p){try{p['void Resize(int newWidth, int newHeight)'](260,260);}catch(e){}p.friendly=true;p.maxPenetrate=-1;p.penetrate=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=10;try{p.Damage();}catch(e){}return true;}
 OnKill(p){RemovePostSlimeGodVisual(p);}
 OnTileCollide(){return false;}
}

