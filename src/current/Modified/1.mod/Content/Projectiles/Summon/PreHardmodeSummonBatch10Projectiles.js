import { Terraria, Modules } from './../../../TL/ModImports.js';
import { ModProjectile } from './../../../TL/ModProjectile.js';
import { ModBuff } from './../../../TL/ModBuff.js';
import { FusionEntityData } from './../../../Core/FusionEntityData.js';

const { Vector2, Rectangle } = Modules;
const SpriteEffects = new NativeClass('Microsoft.Xna.Framework.Graphics', 'SpriteEffects');
const NewProjectile = Terraria.Projectile['int NewProjectile(IEntitySource spawnSource, Vector2 position, Vector2 velocity, int Type, int Damage, float KnockBack, int Owner, float ai0, float ai1, float ai2, NewProjectileModifier modifer)'];
const SolidCollision=Terraria.Collision['bool SolidCollision(Vector2 Position, int Width, int Height)'];
function N(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function I(v,f=-1){const n=Math.floor(Number(v));return Number.isFinite(n)?n:f;}
function setArray(holder,name,index,value){try{let a=holder[name],need=I(index,0)+1,len=N(a&&a.Length,N(a&&a.length,0));if(len<need){a=a.cloneResized(need);holder[name]=a;}try{a['void SetValue(Object value, int index)'](value,I(index,0));return true;}catch(_){}try{a.set_Item(I(index,0),value);return true;}catch(_){}return false;}catch(_){return false;}}
function owner(p){const i=I(p.owner);if(i<0)return null;try{if(i===I(Terraria.Main.myPlayer,-2))return Terraria.Main.LocalPlayer;}catch(_){}try{return Terraria.Main.player.get_Item(i);}catch(_){return null;}}
function npcAt(i){i=I(i);if(i<0||i>=200)return null;try{return Terraria.Main.npc.get_Item(i);}catch(_){return null;}}
function valid(n){try{return !!n&&n.active!==false&&n.friendly!==true&&n.townNPC!==true&&n.dontTakeDamage!==true&&N(n.life)>0;}catch(_){return false;}}
function center(e){try{return e.Center;}catch(_){}try{const r=e['Rectangle getRect()']();return Vector2.new(N(r.X)+N(r.Width)/2,N(r.Y)+N(r.Height)/2);}catch(_){return Vector2.Zero;}}
function norm(v,s=1){const x=N(v?.X),y=N(v?.Y),l=Math.sqrt(x*x+y*y)||1;return Vector2.new(x/l*s,y/l*s);}
function src(p){try{return p.GetProjectileSource_FromThis();}catch(_){try{return null;}catch(__){return null;}}}
function acquire(p,st,range){const tick=I(Terraria.Main.GameUpdateCount,0);if(tick<I(st.nextScan,0)&&valid(st.target))return st.target;st.nextScan=tick+10;st.target=null;try{const f=p.FindTargetWithinRange(range,true);if(f&&f.active!==undefined){if(valid(f))st.target=f;}else{const n=npcAt(f);if(valid(n))st.target=n;}}catch(_){}return st.target;}
function keepBuff(p,pl,buffType){if(!pl||pl.active===false||pl.dead===true){try{p.Kill();}catch(_){p.active=false;}return false;}if(!(buffType>0)){try{p.Kill();}catch(_){p.active=false;}return false;}let idx=-1;try{idx=pl.FindBuffIndex(buffType);}catch(_){}if(idx<0){try{p.Kill();}catch(_){p.active=false;}return false;}p.timeLeft=2;return true;}
function moveToward(p,dest,speed,inertia=20){const c=center(p),dx=N(dest.X)-N(c.X),dy=N(dest.Y)-N(c.Y),v=norm(Vector2.new(dx,dy),speed);p.velocity=Vector2.new((N(p.velocity.X)*(inertia-1)+N(v.X))/inertia,(N(p.velocity.Y)*(inertia-1)+N(v.Y))/inertia);}
function orbitPoint(pl,p,radius=48,yOffset=-52,speed=.035,yScale=.55){const pc=center(pl),tick=I(Terraria.Main.GameUpdateCount,0),slot=Math.max(0,N(p.minionPos,I(p.identity,I(p.whoAmI,0)))),phase=tick*speed+slot*1.73;return Vector2.new(N(pc.X)+Math.cos(phase)*radius,N(pc.Y)+yOffset+Math.sin(phase)*radius*yScale);}
function armMinionDamage(p,fallback){const st=FusionEntityData.GetProjectileBag(p,'recentMinionDamage',()=>({baseDamage:Math.max(1,I(N(p.damage)>0?p.damage:(N(p.originalDamage)>0?p.originalDamage:fallback),fallback))}));if(!(N(st.baseDamage)>0))st.baseDamage=Math.max(1,I(N(p.damage)>0?p.damage:(N(p.originalDamage)>0?p.originalDamage:fallback),fallback));p.damage=Math.max(1,I(st.baseDamage,fallback));if(!(N(p.originalDamage)>0))p.originalDamage=p.damage;p.friendly=true;p.hostile=false;p.minion=true;return st;}
const FrameTextures=new Map();
function frameTexture(path){if(FrameTextures.has(path))return FrameTextures.get(path);let t=null;try{t=tl.texture.load(`Textures/${path}.png`);}catch(_){}FrameTextures.set(path,t);return t;}
function drawVerticalFrame(p,lightColor,path,width,height,frames){const tex=frameTexture(path);if(!tex)return true;try{const draw=Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];if(!draw)return true;const frame=Math.max(0,Math.min(frames-1,I(p.frame,0))),rect=Rectangle.new(0,frame*height,width,height),pos=Vector2.new(N(p.Center.X)-N(Terraria.Main.screenPosition.X),N(p.Center.Y)-N(Terraria.Main.screenPosition.Y)+N(p.gfxOffY)),origin=Vector2.new(width/2,height/2),fx=I(p.spriteDirection,1)<0?SpriteEffects.FlipHorizontally:SpriteEffects.None;draw(tex,pos,rect,lightColor,N(p.rotation),origin,N(p.scale,1),fx,0);return false;}catch(_){return true;}}

export class VileFeederSummon extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/VileFeederSummon';this.BuffType=0;this.ShotType=0;}
 SetStaticDefaults(){try{Terraria.Main.projFrames[this.Type]=3;}catch(_){}try{Terraria.Main.projPet[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type]=true;}catch(_){} }
 PostSetupContent(){this.BuffType=Number(ModBuff.getTypeByName('VileFeederBuff')||0);this.ShotType=Number(ModProjectile.getTypeByName('VileFeederProjectile')||0);}
 SetDefaults(){const p=this.Projectile;p.width=p.height=32;p.friendly=true;p.hostile=false;p.minion=true;p.minionSlots=1;p.penetrate=-1;p.tileCollide=false;p.ignoreWater=true;p.timeLeft=18000;p.netImportant=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=60;}
 OnSpawn(p){armMinionDamage(p,15);p.netUpdate=true;}
 AI(p){const pl=owner(p);if(!(this.BuffType>0))this.BuffType=Number(ModBuff.getTypeByName('VileFeederBuff')||0);if(!keepBuff(p,pl,this.BuffType))return;armMinionDamage(p,15);const st=FusionEntityData.GetProjectileBag(p,'vileFeeder',()=>({target:null,nextScan:0,latched:null,shoot:0}));
  if(st.latched&&valid(st.latched)){const tc=center(st.latched);p.Center=tc;p.velocity=Vector2.Zero;p.rotation=0;st.shoot++;if(st.shoot>=60&&I(p.owner)===I(Terraria.Main.myPlayer)){st.shoot=0;if(!(this.ShotType>0))this.ShotType=Number(ModProjectile.getTypeByName('VileFeederProjectile')||0);if(this.ShotType>0){const a=Math.random()*Math.PI*2,v=Vector2.new(Math.cos(a)*7,Math.sin(a)*7);NewProjectile(src(p),p.Center,v,this.ShotType,Math.max(1,I(p.damage,10)),N(p.knockBack,.5),p.owner,0,0,0,null);}}}
  else{st.latched=null;const t=acquire(p,st,640);const pc=center(pl),c=center(p);if(t){moveToward(p,center(t),12,12);}else{const desired=orbitPoint(pl,p,52,-55,.032,.5);moveToward(p,desired,8,16);if(Math.hypot(N(c.X)-N(pc.X),N(c.Y)-N(pc.Y))>1400){p.Center=pc;p.velocity=Vector2.Zero;}}p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))-Math.PI/2;}
  p.frameCounter=N(p.frameCounter)+1;if(N(p.frameCounter)>=5){p.frameCounter=0;p.frame=(I(p.frame,0)+1)%3;}
 }
 OnHitNPC(p,n){const st=FusionEntityData.GetProjectileBag(p,'vileFeeder',()=>({latched:null,shoot:0}));if(valid(n)){st.latched=n;st.shoot=0;p.velocity=Vector2.Zero;}}
 MinionContactDamage(){return true;}
 OnTileCollide(){return false;}
 PreDraw(p,lightColor){return drawVerticalFrame(p,lightColor,'Projectiles/Summon/VileFeederSummon',22,32,3);}
}

export class VileFeederProjectile extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/VileFeederProjectile';}
 SetStaticDefaults(){setArray(Terraria.Main,'projFrames',this.Type,4);setArray(Terraria.ID.ProjectileID.Sets,'MinionShot',this.Type,true);}
 SetDefaults(){const p=this.Projectile;p.width=p.height=16;p.friendly=true;p.hostile=false;p.timeLeft=300;p.penetrate=1;p.tileCollide=true;p.alpha=255;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=20;}
 AI(p){const st=FusionEntityData.GetProjectileBag(p,'vileShot',()=>({age:0,bounce:3,target:null,nextScan:0}));st.age++;p.alpha=Math.max(0,I(p.alpha,0)-50);if(st.age>30){const t=acquire(p,st,640);if(t){const desired=norm(Vector2.new(N(center(t).X)-N(p.Center.X),N(center(t).Y)-N(p.Center.Y)),10);p.velocity=Vector2.new(N(p.velocity.X)*.84+N(desired.X)*.16,N(p.velocity.Y)*.84+N(desired.Y)*.16);}}p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))-Math.PI/2;p.frameCounter=N(p.frameCounter)+1;if(N(p.frameCounter)>=6){p.frameCounter=0;p.frame=(I(p.frame,0)+1)%4;}}
 CanDamage(p){const st=FusionEntityData.GetProjectileBag(p,'vileShot',()=>({age:0}));return st.age>=30?null:false;}
 OnTileCollide(p,old){const st=FusionEntityData.GetProjectileBag(p,'vileShot',()=>({bounce:3,age:0}));st.bounce--;if(st.bounce<=0)return true;st.age+=15;let x=N(p.velocity.X),y=N(p.velocity.Y);if(x!==N(old.X))x=-N(old.X);if(y!==N(old.Y))y=-N(old.Y);p.velocity=Vector2.new(x,y);return false;}
 PreDraw(p,lightColor){return drawVerticalFrame(p,lightColor,'Projectiles/Summon/VileFeederProjectile',18,20,4);}
}

export class BabyBloodCrawler extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/BabyBloodCrawler';this.BuffType=0;this.RainType=0;try{this.AIType=Number(Terraria.ID.ProjectileID.VenomSpider);}catch(_){} }
 SetStaticDefaults(){try{Terraria.Main.projFrames[this.Type]=11;}catch(_){}try{Terraria.Main.projPet[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type]=true;}catch(_){} }
 PostSetupContent(){this.BuffType=Number(ModBuff.getTypeByName('BabyBloodCrawlerBuff')||0);this.RainType=Number(ModProjectile.getTypeByName('BloodRain')||0);}
 SetDefaults(){const p=this.Projectile;p.width=26;p.height=26;p.netImportant=true;p.friendly=true;p.hostile=false;p.ignoreWater=false;p.minionSlots=1;p.timeLeft=90000;p.penetrate=-1;p.minion=true;p.tileCollide=false;p.aiStyle=26;p.extraUpdates=1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=60;try{this.AIType=Number(Terraria.ID.ProjectileID.VenomSpider);}catch(_){} }
 OnSpawn(p){FusionEntityData.GetProjectileBag(p,'bloodCrawler',()=>({bloodCooldown:0}));armMinionDamage(p,15);p.netUpdate=true;}
 AI(p){const pl=owner(p);if(!pl||pl.active===false||pl.dead===true){p.Kill();return;}if(!(this.BuffType>0))this.BuffType=Number(ModBuff.getTypeByName('BabyBloodCrawlerBuff')||0);let has=false;try{has=this.BuffType>0&&Number(pl.FindBuffIndex(this.BuffType))>=0;}catch(_){}if(!has){p.Kill();return;}p.timeLeft=2;armMinionDamage(p,15);const st=FusionEntityData.GetProjectileBag(p,'bloodCrawler',()=>({bloodCooldown:0}));if(st.bloodCooldown>0)st.bloodCooldown--;}
 OnHitNPC(p,n){const st=FusionEntityData.GetProjectileBag(p,'bloodCrawler',()=>({bloodCooldown:0}));if(st.bloodCooldown>0||I(p.owner)!==I(Terraria.Main.myPlayer)||!valid(n))return;st.bloodCooldown=15;if(!(this.RainType>0))this.RainType=Number(ModProjectile.getTypeByName('BloodRain')||0);if(!(this.RainType>0))return;const tc=center(n),spawn=Vector2.new(N(tc.X)+(Math.random()*200-100),N(tc.Y)-(400+Math.random()*300)),v=norm(Vector2.new(N(tc.X)-N(spawn.X),N(tc.Y)-N(spawn.Y)),25);NewProjectile(src(p),spawn,v,this.RainType,Math.max(1,Math.floor(N(p.damage,15)*.5)),N(p.knockBack,.5),p.owner,0,0,0,null);}
 MinionContactDamage(){return true;}
 OnTileCollide(){return false;}
 PreDraw(p,lightColor){return drawVerticalFrame(p,lightColor,'Projectiles/Summon/BabyBloodCrawler',30,34,11);}
}

export class BloodRain extends ModProjectile{
 constructor(){super();this.Texture='ExtraTextures/TinyGreyscaleCircle';}
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'MinionShot',this.Type,true);}
 SetDefaults(){const p=this.Projectile;p.width=10;p.height=18;p.friendly=true;p.hostile=false;p.penetrate=1;p.timeLeft=90;p.tileCollide=true;p.ignoreWater=true;p.aiStyle=-1;}
 AI(p){p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X))+Math.PI/2;}
}

let SmallSkeletonTexture=null;
function skeletonTex(){if(SmallSkeletonTexture)return SmallSkeletonTexture;try{SmallSkeletonTexture=tl.texture.load('Textures/Projectiles/Summon/SmallSkeletonMinion.png');}catch(_){}return SmallSkeletonTexture;}
export class SmallSkeletonMinion extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/SmallSkeletonMinion';this.BuffType=0;}
 SetStaticDefaults(){try{Terraria.Main.projFrames[this.Type]=7;}catch(_){}try{Terraria.Main.projPet[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type]=true;}catch(_){} }
 PostSetupContent(){this.BuffType=Number(ModBuff.getTypeByName('SmallSkeletonBuff')||0);}
 SetDefaults(){const p=this.Projectile;p.width=24;p.height=34;p.netImportant=true;p.friendly=true;p.hostile=false;p.ignoreWater=true;p.aiStyle=-1;p.minionSlots=1;p.timeLeft=90000;p.penetrate=-1;p.tileCollide=true;p.minion=true;p.extraUpdates=1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=30;}
 OnSpawn(p){FusionEntityData.GetProjectileBag(p,'smallSkeleton',()=>({variant:Math.floor(Math.random()*3),target:null,nextScan:0,lastX:N(p.Center.X)}));armMinionDamage(p,31);p.netUpdate=true;}
 AI(p){const pl=owner(p);if(!pl||pl.active===false||pl.dead===true){p.Kill();return;}if(!(this.BuffType>0))this.BuffType=Number(ModBuff.getTypeByName('SmallSkeletonBuff')||0);let has=false;try{has=this.BuffType>0&&Number(pl.FindBuffIndex(this.BuffType))>=0;}catch(_){}if(!has){p.Kill();return;}p.timeLeft=2;armMinionDamage(p,31);const st=FusionEntityData.GetProjectileBag(p,'smallSkeleton',()=>({variant:0,target:null,nextScan:0,lastX:N(p.Center.X)})),pc=center(pl),c=center(p),t=acquire(p,st,900),tc=t?center(t):null;
  p.frameCounter=N(p.frameCounter)+1;if((I(p.frameCounter,0)%6)===5){p.frame=I(p.frame,0)+1;p.frameCounter=0;}if(I(p.frame,0)<1)p.frame=1;if(I(p.frame,0)>=7)p.frame=1;
  let vx=N(p.velocity.X),vy=N(p.velocity.Y);const oldX=N(st.lastX,N(c.X));st.lastX=N(c.X);let desiredX=tc?N(tc.X):N(pc.X)-40*N(p.minionPos,0),follow=tc?Math.min(N(t?.width,40)/2,40):160,dx=desiredX-N(c.X);if(Math.abs(dx)>follow){vx+=Math.sign(dx)*(tc?(.08+Math.random()*.07):(.11+Math.random()*.05));vx=Math.max(tc?-16:-13,Math.min(tc?16:13,vx));}else vx*=.95;
  const onGround=Math.abs(vy)<.05;let hole=false;try{const ahead=Math.sign(vx||dx||1)*24;hole=!SolidCollision(Vector2.new(N(p.position.X)+ahead,N(p.position.Y)+N(p.height)+2),16,28);}catch(_){}if(onGround&&(hole||(Math.hypot(N(pc.X)-N(c.X),N(pc.Y)-N(c.Y))>205&&Math.abs(N(c.X)-oldX)<.02)))vy=-10;else if(vy!==0)p.frame=2;if(vy>-16)vy+=.3;p.velocity=Vector2.new(vx,vy);
  const pd=Math.hypot(N(pc.X)-N(c.X),N(pc.Y)-N(c.Y));if(pd>1600){p.Center=pc;p.velocity=Vector2.Zero;p.netUpdate=true;}if(vx>.25)p.spriteDirection=1;else if(vx<-.25)p.spriteDirection=-1;
 }
 MinionContactDamage(){return true;}
 OnTileCollide(){return false;}
 PreDraw(p,lightColor){const tex=skeletonTex();if(!tex)return true;try{const st=FusionEntityData.GetProjectileBag(p,'smallSkeleton',()=>({variant:0})),draw=Terraria.Main.spriteBatch['void Draw(Texture2D texture, Vector2 position, Nullable`1 sourceRectangle, Color color, float rotation, Vector2 origin, float scale, SpriteEffects effects, float layerDepth)'];if(!draw)return true;const w=24,h=34,variant=Math.max(0,Math.min(2,I(st.variant,0))),frame=Math.max(0,Math.min(6,I(p.frame,0))),rect=Rectangle.new(variant*w,frame*h,w,h),pos=Vector2.new(N(p.Center.X)-N(Terraria.Main.screenPosition.X),N(p.Center.Y)-N(Terraria.Main.screenPosition.Y)+N(p.gfxOffY)),origin=Vector2.new(w/2,h/2),fx=I(p.spriteDirection,1)<0?SpriteEffects.FlipHorizontally:SpriteEffects.None;draw(tex,pos,rect,lightColor,N(p.rotation),origin,N(p.scale,1),fx,0);return false;}catch(_){return true;}}
}

export class EyeOfNightSummon extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/EyeOfNightSummon';this.BuffType=0;this.CellType=0;}
 SetStaticDefaults(){try{Terraria.Main.projPet[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionSacrificable[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.MinionTargetingFeature[this.Type]=true;}catch(_){}try{Terraria.ID.ProjectileID.Sets.TrackMinionSpawnFromItemUse[this.Type]=true;}catch(_){} }
 PostSetupContent(){this.BuffType=Number(ModBuff.getTypeByName('EyeOfNightBuff')||0);this.CellType=Number(ModProjectile.getTypeByName('EyeOfNightCell')||0);}
 SetDefaults(){const p=this.Projectile;p.width=p.height=16;p.friendly=true;p.hostile=false;p.minion=true;p.minionSlots=1;p.penetrate=-1;p.tileCollide=false;p.ignoreWater=true;p.timeLeft=18000;p.netImportant=true;p.aiStyle=-1;}
 OnSpawn(p){armMinionDamage(p,24);p.netUpdate=true;}
 AI(p){const pl=owner(p);if(!(this.BuffType>0))this.BuffType=Number(ModBuff.getTypeByName('EyeOfNightBuff')||0);if(!keepBuff(p,pl,this.BuffType))return;armMinionDamage(p,24);const st=FusionEntityData.GetProjectileBag(p,'eyeNight',()=>({hover:0,target:null,nextScan:0})),pc=center(pl),c=center(p),t=acquire(p,st,750);if(t){st.hover++;const tc=center(t),phase=N(p.identity,I(p.whoAmI))*0.96+st.hover/15,rx=Math.max(90,N(t.width)*1.2),ry=Math.max(90,N(t.height)*1.2),pulse=.7+.6*((Math.cos(N(p.identity)*1.11+st.hover/14)+1)/2),dest=Vector2.new(N(tc.X)+Math.cos(phase)*rx*pulse,N(tc.Y)+Math.sin(phase)*Math.min(70,ry*.8)*pulse);p.velocity=norm(Vector2.new(N(dest.X)-N(c.X),N(dest.Y)-N(c.Y)),Math.max(5,Math.min(15,5+Math.hypot(N(dest.X)-N(c.X),N(dest.Y)-N(c.Y))/25)));if(st.hover%70===69&&I(p.owner)===I(Terraria.Main.myPlayer)){if(!(this.CellType>0))this.CellType=Number(ModProjectile.getTypeByName('EyeOfNightCell')||0);if(this.CellType>0){const v=norm(Vector2.new(N(tc.X)-N(c.X),N(tc.Y)-N(c.Y)),8);NewProjectile(src(p),c,v,this.CellType,Math.max(1,I(p.damage,24)),N(p.knockBack,1),p.owner,0,0,0,null);}}}
  else{const dest=orbitPoint(pl,p,30,-45,.04,.65);moveToward(p,dest,8,12);p.velocity=Vector2.new(N(p.velocity.X)*.99,N(p.velocity.Y)*.99);}if(Math.hypot(N(c.X)-N(pc.X),N(c.Y)-N(pc.Y))>1800){p.Center=pc;p.velocity=Vector2.new(0,-4);}p.rotation+=N(p.velocity.X)*.075;}
 CanDamage(){return false;}
 MinionContactDamage(){return false;}
}

export class EyeOfNightCell extends ModProjectile{
 constructor(){super();this.Texture='Projectiles/Summon/EyeOfNightCell';}
 SetStaticDefaults(){setArray(Terraria.ID.ProjectileID.Sets,'MinionShot',this.Type,true);}
 SetDefaults(){const p=this.Projectile;p.width=p.height=10;p.friendly=true;p.hostile=false;p.penetrate=2;p.timeLeft=180;p.tileCollide=false;p.ignoreWater=true;p.aiStyle=-1;p.usesLocalNPCImmunity=true;p.localNPCHitCooldown=45;}
 AI(p){const st=FusionEntityData.GetProjectileBag(p,'eyeCell',()=>({stuck:null,offX:0,offY:0,stickTime:0}));if(st.stuck&&valid(st.stuck)){const c=center(st.stuck);p.Center=Vector2.new(N(c.X)+N(st.offX),N(c.Y)+N(st.offY));p.velocity=Vector2.Zero;st.stickTime++;if(st.stickTime>60)p.Kill();}else if(st.stuck){p.Kill();}p.rotation=Math.atan2(N(p.velocity.Y),N(p.velocity.X));}
 OnHitNPC(p,n){if(!valid(n))return;const st=FusionEntityData.GetProjectileBag(p,'eyeCell',()=>({stuck:null,offX:0,offY:0,stickTime:0})),nc=center(n),pc=center(p);st.stuck=n;st.offX=N(pc.X)-N(nc.X);st.offY=N(pc.Y)-N(nc.Y);st.stickTime=0;p.friendly=false;p.tileCollide=false;p.velocity=Vector2.Zero;}
}
